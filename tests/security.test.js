import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {createServer} from 'node:net';
import {validateExerciseSnapshot,decodeExerciseSnapshot} from '../src/exercise-share.js';
import {BoundaryClient} from '../src/admin.js';
import {makePlan} from '../src/geo.js';
import {libraries} from '../src/libraries.js';
import {getLanguage,setLanguage} from '../src/i18n.js';
const projContext={};vm.runInNewContext(readFileSync(new URL('../vendor/proj4.js',import.meta.url),'utf8'),projContext);globalThis.proj4=projContext.proj4;
const valid=()=>({v:1,language:'de',selection:{w:8,e:9,s:53,n:54},settings:{title:'Übung',notes:'',style:'plain',scale:25000,paper:'A4',dpi:150,overlap:10},exercise:{fit:false,points:[{name:'Kirche',kind:'coordinate',lon:8.2,lat:53.5}]}});
test('Share import rejects prototype keys, coerced booleans, malformed points, duplicate IDs and unknown styles/languages',()=>{
 const attacks=[s=>s.settings.style='__proto__',s=>s.language='constructor',s=>s.settings.landscape='false',s=>s.settings.tkOptions={farms:'yes'},s=>s.exercise.points[0].name={},s=>s.exercise.points[0].kind='unknown',s=>s.exercise.points[0].lat=Infinity,s=>s.exercise.fit='false',s=>s.exercise.points=[{...s.exercise.points[0],id:'x'},{...s.exercise.points[0],id:'x'}],s=>s.administrative={iso:'DEU',path:[{level:'ADM3',id:'1',name:'X'},{level:'ADM3',id:'2',name:'Y'}]}];
 for(const attack of attacks){const s=valid();attack(s);assert.throws(()=>validateExerciseSnapshot(s));}
 const polluted=JSON.parse(JSON.stringify(valid()).replace('"notes":""','"notes":"","__proto__":{"polluted":true}'));assert.throws(()=>validateExerciseSnapshot(polluted));assert.equal({}.polluted,undefined);
 const s=valid();s.settings.url='javascript:alert(1)';s.arbitrary={secret:'discard'};assert.ok(!('url'in validateExerciseSnapshot(s).settings));assert.ok(!('arbitrary'in validateExerciseSnapshot(s)));
 const previous=getLanguage();setLanguage('__proto__');assert.equal(getLanguage(),previous);
});
test('Retired Fiord and Dark exercise links migrate to the default map without accepting unknown styles',()=>{for(const style of ['fiord','dark']){const input=valid();input.settings.style=style;assert.equal(validateExerciseSnapshot(input).settings.style,'pq5basemap');}});
test('Compressed input is bounded after inflation and before decoding',async()=>{
 const bomb=deflateSync(Buffer.from(' '.repeat(1048576))).toString('base64url');await assert.rejects(decodeExerciseSnapshot(bomb));await assert.rejects(decodeExerciseSnapshot('a'.repeat(16385)));
});
test('Huge imported rectangle fails before allocating millions of sheets',()=>{
 assert.throws(()=>makePlan({w:0,e:180,s:-60,n:70},{scale:5000,paper:'A4',overlap:0}),/5000/);
});
test('Pinned browser assets exactly match their committed SRI values',async()=>{
 for(const lib of libraries){const bytes=await readFile(new URL('../vendor/'+lib.file,import.meta.url));assert.equal(lib.integrity,'sha384-'+createHash('sha384').update(bytes).digest('base64'));}
});
test('PHP request parser, atomic rate limiter, concurrency slots and cache quota reject abuse',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kartenkunde-proxy-test-'));
 try{const source=resolve('api/proxy-security.php'),code=`require $argv[1]; $dir=$argv[2]; $bad=[null,[],"NaN,0,1,1","0,0,99,1","0,0,1,99","0;system(id),0,1,1","0e0,0,1,1","1,2,0,3"];
 foreach($bad as $input)if(pq5_bbox($input)!==null)exit(10);if(pq5_bbox("53.6,7.8,53.7,7.9")===null)exit(11);
 if(!pq5_rate_allowed($dir,"fixture",100,2)||!pq5_rate_allowed($dir,"fixture",100,2)||pq5_rate_allowed($dir,"fixture",100,2)||!pq5_rate_allowed($dir,"fixture",161,2))exit(12);
 $a=pq5_worker($dir,2);$b=pq5_worker($dir,2);if(!$a||!$b||pq5_worker($dir,2)!==null)exit(13);fclose($a);fclose($b);
 for($i=0;$i<10;$i++)pq5_cache_put($dir,$dir.'/data-'.$i.'.json',str_repeat('x',40),100,2);
 $files=glob($dir.'/data-*.json');$bytes=0;foreach($files as $f)$bytes+=filesize($f);if(count($files)>2||$bytes>100)exit(14);echo 'Guards OK';`;
 assert.equal(execFileSync('php',['-r',code,source,dir],{encoding:'utf8'}),'Guards OK');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Real PHP HTTP endpoint rejects unsupported methods, cross-site calls and hostile bbox without upstream requests',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
 const php=spawn('php',['-S',`127.0.0.1:${port}`,'-t',process.cwd()],{stdio:['ignore','ignore','pipe']});
 try{await new Promise((resolve,reject)=>{php.once('error',reject);php.stderr.once('data',resolve);});const base=`http://127.0.0.1:${port}/api/farms.php`;
 for(const query of ['','?bbox[]=1','?bbox=nan,0,1,1','?bbox=0,0,1,99','?bbox=0;system(id),0,1,1','?bbox=0,0,1,1&farms=1','?bbox=0,0,1,1&farms[]=0','?bbox=0,0,1,1&extra=0']){const r=await fetch(base+query);assert.equal(r.status,400);assert.match(r.headers.get('content-type'),/application\/json/);const body=await r.json();assert.ok(body.error);assert.ok(!JSON.stringify(body).includes(process.cwd()));}
 let r=await fetch(base,{method:'POST',body:'hostile'});assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'GET');r=await fetch(base+'?bbox=0,0,1,1',{headers:{'Sec-Fetch-Site':'cross-site'}});assert.equal(r.status,403);
 }finally{php.kill('SIGTERM');}
});

test('Administrative data rejects oversized responses before reading the payload',async()=>{
 let read=false;const client=new BoundaryClient(async()=>({ok:true,headers:{get:()=>String(33*1024*1024)},text:async()=>{read=true;return '{}';}}));await assert.rejects(client.json('https://www.geoboundaries.org/fixture'));assert.equal(read,false);
});

test('Generated CSP permits only pinned CDN scripts and the exact standalone inline hash',async()=>{
 const rules=await readFile(new URL('../dist/.htaccess',import.meta.url),'utf8'),html=await readFile(new URL('../dist/Start.html',import.meta.url),'utf8'),policy=rules.match(/Header always set Content-Security-Policy "([^"]+)"/)[1],script=policy.split(';').find(s=>s.trim().startsWith('script-src '));
 assert.ok(!script.includes("'unsafe-inline'")&&!script.includes("'unsafe-eval'"));assert.ok(!script.includes('https://cdn.jsdelivr.net '));for(const lib of libraries.filter(l=>!l.css))assert.ok(script.includes(lib.url));
 const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1],hash="'sha256-"+createHash('sha256').update(code).digest('base64')+"'";assert.ok(script.includes(hash));assert.ok(policy.includes("frame-ancestors 'none'"));assert.ok(!rules.includes('__START_SCRIPT_HASH__'));
});
