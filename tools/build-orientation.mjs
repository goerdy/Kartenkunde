// Export the already verified website build; the website remains the source of truth.
import {cp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {snapshot,verifyDist} from './build-snapshot.mjs';
const root=new URL('../',import.meta.url),built=new URL('dist/',root),out=new URL('dist-orientation/',root);
const parent=await verifyDist(root),module=JSON.parse(await readFile(new URL('modules/orientation/module.json',root),'utf8'));
const entries=['modules/orientation',...module.sharedSources,...module.sharedStyles,...module.sharedAssets,...module.resources,'THIRD_PARTY.md','.htaccess'];
// Feedback and patch caches belong to the running instance, never to the build.
await mkdir(out,{recursive:true});
for(const name of await readdir(out))if(name!=='var')await rm(new URL(name,out),{recursive:true,force:true});
for(const path of entries){await mkdir(new URL(path.substring(0,path.lastIndexOf('/')+1),out),{recursive:true});await cp(new URL(path,built),new URL(path,out),{recursive:true});}
const integrated=await readFile(new URL('orientierung.html',built),'utf8');
const main=integrated.match(/<main\b[\s\S]*?<\/main>/)?.[0];
if(!main)throw Error('Trainer mount point missing');
const head=integrated.match(/<head>[\s\S]*?<\/head>/)?.[0];
const html=`<!doctype html>\n<html lang="de" data-build="${parent.version}">${head}<body class="utmref-page site-page" data-page="trainer-standalone"><header class="site-header"><div class="site-brand-row"><a class="brand" href="https://kartenkunde.app/">KARTENKUNDE.app</a><label>Sprache / Language <select id="language"><option value="de">DE</option><option value="en">EN</option><option value="fr">FR</option></select></label></div></header>${main}<footer class="site-footer"><a href="https://kartenkunde.app/impressum.html">Impressum / Datenschutz</a></footer><script type="module" src="./modules/orientation/standalone.js?v=${parent.version}"></script></body></html>\n`;
await writeFile(new URL('index.html',out),html);
// Keep the established entry URL usable in a separately hosted export too.
await writeFile(new URL('orientierung.html',out),html);
const files=await snapshot(out,[...entries,'index.html','orientierung.html']);
const sharedSources=Object.fromEntries(module.sharedSources.map(path=>[path,parent.sourceFiles[path]]));
await writeFile(new URL('build-info.json',out),JSON.stringify({module:module.name,version:parent.version,builtAt:new Date().toISOString(),sourceOfTruth:'main website',sharedSources,files},null,2)+'\n');
console.log(`Eigenständige 3D-Simulation: dist-orientation/ (Hauptseiten-Build ${parent.version})`);
