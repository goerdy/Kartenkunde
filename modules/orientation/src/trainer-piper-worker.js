// Classic worker: inference and phonemization never block the game loop.
const base=new URL('../../../assets/trainer/piper/',self.location.href).href;
importScripts(base+'ort.min.js',base+'piper_phonemize.js');
ort.env.wasm.wasmPaths=base;ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
let current=null;
const modelBytes={'de_DE-ramona-low.onnx':63104526,'de_DE-karlsson-low.onnx':63104526,'de_DE-thorsten-medium.onnx':63221984};
async function checked(response,name){
 const data=await response.arrayBuffer();if(modelBytes[name]&&data.byteLength!==modelBytes[name])throw Error('Die Sprachdatei ist noch nicht vollständig verfügbar. Bitte später erneut versuchen.');
 return new Response(data,{headers:response.headers});
}
async function localFile(name){
 const url=base+name;let cache;try{cache=await caches.open('kartenkunde-piper-v1');const hit=await cache.match(url);if(hit){try{return await checked(hit,name);}catch{await cache.delete(url);}}}catch{}
 const response=await fetch(url);if(!response.ok)throw Error(`Sprachdatei ${name}: HTTP ${response.status}`);
 const complete=await checked(response,name);if(cache)try{await cache.put(url,complete.clone());}catch{}
 return complete;
}
self.onmessage=async({data:{id,voice,text,speaker=0}})=>{
 try{
  if(current?.voice!==voice){
   self.postMessage({id,status:'Stimme wird geladen …'});
   if(current)await current.session.release();current=null;
   const config=await(await localFile(voice+'.onnx.json')).json();
   const session=await ort.InferenceSession.create(await(await localFile(voice+'.onnx')).arrayBuffer(),{executionProviders:['wasm'],graphOptimizationLevel:'all'});
   current={voice,config,session};
  }
  self.postMessage({id,status:'Sprachausgabe wird vorbereitet …'});
  const {config,session}=current;let phonemes;
  const phonemizer=await createPiperPhonemize({noInitialRun:true,locateFile:name=>base+name,print:line=>{phonemes=JSON.parse(line).phonemes;},printErr:()=>{}});
  phonemizer.callMain(['-l',config.espeak.voice,'--input',JSON.stringify([{text}]),'--espeak_data','/espeak-ng-data']);
  const map=config.phoneme_id_map,ids=[...map['^'],...map['_']];
  for(const phoneme of phonemes||[])if(map[phoneme])ids.push(...map[phoneme],...map['_']);
  ids.push(...map['$']);
  if(!phonemes?.length)throw Error('Der Text konnte nicht in Sprachlaute umgewandelt werden.');
  const feeds={input:new ort.Tensor('int64',BigInt64Array.from(ids,BigInt),[1,ids.length]),input_lengths:new ort.Tensor('int64',BigInt64Array.of(BigInt(ids.length)),[1]),scales:new ort.Tensor('float32',Float32Array.of(config.inference.noise_scale,config.inference.length_scale,config.inference.noise_w),[3])};
  if(config.num_speakers>1)feeds.sid=new ort.Tensor('int64',BigInt64Array.of(BigInt(speaker)),[1]);
  const result=await session.run(feeds);const pcm=new Float32Array(result.output.data);
  self.postMessage({id,pcm,sampleRate:config.audio.sample_rate},[pcm.buffer]);
 }catch(error){self.postMessage({id,error:String(error.message||error)});}
};
