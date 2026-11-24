import {libraries} from '../src/libraries.js';
import {createHash} from 'node:crypto';
import {cp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {COPY_ENTRIES,BUILD_INPUTS,snapshot,digest,verifyDist,gitState} from './build-snapshot.mjs';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root),git=gitState(root);
const sourceFiles=await snapshot(root,BUILD_INPUTS),version=digest(JSON.stringify(sourceFiles)).slice(0,12);
await rm(dist,{force:true,recursive:true});await mkdir(dist,{recursive:true});
for(const file of COPY_ENTRIES)await cp(new URL(file,root),new URL(file,dist),{recursive:true});
for(const file of await readdir(new URL('src/',dist))){if(!file.endsWith('.js'))continue;
 const url=new URL('src/'+file,dist),text=await readFile(url,'utf8');
 // Version every local module import, including dynamic boot imports.
 const versioned=text.replace(/((?:from\s*|import\s*\()\s*['"])(\.\/[^'"?]+\.js)(['"])/g,`$1$2?v=${version}$3`);
 await writeFile(url,versioned);
}
for(const file of ['index.html','karten.html','uebungen.html','planzeiger.html','orientierung.html','lehrmaterial.html','impressum.html','hilfe.html','technik.html','diagnose.html','Start.html']){
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
