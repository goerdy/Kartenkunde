import {defaultHelicopter,restoreHelicopter} from './trainer-helicopter.js';
// Input-independent simulation actions. Mouse, keyboard and later XR use these.
import {WORLD_SIZE,VEHICLE_START,deepWater,walkingHeightAt,treeBlocks,defaultState,restoreState,STATIONS,LANDMARKS,mod,inside,LAKE,heightAt,magneticBearing,effectiveDeclination,angleDifference} from './trainer-world.js';
export const INVENTORY=Object.freeze([
  {slot:1,id:'map',label:'fpMap',icon:'map'},
  {slot:2,id:'compass',label:'fpCompass',icon:'compass'},
  {slot:3,id:'romer',label:'fpRomer',icon:'romer'},
  {slot:4,id:'pencil',label:'fpPencil',icon:'pencil'},
  {slot:5,id:'notepad',label:'fpNotepad',icon:'notepad'},
  {slot:6,id:'binoculars',label:'fpBinoculars',icon:'binoculars'},
  {slot:7,id:null,label:'fpEmpty',icon:'empty'},
  {slot:8,id:null,label:'fpEmpty',icon:'empty'},
  {slot:9,id:'radio',label:'fpRadio',icon:'radio'}
]);
export const SURFACES=STATIONS.map((s,i)=>({id:`table-${i}`,e:s.e+9,n:s.n+8,angle:0,width:1.6,depth:.9,height:.79,material:'wood'}));
export function defaultGameState(){
  const base=defaultState(),station=STATIONS[0];
  return {...base,version:2,jump:{offset:0,velocity:0,grounded:true,wasPressed:false},helicopter:defaultHelicopter(),vehicle:{...VEHICLE_START,occupied:false,speed:0,steer:0,lookYaw:0,lookPitch:0,blueLight:false,siren:false,radioOn:false,tripMeters:0},player:{e:station.e,n:station.n},taskOrigin:{e:station.e,n:station.n},
    mapLocation:'stowed',notepadLocation:'stowed',notes:'',surface:0,mode:'explore',paused:true,started:false,activeSlot:1,handTool:null,
    items:{compass:'stowed',romer:'stowed',pencil:'stowed',binoculars:'stowed',radio:'stowed'},paperAngle:12,paperX:0,paperY:0,
    compass:{x:.025,y:0,angle:0,ring:0},romer:{x:-.025,y:0,angle:0},handAngle:0,
    quality:'high',sensitivity:1,soundEnabled:true,mapAction:'move',moveDistance:0,revision:0};
}
const bounded=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
export function restoreGameState(raw){
  const s=defaultGameState();if(!raw||![1,2].includes(raw.version))return s;
  const legacy=restoreState({...raw,version:1});
  for(const key of ['task','instrument','unit','north','declination','advanced','helpers','points','lines','resultPoint','observations','target','exerciseValue','station','yaw','pitch'])s[key]=legacy[key];
  if(raw.version===1){s.taskOrigin={...STATIONS[s.station]};s.player={e:STATIONS[s.station].e,n:STATIONS[s.station].n};return s;}
  s.notes=typeof raw.notes==='string'?raw.notes.slice(0,12000):'';s.notepadLocation=raw.notepadLocation==='hand'?'hand':'stowed';
  const location=['stowed','hand','surface'];if(location.includes(raw.mapLocation))s.mapLocation=raw.mapLocation;
  s.surface=Math.round(bounded(raw.surface,0,SURFACES.length-1,0));
  s.player={e:bounded(raw.player?.e,10,WORLD_SIZE-10,STATIONS[0].e),n:bounded(raw.player?.n,10,WORLD_SIZE-10,STATIONS[0].n)};
  if(s.mapLocation==='hand')s.notepadLocation='stowed';
  if(deepWater(s.player.e,s.player.n))s.player={e:STATIONS[0].e,n:STATIONS[0].n};
  s.taskOrigin={e:bounded(raw.taskOrigin?.e,0,WORLD_SIZE,s.player.e),n:bounded(raw.taskOrigin?.n,0,WORLD_SIZE,s.player.n)};
  s.paperAngle=mod(bounded(raw.paperAngle,-36000,36000,12));s.paperX=bounded(raw.paperX,-.3,.3,0);s.paperY=bounded(raw.paperY,-.2,.2,0);
  for(const key of ['compass','romer']){const r=raw[key];s[key]={...s[key],x:bounded(r?.x,-.1,.1,0),y:bounded(r?.y,-.1,.1,0),angle:mod(bounded(r?.angle,-36000,36000,0))};}
  s.compass.ring=mod(bounded(raw.compass?.ring,-36000,36000,0));
  let held=false;
  for(const id of ['compass','romer','pencil','binoculars','radio']){
    const loc=raw.items?.[id];if(['stowed','hand','onMap'].includes(loc)){s.items[id]=loc==='hand'&&held?'stowed':loc;if(s.items[id]==='hand'){held=true;s.handTool=id;}}
    if(s.items[id]==='onMap'&&(s.mapLocation==='stowed'||id==='binoculars'||id==='radio'))s.items[id]='stowed';
  }
  const v=raw.vehicle;
  if(v&&Number.isFinite(v.e)&&Number.isFinite(v.n)&&v.e>13&&v.e<WORLD_SIZE-13&&v.n>13&&v.n<WORLD_SIZE-13&&!deepWater(v.e,v.n)){
    s.vehicle={...s.vehicle,e:v.e,n:v.n,heading:mod(bounded(v.heading,-36000,36000,80)),occupied:v.occupied===true,tripMeters:bounded(v.tripMeters,0,1e9,0),radioOn:v.radioOn===true,blueLight:v.blueLight===true,siren:v.siren===true,lookYaw:bounded(v.lookYaw,-110,110,0),lookPitch:bounded(v.lookPitch,-55,55,0)};
    if(s.vehicle.occupied)s.player={e:v.e,n:v.n};
  }
  s.helicopter=restoreHelicopter(raw.helicopter,s.vehicle.occupied);if(s.helicopter.occupied){s.player={e:s.helicopter.e,n:s.helicopter.n};s.yaw=mod(s.helicopter.heading+s.north);s.pitch=0;}
  s.activeSlot=Math.round(bounded(raw.activeSlot,1,9,1));s.quality=['high','medium','low'].includes(raw.quality)?raw.quality:'high';s.sensitivity=bounded(raw.sensitivity,.4,2,1);
  s.soundEnabled=raw.soundEnabled!==false;
  if(s.handTool==='radio')s.activeSlot=9;
  s.handAngle=mod(bounded(raw.handAngle,-36000,36000,0));
  return s;
}
export function nearSurface(s,index=s.surface){const p=SURFACES[index];return Math.hypot(s.player.e-p.e,s.player.n-p.n)<2.25;}
export function nearestSurface(s){return SURFACES.map((p,i)=>({i,d:Math.hypot(s.player.e-p.e,s.player.n-p.n)})).sort((a,b)=>a.d-b.d)[0];}
export function mapAvailable(s){return s.mapLocation==='hand'||s.mapLocation==='surface'&&nearSurface(s);}
export function slotStatus(s,id){
  if(!id)return 'empty';if(id==='notepad')return s.notepadLocation;if(id==='map')return s.mapLocation;
  return s.items[id]==='onMap'?(s.mapLocation==='hand'?'onHandMap':'onTableMap'):s.items[id];
}
function stowHand(s){if(s.handTool)s.items[s.handTool]='stowed';s.handTool=null;}
export function equipSlot(s,slot){
  const entry=INVENTORY.find(p=>p.slot===slot);s.activeSlot=slot;if(!entry?.id)return {ok:false,key:'fpEmptySlot'};
  const id=entry.id;
  if(id==='radio'){
    if(s.mode==='radio'){stowHand(s);s.mode='explore';}
    else{stowHand(s);s.notepadLocation='stowed';s.items.radio='hand';s.handTool='radio';s.mode='radio';}
  }else if(id==='notepad'){
    if(s.notepadLocation==='hand'){s.notepadLocation='stowed';s.mode='explore';}
    else {if(s.mapLocation==='hand'){s.mapLocation='stowed';for(const key of ['compass','romer','pencil'])if(s.items[key]==='onMap')s.items[key]='stowed';}s.notepadLocation='hand';stowHand(s);s.items.pencil='hand';s.handTool='pencil';s.mode='notes';}
  }else if(id==='map'){
    s.notepadLocation='stowed';
    if(s.mapLocation==='surface'&&!nearSurface(s))return {ok:false,key:'fpTooFar'};
    if(s.mapLocation==='hand'){
      s.mapLocation='stowed';for(const key of ['compass','romer','pencil'])if(s.items[key]==='onMap')s.items[key]='stowed';
      s.mode='explore';
    }else{s.mapLocation='hand';s.paperAngle=mod(s.yaw);s.paperX=0;s.paperY=0;}
  }else{
    if(s.items[id]==='onMap'&&s.mapLocation==='surface'&&!nearSurface(s))return {ok:false,key:'fpTooFar'};
    if(s.items[id]==='hand'){s.items[id]='stowed';s.handTool=null;s.mode='explore';}
    else{stowHand(s);s.items[id]='hand';s.handTool=id;s.handAngle=0;}
  }
  if(s.mode==='binoculars'&&s.handTool!=='binoculars')s.mode='explore';
  if(s.mode==='inspect'&&!['compass','romer'].includes(s.handTool))s.mode='explore';
  if(s.handTool!=='pencil')s.mapAction='move';
  return {ok:true};
}
export function placeMap(s,index=nearestSurface(s).i){
  if(!nearSurface(s,index))return {ok:false,key:'fpTooFar'};
  if(s.mapLocation!=='hand')return {ok:false,key:'fpNeedMap'};
  s.mapLocation='surface';s.surface=index;s.paperX=0;s.paperY=0;return {ok:true};
}
export function attachTool(s){
  if(!mapAvailable(s))return {ok:false,key:'fpNeedMap'};
  if(!['compass','romer'].includes(s.handTool))return {ok:false,key:'fpNeedInstrument'};
  const id=s.handTool;s.items[id]='onMap';s.handTool=null;return {ok:true};
}
export function takeTool(s,id){
  if(!['compass','romer'].includes(id)||s.items[id]!=='onMap'||!mapAvailable(s))return {ok:false,key:'fpNeedInstrument'};
  stowHand(s);s.items[id]='hand';s.handTool=id;return {ok:true};
}
export function turnPlayer(s,deltaYaw,deltaPitch=0){
  s.yaw=mod(s.yaw+deltaYaw);s.pitch=bounded(s.pitch+deltaPitch,-75,75,s.pitch);
  if(s.mapLocation==='hand')s.paperAngle=mod(s.paperAngle+deltaYaw);
}
// Editing keeps a free cursor: A/D turn the body instead of strafing.
export function navigationInput(s,keys,seconds){
  const side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
  if(s.mode==='map'&&side)turnPlayer(s,side*75*Math.min(.05,Math.max(0,seconds)));
  return {forward,right:s.mode==='map'?0:side,sprint:keys.has('ShiftLeft')||keys.has('ShiftRight'),turning:s.mode==='map'&&side!==0};
}
// Furniture uses a continuous horizontal footprint, rather than separate thin
// planks which can wedge the walking ellipsoid when the ground slopes.
export function resolvePicnicMove(from,to){
  const start={...from},delta={e:to.e-from.e,n:to.n-from.n};
  const boxes=SURFACES.map(p=>({minE:p.e-(p.width+.22)/2-.31,maxE:p.e+(p.width+.22)/2+.31,minN:p.n-1.305,maxN:p.n+1.305}));
  for(const b of boxes){
    if(start.e>b.minE&&start.e<b.maxE&&start.n>b.minN&&start.n<b.maxN){
      const exits=[['e',b.minE],['e',b.maxE],['n',b.minN],['n',b.maxN]].sort((a,b)=>Math.abs(start[a[0]]-a[1])-Math.abs(start[b[0]]-b[1]));
      start[exits[0][0]]=exits[0][1];
    }
  }
  const result={...start};
  for(const axis of ['e','n']){
    result[axis]+=delta[axis];
    for(const b of boxes){
      const other=axis==='e'?'n':'e',lo=axis==='e'?b.minE:b.minN,hi=axis==='e'?b.maxE:b.maxN;
      const otherLo=other==='e'?b.minE:b.minN,otherHi=other==='e'?b.maxE:b.maxN;
      if(result[other]<=otherLo||result[other]>=otherHi)continue;
      if(start[axis]<=lo&&result[axis]>lo)result[axis]=lo;
      else if(start[axis]>=hi&&result[axis]<hi)result[axis]=hi;
    }
  }
  return result;
}
export function walkingStep(s,forward,right,seconds,sprint=false){
  const len=Math.hypot(forward,right);if(!len)return {...s.player};
  const angle=(s.yaw-s.north)*Math.PI/180,speed=sprint?8:3.2,distance=Math.min(.05,Math.max(0,seconds))*speed;
  const e=s.player.e+(Math.sin(angle)*forward+Math.cos(angle)*right)/len*distance;
  const n=s.player.n+(Math.cos(angle)*forward-Math.sin(angle)*right)/len*distance;
  if(e<10||e>WORLD_SIZE-10||n<10||n>WORLD_SIZE-10||deepWater(e,n))return {...s.player};
  if(Math.abs(walkingHeightAt(e,n)-walkingHeightAt(s.player.e,s.player.n))>distance*.8)return {...s.player};
  if(treeBlocks(s.player,{e,n}))return {...s.player};
  return {e,n};
}
export function taskCourse(s){return magneticBearing(s.taskOrigin,LANDMARKS[s.target],effectiveDeclination(s));}
export function assessGame(s){
  if(s.task==='free')return {kind:'free',passed:false};
  if(s.task==='cross'){
    if(!s.resultPoint)return {kind:'missing',passed:false};
    const error=Math.hypot(s.resultPoint.e-s.player.e,s.resultPoint.n-s.player.n);return {kind:'distance',error,passed:error<=100};
  }
  const desired=s.task==='orient'?s.north:s.task==='set'?s.exerciseValue:s.task==='sight'?magneticBearing(s.player,LANDMARKS[s.target],effectiveDeclination(s)):taskCourse(s);
  const actual=s.task==='orient'?s.paperAngle:s.task==='sight'?mod(s.yaw+s.handAngle-s.north-effectiveDeclination(s)):s.compass.ring;
  const error=s.task==='sight'?Math.max(Math.abs(angleDifference(actual,desired)),Math.abs(angleDifference(s.compass.ring,desired)),Math.abs(angleDifference(actual,s.compass.ring))):Math.abs(angleDifference(actual,desired));
  return {kind:'angle',error,passed:error<=3,desired};
}
export function seedGameTask(s,task=s.task){
  s.task=task;s.taskOrigin={...s.player};s.points=[];s.lines=[];s.selected=null;s.resultPoint=null;s.observations=[];
  if(['course','sight'].includes(task)){const b=LANDMARKS[s.target];s.points=[{id:'task-a',...s.taskOrigin,name:'A'},{id:'task-b',e:b.e,n:b.n,name:'B'}];}
}

export function recallNavigation(s){
  if(s.mapLocation==='surface'){
    for(const id of ['compass','romer','pencil'])if(s.items[id]==='onMap')s.items[id]='stowed';
    s.mapLocation='stowed';s.paperX=0;s.paperY=0;
  }
  return {ok:true,key:'fpMaterialRecalled'};
}
