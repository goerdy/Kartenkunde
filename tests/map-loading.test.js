import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {fetchPrintTile,createPrintTileLoader,printTileRequest,waitForPrintableMap} from '../src/map-loading.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const params=printTileRequest('https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/test/1/2/3.pbf','Tile');
const response=()=>({ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer,headers:new Headers({'Cache-Control':'max-age=86400'})});
class MapFixture extends EventEmitter{loadedValue=false;loaded(){return this.loadedValue;}triggerRepaint(){}}
test('A slow base map followed by slow POIs gets separate budgets and captures only the completed frame',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});const map=new MapFixture();let prepared=false,finished=false;
 const result=waitForPrintableMap(map,async()=>{prepared=true;map.loadedValue=false;await new Promise(r=>setTimeout(r,55000));},undefined).then(()=>finished=true);
 context.mock.timers.tick(40000);map.loadedValue=true;map.emit('load');await tick();assert.ok(prepared);
 context.mock.timers.tick(55000);await tick();assert.equal(finished,false);map.loadedValue=true;map.emit('render');await result;
 assert.equal(finished,true);assert.equal(map.eventNames().length,0);
});
test('An already idle map completes; cancelling during POI preparation rejects immediately and removes listeners',async()=>{
 const map=new MapFixture();map.loadedValue=true;await waitForPrintableMap(map,()=>{},undefined);
 const controller=new AbortController();const result=waitForPrintableMap(map,()=>new Promise(()=>{}),controller.signal);await tick();controller.abort();await assert.rejects(result,{name:'AbortError'});assert.equal(map.eventNames().length,0);
});
test('A stalled base source still times out; a reported source failure retains its cause',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});const map=new MapFixture();const result=waitForPrintableMap(map,()=>{},undefined,{loadTimeout:100});context.mock.timers.tick(100);await assert.rejects(result,/Zeit|time|chargement/i);assert.equal(map.eventNames().length,0);
 const failed=new MapFixture();const promise=waitForPrintableMap(failed,()=>{});failed.emit('error',{error:Error('BKG tile HTTP 503')});failed.loadedValue=true;failed.emit('load');await assert.rejects(promise,/BKG tile HTTP 503/);assert.equal(failed.eventNames().length,0);
});
test('Print tiles retry temporary failures and retain bytes and cache metadata; permanent errors do not retry',async()=>{
 const calls=[];const result=await fetchPrintTile(params,new AbortController(),async(url,options)=>{calls.push({url,options});if(calls.length<3)throw TypeError('Temporary network failure');return response();});
 assert.equal(calls.length,3);assert.ok(calls.every(c=>c.url.startsWith('https://')));assert.equal(calls[1].options.cache,'reload');assert.deepEqual([...new Uint8Array(result.data)],[1,2,3]);assert.equal(result.cacheControl,'max-age=86400');
 let count=0;await assert.rejects(()=>fetchPrintTile(params,new AbortController(),async()=>{count++;return {ok:false,status:404};}),/404/);assert.equal(count,1);
});
test('A hung tile request is aborted and retried; user cancellation never retries',async context=>{
 context.mock.timers.enable({apis:['setTimeout']});let count=0;
 const hung=(url,{signal})=>{count++;if(count>1)return Promise.resolve(response());return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));};
 const result=fetchPrintTile(params,new AbortController(),hung,{attemptTimeout:15000});context.mock.timers.tick(15000);await tick();await result;assert.equal(count,2);
 count=0;const controller=new AbortController(),cancelled=fetchPrintTile(params,controller,hung);controller.abort();await assert.rejects(cancelled,{name:'AbortError'});assert.equal(count,1);
});
test('Tile concurrency is bounded; cancelling a queued request never starts it',async()=>{
 const running=[];const loader=createPrintTileLoader({concurrency:1,fetcher:()=>new Promise(resolve=>running.push(resolve))});const a=loader(params,new AbortController()),controller=new AbortController(),b=loader(params,controller);assert.equal(running.length,1);controller.abort();await assert.rejects(b,{name:'AbortError'});running[0](response());await a;await tick();assert.equal(running.length,1);
 assert.equal(printTileRequest('https://example.com/tile.pbf','Tile').url,'https://example.com/tile.pbf');assert.equal(printTileRequest('https://tiles.openfreemap.org/fonts/font.pbf','Glyphs').url,'https://tiles.openfreemap.org/fonts/font.pbf');
});
