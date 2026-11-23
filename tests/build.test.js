import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {COPY_ENTRIES,BUILD_INPUTS,snapshot,verifyDist} from '../tools/build-snapshot.mjs';
test('Release verification detects changed sources, changed output and obsolete output files',async()=>{
 const path=await mkdtemp(tmpdir()+'/pq5-build-check-'),root=pathToFileURL(path+'/'),dist=new URL('dist/',root);
 try{
 for(const dir of ['src','api','assets','vendor','tools'])await mkdir(new URL(dir+'/',root));
 for(const file of BUILD_INPUTS.filter(name=>!['src','api','assets','vendor'].includes(name)))await writeFile(new URL(file,root),'fixture');
 await writeFile(new URL('src/module.js',root),'original');await mkdir(dist);
 for(const entry of COPY_ENTRIES)await cp(new URL(entry,root),new URL(entry,dist),{recursive:true});
 const manifest={version:'fixture',sourceFiles:await snapshot(root,BUILD_INPUTS),files:await snapshot(dist,COPY_ENTRIES)};await writeFile(new URL('build-info.json',dist),JSON.stringify(manifest));
 assert.equal((await verifyDist(root)).version,'fixture');
 await writeFile(new URL('src/module.js',root),'changed');await assert.rejects(()=>verifyDist(root),/veraltet/);
 await writeFile(new URL('src/module.js',root),'original');await writeFile(new URL('index.html',dist),'changed');await assert.rejects(()=>verifyDist(root),/verändert/);
 await writeFile(new URL('index.html',dist),'fixture');await writeFile(new URL('obsolete.js',dist),'old');await assert.rejects(()=>verifyDist(root),/verändert/);
 }finally{await rm(root,{recursive:true,force:true});}
});
