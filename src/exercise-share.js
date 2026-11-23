import {normalizeExercisePoints} from './exercise.js';
import {administrativeReference} from './admin.js';
import {t} from './i18n.js';
export const EXERCISE_SHARE_BASE='https://kartenkunde.app/';
const exerciseShareLimit=65536,exerciseEncodedLimit=16384;
export function validateExerciseSnapshot(value){
 const fail=()=>{throw Error(t('exerciseLinkInvalid'));},object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
 if(!object(value)||value.v!==1||!object(value.settings)||!object(value.exercise))fail();
 // Reject pollution keys even in otherwise ignored properties; cap work before traversing.
 const queue=[value];let visited=0;while(queue.length){const item=queue.pop();if(++visited>1000)fail();if(item&&typeof item==='object'){for(const key of Object.keys(item)){if(['__proto__','constructor','prototype'].includes(key))fail();const child=item[key];if(child&&typeof child==='object')queue.push(child);}}}
 const s=value.settings,e=value.exercise,styles=['pq5basemap','pq5tk','pq5gray','liberty','bright','positron','fiord','dark','mono','lgln50','lgln50gray','plain'];
 if(![25000,50000].includes(s.scale)||!['A4','A3','A2','A1'].includes(s.paper)||!styles.includes(s.style)||![96,150,200,300].includes(s.dpi)||![0,5,10,15].includes(s.overlap))fail();
 if(typeof s.title!=='string'||s.title.length>80||typeof s.notes!=='string'||s.notes.length>600)fail();
 const settings={scale:s.scale,paper:s.paper,dpi:s.dpi,overlap:s.overlap,style:s.style,title:s.title,notes:s.notes};
 for(const key of ['landscape','utmLabels','dmsLabels','streetNames','contours'])if(Object.hasOwn(s,key)){if(typeof s[key]!=='boolean')fail();settings[key]=s[key];}
 if(s.areaName!==undefined){if(typeof s.areaName!=='string'||s.areaName.length>160)fail();settings.areaName=s.areaName;}
 if(Object.hasOwn(s,'tkOptions')){if(!object(s.tkOptions))fail();settings.tkOptions={};const allowed=['farms','churches','wind','transmitters','castles','ruins','waterTowers','chimneys','substations','pylons','powerLines','militaryAreas','lighthouses','locks','hospitals','fireStations','police','viewTowers','cemeteries','peaks','streetNames','contours'];for(const key of Object.keys(s.tkOptions)){if(key==='scale'){if(s.tkOptions[key]!==s.scale)fail();settings.tkOptions[key]=s.scale;}else{if(!allowed.includes(key)||typeof s.tkOptions[key]!=='boolean')fail();settings.tkOptions[key]=s.tkOptions[key];}}}
 if(!Array.isArray(e.points)||!e.points.length||e.points.length>20||typeof e.fit!=='boolean')fail();
 for(const point of e.points){if(!object(point)||typeof point.name!=='string'||!point.name.trim()||point.name.length>80||!['place','coordinate'].includes(point.kind)||!Number.isFinite(point.lon)||!Number.isFinite(point.lat)||point.lon< -180||point.lon>180||point.lat< -80||point.lat>=84)fail();if(point.precision!==undefined&&(!Number.isInteger(point.precision)||point.precision<1||point.precision>5))fail();if(point.coordinate!==undefined&&(typeof point.coordinate!=='string'||point.coordinate.length>40))fail();if(point.id!==undefined&&(typeof point.id!=='string'||point.id.length>100))fail();}
 const points=normalizeExercisePoints(e.points),ids=new Set(points.map(p=>p.id));if(ids.size!==points.length)fail();
 let selection=null;if(value.selection!==undefined&&value.selection!==null){const b=value.selection;if(!object(b)||!['w','e','s','n'].every(k=>Number.isFinite(b[k]))||b.w< -180||b.e>180||b.s< -80||b.n>=84||b.w>=b.e||b.s>=b.n)fail();selection={w:b.w,e:b.e,s:b.s,n:b.n};}if(!e.fit&&!selection)fail();
 if(s.feature)fail();let administrative=null;if(value.administrative!==undefined&&value.administrative!==null){const a=value.administrative;if(!object(a)||typeof a.iso!=='string'||!(/^[A-Z]{3}$/).test(a.iso)||!Array.isArray(a.path)||!a.path.length||a.path.length>6)fail();let previous=-1;const path=a.path.map(p=>{if(!object(p)||typeof p.level!=='string'||!/^ADM[0-5]$/.test(p.level)||typeof p.id!=='string'||p.id.length>128||typeof p.name!=='string'||!p.name||p.name.length>160||Number(p.level[3])<=previous)fail();previous=Number(p.level[3]);return {level:p.level,id:p.id,name:p.name};});administrative={iso:a.iso,path};}
 const result={v:1,selection,administrative,settings,exercise:{active:true,fit:e.fit,solutions:true,scale:s.scale,points}};
 if(value.language!==undefined){if(!['de','en','fr'].includes(value.language))fail();result.language=value.language;}
 if(value.view!==undefined){const v=value.view;if(!object(v)||!Array.isArray(v.center)||v.center.length!==2||!v.center.every(Number.isFinite)||Math.abs(v.center[0])>=85||Math.abs(v.center[1])>180||!Number.isFinite(v.zoom)||v.zoom<2||v.zoom>18)fail();result.view={center:[...v.center],zoom:v.zoom};}
 return result;
}
export function exerciseSnapshot(settings,selection,language,view){
 const {exercise,feature,boundarySelection,boundaryAttribution,...common}=settings;const administrative=feature?boundarySelection||administrativeReference(feature):null;if(feature&&!administrative)throw Error(t('exerciseAreaReselect'));
 return validateExerciseSnapshot({v:1,language,view,selection,administrative,settings:common,exercise:{fit:exercise.fit,points:exercise.points.map(({id,...point})=>point)}});
}
export async function encodeExerciseSnapshot(snapshot){
 const bytes=new TextEncoder().encode(JSON.stringify(validateExerciseSnapshot(snapshot)));if(bytes.length>exerciseShareLimit)throw Error(t('exerciseLinkLarge'));
 const packed=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());let binary='';for(let i=0;i<packed.length;i+=8192)binary+=String.fromCharCode(...packed.subarray(i,i+8192));
 return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export async function decodeExerciseSnapshot(encoded){
 try{if(typeof encoded!=='string'||encoded.length>exerciseEncodedLimit||!/^[A-Za-z0-9_-]+$/.test(encoded))throw Error();const binary=atob(encoded.replaceAll('-','+').replaceAll('_','/')),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>exerciseShareLimit)throw Error();chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 return validateExerciseSnapshot(JSON.parse(await new Blob(chunks).text()));
 }catch{throw Error(t('exerciseLinkInvalid'));}
}
export async function createExerciseShare(snapshot,{base=EXERCISE_SHARE_BASE}={}){
 const data=await encodeExerciseSnapshot(snapshot),url=new URL(base);url.hash=`uebung=${data}`;
 const code=globalThis.qrcode(0,'M');try{code.addData(url.href,'Byte');code.make();}catch{throw Error(t('exerciseLinkLarge'));}
 return {url:url.href};
}
export async function readExerciseShare(locationURL){
 const url=new URL(locationURL),params=new URLSearchParams(url.hash.slice(1));return params.has('uebung')?decodeExerciseSnapshot(params.get('uebung')):null;
}
