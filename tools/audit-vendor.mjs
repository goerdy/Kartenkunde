// Check the exact shipped browser libraries; report upstream's explicit v5 backport separately.
import {libraries} from '../src/libraries.js';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const packages={};for(const lib of libraries){const [,name,version]=lib.url.match(/npm\/([^@]+)@([^/]+)/);packages[name]=[version];const bytes=await readFile(new URL('../vendor/'+lib.file,import.meta.url));if(lib.integrity!=='sha384-'+createHash('sha384').update(bytes).digest('base64'))throw Error('Integrity mismatch: '+lib.file);}
const response=await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(packages),signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Advisory service unavailable: '+response.status);
const report=await response.json(),unresolved=[],reviewed=[];
for(const [name,advisories]of Object.entries(report))for(const advisory of advisories){
 const finding={package:name,version:packages[name][0],title:advisory.title,severity:advisory.severity,url:advisory.url};
 if(name==='maplibre-gl'&&finding.version==='5.24.1'&&advisory.url.endsWith('GHSA-jrc7-96c5-q579'))reviewed.push({...finding,reason:'Upstream explicitly lists 5.24.1 as patched; npm uses a broader <=6.4.0 range. The shipped pinned source uses a stable attribute-name snapshot, and the browser canary is covered by test:exercise.',upstream:'https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579'});
 else unresolved.push(finding);
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),packages,unresolved,reviewed},null,2));if(unresolved.length)process.exitCode=1;
