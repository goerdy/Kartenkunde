import {verifyDist} from './build-snapshot.mjs';
try{const manifest=await verifyDist(new URL('../',import.meta.url));console.log(`dist aktuell und vollständig: ${manifest.version} (${manifest.builtAt})`);}catch(error){console.error(error.message);process.exitCode=1;}
