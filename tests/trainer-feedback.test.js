import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {feedbackContext} from '../modules/orientation/src/trainer-feedback.js';
import {defaultGameState} from '../modules/orientation/src/trainer-game-state.js';
test('Diagnostic snapshot preserves held items and vehicle position without notes or transcripts',()=>{
 const s=defaultGameState();s.notes='PRIVATE';s.handTool='compass';s.items.compass='hand';s.vehicle.occupied=true;s.vehicle.e=100;s.vehicle.n=200;
 const c=feedbackContext(s,'abc');s.handTool='radio';s.items.compass='stowed';
 assert.equal(c.hand,'compass');assert.equal(c.items.compass,'hand');assert.deepEqual(c.position,{e:100,n:200});assert.ok(!JSON.stringify(c).includes('PRIVATE'));assert.equal(c.vehicle.occupied,true);
});
test('Feedback endpoint validates consent, origin, schema, text and size; stores inert text and limits reports',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'kartenkunde-feedback-'));await mkdir(join(dir,'api'));await copyFile('api/feedback.php',join(dir,'api/feedback.php'));
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const php=spawn('php',['-S',`127.0.0.1:${port}`,'-t',dir],{stdio:['ignore','ignore','pipe']});
 try{
  await new Promise((r,j)=>{php.once('error',j);php.stderr.once('data',r);});
  const url=`http://127.0.0.1:${port}/api/feedback.php`,context=feedbackContext(defaultGameState(),'test-build');
  const data={text:'<script>alert(1)</script> <?php system("id"); ?> ../../escape.txt\nTest',consent:true,context};
  const post=(body=data,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Kartenkunde-Feedback':'1',...headers},body:JSON.stringify(body)});
  assert.equal((await fetch(url)).status,405);
  assert.equal((await post(data,{'Origin':'https://evil.example'})).status,403);
  assert.equal((await post(data,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await post(data,{'X-Kartenkunde-Feedback':''})).status,400);
  for(const bad of [{...data,consent:false},{...data,path:'../../escape.txt'},{...data,text:'bad\0text'},{...data,text:'x'.repeat(4001)},{...data,context:{...context,notes:'PRIVATE'}},{...data,context:{...context,position:{e:'x',n:0}}}])assert.equal((await post(bad)).status,400);
  assert.equal((await post({...data,text:'x'.repeat(20000)})).status,413);
  for(let i=0;i<3;i++){
   const res=await post(data,{'Origin':`http://127.0.0.1:${port}`});assert.equal(res.status,201);const {id}=await res.json();assert.match(id,/^\d{8}-\d{6}-[a-f0-9]{16}$/);
   const contents=await readFile(join(dir,'var/feedback',id+'.txt'),'utf8');assert.ok(contents.includes(JSON.stringify(data.text)));assert.ok(contents.includes('"hand"'));assert.ok(!contents.includes('127.0.0.1'));
  }
  assert.equal((await post()).status,429);
  assert.equal((await readdir(join(dir,'var/feedback'))).filter(f=>f.endsWith('.txt')).length,3);
  assert.equal(await readFile(join(dir,'var/feedback/.htaccess'),'utf8'),'Require all denied\n');
 }finally{php.kill();await rm(dir,{recursive:true,force:true});}
});
