import {SpeechAssets} from './trainer-speech-assets.js';
import {speechPlan} from './trainer-speech-plan.js';
export {speechChunks} from './trainer-speech-chunks.js';
export const PIPER_VOICES=Object.freeze({
 instructor:{name:'Ramona',lang:'de-DE',model:'de_DE-ramona-low'},
 dispatch:{name:'Karlsson',lang:'de-DE',model:'de_DE-karlsson-low'},
 self:{name:'Thorsten',lang:'de-DE',model:'de_DE-thorsten-medium'}
});
// Bound inference memory and start speaking before a long lesson finishes rendering.

export class PiperSpeech{
 constructor({environment=globalThis,onStatus=()=>{}}={}){this.env=environment;this.onStatus=onStatus;this.counter=0;this.generation=0;this.pending=null;this.assets=new SpeechAssets(environment);this.decoded=new Map();this.generated=new Map();this.preparing=new Map();this.queue=Promise.resolve();this.backgroundAbort=new (environment.AbortController||globalThis.AbortController)();}
 unlock(){const Context=this.env.AudioContext||this.env.webkitAudioContext;if(!this.context&&Context)this.context=new Context();return this.context?.resume();}
 async _synthesize(text,role){
  if(!this.worker){this.worker=new this.env.Worker(new URL('./trainer-piper-worker.js',import.meta.url));this.worker.onmessage=({data})=>{if(data.id!==this.pending?.id)return;if(data.status){this.onStatus(data.status);return;}const pending=this.pending;this.pending=null;data.error?pending.reject(Error(data.error)):pending.resolve(data);};this.worker.onerror=()=>{this.pending?.reject(Error('Die lokale Sprachsynthese konnte nicht gestartet werden.'));this.pending=null;this.worker?.terminate();this.worker=null;};}
  const voice=PIPER_VOICES[role]||PIPER_VOICES.self,id=++this.counter;
  return new Promise((resolve,reject)=>{this.pending={id,resolve,reject};this.worker.postMessage({id,text,voice:voice.model,speaker:voice.speaker||0});});
 }
 synthesize(text,role){
  const key=role+'\n'+text;if(this.generated.has(key))return Promise.resolve(this.generated.get(key));if(this.preparing.has(key))return this.preparing.get(key);
  const token=this.generation;let task;task=this.queue.catch(()=>{}).then(()=>token===this.generation?this._synthesize(text,role):null).then(audio=>{if(audio&&token===this.generation){this.generated.set(key,audio);while(this.generated.size>32)this.generated.delete(this.generated.keys().next().value);}return audio;}).finally(()=>{if(this.preparing.get(key)===task)this.preparing.delete(key);});
  this.preparing.set(key,task);this.queue=task.catch(()=>{});return task;
 }
 async prepare(lines){
  const token=this.generation;
  for(const line of lines)for(const segment of speechPlan(line.text)){
   if(token!==this.generation)return;const role=PIPER_VOICES[line.role]?line.role:'self';
   if(segment.number&&!await this.assets.has(role,segment.text))await this.synthesize(segment.text,role);
  }
 }
 async preload(progress=()=>{}){try{await this.assets.preload(progress);}catch{progress(1);this.onStatus('Vorbereitete Sprachausgabe nicht verfügbar; Piper und lesbare Texte bleiben nutzbar.');}}
 async warmModels(){
  const base=new URL('../../../assets/trainer/piper/',import.meta.url),signal=this.backgroundAbort.signal;
  try{const cache=await this.env.caches?.open('kartenkunde-piper-v1');
   for(const model of [PIPER_VOICES.self.model,PIPER_VOICES.dispatch.model,PIPER_VOICES.instructor.model])for(const suffix of ['.onnx.json','.onnx']){
    if(signal.aborted)return;const url=new URL(model+suffix,base).href;if(await cache?.match(url))continue;
    const response=await this.env.fetch(url,{signal,priority:'low'});if(!response.ok)continue;const data=await response.arrayBuffer();const expected=model==='de_DE-thorsten-medium'?63221984:63104526;if(suffix==='.onnx'&&data.byteLength!==expected)continue;await cache?.put(url,new this.env.Response(data,{headers:response.headers}));
   }
   for(const name of ['piper_phonemize.data','piper_phonemize.wasm','ort-wasm-simd.wasm']){if(signal.aborted)return;await this.env.fetch(new URL(name,base),{signal,priority:'low',cache:'force-cache'});}
  }catch{} // Background preparation must never prevent entering the world.
 }
 async speak(text,role){
  const token=this.generation;await this.unlock();if(token!==this.generation)return;if(!this.context)throw Error('Audiowiedergabe wird nicht unterstützt.');
  role=PIPER_VOICES[role]?role:'self';
  for(const {text:chunk,pause} of speechPlan(text)){
   if(pause){await new Promise(resolve=>{let timer;const finish=()=>{clearTimeout(timer);if(this.finish===finish)this.finish=null;resolve();};this.finish=finish;timer=setTimeout(finish,pause);});if(token!==this.generation)return;continue;}
   const key=role+'\n'+chunk;let buffer=this.decoded.get(key);
   if(!buffer){const clip=await this.assets.clip(role,chunk);if(token!==this.generation)return;
    if(clip)try{buffer=await this.context.decodeAudioData(clip);}catch{}
    if(!buffer){const audio=await this.synthesize(chunk,role);if(!audio||token!==this.generation)return;buffer=this.context.createBuffer(1,audio.pcm.length,audio.sampleRate);buffer.copyToChannel(audio.pcm,0);}
    if(token!==this.generation)return;this.decoded.set(key,buffer);while(this.decoded.size>16)this.decoded.delete(this.decoded.keys().next().value);
   }
   if(token!==this.generation)return;
   await new Promise(resolve=>{const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);this.source=source;this.finish=resolve;source.onended=()=>{if(this.source===source){this.source=null;this.finish=null;}resolve();};source.start();});
   if(token!==this.generation)return;
  }
 }
 cancel(){this.generation++;this.cancelled=true;this.source?.stop();this.source=null;this.finish?.();this.finish=null;this.pending?.resolve(null);this.pending=null;this.worker?.terminate();this.worker=null;}
 reset(){this.cancelled=false;}
 dispose(){this.backgroundAbort.abort();this.cancel();this.context?.close();}
}
