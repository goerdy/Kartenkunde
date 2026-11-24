import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeHazard,hazardConfig,hazardMapURL,hazardLegend,composeHazard} from '../src/hazards.js';
import {coverLayout} from '../src/cover.js';
vm.runInThisContext(readFileSync(new URL('../vendor/proj4.js',import.meta.url),'utf8'));
test('Hazards default off and requests use fixed providers, layers and sheet extent',()=>{
 assert.equal(normalizeHazard().id,'none');assert.equal(hazardConfig({id:'https://evil.test'}),null);
 assert.equal(normalizeHazard({id:'rainExtreme',opacity:2}).opacity,1);
 const box={x0:425000,y0:5946000,x1:427000,y1:5948000};
 const u=new URL(hazardMapURL({id:'coastExtreme'},'EPSG:25832',box,512,256));
 assert.equal(u.hostname,'www.umweltkarten-niedersachsen.de');assert.equal(u.searchParams.get('LAYERS'),'Wassertiefen_Küste_HWextrem61160');assert.equal(u.searchParams.get('BBOX'),'425000,5946000,427000,5948000');assert.equal(u.searchParams.get('WIDTH'),'512');
 assert.equal(hazardLegend({id:'coastExtreme'}).length,10);assert.equal(hazardLegend({id:'rainExtreme'}).length,6);
});
test('Hazard cover panel fits with notes and keeps the overview separate on all paper formats',()=>{
 for(const dim of [[210,297],[297,420],[420,594],[594,841]])for(const paper of [dim,[...dim].reverse()])for(const style of ['pq5basemap','lgln50'])for(const notes of ['', 'Notizen']){
 const l=coverLayout({paper,style,notes,hazard:{id:'coastExtreme'}});
 assert.ok(l.map.w>20&&l.map.h>40);assert.ok(l.hazardBox.h>=48);assert.ok(l.map.x+l.map.w<l.hazardBox.x);
 assert.ok(l.hazardBox.y+l.hazardBox.h<l.print.y);assert.ok(!l.notes||l.hazardBox.y+l.hazardBox.h<l.notes.y||l.notes.x>=l.map.x+l.map.w);
 }
});
test('WMS composition preserves sheet extent, opacity and cancellation; failures cannot silently omit a layer',async()=>{
 const old={fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap,document:globalThis.document};
 const requests=[],drawn=[],ctx={save(){},restore(){},drawImage(...x){drawn.push({alpha:this.globalAlpha,args:x});}};
 const canvas={width:1501,height:20,getContext:()=>ctx},plan={hazard:{id:'coastExtreme',opacity:.4},crs:'+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs',warnings:new Set()},sheet={x0:425000,x1:426501,y0:5946000,y1:5946020};
 globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}})})};globalThis.createImageBitmap=async()=>({close(){}});
 globalThis.fetch=async url=>{requests.push(new URL(url));return {ok:true,headers:new Headers({'content-type':'image/png'}),blob:async()=>new Blob()};};
 try{
 assert.equal(await composeHazard(canvas,plan,sheet),canvas);assert.equal(requests.length,2);
 assert.equal(requests[0].searchParams.get('BBOX'),'425000,5946000,426400,5946020');assert.equal(requests[1].searchParams.get('BBOX'),'426400,5946000,426501,5946020');assert.ok(drawn.every(x=>x.alpha===.4));
 requests.length=0;await composeHazard(canvas,{...plan,hazard:{id:'none'}},sheet);assert.equal(requests.length,0);
 await assert.rejects(composeHazard(canvas,plan,sheet,AbortSignal.abort()),{name:'AbortError'});
 globalThis.fetch=async()=>({ok:false});await assert.rejects(composeHazard(canvas,plan,sheet));
 }finally{Object.assign(globalThis,old);}
});
