import {readFile,readdir} from 'node:fs/promises';
import {snapshot,verifyDist} from './build-snapshot.mjs';
const root=new URL('../',import.meta.url),out=new URL('dist-orientation/',root);
try{
 const parent=await verifyDist(root),manifest=JSON.parse(await readFile(new URL('build-info.json',out),'utf8'));
 if(manifest.version!==parent.version)throw Error('3D-Export ist veraltet: npm run build:orientation ausführen.');
 const actual=await snapshot(out,(await readdir(out)).filter(name=>name!=='build-info.json'&&name!=='var'));
 if(JSON.stringify(actual)!==JSON.stringify(manifest.files))throw Error('3D-Export ist verändert oder unvollständig.');
 for(const [path,hash]of Object.entries(manifest.sharedSources))if(parent.sourceFiles[path]!==hash)throw Error(`Hauptseiten-Quelle geändert: ${path}`);
 console.log(`3D-Export aktuell und vollständig: ${manifest.version}`);
}catch(error){console.error(error.message);process.exitCode=1;}
