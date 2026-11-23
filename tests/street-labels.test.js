import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {streetNameFeatures,installStreetNameLabels} from '../src/street-labels.js';
import {createPQ5BasemapStyle} from '../src/pq5-basemap.js';
import {createPQ5TKStyle,createPQ5TKPrintStyle,createPQ5TKOverviewStyle} from '../src/pq5-tk.js';
const road=(name,line)=>({type:'Feature',properties:{name},geometry:{type:'LineString',coordinates:line}});
const options={project:p=>({x:p[0],y:p[1]}),unproject:p=>[p.x,p.y],width:100,height:100};
test('Every named visible street lacking a line label gets an anchor, including tiny streets and sharp bends',()=>{
 const features=[road('Kurz',[[5,5],[6,5]]),road('Kurve',[[10,10],[10,20],[20,20]]),road('Auswärts',[[-20,-20],[-10,-10]]),road('Vorhanden',[[20,30],[50,30]]),road('',[[30,40],[50,40]])];
 const result=streetNameFeatures(features,{...options,shown:new Set(['Vorhanden'])});assert.deepEqual(result.features.map(f=>f.properties.name),['Kurz','Kurve']);assert.deepEqual(result.features[0].geometry.coordinates,[5.5,5]);
});
test('Tile duplicates use the longest visible candidate; clipping precedes midpoint calculation and print footprint is respected',()=>{
 const features=[road('Rand',[[-500,50],[50,50]]),road('Rand',[[80,80],[90,80]]),road('Rand',[[-500,50],[50,50]])];
 const result=streetNameFeatures(features,options);assert.equal(result.features.length,1);assert.deepEqual(result.features[0].geometry.coordinates,[25,50]);
 const clipped=streetNameFeatures(features,{...options,clipSegment:(a,b)=>b[0]===50?[[10,50],[20,50]]:null});assert.deepEqual(clipped.features[0].geometry.coordinates,[15,50]);
 const reversed=streetNameFeatures([road('West',[[80,50],[20,50]])],options);assert.ok(Math.abs(reversed.features[0].properties.rotation)<=90);
});
test('Street labels ignore collision hiding and point fallback follows scale, checkbox, overview and physical print size',()=>{
 for(const factory of [createPQ5BasemapStyle,createPQ5TKStyle,createPQ5TKPrintStyle]){
 const style=factory({scale:5000}),line=style.layers.find(l=>l.id==='tk-street-names'),fallback=style.layers.find(l=>l.id==='tk-street-name-fallback');assert.equal(line.layout['text-allow-overlap'],true);assert.equal(line.layout['text-ignore-placement'],true);assert.equal(fallback.layout['symbol-placement'],'point');assert.equal(fallback.layout['text-allow-overlap'],true);assert.ok(style.sources['street-label-points']);
 for(const opts of [{scale:10000},{scale:5000,streetNames:false}])assert.ok(!factory(opts).sources['street-label-points']);
 const overview=createPQ5TKOverviewStyle(style);assert.ok(!overview.sources['street-label-points']);assert.ok(!overview.layers.find(l=>l.id==='tk-street-name-fallback'));
 }
 const print=createPQ5BasemapStyle({scale:5000},'print');assert.equal(print.layers.find(l=>l.id==='tk-street-name-fallback').layout['text-size'],44);
});
test('Placement refresh removes temporary fallback duplicates, caches source queries and disposes listeners',()=>{
 class MapFixture extends EventEmitter{queries=0;shown=[];updates=[];getStyle(){return {layers:[{id:'tk-street-names',source:'basemap','source-layer':'Verkehrslinie'}]};}getSource(id){return id==='street-label-points'?source:null;}getContainer(){return {clientWidth:100,clientHeight:100};}querySourceFeatures(){this.queries++;return [road('Kurz',[[10,10],[12,10]])];}queryRenderedFeatures(){return this.shown;}project(p){return options.project(p);}unproject(p){return options.unproject(p);}}
 const map=new MapFixture(),source={setData:data=>map.updates.push(data)};installStreetNameLabels(map);map.emit('style.load');assert.equal(map.listenerCount('idle'),1);assert.equal(map.updates[0].features.length,1);map.shown=[road('Kurz',[])];map.emit('idle');assert.equal(map.updates.at(-1).features.length,0);map.emit('idle');assert.equal(map.queries,1);assert.equal(map.updates.length,2);map.emit('remove');assert.equal(map.listenerCount('idle'),0);
});
