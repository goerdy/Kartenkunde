import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createMapTestPDF,testExportPanel,testExportLayout,TEST_EXPORT_LOCATIONS} from '../src/test-export.js';
import {MAP_STYLES} from '../src/render.js';
import {project} from '../src/geo.js';
const ctx={atob,btoa,TextEncoder,TextDecoder,console,Uint8Array,Uint8ClampedArray,ArrayBuffer};
for(const name of ['proj4','mgrs','jspdf'])vm.runInNewContext(readFileSync(new URL(`../vendor/${name}.js`,import.meta.url),'utf8'),ctx);
Object.assign(globalThis,{proj4:ctx.proj4,mgrs:ctx.mgrs,jspdf:ctx.jspdf});
const image=()=>({width:2,height:2,data:new Uint8ClampedArray(16).fill(255)});
test('Every map type renders both exact 5 km squares centred on the fixed locations at 1:50k and 300 dpi',async()=>{
 const calls=[],progress=[],pdf=await createMapTestPDF({render:async(plan,sheet,w,h)=>{calls.push({plan,sheet,w,h});return image();},onProgress:(n,total)=>progress.push([n,total])});
 assert.equal(pdf.getNumberOfPages(),1);assert.ok(Math.abs(pdf.internal.pageSize.getWidth()-594)<.01);assert.ok(Math.abs(pdf.internal.pageSize.getHeight()-841)<.01);assert.equal(calls.length,Object.keys(MAP_STYLES).length*2);assert.equal(pdf.exportWarnings.length,0);
 for(const [i,{plan,sheet,w,h}]of calls.entries()){
 assert.equal(plan.style,Object.keys(MAP_STYLES)[Math.floor(i/2)]);assert.equal(plan.scale,50000);assert.equal(plan.dpi,300);assert.equal(w,1181);assert.equal(h,1181);assert.equal(sheet.x1-sheet.x0,5000);assert.equal(sheet.y1-sheet.y0,5000);assert.equal((sheet.x1-sheet.x0)/plan.scale*1000,100);
 const p=TEST_EXPORT_LOCATIONS[i%2],xy=project(plan.crs,[p.lon,p.lat]);assert.ok(Math.abs((sheet.x0+sheet.x1)/2-xy[0])<1e-7);assert.ok(Math.abs((sheet.y0+sheet.y1)/2-xy[1])<1e-7);
 const layout=testExportLayout(),x=layout.left+i%layout.columns*layout.pitchX,y=layout.top+Math.floor(i/layout.columns)*layout.pitchY;assert.ok(x>=12&&x+100<layout.paper[0]-12);assert.ok(y-12>49&&y+112<layout.paper[1]-25);
 }assert.deepEqual(progress.at(-1),[calls.length,calls.length]);
});
test('A failed source remains marked in the comparison PDF while subsequent map types render',async()=>{
 let calls=0;const pdf=await createMapTestPDF({render:async plan=>{if(++calls===2)throw Error('HTTP 503');if(calls===3)plan.warnings.add('POI unavailable');return image();}});assert.equal(calls,Object.keys(MAP_STYLES).length*2);assert.equal(pdf.getNumberOfPages(),1);assert.equal(pdf.exportWarnings.length,2);assert.equal(pdf.exportWarnings[0].message,'HTTP 503');assert.equal(pdf.exportWarnings[1].message,'POI unavailable');
});
test('Cancellation stops the test export without rendering remaining squares',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(createMapTestPDF({signal:controller.signal,render:async()=>{calls++;controller.abort();return image();}}),{name:'AbortError'});assert.equal(calls,1);
});
