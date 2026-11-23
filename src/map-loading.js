import {t} from './i18n.js';
const PRINT_TILE_PROTOCOL='pq5-print-tile',installedTileProtocols=new WeakSet();
export function printTileRequest(url,type){
 if(type==='Tile'&&/^https:\/\/(?:sgx\.geodatenzentrum\.de\/gdz_basemapde_vektor\/tiles\/|tiles\.openfreemap\.org\/planet\/)/.test(url))return {url:PRINT_TILE_PROTOCOL+'://'+url.slice(8)};
 return {url};
}
// Individual stalled requests must end before the map deadline. Retry only
// transient failures; cancelling/removing a map always aborts the entire request.
export async function fetchPrintTile(params,controller,fetcher=globalThis.fetch,{attemptTimeout=15000,attempts=3}={}){
 const url=params.url.replace(PRINT_TILE_PROTOCOL+'://','https://'),signal=controller.signal;
 let last;
 for(let attempt=0;attempt<attempts;attempt++){
 if(signal.aborted)throw new DOMException(t('cancelled'),'AbortError');
 const request=new AbortController(),abort=()=>request.abort();signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,attemptTimeout);
 try{
 const response=await fetcher(url,{signal:request.signal,headers:params.headers,credentials:params.credentials,cache:attempt?'reload':params.cache});
 if(!response.ok){const error=Error(`HTTP ${response.status}: ${url}`);error.status=response.status;error.retryable=[408,425,429].includes(response.status)||response.status>=500;throw error;}
 const data=await response.arrayBuffer();if(signal.aborted)throw new DOMException(t('cancelled'),'AbortError');
 return {data,cacheControl:response.headers?.get('Cache-Control'),expires:response.headers?.get('Expires')};
 }catch(error){if(signal.aborted)throw new DOMException(t('cancelled'),'AbortError');last=error;if(error.retryable===false)throw error;}
 finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
 }
 throw last;
}
export function createPrintTileLoader({concurrency=8,fetcher=globalThis.fetch,...options}={}){
 let active=0;const queue=[];
 const drain=()=>{while(active<concurrency&&queue.length){const job=queue.shift();job.controller.signal.removeEventListener('abort',job.cancel);active++;
 fetchPrintTile(job.params,job.controller,fetcher,options).then(job.resolve,job.reject).finally(()=>{active--;drain();});
 }};
 return (params,controller)=>new Promise((resolve,reject)=>{
 if(controller.signal.aborted){reject(new DOMException(t('cancelled'),'AbortError'));return;}
 const job={params,controller,resolve,reject,cancel:()=>{const index=queue.indexOf(job);if(index>=0)queue.splice(index,1);reject(new DOMException(t('cancelled'),'AbortError'));}};
 controller.signal.addEventListener('abort',job.cancel,{once:true});queue.push(job);drain();
 });
}
export function installPrintTileLoader(library){if(installedTileProtocols.has(library))return;library.addProtocol(PRINT_TILE_PROTOCOL,createPrintTileLoader());installedTileProtocols.add(library);}
function waitForMapFrame(map,event,signal,timeout){return new Promise((resolve,reject)=>{
 let timer;
 const done=error=>{clearTimeout(timer);map.off(event,ready);map.off('render',rendered);signal?.removeEventListener('abort',abort);error?reject(error):resolve();};
 const ready=()=>done(),abort=()=>done(new DOMException(t('cancelled'),'AbortError'));
 const rendered=()=>{if(map.loaded())done();};
 if(signal?.aborted){abort();return;}
 timer=setTimeout(()=>done(Error(t('mapTimeout'))),timeout);map.on(event,ready);map.on('render',rendered);signal?.addEventListener('abort',abort,{once:true});
 // A prior idle event may have occurred while POIs were loading. loaded() also
 // checks pending source updates, so never capture before setData is rendered.
 if(map.loaded())done();else map.triggerRepaint();
 });}
function preparePrintableMap(prepare,signal){return new Promise((resolve,reject)=>{
 const done=(error,value)=>{signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);},abort=()=>done(new DOMException(t('cancelled'),'AbortError'));
 if(signal?.aborted){abort();return;}
 signal?.addEventListener('abort',abort,{once:true});Promise.resolve().then(()=>{if(signal?.aborted)throw new DOMException(t('cancelled'),'AbortError');return prepare();}).then(value=>done(null,value),done);
 });}
export async function waitForPrintableMap(map,prepare,signal,{loadTimeout=90000,paintTimeout=30000}={}){
 let error;const onError=e=>{error=Error(t('mapLoadError',{detail:e.error?.message||t('network')}));};map.on('error',onError);
 try{
 await waitForMapFrame(map,'load',signal,loadTimeout);if(error)throw error;
 if(signal?.aborted)throw new DOMException(t('cancelled'),'AbortError');
 await preparePrintableMap(prepare,signal);
 if(signal?.aborted)throw new DOMException(t('cancelled'),'AbortError');
 await waitForMapFrame(map,'idle',signal,paintTimeout);if(error)throw error;
 }catch(reason){throw reason.name==='AbortError'?reason:error||reason;}finally{map.off('error',onError);}
}
