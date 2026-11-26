import test from 'node:test';
import assert from 'node:assert/strict';
import {TrainingSpeech,radioExchange} from '../modules/orientation/src/trainer-speech.js';
function fake(){const spoken=[];let finish;const engine={reset(){},cancel(){finish?.();},speak(text,role){spoken.push({text,voice:{name:role==='instructor'?'Ramona':role==='dispatch'?'Karlsson':'Thorsten'}});return new Promise(resolve=>{finish=resolve;queueMicrotask(resolve);});}};return {env:{kartenkundePiper:engine},spoken};}
test('Full radio exchanges synthesize both sides in strict turn order and commit once after the final Ende',async()=>{
 const {env,spoken}=fake(),log=[],s=new TrainingSpeech({environment:env,onLine:l=>log.push(l),delay:async()=>{}});let commits=0;
 await s.play(radioExchange('Benötige ein Fahrzeug.','Verstanden. Fahrzeug wird entsandt.'),()=>{assert.match(spoken.at(-1).text,/Ende/);commits++;});
 assert.equal(commits,1);assert.equal(log.length,5);assert.deepEqual(log.map(l=>l.role),['self','dispatch','self','dispatch','self']);assert.match(log[0].text,/Leitstelle Sankt Florian von Einsatzleiter/);assert.match(log[1].text,/Hier Leitstelle.*kommen/);assert.equal(s.busy,false);
 await s.play([{role:'instructor',text:'Willkommen.'}]);assert.equal(spoken.at(-1).voice.name,'Ramona');assert.equal(spoken[1].voice.name,'Karlsson');s.dispose();
});
test('Cancellation during a radio turn releases the queue and never commits a resource request',async()=>{
 const {env}=fake();env.kartenkundePiper.speak=()=>new Promise(resolve=>{env.kartenkundePiper.cancel=resolve;});const s=new TrainingSpeech({environment:env,delay:async()=>{}});let commits=0;
 const pending=s.play(radioExchange('Fahrzeug.','Wird geschickt.'),()=>commits++);assert.equal(s.busy,true);assert.equal(await s.play([]),false);s.cancel();assert.equal(await pending,false);assert.equal(commits,0);assert.equal(s.busy,false);
});
test('Text-only output, muted speech, explicit voice selection and replay preserve readable turns',async()=>{
 const output=[],{env,spoken}=fake();const s=new TrainingSpeech({environment:env,enabled:()=>false,onLine:l=>output.push(l.text),delay:async()=>{}});await s.play(radioExchange('Hinweis.','Antwort.'));assert.equal(output.length,5);assert.equal(spoken.length,0);
 const other=new TrainingSpeech({environment:env,preferences:()=>({selfVoice:'Ramona'}),delay:async()=>{}});await other.play([{role:'self',text:'Verstanden.'}]);assert.equal(spoken.at(-1).voice.name,'Thorsten');other.dispose();s.dispose();
});

import {speechChunks,PIPER_VOICES} from '../modules/orientation/src/trainer-piper.js';
test('Piper uses fixed roles and bounds inference chunks without losing text',()=>{assert.equal(PIPER_VOICES.instructor.name,'Ramona');assert.equal(PIPER_VOICES.dispatch.name,'Karlsson');assert.equal(PIPER_VOICES.self.name,'Thorsten');const text='Willkommen. '+('Langer Lehrtext mit Koordinaten 0 1 2 3. '.repeat(25));const chunks=speechChunks(text);assert.ok(chunks.every(t=>t.length<=240));assert.equal(chunks.join(' '),text.trim());});

import {PiperSpeech} from '../modules/orientation/src/trainer-piper.js';
test('Variable numeric groups are prepared before playback, deduplicated and cached',async()=>{
 const p=new PiperSpeech(),calls=[];p.assets={has:async()=>false};p._synthesize=async(text,role)=>{calls.push({text,role});return {pcm:Float32Array.of(.2,.1),sampleRate:16000};};
 await p.prepare([{role:'self',text:'UTMREF 32U KA 0712 0698 – kommen.'}]);assert.equal(calls.length,1);assert.equal(calls[0].text,'null sieben eins zwei null sechs neun acht');assert.equal(calls[0].role,'self');await Promise.all([p.synthesize(calls[0].text,'self'),p.synthesize(calls[0].text,'self')]);assert.equal(calls.length,1);p.dispose();
});
test('Cancelling preparation drops queued synthesis jobs and cannot restart a cancelled worker',async()=>{
 const p=new PiperSpeech();let finish,calls=0;p._synthesize=()=>{calls++;return new Promise(resolve=>{finish=resolve;p.pending={resolve};});};const a=p.synthesize('eins','self'),b=p.synthesize('zwei','self');await new Promise(r=>setImmediate(r));p.cancel();assert.equal(await a,null);assert.equal(await b,null);assert.equal(calls,1);p.dispose();
});

import {readFileSync} from 'node:fs';
import {speechCatalog} from '../tools/trainer-speech-catalog.mjs';
test('Every current fixed dialogue fragment is present in the generated audio catalog',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/trainer/speech/manifest.json',import.meta.url)));for(const line of speechCatalog())assert.ok(manifest.clips[line.role+'\n'+line.text],line.role+': '+line.text);
});
test('The pause after the zone field is short and can be cancelled without playing the following square',async()=>{
 const p=new PiperSpeech();let played=0;p.assets={clip:async()=>new ArrayBuffer(1)};
 p.context={resume:async()=>{},close(){},decodeAudioData:async()=>({}),createBufferSource(){const source={connect(){},stop(){},start(){played++;queueMicrotask(()=>source.onended());}};return source;}};
 const started=Date.now(),pending=p.speak('32U KA 123 123','self');setTimeout(()=>p.cancel(),20);await pending;assert.equal(played,1);assert.ok(Date.now()-started<220);p.dispose();
});

import {speechPlan} from '../modules/orientation/src/trainer-speech-plan.js';
test('Mixed per-coordinate verdicts use pre-rendered wording in both instructor and dispatch voices',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/trainer/speech/manifest.json',import.meta.url)));
 const statuses=['ist korrekt','ist zu ungenau','liegt komplett daneben','fehlt oder hat ein ungültiges Format'];
 for(const first of statuses)for(const second of statuses)for(const third of statuses)for(const role of ['instructor','dispatch']){
  const text=`Koordinate 1 ${first}. Koordinate 2 ${second}. Koordinate 3 ${third}.`+(role==='dispatch'?' – kommen.':'');
  for(const part of speechPlan(text))if(part.text&&!part.number)assert.ok(manifest.clips[role+'\n'+part.text],role+': '+part.text);
 }
});

import {SUPPORT_FAILURE_KEYS,supportRequest,supportReply} from '../modules/orientation/src/trainer-radio-text.js';
import {getLanguage,setLanguage} from '../src/i18n.js';
test('All real vehicle/heli refusal fragments are pre-rendered in Karlsson, regardless of Node or UI language',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/trainer/speech/manifest.json',import.meta.url)));assert.equal(manifest.voices.dispatch,'de_DE-karlsson-low');const original=getLanguage();let first;
 try{for(const lang of ['de','en','fr']){setLanguage(lang);const catalog=speechCatalog();if(first)assert.deepEqual(catalog,first,'Audio catalog must not depend on host language');else first=catalog;
  for(const [action,keys]of Object.entries(SUPPORT_FAILURE_KEYS))for(const key of keys){const lines=radioExchange(supportRequest(action),supportReply(action,{ok:false,key}));for(const line of lines)for(const part of speechPlan(line.text))if(part.text&&!part.number)assert.ok(manifest.clips[line.role+'\n'+part.text],lang+' missing '+line.role+': '+part.text);}
 }}finally{setLanguage(original);}
});

test('Vehicle refusals play completely from local audio files without invoking live synthesis',async()=>{
 const p=new PiperSpeech({environment:{AbortController,Response,fetch:async url=>new Response(readFileSync(new URL('../assets/trainer/speech/'+new URL(url).pathname.split('/').at(-1),import.meta.url)))}});
 p.context={resume:async()=>{},close(){},decodeAudioData:async()=>({}),createBufferSource(){const source={connect(){},stop(){},start(){queueMicrotask(()=>source.onended());}};return source;}};
 let generated=0;p._synthesize=async()=>{generated++;throw Error('Fixed radio response tried live synthesis');};
 try{for(const [action,keys]of Object.entries(SUPPORT_FAILURE_KEYS))for(const key of keys){const reply=radioExchange(supportRequest(action),supportReply(action,{ok:false,key}))[3];assert.equal(reply.role,'dispatch');await p.speak(reply.text,reply.role);}assert.equal(generated,0);}finally{p.dispose();}
});
