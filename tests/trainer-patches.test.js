import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,copyFile,writeFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {patchLayout} from '../modules/orientation/src/trainer-patch-wall.js';
test('Patch layout preserves portrait and landscape aspect ratios without overlap, including large collections',()=>{
 for(const count of [0,1,2,17,75,300]){
  const images=Array.from({length:count},(_,i)=>({width:i%2?1200:400,height:i%2?300:900})),boxes=patchLayout(images);
  for(let i=0;i<count;i++){
   const b=boxes[i];assert.ok(Math.abs(b.width/b.height-images[i].width/images[i].height)<1e-9);
   assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=2048&&b.y+b.height<=1024);
   for(const a of boxes.slice(0,i))assert.ok(b.x+b.width<=a.x||a.x+a.width<=b.x||b.y+b.height<=a.y||a.y+a.height<=b.y);
  }
 }
});
test('First access creates bounded alpha-preserving thumbnails; later additions and replacements update automatically',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kartenkunde-patches-')),input=join(dir,'input'),cache=join(dir,'cache');await mkdir(input);
 const script=`require $argv[1]; echo json_encode(patch_catalog($argv[2],$argv[3]));`;
 const catalog=()=>JSON.parse(execFileSync('php',['-r',script,resolve('api/patches.php'),input,cache],{encoding:'utf8'}));
 try{
  await copyFile('assets/trainer/patches/Berufsfeuerwehr-Wilhelmshaven.png',join(input,'first.png'));
  await writeFile(join(input,'broken.png'),'not an image');await writeFile(join(input,'ignore.php'),'<?php exit(9);');
  let data=catalog();assert.equal(data.patches.length,1);assert.equal(data.skipped,1);const p=data.patches[0];assert.equal(Math.max(p.width,p.height),512);
  const file=join(cache,p.id+'.png'),before=await stat(file);assert.equal(catalog().patches[0].id,p.id);assert.equal((await stat(file)).mtimeMs,before.mtimeMs);
  await copyFile('assets/trainer/patches/THW-Koordinaten.png',join(input,'second.png'));assert.equal(catalog().patches.length,2);
  await copyFile('assets/trainer/patches/THW-Koordinaten.png',join(input,'first.png'));data=catalog();assert.notEqual(data.patches[0].id,p.id);
  const alpha=execFileSync('php',['-r',`$im=imagecreatefrompng($argv[1]);echo (imagecolorat($im,0,0)>>24)&127;`,join(cache,data.patches[0].id+'.png')],{encoding:'utf8'});assert.equal(alpha,'127');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Patch HTTP endpoint serves generated images and rejects paths, arrays and unsupported methods',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kartenkunde-patch-http-'));await mkdir(join(dir,'api'));await mkdir(join(dir,'assets/trainer/patches'),{recursive:true});
 await copyFile('api/patches.php',join(dir,'api/patches.php'));await copyFile('assets/trainer/patches/THW-Koordinaten.png',join(dir,'assets/trainer/patches/THW.png'));
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const php=spawn('php',['-S',`127.0.0.1:${port}`,'-t',dir],{stdio:['ignore','ignore','pipe']});
 try{
  await new Promise((resolve,reject)=>{php.once('error',reject);php.stderr.once('data',resolve);});const url=`http://127.0.0.1:${port}/api/patches.php`;
  const response=await fetch(url),data=await response.json();assert.equal(data.patches.length,1);assert.equal(response.headers.get('cache-control'),'no-store');
  const image=await fetch(url+data.patches[0].src);assert.equal(image.headers.get('content-type'),'image/png');assert.match(image.headers.get('cache-control'),/immutable/);assert.ok((await image.arrayBuffer()).byteLength>100);
  for(const query of ['?image=../../etc/passwd','?image[]=x','?unknown=1','?image='+data.patches[0].id+'&other=1'])assert.equal((await fetch(url+query)).status,400);
  assert.equal((await fetch(url,{method:'POST'})).status,405);
 }finally{php.kill();await rm(dir,{recursive:true,force:true});}
});
