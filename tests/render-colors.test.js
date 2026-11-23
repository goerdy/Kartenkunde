import test from 'node:test';
import assert from 'node:assert/strict';
import {captureMapPixels} from '../src/render.js';

test('WebGL capture preserves RGBA channels, flips rows and restores the framebuffer',()=>{
 const savedDocument=globalThis.document,bindings=[];let frame;
 // WebGL rows: bottom first. Red/blue values make channel swaps detectable.
 const pixels=new Uint8Array([0,0,255,255,255,255,255,255,229,237,204,255,255,237,73,255]);
 const gl={drawingBufferWidth:2,drawingBufferHeight:2,FRAMEBUFFER:1,FRAMEBUFFER_BINDING:2,RGBA:3,UNSIGNED_BYTE:4,getParameter:()=>99,bindFramebuffer:(...args)=>bindings.push(args),readPixels(x,y,w,h,format,type,out){assert.equal(format,3);assert.equal(type,4);out.set(pixels);}};
 const canvas={getContext:kind=>kind==='2d'?{createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:value=>frame=value,drawImage:()=>assert.fail('Do not copy WebGL using drawImage')}:null};
 globalThis.document={createElement:()=>canvas};
 try{
 captureMapPixels({getContext:kind=>kind==='webgl'?gl:null},2,2);
 assert.deepEqual([...frame.data],[229,237,204,255,255,237,73,255,0,0,255,255,255,255,255,255]);assert.deepEqual(bindings,[[1,null],[1,99]]);
 captureMapPixels({getContext:()=>gl},2,2,true);
 for(let i=0;i<frame.data.length;i+=4){assert.equal(frame.data[i],frame.data[i+1]);assert.equal(frame.data[i],frame.data[i+2]);assert.equal(frame.data[i+3],255);}
 }finally{globalThis.document=savedDocument;}
});
