import {libraries} from '../src/libraries.js';
import {createHash} from 'node:crypto';
import {cp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {COPY_ENTRIES,BUILD_INPUTS,snapshot,digest,verifyDist,gitState} from './build-snapshot.mjs';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root),git=gitState(root);
const sourceFiles=await snapshot(root,BUILD_INPUTS),version=digest(JSON.stringify(sourceFiles)).slice(0,12);
// Preserve private PHP runtime data across local rebuilds; never include it in the release.
await mkdir(dist,{recursive:true});
for(const name of await readdir(dist))if(name!=='var')await rm(new URL(name,dist),{force:true,recursive:true});
for(const file of COPY_ENTRIES)await cp(new URL(file,root),new URL(file,dist),{recursive:true});
async function versionModules(directory){
 for(const entry of await readdir(new URL(directory,dist),{withFileTypes:true})){
  const path=directory+entry.name;
  if(entry.isDirectory()){await versionModules(path+'/');continue;}
  if(!entry.name.endsWith('.js'))continue;
  const url=new URL(path,dist),text=await readFile(url,'utf8');
  const versioned=text.replace(/((?:from\s*|import\s*\()\s*['"])(\.{1,2}\/[^'"?]+\.js)(['"])/g,`$1$2?v=${version}$3`);
  await writeFile(url,versioned);
 }
}
await versionModules('src/');await versionModules('modules/');
for(const file of ['index.html','karten.html','uebungen.html','planzeiger.html','koordinaten.html','orientierung.html','lehrmaterial.html','impressum.html','hilfe.html','technik.html','diagnose.html','Start.html']){
 const url=new URL(file,dist);let html=await readFile(url,'utf8');
 html=html.replace('<html lang="de"',`<html lang="de" data-build="${version}"${git?` data-commit="${git.commit}" data-dirty="${git.dirty}"`:''}`).replace('id="buildId" data-i18n-title="buildDetails" title="Versionskennung dieser Ausgabe">dev',`id="buildId" data-i18n-title="buildDetails" title="Versionskennung dieser Ausgabe">${version}`);
 html=html.replace(/((?:src|href)="\.\.?\/[^"?]+\.(?:js|css))(?:\?[^\"]*)?"/g,`$1?v=${version}"`);
 await writeFile(url,html);
}
const standalone=await readFile(new URL('Start.html',dist),'utf8'),inline=[...standalone.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].filter(m=>m[1].trim()).map(m=>`'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`).join(' ');
const rules=await readFile(new URL('.htaccess',dist),'utf8');await writeFile(new URL('.htaccess',dist),rules.replace('__START_SCRIPT_HASH__',inline).replace('__LIBRARY_SCRIPT_SOURCES__',libraries.filter(lib=>!lib.css).map(lib=>lib.url).join(' ')));
const files=await snapshot(dist,COPY_ENTRIES);
await writeFile(new URL('build-info.json',dist),JSON.stringify({version,git,builtAt:new Date().toISOString(),sourceFiles,files},null,2)+'\n');
await verifyDist(root);
console.log(`dist/ ist fertig und geprüft. Version: ${version}`);
