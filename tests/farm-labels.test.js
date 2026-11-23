import test from 'node:test';
import assert from 'node:assert/strict';
import {farmFeatures,farmQueryBounds,loadFarmFeatures,installFarmLabels} from '../src/farm-labels.js';
const bounds=(s,w,n,e)=>({getSouth:()=>s,getWest:()=>w,getNorth:()=>n,getEast:()=>e});
test('Named farms include nodes and area centres, without unnamed objects or duplicate IDs',()=>{
 const node={type:'node',id:1,lat:53.6,lon:7.8,tags:{place:'farm',name:'Named Farm'}};
 const result=farmFeatures({elements:[node,node,{type:'way',id:2,center:{lat:53.7,lon:7.9},tags:{place:'farm',name:'Other Farm'}},{type:'node',id:3,lat:53,lon:8,tags:{place:'farm'}}]});
 assert.equal(result.features.length,2);assert.deepEqual(result.features[0].geometry.coordinates,[7.8,53.6]);assert.equal(result.features[1].properties.name,'Other Farm');assert.throws(()=>farmFeatures({remark:'runtime error',elements:[]}));
});
test('Farm requests are limited to detail extents and cached across repeated print/preview views',async()=>{
 const box=farmQueryBounds(bounds(53.61,7.81,53.69,7.89));assert.deepEqual(box,[53.6,7.8,53.7,7.9]);assert.equal(farmQueryBounds(bounds(-40,-170,80,170)),null);
 let calls=0;const fetcher=async(url,options)=>{calls++;assert.ok(url.startsWith('https://postpass.geofabrik.de/'));const query=new URL(url).searchParams.get('data');assert.match(query,/ST_MakeEnvelope/);assert.ok(query.includes('{"place":"farm"}'));return {ok:true,json:async()=>({elements:[]})};};
 const first=await loadFarmFeatures(box,undefined,fetcher);assert.equal(await loadFarmFeatures(box,undefined,fetcher),first);assert.equal(calls,1);
 await assert.rejects(()=>loadFarmFeatures([50,8,50.1,8.1],undefined,async()=>({ok:false,status:429})));
});
test('Farm loading writes its GeoJSON before export continues and cleans up map listeners',async()=>{
 const oldFetch=globalThis.fetch,events={},data=[];
 globalThis.fetch=async()=>({ok:true,json:async()=>({elements:[{type:'node',id:1,lat:51.1,lon:9.1,tags:{place:'farm',name:'Fixture Farm'}}]})});
 const map={getBounds:()=>bounds(51.1,9.1,51.2,9.2),getSource:()=>({setData:d=>data.push(d)}),on:(name,fn)=>events[name]=fn,off:(name,fn)=>{if(events[name]===fn)delete events[name];},fire(){}};
 // Keep source identity stable, as MapLibre does.
 const source={setData:d=>data.push(d)};map.getSource=()=>source;
 try{await installFarmLabels(map);assert.equal(data[0].features[0].properties.name,'Fixture Farm');events.remove();assert.deepEqual(Object.keys(events),[]);}finally{globalThis.fetch=oldFetch;}
});

test('Farm requests fall back after network, HTTP or invalid-JSON errors, without hiding cancellation',async()=>{
 for(const [index,firstFailure]of [()=>{throw new TypeError('NetworkError');},()=>({ok:false,status:429}),()=>({ok:true,json:async()=>{throw new SyntaxError('HTML');}})].entries()){
 const calls=[];const features=await loadFarmFeatures([52+index/10,10,52.05+index/10,10.1],undefined,async url=>{calls.push(url);if(calls.length===1)return firstFailure();return {ok:true,json:async()=>({elements:[]})};});
 assert.equal(features.features.length,0);assert.equal(calls.length,2);assert.ok(calls[1].startsWith('https://overpass-api.de/'));
 }
 const controller=new AbortController();controller.abort();await assert.rejects(()=>loadFarmFeatures([53,12,53.1,12.1],controller.signal,()=>assert.fail('Aborted request must not fetch')),{name:'AbortError'});
});
test('Unavailable additional farms warn without rejecting map/PDF preparation; failure retries are throttled',async()=>{
 const oldFetch=globalThis.fetch,events={},warnings=[];let calls=0;
 globalThis.fetch=async()=>{calls++;return {ok:false,status:503};};
 const source={setData:()=>assert.fail('Failed data must not replace existing farms')};
 const map={getBounds:()=>bounds(54.1,10.1,54.2,10.2),getSource:()=>source,on:(n,fn)=>events[n]=fn,off:(n,fn)=>{if(events[n]===fn)delete events[n];},fire:(name,event)=>warnings.push({name,event})};
 try{
 await installFarmLabels(map);assert.equal(warnings[0].name,'farmwarning');assert.match(warnings[0].event.error.message,/HTTP 503/);assert.equal(calls,2);
 await installFarmLabels(map);assert.equal(calls,2);events.remove();
 }finally{globalThis.fetch=oldFetch;}
});

test('The additional layer loads named farms without requesting isolated dwellings twice',async()=>{
 const features=farmFeatures({elements:[{type:'node',id:1,lat:53.6,lon:7.8,tags:{name:'Pulvermacherei',place:'farm'}},{type:'node',id:2,lat:53.6,lon:7.8,tags:{name:'Other dwelling',place:'isolated_dwelling'}}]});
 assert.equal(features.features.length,1);assert.equal(features.features[0].properties.name,'Pulvermacherei');
 const calls=[];await loadFarmFeatures([53.5,7.7,53.6,7.8],undefined,async url=>{calls.push(new URL(url).searchParams.get('data'));return {ok:true,json:async()=>({elements:[]})};});
 assert.ok(calls[0].includes('{"place":"farm"}'));assert.ok(!calls[0].includes('isolated_dwelling'));assert.ok(calls[0].includes('ST_PointOnSurface'));
});
test('Same-origin farm proxy handles raw PHP and normalized Node responses before external services',async()=>{
 const previous=globalThis.document;globalThis.document={baseURI:'https://example.org/pq5/UTMREF-MAP/index.html'};
 try{for(const [i,payload]of [{elements:[{type:'node',id:1,lat:51,lon:10,tags:{place:'farm',name:'Fixture Farm'}}]},{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[10,51]},properties:{class:'farm',name:'Fixture Farm'}}]}].entries()){
 const calls=[];const data=await loadFarmFeatures([51+i/10,10,51.05+i/10,10.1],undefined,async url=>{calls.push(new URL(url));return {ok:true,json:async()=>payload};});
 assert.equal(calls.length,1);assert.equal(calls[0].pathname,'/pq5/UTMREF-MAP/api/farms.php');assert.ok(calls[0].searchParams.has('bbox'));assert.equal(data.features[0].properties.name,'Fixture Farm');
 }}finally{globalThis.document=previous;}
});
