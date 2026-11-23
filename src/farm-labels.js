import {t} from './i18n.js';
import {tkFeatureClass,tkPostpassSQL,tkOverpassQuery,normalizeTKOptions,TK_CLASS_OPTIONS,tkGeometryAllowed,tkOSMGeometry} from './tk-features.js';
const farmCache=new Map(),farmLoaders=new WeakMap(),farmFailures=new Map(),pending=new Map();
let postpassQueue=Promise.resolve();
export const POSTPASS_ENDPOINT='https://postpass.geofabrik.de/api/interpreter';
export const FARM_ENDPOINTS=[POSTPASS_ENDPOINT,'https://overpass-api.de/api/interpreter'];
const abortError=()=>new DOMException(t('cancelled'),'AbortError');
// OSM ele is metres above sea level; never substitute height or a missing zero.
export function peakElevation(value){
 const raw=String(value??'').trim();if(!/^[+-]?\d+(?:[.,]\d+)?(?:\s*m)?$/.test(raw))return '';
 const number=Number(raw.replace(/\s*m$/,'').replace(',','.'));return Number.isFinite(number)?`${number} m`:'';
}
export function farmFeatures(result){
 if(result?.remark)throw Error(t('farmLoadError'));
 let candidates;
 if(result?.type==='FeatureCollection'&&Array.isArray(result.features))candidates=result.features.map(f=>{
 const p=f.properties||{},tags=p.tags||{};
 return {id:f.id??`${p.osm_type||'osm'}/${p.osm_id}`,geometry:f.geometry,name:p.name??tags.name??'',ele:p.ele??tags.ele??p.elevation,kind:p.tags?tkFeatureClass(tags):p.class};
 });
 else if(Array.isArray(result?.elements))candidates=result.elements.map(e=>({id:`${e.type}/${e.id}`,geometry:tkOSMGeometry(e,tkFeatureClass(e.tags)),name:e.tags?.name||'',ele:e.tags?.ele,kind:tkFeatureClass(e.tags)}));
 else throw Error(t('farmLoadError'));
 const seen=new Set();return {type:'FeatureCollection',features:candidates.flatMap(f=>{
 if(!Object.hasOwn(TK_CLASS_OPTIONS,f.kind)||!tkGeometryAllowed(f.kind,f.geometry)||seen.has(f.id))return [];
 seen.add(f.id);return [{type:'Feature',id:f.id,geometry:f.geometry,properties:{name:f.name,class:f.kind,...(f.kind==='peak'?{elevation:peakElevation(f.ele)}:{})}}];
 })};
}
export function farmQueryBounds(bounds){
 const box=[Math.max(-90,Math.floor(bounds.getSouth()*10)/10),Math.max(-180,Math.floor(bounds.getWest()*10)/10),Math.min(90,Math.ceil(bounds.getNorth()*10)/10),Math.min(180,Math.ceil(bounds.getEast()*10)/10)];
 try{tkPostpassSQL(box);return box;}catch{return null;}
}
export async function loadFarmFeatures(box,signal,fetcher=globalThis.fetch){
 const sql=tkPostpassSQL(box),key='tk-v5:'+box.join(',');if(signal?.aborted)throw abortError();
 const cached=farmCache.get(key);if(cached&&Date.now()-cached.time<300000)return cached.features;
 const covering=[...farmCache.values()].find(entry=>Date.now()-entry.time<300000&&entry.box&&box[0]>=entry.box[0]&&box[1]>=entry.box[1]&&box[2]<=entry.box[2]&&box[3]<=entry.box[3]);if(covering)return covering.features;
 const failure=farmFailures.get(key);if(failure&&Date.now()-failure.time<30000)throw failure.error;
 // Requests without external cancellation (server calls) can share a pending result.
 if(!signal&&pending.has(key))return pending.get(key);
 const task=(async()=>{
 let lastError;
 const proxy=globalThis.document?.baseURI&&/^https?:/.test(globalThis.document.baseURI)?new URL('./api/farms.php',globalThis.document.baseURI).href:null;
 for(const endpoint of proxy?[proxy,...FARM_ENDPOINTS]:FARM_ENDPOINTS){
 const execute=async()=>{
 if(signal?.aborted)throw abortError();
 const request=new AbortController(),abort=()=>request.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,endpoint===proxy?38000:15000);
 try{
 const params=endpoint===proxy?{bbox:box.join(',')}:endpoint===POSTPASS_ENDPOINT?{data:sql}:{data:tkOverpassQuery(box)};
 const headers=globalThis.document?{}:{'User-Agent':'KARTENKUNDE.app/1.0 (OSM topographic print tool)','Accept':'application/json'};
 const response=await fetcher(`${endpoint}?${new URLSearchParams(params)}`,{signal:request.signal,headers});
 if(!response.ok){let detail='';try{detail=(await response.json()).error||'';}catch{}throw Error(`HTTP ${response.status}${detail?': '+detail:''}`);}
 return farmFeatures(await response.json());
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 };
 try{
 let features;
 if(endpoint===POSTPASS_ENDPOINT){const next=postpassQueue.then(execute,execute);postpassQueue=next.catch(()=>{});features=await next;}else features=await execute();
 farmFailures.delete(key);farmCache.set(key,{time:Date.now(),features,box:[...box]});if(farmCache.size>24)farmCache.delete(farmCache.keys().next().value);return features;
 }catch(error){if(signal?.aborted)throw abortError();lastError=error;}
 }
 const error=Error(t('farmLoadError'));error.detailKey=lastError?.name==='AbortError'?'mapTimeout':lastError?.name==='TypeError'?'network':lastError?.name==='SyntaxError'?'invalidJSON':lastError?.message===t('farmLoadError')?'invalidJSON':null;error.detail=lastError?.message;error.message=formatFarmError(error);
 farmFailures.set(key,{time:Date.now(),error});if(farmFailures.size>24)farmFailures.delete(farmFailures.keys().next().value);throw error;
 })();
 if(!signal)pending.set(key,task);
 try{return await task;}finally{if(!signal)pending.delete(key);}
}
export function installFarmLabels(map,options={}){
 farmLoaders.get(map)?.();if(!Object.values(normalizeTKOptions(options)).some(Boolean))return Promise.resolve();
 let timer,request,revision=0,disposed=false;const sourceId='named-farms';
 const refresh=async()=>{
 const version=++revision;request?.abort();const source=map.getSource(sourceId);if(!source||disposed)return;
 const box=farmQueryBounds(map.getBounds());if(!box){source.setData({type:'FeatureCollection',features:[]});return;}
 request=new AbortController();const abortTimer=setTimeout(()=>request.abort(),55000);
 try{const features=await loadFarmFeatures(box,request.signal);if(!disposed&&version===revision&&map.getSource(sourceId)===source){source.setData(features);const farms=features.features.filter(f=>f.properties.class==='farm');map.fire('farmdata',{count:farms.length,names:farms.map(f=>f.properties.name),symbols:features.features.length-farms.length});}}
 catch(error){if(disposed||version!==revision)return;map.fire('farmwarning',{error,message:t('farmUnavailable')});}
 finally{clearTimeout(abortTimer);}
 };
 const moved=()=>{clearTimeout(timer);timer=setTimeout(()=>refresh().catch(error=>map.fire('farmwarning',{error,message:t('farmUnavailable')})),450);};
 const dispose=()=>{disposed=true;++revision;clearTimeout(timer);request?.abort();map.off('moveend',moved);map.off('remove',dispose);};
 map.on('moveend',moved);map.on('remove',dispose);farmLoaders.set(map,dispose);return refresh();
}

export function formatFarmError(error){
 const detail=error?.detailKey?t(error.detailKey):error?.detail||error?.message||t('network');
 return `${t('farmLoadError')} (${detail})`;
}
