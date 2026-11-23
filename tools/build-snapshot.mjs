import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const COPY_ENTRIES=['index.html','karten.html','uebungen.html','planzeiger.html','lehrmaterial.html','impressum.html','hilfe.html','technik.html','diagnose.html','Start.html','src','api','assets','vendor','README.md','THIRD_PARTY.md','.htaccess'];
export const BUILD_INPUTS=[...COPY_ENTRIES,'templates','tools/site.mjs','package.json','tools/build.mjs','tools/standalone.mjs','tools/build-snapshot.mjs'];
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
export async function verifyDist(root){
 const dist=new URL('dist/',root),manifest=JSON.parse(await readFile(new URL('build-info.json',dist),'utf8'));
 const source=await snapshot(root,BUILD_INPUTS);
 if(JSON.stringify(source)!==JSON.stringify(manifest.sourceFiles))throw Error('dist ist veraltet: Quelldateien wurden geändert. Bitte npm run build ausführen.');
 const files=(await readdir(dist)).filter(name=>name!=='build-info.json');const built=await snapshot(dist,files);
 if(JSON.stringify(built)!==JSON.stringify(manifest.files))throw Error('dist ist unvollständig oder wurde nach dem Build verändert. Bitte npm run build ausführen.');
 return manifest;
}
