import test from 'node:test';
import assert from 'node:assert/strict';
import {styleURL,setPreviewStyle,lglnMapURL,lglnCredit,styleCredit,lglnIntersects,renderMap,renderLGLN} from '../src/render.js';
import {utm} from '../src/geo.js';
import {setLanguage} from '../src/i18n.js';
setLanguage('de');
const box={x0:540000,y0:5790000,x1:550000,y1:5800000};
test('LGLN preview tiles use the official WMS, correct layers, Mercator extent template and coverage',()=>{
 for(const [id,layer]of [['lgln50','ni_dtk50_farbe'],['lgln50gray','ni_dtk50_grau']]){
 const style=styleURL(id),url=Object.values(style.sources)[0].tiles[0],params=new URL(url).searchParams;
 assert.ok(url.includes('BBOX={bbox-epsg-3857}'));assert.equal(params.get('LAYERS'),layer);assert.equal(params.get('CRS'),'EPSG:3857');assert.equal(params.get('WIDTH'),'256');assert.equal(Object.values(style.sources)[0].tileSize,256);assert.ok(!url.includes('/auth/'));
 const print=new URL(lglnMapURL(id,'EPSG:32632',box,2244,3272)).searchParams;
 assert.equal(print.get('BBOX'),'540000,5790000,550000,5800000');assert.equal(print.get('WIDTH'),'2244');assert.equal(print.get('HEIGHT'),'3272');assert.equal(print.get('CRS'),'EPSG:32632');
 }
 assert.equal(lglnIntersects({w:9,e:10,s:52,n:53}),true);assert.equal(lglnIntersects({w:12,e:13,s:48,n:49}),false);
 assert.match(lglnCredit(2026),/GeoBasis-DE\/LGLN 2026.*CC BY 4.0.*Daten geändert/);assert.ok(!styleCredit('lgln50').includes('OpenStreetMap'));
});
test('LGLN print path requests the exact UTM sheet and output resolution without WebGL',async()=>{
 const originals={fetch:globalThis.fetch,document:globalThis.document,createImageBitmap:globalThis.createImageBitmap};
 const requests=[],draws=[];let closed=0;
 globalThis.fetch=async url=>{requests.push(new URL(url).searchParams);return {ok:true,headers:new Headers({'content-type':'image/png'}),blob:async()=>new Blob(['fixture'])};};
 globalThis.createImageBitmap=async()=>({close:()=>closed++});
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},drawImage(...a){draws.push(a);}})})};
 try{
 for(const [crs,expected]of [[utm(32),'EPSG:32632'],[utm(33),'EPSG:32633'],['EPSG:3857','EPSG:3857']]){
 const canvas=await renderMap({style:'lgln50',crs},box,1200,1700);
 assert.equal(canvas.width,1200);assert.equal(canvas.height,1700);assert.equal(requests.at(-1).get('CRS'),expected);assert.equal(requests.at(-1).get('BBOX'),'540000,5790000,550000,5800000');
 }
 assert.equal(draws.length,3);assert.equal(closed,3);
 globalThis.fetch=async()=>({ok:true,headers:new Headers({'content-type':'text/xml'})});
 await assert.rejects(()=>renderLGLN({style:'lgln50',crs:utm(32)},box,100,100),/kein Kartenbild/);
 globalThis.fetch=async()=>({ok:false,status:503});await assert.rejects(()=>renderLGLN({style:'lgln50',crs:utm(32)},box,100,100),/HTTP 503/);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>renderMap({style:'lgln50',crs:utm(32)},box,100,100,controller.signal),{name:'AbortError'});
 await assert.rejects(()=>renderLGLN({style:'lgln50',crs:utm(31)},box,100,100),/deckt diesen Ausschnitt nicht ab/);
 }finally{Object.assign(globalThis,originals);}
});

test('Switching grey or monochrome to colour clears filters and replaces raster sources',()=>{
 const calls=[],host={style:{filter:'grayscale(1)'}},map={setStyle:(style,options)=>calls.push({style,options})};
 for(const id of ['mono','lgln50gray','lgln50','lgln50gray','lgln50']){
 setPreviewStyle(map,host,id);assert.equal(host.style.filter,['mono','lgln50gray','pq5gray'].includes(id)?'grayscale(1)':'');assert.deepEqual(calls.at(-1).options,{diff:false});
 }
 const grey=styleURL('lgln50gray'),colour=styleURL('lgln50');
 assert.notEqual(Object.keys(grey.sources)[0],Object.keys(colour.sources)[0]);
 assert.equal(new URL(Object.values(calls.at(-1).style.sources)[0].tiles[0]).searchParams.get('LAYERS'),'ni_dtk50_farbe');
});
