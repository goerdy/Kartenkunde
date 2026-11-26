// End-to-end checks of the locally built 3D trainer. Start the server on port 8082.
// No external map service is used; screenshots are written under /tmp.
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const exerciseTestBase=new URL(process.env.KARTENKUNDE_URL||'http://127.0.0.1:8082/'),exerciseTestDist=process.env.KARTENKUNDE_DIST??'dist/';
const profile=await mkdtemp(join(tmpdir(),'utmref-screenshot-'));
let browser,buffer='',nextId=1,diagnostics='';const waiting=new Map();
function failAll(error){for(const pending of waiting.values()){clearTimeout(pending.timer);pending.reject(error);}waiting.clear();}
function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=nextId++,timer=setTimeout(()=>{waiting.delete(id);reject(Error(`Browser-Zeitüberschreitung: ${method}`));},180000);waiting.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});}
try{
 browser=spawn(process.env.CHROMIUM_BIN||'chromium',['--headless','--no-sandbox','--use-gl=angle',...(process.env.KARTENKUNDE_GPU?['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist']:['--use-angle=swiftshader','--enable-unsafe-swiftshader']),'--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--hide-scrollbars','--remote-debugging-pipe',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
 browser.stderr.on('data',chunk=>{diagnostics=(diagnostics+chunk).slice(-4000);});browser.on('error',error=>failAll(error));browser.on('exit',code=>failAll(Error(`Browser beendet (${code}). ${diagnostics}`)));
 browser.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let end;while((end=buffer.indexOf('\0'))>=0){const raw=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!raw)continue;const response=JSON.parse(raw),pending=waiting.get(response.id);if(!pending)continue;waiting.delete(response.id);clearTimeout(pending.timer);response.error?pending.reject(Error(response.error.message)):pending.resolve(response.result);}});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 await send('Page.enable',{},sessionId);if(process.env.KARTENKUNDE_FORCE_CDN){await send('Network.enable',{},sessionId);await send('Network.setBlockedURLs',{urls:['*/vendor/leaflet.js*']},sessionId);}await send('Runtime.enable',{},sessionId);await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);


 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,userGesture:true,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const navigate=async file=>{await send('Page.navigate',{url:new URL(exerciseTestDist+file,exerciseTestBase).href},sessionId);};
 const check=(condition,message)=>{if(!condition)throw Error(message);};
 await navigate('hilfe.html');
 await evaluate(`window.piperCsp=[];document.addEventListener('securitypolicyviolation',e=>piperCsp.push(e.violatedDirective));window.piper=null;`);
 if(!process.env.KARTENKUNDE_PRELOADED)for(const role of ['instructor','dispatch','self']){
  const result=await evaluate(`(async()=>{const {PiperSpeech}=await import('./modules/orientation/src/trainer-piper.js');window.piper ||= new PiperSpeech();const start=performance.now();const audio=await piper.synthesize('Hier spricht die '+${JSON.stringify(role)}+'. Kommen.',${JSON.stringify(role)});let peak=0;for(const v of audio.pcm)peak=Math.max(peak,Math.abs(v));return {role:${JSON.stringify(role)},samples:audio.pcm.length,rate:audio.sampleRate,peak,ms:Math.round(performance.now()-start),csp:piperCsp};})()`);
  check(result.samples>1000&&result.peak>0.01&&result.csp.length===0,'Real Piper inference: '+JSON.stringify(result));console.log(result);
 }
 const playback=await evaluate(`(async()=>{if(!piper){const {PiperSpeech}=await import('./modules/orientation/src/trainer-piper.js');piper=new PiperSpeech();}piper.cancel();await piper.unlock();await piper.preload();await piper.speak('Verstanden – Ende.','self');return !piper.source&&!piper.pending&&!piper.worker;})()`);check(playback,'Preloaded fixed speech plays without starting the synthesis worker');
 const cancelled=await evaluate(`(async()=>{const pending=piper.speak('Dieser lange Funkspruch wird abgebrochen.','instructor');setTimeout(()=>piper.cancel(),10);await pending;return !piper.worker&&!piper.source&&!piper.pending;})()`);check(cancelled,'Cancellation stops real inference and playback');
 const prepared=await evaluate(`(async()=>{await piper.prepare([{role:'self',text:'32U KA 0712 0698'}]);return piper.generated.has('self'+String.fromCharCode(10)+'null sieben eins zwei null sechs neun acht');})()`);check(prepared,'Variable coordinates are generated ahead of their turn');
 await evaluate('piper.dispose()');console.log('Real Piper synthesis, playback and cancellation passed');
}finally{browser?.kill('SIGTERM');await rm(profile,{recursive:true,force:true}).catch(()=>{});}
