const base=new URL('../../../assets/trainer/speech/',import.meta.url);
export class SpeechAssets{
 constructor(environment=globalThis){this.env=environment;this.manifest=null;this.inflight=new Map();}
 async load(){if(!this.loading)this.loading=(async()=>{const response=await this.env.fetch(new URL('manifest.json',base),{cache:'no-cache'});if(!response.ok)throw Error('Vorbereitete Sprachausgabe konnte nicht geladen werden.');this.manifest=await response.json();})();return this.loading;}
 async file(entry){
  const url=new URL(entry.file,base).href;if(this.inflight.has(url))return (await this.inflight.get(url)).clone();
  const pending=(async()=>{let cache;try{cache=await this.env.caches?.open('kartenkunde-speech-clips-v1');const hit=await cache?.match(url);if(hit)return hit;}catch{}
   const response=await this.env.fetch(url);if(!response.ok)throw Error('Sprachaufnahme konnte nicht geladen werden.');const bytes=await response.arrayBuffer();if(bytes.byteLength!==entry.bytes)throw Error('Sprachaufnahme ist unvollständig.');
   const complete=new this.env.Response(bytes,{headers:{'Content-Type':'audio/ogg'}});try{await cache?.put(url,complete.clone());}catch{}return complete;
  })();this.inflight.set(url,pending);try{return (await pending).clone();}finally{this.inflight.delete(url);}
 }
 async preload(progress=()=>{}){
  await this.load();const entries=Object.values(this.manifest.clips),total=entries.length;let next=0,done=0;
  await Promise.all(Array.from({length:4},async()=>{while(next<total){const entry=entries[next++];await this.file(entry);progress(++done/Math.max(1,total));}}));progress(1);
 }
 async has(role,text){try{await this.load();return !!this.manifest.clips[role+'\n'+text];}catch{return false;}}
 async clip(role,text){try{await this.load();const entry=this.manifest.clips[role+'\n'+text];return entry?(await this.file(entry)).arrayBuffer():null;}catch{return null;}}
}
