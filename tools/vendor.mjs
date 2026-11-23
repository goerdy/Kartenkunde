import {libraries} from '../src/libraries.js';
import {mkdir,writeFile,mkdtemp,rm,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const pin=process.argv.includes('--pin'),archives=new Map(),temp=await mkdtemp(join(tmpdir(),'kartenkunde-vendor-'));
try{
 await mkdir(new URL('../vendor/',import.meta.url),{recursive:true});
 for(const lib of libraries){
 const match=/^https:\/\/cdn\.jsdelivr\.net\/npm\/([a-z0-9-]+)@([0-9.]+)\/(.+)$/.exec(lib.url);if(!match)throw Error('Unapproved dependency URL');const [,name,version,file]=match,key=name+'@'+version;
 if(file.split('/').includes('..'))throw Error('Invalid package path');
 if(!archives.has(key)){const r=await fetch(`https://registry.npmjs.org/${name}/${version}`,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Package metadata unavailable: '+key);const meta=await r.json();if(!meta.dist.tarball.startsWith('https://registry.npmjs.org/'))throw Error('Unapproved package host');const response=await fetch(meta.dist.tarball,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Package unavailable: '+key);const bytes=Buffer.from(await response.arrayBuffer());if('sha512-'+createHash('sha512').update(bytes).digest('base64')!==meta.dist.integrity)throw Error('Package integrity failed: '+key);const path=join(temp,key+'.tgz');await writeFile(path,bytes);archives.set(key,path);}
 const data=execFileSync('tar',['-xOzf',archives.get(key),'package/'+file],{maxBuffer:64*1024*1024}),integrity='sha384-'+createHash('sha384').update(data).digest('base64');
 if(!pin&&integrity!==lib.integrity)throw Error('Pinned integrity mismatch: '+lib.file+' (review before --pin)');
 if(pin)lib.integrity=integrity;await writeFile(new URL('../vendor/'+lib.file,import.meta.url),data);console.log('Verified:',lib.file);
 }
 if(pin)await writeFile(new URL('../src/libraries.js',import.meta.url),'export const libraries='+JSON.stringify(libraries,null,1)+';\n');
}finally{await rm(temp,{recursive:true,force:true});}
console.log('Versioned registry archives and per-file integrity verified.');
