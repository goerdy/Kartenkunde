import test from 'node:test';
import assert from 'node:assert/strict';
import {grayscaleColorArguments,applyPDFMonochrome} from '../src/monochrome.js';
import {MAP_STYLES,isPQ5,styleURL,styleName,setPreviewStyle} from '../src/render.js';
import {setLanguage} from '../src/i18n.js';
import {drawTKLegend,tkLegendLayout} from '../src/tk-legend.js';
test('PQ5 grey shares the detailed map and feature controls, with a reversible preview filter',()=>{
 assert.ok(isPQ5('pq5gray'));assert.equal(MAP_STYLES.pq5gray.monochrome,true);assert.equal(isPQ5('liberty'),false);
 const colour=styleURL('pq5tk'),grey=styleURL('pq5gray');assert.deepEqual(grey.layers,colour.layers);assert.deepEqual(grey.sources,colour.sources);
 const host={style:{}},map={setStyle(){}};setPreviewStyle(map,host,'pq5gray');assert.equal(host.style.filter,'grayscale(1)');setPreviewStyle(map,host,'pq5tk');assert.equal(host.style.filter,'');
});
test('PDF vector colours, including hexadecimal legend swatches, become neutral greys',()=>{
 assert.deepEqual(grayscaleColorArguments(['#d02030']),[71,71,71]);assert.deepEqual(grayscaleColorArguments([0,124,240]),[106,106,106]);assert.deepEqual(grayscaleColorArguments([0]),[0]);
 const recorded=[];const pdf={setDrawColor(...args){recorded.push(args);return this;},setFillColor(...args){recorded.push(args);return this;},setTextColor(...args){recorded.push(args);return this;},setFont(){},setFontSize(){},text(){},setLineWidth(){},setLineDashPattern(){},line(){},triangle(){},rect(){}};
 applyPDFMonochrome(pdf);drawTKLegend(pdf,tkLegendLayout([210,297],186,{},'pq5gray'),12,40);
 assert.ok(recorded.length>20);for(const colour of recorded)assert.ok(colour.length===1||colour[0]===colour[1]&&colour[1]===colour[2]);
});
test('Requested provider names appear in all languages and PDF legend variant titles remain distinct',()=>{
 try{for(const lang of ['de','en','fr']){setLanguage(lang);assert.equal(styleName('pq5tk'),'PQ5-Default (Topo OSM)');assert.equal(styleName('pq5gray'),'PQ5-grau (Topo OSM)');for(const id of ['liberty','bright','positron','fiord','dark','mono','plain'])assert.ok(styleName(id).endsWith('(Openfreemap)'));assert.ok(styleName('lgln50').startsWith('DTK50 (LGLN'));}}finally{setLanguage('de');}
 assert.equal(tkLegendLayout([210,297],186,{},'pq5gray').name,'PQ5-grau');
});
