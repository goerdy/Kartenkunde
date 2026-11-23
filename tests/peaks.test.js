import test from 'node:test';
import assert from 'node:assert/strict';
import {farmFeatures,peakElevation} from '../src/farm-labels.js';
import {createPQ5TKStyle,createPQ5TKPrintStyle,createPQ5TKOverviewStyle} from '../src/pq5-tk.js';
import {createPQ5BasemapStyle} from '../src/pq5-basemap.js';
import {tkSymbolGeometry} from '../src/tk-symbols.js';
import {tkLegendLayout} from '../src/tk-legend.js';
test('Peak data retains actual elevation through raw Postpass, normalized proxy and Overpass paths',()=>{
 const raw={type:'FeatureCollection',features:[{id:'node/1',geometry:{type:'Point',coordinates:[10,51]},properties:{tags:{natural:'peak',name:'Gipfel',ele:'1141.2'}}}]};
 const data=farmFeatures(raw);assert.equal(data.features[0].properties.elevation,'1141.2 m');assert.deepEqual(farmFeatures(data),data);
 const over=farmFeatures({elements:[{type:'node',id:2,lon:10,lat:51,tags:{natural:'peak',ele:'0'}}]});assert.equal(over.features[0].properties.elevation,'0 m');
 assert.equal(peakElevation(undefined),'');assert.equal(peakElevation('unknown'),'');assert.equal(peakElevation('123,5 m'),'123.5 m');assert.equal(peakElevation('-12'),'-12 m');
});
test('All PQ5 styles expose switchable peak symbols and labels, print scaling, legend and clean overview',()=>{
 for(const create of [createPQ5TKStyle,createPQ5TKPrintStyle,createPQ5BasemapStyle]){
 const on=create(),off=create({peaks:false});assert.equal(on.layers.find(l=>l.id==='tk-mountain-peaks').layout.visibility,'visible');assert.equal(off.layers.find(l=>l.id==='tk-mountain-peaks').layout.visibility,'none');
 assert.ok(!JSON.stringify(on.layers.find(l=>l.id==='tk-landmarks').filter).includes('"peak"'));
 }
 assert.ok(tkSymbolGeometry('peak').some(s=>s.closed&&s.fill&&s.points.length===3));
 assert.ok(tkLegendLayout([210,297],186,{}).entries.some(e=>e.symbol==='peak'));assert.ok(!tkLegendLayout([210,297],186,{peaks:false}).entries.some(e=>e.symbol==='peak'));
 assert.ok(!createPQ5TKOverviewStyle().layers.some(l=>l.id==='tk-mountain-peaks'));
});
