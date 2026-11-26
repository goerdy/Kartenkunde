import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const COPY_ENTRIES=['index.html','karten.html','uebungen.html','planzeiger.html','koordinaten.html','orientierung.html','lehrmaterial.html','lehrunterlage.html','impressum.html','hilfe.html','technik.html','diagnose.html','Start.html','src','modules','api','assets','vendor','README.md','THIRD_PARTY.md','.htaccess'];
export const BUILD_INPUTS=[...COPY_ENTRIES,'templates','tools/site.mjs','package.json','tools/build.mjs','tools/build-orientation.mjs','tools/standalone.mjs','tools/build-snapshot.mjs'];
export const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
export async function snapshot(root,entries){
 const result={};
 async function visit(path){
 const url=new URL(path,root);let children;
 try{children=await readdir(url,{withFileTypes:true});}catch(error){if(error.code!=='ENOTDIR')throw error;result[path]=digest(await readFile(url));return;}
 for(const child of children.sort((a,b)=>a.name.localeCompare(b.name)))await visit(path+'/'+child.name);
 }
 for(const entry of entries)await visit(entry);
 return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));
}
export function gitState(root){
 const cwd=fileURLToPath(root),run=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
 try{
  if(resolve(run('rev-parse','--show-toplevel'))!==resolve(cwd))return null;
  const commit=run('rev-parse','--verify','HEAD');if(!/^[a-f0-9]{40,64}$/.test(commit))return null;
  return {commit,short:commit.slice(0,12),dirty:run('status','--porcelain','--untracked-files=normal')!==''};
 }catch{return null;}
}
export async function verifyDist(root){
 const dist=new URL('dist/',root),manifest=JSON.parse(await readFile(new URL('build-info.json',dist),'utf8'));
 const source=await snapshot(root,BUILD_INPUTS);
 if(JSON.stringify(source)!==JSON.stringify(manifest.sourceFiles))throw Error('dist ist veraltet: Quelldateien wurden geändert. Bitte npm run build ausführen.');
 if(Object.hasOwn(manifest,'git')&&JSON.stringify(manifest.git)!==JSON.stringify(gitState(root)))throw Error('dist stammt aus einem anderen Git-Stand. Bitte npm run build ausführen.');
 const files=(await readdir(dist)).filter(name=>name!=='build-info.json'&&name!=='var');const built=await snapshot(dist,files);
 if(JSON.stringify(built)!==JSON.stringify(manifest.files))throw Error('dist ist unvollständig oder wurde nach dem Build verändert. Bitte npm run build ausführen.');
 return manifest;
}
