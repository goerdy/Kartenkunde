import test from 'node:test';
import assert from 'node:assert/strict';
import {createPQ5BasemapStyle,BASEMAP_TILEJSON} from '../src/pq5-basemap.js';
import {isPQ5,isBasemap,styleURL,styleCredit} from '../src/render.js';
import {TK_FEATURE_KEYS} from '../src/tk-features.js';
import {tkLegendLayout} from '../src/tk-legend.js';
test('basemap uses its own official schema and PQ5 palette; roads only label numbers and all water lines are drawn',()=>{
 const style=styleURL('pq5basemap');assert.ok(isPQ5('pq5basemap')&&isBasemap('pq5basemap'));assert.equal(style.sources.basemap.url,BASEMAP_TILEJSON);assert.ok(!style.sources.osm);
 assert.equal(style.layers.find(l=>l.id==='bm-waterways')['source-layer'],'Gewaesserlinie');assert.equal(style.layers.find(l=>l.id==='bm-waterways').paint['line-color'],'#007cf0');assert.ok(!JSON.stringify(style.layers.find(l=>l.id==='bm-waterways').filter).includes('name'));
 assert.deepEqual(style.layers.find(l=>l.id==='tk-road-refs').layout['text-field'],['get','nummer']);assert.ok(styleCredit('pq5basemap').includes('GeoBasis-DE / BKG'));assert.ok(styleCredit('pq5basemap').includes('ODbL'));
});
test('basemap POIs share all existing controls, print scaling and clean cover overview',()=>{
 const off=Object.fromEntries(TK_FEATURE_KEYS.map(k=>[k,false]));
 for(const mode of ['screen','print']){const style=createPQ5BasemapStyle(off,mode);assert.deepEqual(style.layers.find(l=>l.id==='tk-landmarks').filter,['==',1,0]);assert.equal(style.layers.find(l=>l.id==='tk-named-farms').layout.visibility,'none');assert.equal(style.layers.find(l=>l.id==='tk-cemetery-fill').layout.visibility,'none');}
 const printed=createPQ5BasemapStyle({},'print');assert.equal(printed.metadata['pq5:printScale'],4);
 const overview=createPQ5BasemapStyle({},'overview');assert.ok(!overview.sources['named-farms']);assert.ok(overview.layers.every(l=>l.source!=='named-farms'));assert.ok(!overview.layers.some(l=>l.id==='tk-small-settlements'));
 assert.equal(tkLegendLayout([210,297],186,{},'pq5basemap').name,'PQ5-Default-GER');
});

test('Street names are opt-out only at 1:5000, in both screen and print styles, and never on cover',()=>{
 for(const mode of ['screen','print']){
 assert.ok(createPQ5BasemapStyle({scale:5000},mode).layers.some(l=>l.id==='tk-street-names'));
 assert.ok(!createPQ5BasemapStyle({scale:5000,streetNames:false},mode).layers.some(l=>l.id==='tk-street-names'));
 for(const scale of [10000,25000,50000,100000,200000])assert.ok(!createPQ5BasemapStyle({scale,streetNames:true},mode).layers.some(l=>l.id==='tk-street-names'));
 }
 const overview=createPQ5BasemapStyle({scale:5000,streetNames:true},'overview');assert.ok(!overview.layers.some(l=>l.id==='tk-street-names'));
 const places=overview.layers.find(l=>l.id==='tk-overview-places');assert.ok(places);assert.deepEqual(places.filter[2][2][1],['Gemeindeteil','Stadtteil']);assert.ok(!overview.sources['named-farms']);
});

test('Detailed official rail classes and OSM service roads appear in screen/print, including private driveways',()=>{
 for(const mode of ['screen','print']){
 const style=createPQ5BasemapStyle({},mode),rail=style.layers.find(l=>l.id==='bm-rail');
 for(const kind of ['Gleis','Güterverkehr','Personenverkehr','Straßenbahn','U-Bahn'])assert.ok(rail.filter[2][1].includes(kind));
 assert.equal(style.sources['osm-detail'].url,'https://tiles.openfreemap.org/planet');
 const service=style.layers.find(l=>l.id==='bm-osm-service-fill');assert.equal(service['source-layer'],'transportation');assert.deepEqual(service.filter,['==',['get','class'],'service']);assert.ok(!JSON.stringify(service.filter).includes('access'));
 assert.ok(style.layers.findIndex(l=>l.id==='bm-osm-service-fill')>style.layers.findIndex(l=>l.id==='tk-buildings'));
 }
 const overview=createPQ5BasemapStyle({},'overview');assert.ok(!overview.sources['osm-detail']);assert.ok(overview.layers.every(l=>l.source!=='osm-detail'));
});

test('Settlement names reserve space before contours and supplementary POIs in preview, print and overview',async()=>{
 const {createPQ5TKStyle,createPQ5TKPrintStyle,createPQ5TKOverviewStyle}=await import('../src/pq5-tk.js');
 for(const style of [createPQ5TKStyle(),createPQ5TKPrintStyle(),createPQ5TKOverviewStyle(),...['screen','print','overview'].map(mode=>createPQ5BasemapStyle({},mode))]){
 const index=id=>style.layers.findIndex(l=>l.id===id),village=style.layers.find(l=>l.id==='tk-villages');
 for(const id of ['tk-landmarks','tk-named-farms','tk-mountain-peaks','bm-contour-labels','bm-contour-short-labels','tk-small-settlements','tk-overview-places'])if(index(id)>=0)assert.ok(index('tk-villages')>index(id),id);
 assert.ok(index('tk-cities')>index('tk-villages')||index('bm-cities')>index('tk-villages'));
 assert.ok(village.layout['text-variable-anchor'].length>=5);assert.notEqual(village.layout['text-allow-overlap'],true);
 }
});
