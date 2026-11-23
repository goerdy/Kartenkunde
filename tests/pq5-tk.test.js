import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPQ5TKStyle,createPQ5TKPrintStyle,pq5PrintPixelRatio,PQ5_PRINT_DETAIL_OFFSET} from '../src/pq5-tk.js';
import {styleURL,styleCredit,MAP_STYLES} from '../src/render.js';
test('PQ5-TK is a standalone vector style shared by preview and PDF without LGLN dependencies',()=>{
 const style=styleURL('pq5tk');assert.equal(style.name,'PQ5-Default (Topo OSM)');assert.equal(style.version,8);assert.ok(style.layers.length>30);
 assert.deepEqual(style,JSON.parse(JSON.stringify(style)));assert.deepEqual({...style,name:'PQ5-TK'},createPQ5TKStyle());
 const ids=new Set();for(const layer of style.layers){assert.ok(!ids.has(layer.id));ids.add(layer.id);if(layer.type!=='background'){assert.ok(style.sources[layer.source]);if(style.sources[layer.source].type==='vector')assert.ok(layer['source-layer']);}assert.ok(['background','fill','line','symbol'].includes(layer.type));}
 assert.equal(style.sources.osm.type,'vector');assert.equal(style.sources.osm.url,'https://tiles.openfreemap.org/planet');assert.ok(!JSON.stringify(style).includes('lgln.niedersachsen.de'));assert.ok(styleCredit('pq5tk').includes('OpenStreetMap'));assert.equal(MAP_STYLES.pq5tk.monochrome,undefined);
 // MapLibre can mutate style objects; subsequent maps and PDF renders must receive fresh state.
 style.layers[0].paint['background-color']='#000000';assert.notEqual(createPQ5TKStyle().layers[0].paint['background-color'],'#000000');
});
test('PQ5-TK names use provider-supported fonts and keep water and terrain labels distinct',()=>{
 const symbols=createPQ5TKStyle().layers.filter(l=>l.type==='symbol');
 for(const layer of symbols)for(const font of layer.layout['text-font']||[])assert.ok(['Noto Sans Regular','Noto Sans Italic','Noto Sans Bold'].includes(font));
 assert.ok(symbols.some(l=>l.id==='tk-mountain-peaks'&&l.source==='named-farms'));assert.ok(symbols.some(l=>l['source-layer']==='transportation_name'&&l.layout['symbol-placement']==='line'));
 assert.notEqual(symbols.find(l=>l.id==='tk-water-names').paint['text-color'],symbols.find(l=>l.id==='tk-cities').paint['text-color']);
});
test('Application and PDF branding use KARTENKUNDE.app; saved old default titles migrate',()=>{
 const root=new URL('../',import.meta.url),html=readFileSync(new URL('karten.html',root),'utf8'),pdf=readFileSync(new URL('src/pdf.js',root),'utf8'),main=readFileSync(new URL('src/main.js',root),'utf8');
 assert.ok(main.includes("saved[id]==='pq4tk'?'pq5tk'"));assert.ok(html.includes(' · KARTENKUNDE.app</title>'));assert.ok(html.includes('value="KARTENKUNDE.app"'));
 assert.ok(pdf.includes("creator:'KARTENKUNDE.app'"));assert.ok(readFileSync(new URL('src/cover.js',root),'utf8').includes("coverText(pdf,'KARTENKUNDE.app'"));
 assert.ok(main.includes("['Mein Kartenatlas','UTMREF-MAP','UMTFREF-MAP','PQ5-UTMREF-MAP'].includes(saved[id])?'KARTENKUNDE.app':saved[id]"));
});

function cameraValue(value,zoom){
 if(typeof value==='number')return value;
 assert.equal(value[0],'interpolate');assert.deepEqual(value[2],['zoom']);
 if(zoom<=value[3])return value[4];
 for(let i=5;i<value.length;i+=2)if(zoom<=value[i]){const base=value[1][1],span=value[i]-value[i-2],pos=zoom-value[i-2],t=base===1?pos/span:(base**pos-1)/(base**span-1);return value[i-1]+t*(value[i+1]-value[i-1]);}
 return value.at(-1);
}
test('Print loads two finer zoom levels while strokes keep their physical size at every DPI',()=>{
 const screen=createPQ5TKStyle(),print=createPQ5TKPrintStyle();
 for(const dpi of [96,150,200,300]){
 const ratio=pq5PrintPixelRatio(dpi),oldRatio=dpi/150;
 // Resolution changes with DPI. Vector detail must stay constant across DPI choices.
 const resolution=14*150/dpi;
 const oldZoom=Math.log2(40075016.68557849/(512*resolution*oldRatio));
 const newZoom=Math.log2(40075016.68557849/(512*resolution*ratio));
 assert.ok(Math.abs(newZoom-oldZoom-PQ5_PRINT_DETAIL_OFFSET)<1e-12);
 assert.ok(newZoom>=14); // Full detail tiles rather than the old zoom-12 generalisation.
 for(const layer of screen.layers){const other=print.layers.find(l=>l.id===layer.id);
 if(layer.paint?.['line-width']!==undefined)assert.ok(Math.abs(cameraValue(layer.paint['line-width'],oldZoom)*oldRatio-cameraValue(other.paint['line-width'],newZoom)*ratio)<1e-9);
 if(layer.layout?.['text-size']!==undefined)assert.ok(Math.abs(cameraValue(layer.layout['text-size'],oldZoom)*oldRatio-cameraValue(other.layout['text-size'],newZoom)*ratio)<1e-9);
 }
 }
});
test('Road labels use references only; small settlement names have a dedicated dense label layer',()=>{
 for(const style of [createPQ5TKStyle(),createPQ5TKPrintStyle()]){
 const roads=style.layers.filter(l=>l['source-layer']==='transportation_name');assert.equal(roads.length,1);assert.deepEqual(roads[0].layout['text-field'],['get','ref']);
 assert.ok(!JSON.stringify(roads[0].layout['text-field']).includes('name'));
 const small=style.layers.find(l=>l.id==='tk-small-settlements');assert.ok(JSON.stringify(small.filter).includes('isolated_dwelling'));assert.ok(JSON.stringify(small.filter).includes('hamlet'));assert.ok(small.layout['text-variable-anchor'].length>1);assert.equal(small.layout['text-padding'],style.name==='PQ5-TK'?1:4);
 }
});

test('Small and unnamed surface waters render blue; intermittent and tunnel water is dashed rather than erased',()=>{
 const evaluate=(e,properties)=>{if(!Array.isArray(e))return e;switch(e[0]){case 'get':return properties[e[1]];case 'literal':return e[1];case 'in':return evaluate(e[2],properties).includes(evaluate(e[1],properties));case '!':return !evaluate(e[1],properties);case '!=':return evaluate(e[1],properties)!==evaluate(e[2],properties);case '==':return evaluate(e[1],properties)===evaluate(e[2],properties);case 'all':return e.slice(1).every(v=>evaluate(v,properties));default:throw Error(e[0]);}};
 for(const style of [createPQ5TKStyle(),createPQ5TKPrintStyle()]){
 const water=style.layers.filter(l=>l.type==='line'&&l['source-layer']==='waterway');
 for(const kind of ['stream','ditch','drain','river','canal'])for(const extra of [{},{intermittent:1},{brunnel:'tunnel'}]){
 const matches=water.filter(l=>evaluate(l.filter,{class:kind,...extra}));assert.equal(matches.length,1,`${kind}: ${JSON.stringify(extra)}`);
 const layer=matches[0];assert.notEqual(layer.paint['line-color'],style.layers[0].paint['background-color']);assert.equal(layer.paint['line-color'],'#007cf0');assert.ok(cameraValue(layer.paint['line-width'],style.name==='PQ5-TK'?12:14)>0);
 if(extra.intermittent||extra.brunnel)assert.ok(layer.paint['line-dasharray']);
 }
 assert.ok(style.layers.find(l=>l.id==='tk-shore').minzoom<=8);
 }
});

test('OSM PQ5 street names follow the 1:5000 switch in screen and print output',()=>{
 for(const factory of [createPQ5TKStyle,createPQ5TKPrintStyle]){
 const named=factory({scale:5000}).layers.find(l=>l.id==='tk-street-names');assert.ok(named);assert.equal(named['source-layer'],'transportation_name');assert.notDeepEqual(named.layout['text-field'],['get','ref']);
 assert.ok(!factory({scale:5000,streetNames:false}).layers.some(l=>l.id==='tk-street-names'));
 assert.ok(!factory({scale:10000,streetNames:true}).layers.some(l=>l.id==='tk-street-names'));
 }
});
