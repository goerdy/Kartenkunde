import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {COPY_ENTRIES,BUILD_INPUTS,snapshot,verifyDist,gitState} from '../tools/build-snapshot.mjs';
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

test('Git version metadata distinguishes clean, staged, untracked and source-archive builds',async()=>{
 const path=await mkdtemp(tmpdir()+'/kartenkunde-git-version-'),root=pathToFileURL(path+'/');
 const git=(...args)=>execFileSync('git',['-c','user.name=Build test','-c','user.email=build@example.invalid','-c','commit.gpgsign=false',...args],{cwd:path,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 try{
  assert.equal(gitState(root),null);
  git('init','-b','main');await writeFile(new URL('.gitignore',root),'ignored.tmp\n');await writeFile(new URL('source.js',root),'original');git('add','.');git('commit','-m','Fixture');
  const clean=gitState(root);assert.equal(clean.commit,git('rev-parse','HEAD'));assert.equal(clean.short,clean.commit.slice(0,12));assert.equal(clean.dirty,false);
  await writeFile(new URL('ignored.tmp',root),'ignored');assert.equal(gitState(root).dirty,false);
  await writeFile(new URL('untracked.js',root),'new');assert.equal(gitState(root).dirty,true);await rm(new URL('untracked.js',root));
  await writeFile(new URL('source.js',root),'modified');assert.equal(gitState(root).dirty,true);git('add','source.js');assert.equal(gitState(root).dirty,true);git('commit','-m','Update');assert.equal(gitState(root).dirty,false);assert.notEqual(gitState(root).commit,clean.commit);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('Release verification rejects another Git commit even when build sources did not change',async()=>{
 const path=await mkdtemp(tmpdir()+'/kartenkunde-git-release-'),root=pathToFileURL(path+'/'),dist=new URL('dist/',root);
 const git=(...args)=>execFileSync('git',['-c','user.name=Build test','-c','user.email=build@example.invalid','-c','commit.gpgsign=false',...args],{cwd:path,encoding:'utf8',stdio:['ignore','pipe','ignore']});
 try{
  for(const dir of ['src','api','assets','vendor','tools'])await mkdir(new URL(dir+'/',root));
  for(const file of BUILD_INPUTS.filter(name=>!['src','api','assets','vendor'].includes(name)))await writeFile(new URL(file,root),'fixture');
  await mkdir(dist);for(const entry of COPY_ENTRIES)await cp(new URL(entry,root),new URL(entry,dist),{recursive:true});
  git('init','-b','main');git('commit','--allow-empty','-m','First');
  const manifest={git:gitState(root),sourceFiles:await snapshot(root,BUILD_INPUTS),files:await snapshot(dist,COPY_ENTRIES)};await writeFile(new URL('build-info.json',dist),JSON.stringify(manifest));await verifyDist(root);
  git('commit','--allow-empty','-m','Second');await assert.rejects(()=>verifyDist(root),/anderen Git-Stand/);
 }finally{await rm(root,{recursive:true,force:true});}
});
