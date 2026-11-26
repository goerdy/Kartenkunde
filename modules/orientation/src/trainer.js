import {mapUseWarning} from './trainer-map-safety.js';
import {TrainerFeedback} from './trainer-feedback.js';
import {CampaignUI} from './trainer-campaign-ui.js';
import {nearTrainingBoard} from './trainer-classroom.js';
import {requestHelicopter,nearHelicopter,enterHelicopter,exitHelicopter} from './trainer-helicopter.js';
import {t,getLanguage} from '../host.js';
import {drawTownPlan,MAP_SIDE,COMPASS_LENGTH,ROMER_SIDE} from './trainer-art.js';
import {TrainerScene} from './trainer-scene.js';
import {INVENTORY,SURFACES,defaultGameState,restoreGameState,equipSlot,closeNotepad,slotStatus,nearestSurface,nearSurface,mapAvailable,placeMap,attachTool,takeTool,recallNavigation,seedGameTask,assessGame,taskCourse} from './trainer-game-state.js';
import {WORLD_SIZE,STATIONS,LANDMARKS,mod,toUnit,fromUnit,angleDifference,effectiveDeclination,magneticBearing} from './trainer-world.js';
import {TrainerAudio} from './trainer-audio.js';
import {nearVehicle,enterVehicle,exitVehicle,requestVehicle,resetTrip} from './trainer-vehicle.js';
const $=id=>document.getElementById(id),root=$('trainer'),canvas=$('fpCanvas'),STORAGE='kartenkunde-orientation-v2';
let stored;try{stored=JSON.parse(localStorage.getItem(STORAGE)||localStorage.getItem('kartenkunde-orientation-v1')||'null');}catch{}
export const state=restoreGameState(stored);
export let campaignUI;
const reportUI=new TrainerFeedback(state);
let feedback=null,solution=false,drag=null,connection=null,toastTimer,saveTimer,uiTime=0,pointerFailure=false,ignoreUnlock=false,lockPending=false;
const taskKeys={free:'trFree',orient:'trOrient',course:'trCourse',set:'trSet',sight:'trSightTask',cross:'trCross'};
const briefKeys={free:'trBriefFree',orient:'trBriefOrient',course:'trBriefCourse',set:'trBriefSet',sight:'trBriefSight',cross:'trBriefCross'};
const angle=value=>`${toUnit(value,state.unit).toLocaleString(getLanguage(),{maximumFractionDigits:state.unit==='mil'?0:1,useGrouping:false})}${state.unit==='mil'?' / 6400':'°'}`;
const nextId=()=>crypto.randomUUID();
export const audio=new TrainerAudio();
export const scene=new TrainerScene(canvas,state,{onFrame:()=>audio.update(state,scene.keys),onError:key=>{$('fpError').hidden=false;$('fpError').textContent=t(key);},onMove:()=>{persist();},onModeChange:()=>{drag=null;connection=null;update();if(state.mode==='explore')lock();toast('fpTooFar');}});
const icons={radio:'<path d="M8 8V2M5 8h18v18H5zM9 12h10v5H9zM9 21h1m4 0h1m4 0h1"/>',binoculars:'<path d="M5 8h6v14H3V12zM17 8h6l2 4v10h-8zM11 12h6M6 8V4h4v4M18 8V4h4v4"/><circle cx="7" cy="21" r="4"/><circle cx="21" cy="21" r="4"/>',map:'<path d="M3 5l7-2 8 3 7-3v20l-7 3-8-3-7 2zM10 3v20M18 6v20"/>',compass:'<circle cx="14" cy="14" r="11"/><path d="M18 7l-2 10-6 4 2-10z"/>',romer:'<path d="M3 3h22v22H3zM7 7h14v14H7zM8 25v-3m5 3v-3m5 3v-3m7-14h-3m3 5h-3m3 5h-3"/>',pencil:'<path d="M5 19L20 4l5 5L10 24l-7 2zM17 7l5 5M5 19l5 5"/>',notepad:'<path d="M5 4h19v22H5zM3 8h5M3 13h5M3 18h5M11 9h9M11 14h9M11 19h6"/>',empty:'<path d="M9 14h10M14 9v10"/>'};
for(const entry of INVENTORY){const button=document.createElement('button');button.className='fp-slot';button.dataset.slot=String(entry.slot);button.innerHTML=`<span class="fp-key">${entry.slot}</span><svg viewBox="0 0 28 28" aria-hidden="true">${icons[entry.icon]}</svg><span class="fp-name"></span><span class="fp-location"></span>`;button.onclick=()=>chooseSlot(entry.slot);$('fpInventory').append(button);}
function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{}},250);}
function toast(key,raw=false){$('fpToast').textContent=raw?key:t(key);$('fpToast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('fpToast').hidden=true,4200);}
function release(){scene.keys.clear();if(document.pointerLockElement){ignoreUnlock=true;document.exitPointerLock();}}
async function lock(){
 if(lockPending||document.pointerLockElement===canvas||!['explore','sight','read','binoculars'].includes(state.mode))return;
 lockPending=true;canvas.focus({preventScroll:true});try{if(canvas.requestPointerLock)await canvas.requestPointerLock();else pointerFailure=true;if(state.paused||!['explore','read','sight','binoculars'].includes(state.mode))release();}catch{pointerFailure=true;toast('fpClickToLook');}finally{lockPending=false;}
}
function clearFeedback(){feedback=null;solution=false;scene.solution=false;}
function options(select,entries,value){select.replaceChildren(...entries.map(([id,label])=>{const o=document.createElement('option');o.value=id;o.textContent=label;return o;}));select.value=String(value);}
function updateObjects(){options($('fpObject'),[['',t('trNoSelection')],...state.points.map(p=>[p.id,p.name||'●']),...state.lines.map((l,i)=>[l.id,t(l.kind==='ray'?'trRay':'trLine')+' '+(i+1)])],state.selected||'');const p=state.points.find(p=>p.id===state.selected),l=state.lines.find(l=>l.id===state.selected);$('fpPointName').value=p?.name||'';$('fpRename').disabled=!p;$('fpDelete').disabled=!p&&!l;$('fpExtend').disabled=l?.kind!=='ray';}
function feedbackText(){if(!feedback)return '';if(feedback.kind==='solution')return feedback.text;if(feedback.kind==='free')return t('trFreeCheck');if(feedback.kind==='missing')return t('trMissing');return t(feedback.passed?'trPassed':'trTryAgain')+' · '+(feedback.kind==='distance'?t('trDistanceError',{value:Math.round(feedback.error)}):t('trAngleError',{value:angle(feedback.error),tolerance:angle(3)}));}
function update(){
  root.dataset.mode=state.mode;$('fpWelcome').hidden=state.started;$('fpJournal').hidden=state.mode!=='journal';$('fpNotes').hidden=state.mode!=='notes';$('fpRadioPanel').hidden=state.mode!=='radio';$('fpMapTools').hidden=state.mode!=='map'&&!(state.mode==='notes'&&state.notesReturn?.mode==='map');$('fpMapTools').inert=state.mode==='notes';$('fpInspectTools').hidden=state.mode!=='inspect';
  $('fpBinocularView').hidden=state.mode!=='binoculars';updateBinocularScale();
  $('fpCrosshair').hidden=['map','journal','notes','read','inspect','sight','binoculars','radio'].includes(state.mode)||!state.started||state.vehicle.occupied||state.helicopter.occupied;
  $('fpControls').textContent=t(state.helicopter.occupied?'fpFlyingContext':state.vehicle.occupied?'fpDrivingContext':state.mapLocation==='hand'||state.handTool?'fpHeldKeys':'fpExploreKeys');
  for(const entry of INVENTORY){const node=root.querySelector(`[data-slot="${entry.slot}"]`),status=slotStatus(state,entry.id),held=status==='hand'||status==='onHandMap';node.dataset.held=String(held);node.dataset.active=String(state.activeSlot===entry.slot);node.dataset.empty=String(!entry.id);node.setAttribute('aria-pressed',String(held));const title=t(entry.id==='compass'?(state.instrument==='mirror'?'fpCompassMirrorShort':'fpCompassBaseShort'):entry.label);node.querySelector('.fp-name').textContent=title;node.querySelector('.fp-location').textContent=status==='hand'?t('fpHand'):status==='onHandMap'?t('fpOnMap'):status==='surface'||status==='onTableMap'?t('fpOnTable'):'';node.setAttribute('aria-label',`${entry.slot}: ${title} · ${t(held?'fpHand':status==='surface'||status==='onTableMap'?'fpOnTable':'fpStowed')}`);}
  $('fpMission').textContent=t(taskKeys[state.task]);$('fpBrief').textContent=t(briefKeys[state.task])+(state.task==='set'?' '+angle(state.exerciseValue):'');
  for(const [id,val]of Object.entries({fpTask:state.task,fpTarget:state.target,fpCompassType:state.instrument,fpUnit:state.unit,fpQuality:state.quality,fpSensitivity:state.sensitivity,fpNorth:state.north,fpDeclination:state.declination,fpGiven:Math.round(toUnit(state.exerciseValue,state.unit))}))$(id).value=String(val);
  $('fpGiven').max=state.unit==='mil'?6399:359;$('fpGiven').disabled=state.task!=='set';$('fpTarget').disabled=!['course','sight','free'].includes(state.task);$('fpAdvanced').checked=state.advanced;$('fpDeclination').disabled=!state.advanced;$('fpShowHelpers').checked=state.helpers;$('fpShowHelpers').closest('label').hidden=!!state.campaign.active;$('fpSound').checked=state.soundEnabled;
  $('fpFeedback').hidden=!feedback;$('fpFeedback').dataset.pass=String(feedback?.passed===true);$('fpFeedback').textContent=feedbackText();
  $('fpAttach').disabled=!['compass','romer'].includes(state.handTool);$('fpTakeTool').disabled=state.items.compass!=='onMap'&&state.items.romer!=='onMap';$('fpTakeMap').disabled=state.mapLocation!=='surface';
  for(const button of root.querySelectorAll('[data-map-action]')){button.setAttribute('aria-pressed',String(button.dataset.mapAction===state.mapAction));button.disabled=button.dataset.mapAction!=='move'&&state.handTool!=='pencil';}
  $('fpBearingNote').textContent=state.notes?t('fpNotepad')+' · 5':'';
  $('fpHelpers').hidden=!state.helpers;$('fpHelpers').textContent=`${t('trRingValue')}: ${angle(state.compass.ring)}\n${t('trSightValue')}: ${angle(mod(state.yaw+state.handAngle-state.north-effectiveDeclination(state)))}\nE ${state.player.e.toFixed(0)} · N ${state.player.n.toFixed(0)}`;
  scene.solution=solution;persist();
}
function localize(){options($('fpTask'),Object.entries(taskKeys).map(([id,key])=>[id,t(key)]),state.task);options($('fpTarget'),LANDMARKS.map((p,i)=>[i,p.name]),state.target);$('fpGuide').replaceChildren(...['fpGuideEquipment','fpGuideInteraction','fpGuideWalking','fpGuideVehicle','fpGuideHelicopter','fpGuideRadio','trGuideCompass','trGuideCross','trGuideNorth'].map(key=>{const p=document.createElement('p');p.textContent=t(key);return p;}));scene.invalidate();updateObjects();update();fullscreenChanged();}
export function enterExplore(capture=true){if(canvas.dataset.ready!=='true')return;if(state.soundEnabled)audio.unlock();scene.startLoop();state.mode='explore';state.paused=false;state.started=true;drag=null;connection=null;update();if(capture!==false)lock();else{canvas.focus({preventScroll:true});toast('fpClickToLook');}}
export function openInspect(){if(!['compass','romer'].includes(state.handTool)){toast('fpNeedInstrument');return false;}state.mode='inspect';state.paused=false;release();update();return true;}
function openJournal(){if(!state.started)return;campaignUI?.cancel();$('fpDialogue').hidden=true;drawTownPlan($('fpTownPlan'));state.vehicle.speed=0;state.mode='journal';state.paused=true;drag=null;release();update();$('fpJournalClose').focus();}
function closeJournal(){enterExplore();}
function warnMapUse(){const key=mapUseWarning(state);if(key)toast(key);}
export function chooseSlot(slot){
  if(!state.started)return;if(slot===9&&state.mode!=='radio')reportUI.capture();if(slot===5&&state.mode==='notes'){closeNotes();return;}if(['radio','dialogue'].includes(state.mode)&&slot!==9){campaignUI?.cancel();$('fpDialogue').hidden=true;}const result=equipSlot(state,slot);if(!result.ok)toast(result.key);
  if(state.mode==='radio'){campaignUI?.openRadio();state.paused=true;state.vehicle.speed=0;release();update();$('fpRequestVehicle').focus();}
  else if(state.mode==='notes'){campaignUI?.renderNotebook();state.paused=true;release();$('fpNotesText').value=state.notes;update();$('fpNotesText').focus();}
  else{state.paused=false;if(state.mode==='map'&&!mapAvailable(state))state.mode='explore';update();if(state.mode==='explore')lock();}
  if(result.ok&&slot===1&&state.mapLocation==='hand')warnMapUse();
}
function closeRadio(){campaignUI?.cancel();equipSlot(state,9);enterExplore();}
$('fpRequestHelicopter').onclick=()=>{const result=requestHelicopter(state);toast(result.key);update();};
$('fpRadioClose').onclick=closeRadio;$('fpRequestVehicle').onclick=()=>{const result=requestVehicle(state);toast(result.key);update();};$('fpRecallMaterial').onclick=()=>{const result=recallNavigation(state);toast(result.key);update();};
function switchCompass(){state.instrument=state.instrument==='base'?'mirror':'base';update();toast(t(state.instrument==='mirror'?'trMirror':'trBase'),true);}
export function openMap(){
  if(!mapAvailable(state)){if(['compass','romer'].includes(state.handTool))return openInspect();toast('fpNeedMap');return false;}
  warnMapUse();state.mode='map';state.paused=false;drag=null;connection=null;release();updateObjects();update();return true;
}
function interact(){
  const person=scene.campaignScene?.interaction(state);if(person){campaignUI.speakPerson(person);return;}
  if(nearTrainingBoard(state)){state.trainingLesson=(state.trainingLesson+1)%3;scene.classroom.setLesson(state.trainingLesson);toast('fpBoardChanged');persist();return;}
  if(state.helicopter.occupied){const result=exitHelicopter(state);if(!result.ok)return toast(result.key);scene.keys.clear();Object.assign(state.jump,{offset:0,velocity:0,grounded:true,wasPressed:false});toast(result.key);enterExplore();return;}
  if(!state.vehicle.occupied&&nearHelicopter(state)){const result=enterHelicopter(state);if(!result.ok)return toast(result.key);scene.keys.clear();Object.assign(state.jump,{offset:0,velocity:0,grounded:true,wasPressed:false});toast(result.key);enterExplore();return;}
  if(state.vehicle.occupied){const result=exitVehicle(state);if(!result.ok)return toast(result.key);scene.keys.clear();toast('fpVehicleExited');enterExplore();return;}
  if(nearVehicle(state)){const result=enterVehicle(state);if(!result.ok)return toast(result.key);scene.keys.clear();Object.assign(state.jump,{offset:0,velocity:0,grounded:true,wasPressed:false});toast('fpVehicleEntered');enterExplore();return;}
  const nearest=nearestSurface(state);
  if(nearest.d<2.25){if(state.mapLocation==='hand'){const result=placeMap(state,nearest.i);if(!result.ok)return toast(result.key);toast('fpMapPlaced');openMap();}
    else if(state.mapLocation==='surface'&&state.surface===nearest.i)openMap();else toast('fpNeedMap');
  }else if(mapAvailable(state))openMap();else toast('fpTooFar');
}
function putTool(){const result=attachTool(state);if(!result.ok)toast(result.key);update();}
function pickTool(){const id=state.items.compass==='onMap'?'compass':state.items.romer==='onMap'?'romer':null;if(!id)return toast('fpNoToolOnMap');const result=takeTool(state,id);if(!result.ok)toast(result.key);update();}
function check(){feedback=assessGame(state);update();toast(feedbackText(),true);}
$('fpInspectBack').onclick=enterExplore;$('fpInspectSwitch').onclick=switchCompass;
$('fpStart').onclick=enterExplore;$('fpJournalOpen').onclick=openJournal;$('fpJournalClose').onclick=closeJournal;
$('fpLeaveMap').onclick=enterExplore;$('fpAttach').onclick=putTool;$('fpTakeTool').onclick=pickTool;$('fpTakeMap').onclick=()=>{chooseSlot(1);openMap();};$('fpSwitchCompass').onclick=switchCompass;
function closeNotes(){state.notes=$('fpNotesText').value.slice(0,12000);$('fpNotesText').blur();closeNotepad(state);if(state.mode==='explore')enterExplore();else{release();update();if(state.mode==='radio')$('fpRequestVehicle').focus();else canvas.focus({preventScroll:true});}}
$('fpNotesClose').onclick=closeNotes;$('fpNotesText').oninput=()=>{state.notes=$('fpNotesText').value.slice(0,12000);persist();};
$('fpTask').onchange=()=>{seedGameTask(state,$('fpTask').value);clearFeedback();updateObjects();update();};
$('fpTarget').onchange=()=>{state.target=Number($('fpTarget').value);seedGameTask(state);clearFeedback();updateObjects();update();};
$('fpGiven').onchange=()=>{const value=Number($('fpGiven').value);if(Number.isFinite(value))state.exerciseValue=fromUnit(value,state.unit);clearFeedback();update();};
$('fpCompassType').onchange=()=>{state.instrument=$('fpCompassType').value;update();};$('fpUnit').onchange=()=>{state.unit=$('fpUnit').value;update();};
$('fpSound').onchange=()=>{state.soundEnabled=$('fpSound').checked;if(!state.soundEnabled)campaignUI?.speech.next();if(state.soundEnabled)audio.unlock();update();};
$('fpQuality').onchange=()=>{state.quality=$('fpQuality').value;scene.applyQuality();update();};$('fpSensitivity').onchange=()=>{state.sensitivity=Number($('fpSensitivity').value);update();};
$('fpAdvanced').onchange=()=>{state.advanced=$('fpAdvanced').checked;clearFeedback();update();};$('fpDeclination').onchange=()=>{state.declination=Math.max(-30,Math.min(30,Number($('fpDeclination').value)||0));clearFeedback();update();};$('fpNorth').onchange=()=>{state.north=mod(Number($('fpNorth').value)||0);clearFeedback();update();};$('fpShowHelpers').onchange=()=>{state.helpers=$('fpShowHelpers').checked;update();};
$('fpCheck').onclick=check;$('fpCheckMap').onclick=check;
$('fpSolution').onclick=()=>{solution=true;feedback={kind:'solution',text:state.task==='cross'?t('trSolutionPosition'):state.task==='free'?t('trFreeCheck'):t('trSolutionAngle',{value:angle(state.task==='orient'?state.north:state.task==='set'?state.exerciseValue:state.task==='sight'?magneticBearing(state.player,LANDMARKS[state.target],effectiveDeclination(state)):taskCourse(state))})};update();};
$('fpResetTask').onclick=()=>{seedGameTask(state);clearFeedback();updateObjects();update();};
root.querySelectorAll('[data-map-action]').forEach(button=>button.onclick=()=>{state.mapAction=button.dataset.mapAction;connection=null;update();});
$('fpObject').onchange=()=>{state.selected=$('fpObject').value||null;updateObjects();update();};$('fpRename').onclick=()=>{const p=state.points.find(p=>p.id===state.selected);if(p)p.name=$('fpPointName').value.trim().slice(0,24);updateObjects();update();};
function removeSelected(){state.points=state.points.filter(p=>p.id!==state.selected);state.lines=state.lines.filter(l=>l.id!==state.selected&&l.a!==state.selected&&l.b!==state.selected);state.selected=null;connection=null;clearFeedback();updateObjects();update();}
$('fpDelete').onclick=removeSelected;$('fpExtend').onclick=()=>{const l=state.lines.find(l=>l.id===state.selected);if(l?.kind==='ray')l.length=Math.min(10000,l.length+1000);update();};
async function toggleFullscreen(){
  try{
    if(document.fullscreenElement||document.webkitFullscreenElement){if(document.exitFullscreen)await document.exitFullscreen();else document.webkitExitFullscreen();}
    else if(root.requestFullscreen)await root.requestFullscreen({navigationUI:'hide'});
    else if(root.webkitRequestFullscreen)root.webkitRequestFullscreen();
    else throw Error('Fullscreen API unavailable');
  }catch{toast('fpFullscreenUnavailable');}
  scene.resize();
}
$('fpFullscreen').onclick=toggleFullscreen;$('fpFullscreen').setAttribute('aria-keyshortcuts','V');
function fullscreenChanged(){const active=(document.fullscreenElement||document.webkitFullscreenElement)===root;$('fpFullscreen').textContent=t(active?'simExitFullscreen':'simFullscreen')+' · V';$('fpFullscreen').setAttribute('aria-pressed',String(active));scene.resize();}
document.addEventListener('fullscreenchange',fullscreenChanged);document.addEventListener('webkitfullscreenchange',fullscreenChanged);
function editable(target){return !!target.closest('input,textarea,select,[contenteditable=true]');}
document.addEventListener('keydown',event=>{
  if(!state.started)return;
  if(state.mode==='dialogue'){if(event.code==='Escape'){event.preventDefault();campaignUI.closeDialog();}else if(event.code==='KeyE'&&!event.repeat){event.preventDefault();campaignUI.speech.next();}return;}
  if(event.code==='Escape'){
    event.preventDefault();if(event.repeat)return;ignoreUnlock=true;if(state.mode==='journal')closeJournal();else if(state.mode==='radio')closeRadio();else if(state.mode==='notes')closeNotes();else if(state.mode==='map'||state.mode==='read'||state.mode==='sight'||state.mode==='inspect'||state.mode==='binoculars')enterExplore();else openJournal();return;
  }
  if(editable(event.target))return;
  if(event.code==='KeyV'&&!event.ctrlKey&&!event.altKey&&!event.metaKey){event.preventDefault();if(!event.repeat)toggleFullscreen();return;}
  if(event.code==='Tab'){event.preventDefault();state.mode==='journal'?closeJournal():openJournal();return;}
  if(state.mode==='radio'&&event.code==='Digit9'){event.preventDefault();if(!event.repeat)closeRadio();return;}
  if(state.mode==='notes'&&event.code==='Digit5'){event.preventDefault();if(!event.repeat)closeNotes();return;}
  if(state.paused)return;
  if(/^Digit[1-9]$/.test(event.code)){event.preventDefault();if(!event.repeat)chooseSlot(Number(event.code.slice(-1)));return;}
  if(state.mode==='explore'&&!document.pointerLockElement&&['KeyW','KeyA','KeyS','KeyD'].includes(event.code))lock();
  if(['KeyW','KeyA','KeyS','KeyD'].includes(event.code)||event.code==='Space'||state.helicopter.occupied&&['Space','ControlLeft','ControlRight'].includes(event.code))event.preventDefault();scene.keys.add(event.code);
  if(event.repeat)return;
  if((state.vehicle.occupied||state.helicopter.occupied)&&state.mode==='explore'&&event.code==='KeyR'){event.preventDefault();const receiver=state.helicopter.occupied?state.helicopter:state.vehicle;receiver.radioOn=!receiver.radioOn;if(state.soundEnabled)audio.unlock();audio.update(state,scene.keys);toast(receiver.radioOn?'fpMusicOn':'fpMusicOff');update();return;}
  if(state.vehicle.occupied&&event.code==='KeyT'){event.preventDefault();resetTrip(state);update();return;}
  if(state.vehicle.occupied&&['KeyB','KeyH'].includes(event.code)){event.preventDefault();const key=event.code==='KeyB'?'blueLight':'siren';state.vehicle[key]=!state.vehicle[key];if(state.soundEnabled)audio.unlock();update();return;}
  if(event.code==='KeyE'){event.preventDefault();interact();}
  if(event.code==='KeyF'){event.preventDefault();['map','inspect'].includes(state.mode)?enterExplore():openMap();}
  if(event.code==='KeyI'){event.preventDefault();state.mode==='inspect'?enterExplore():openInspect();}
  if(event.code==='KeyG'){event.preventDefault();putTool();}
  if(event.code==='KeyC'){event.preventDefault();switchCompass();}
  if(event.code==='Delete'&&state.mode==='map'){event.preventDefault();removeSelected();}
});
document.addEventListener('keyup',event=>scene.keys.delete(event.code));
window.addEventListener('blur',()=>{scene.keys.clear();if(state.started&&['explore','map','read','sight','binoculars'].includes(state.mode))openJournal();});
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===canvas){if(state.paused||!['explore','read','sight','binoculars'].includes(state.mode)){release();return;}ignoreUnlock=false;pointerFailure=false;}else{scene.keys.clear();const intentional=ignoreUnlock;ignoreUnlock=false;if(!intentional&&state.started&&['explore','read','sight','binoculars'].includes(state.mode)&&!pointerFailure)openJournal();}});
root.addEventListener('contextmenu',event=>event.preventDefault());
document.addEventListener('pointerdown',event=>{
  if(!state.started||state.paused||!(event.target===canvas||document.pointerLockElement===canvas))return;
  if(event.button===2&&state.mode==='explore'){
    if(state.handTool==='binoculars'&&!event.shiftKey)state.mode='binoculars';else if(state.handTool==='compass'&&!event.shiftKey)state.mode='sight';else if(state.mapLocation==='hand'){warnMapUse();state.mode='read';}update();event.preventDefault();
  }else if(event.button===0&&state.mode==='explore')lock();
},true);
window.addEventListener('pointerup',event=>{if(event.button===2&&['read','sight','binoculars'].includes(state.mode)){state.mode='explore';update();}});
window.addEventListener('pointermove',event=>{if(!state.started||state.paused||!['explore','map','read','sight','binoculars'].includes(state.mode))return;if(document.pointerLockElement===canvas||event.buttons===2&&['map','read','sight','binoculars'].includes(state.mode)||pointerFailure&&(event.buttons&1)){scene.look(event.movementX,event.movementY);clearFeedback();updateBinocularScale();}});
function updateBinocularScale(){
  if(state.mode!=='binoculars')return;
  const heading=mod(state.yaw-state.north-effectiveDeclination(state)),scale=$('fpBinocularScale'),width=300,pixelsPerDegree=5;
  const mil=state.unit==='mil',step=mil?20*360/6400:1,major=mil?5:10,ticks=[];
  const middle=Math.round(heading/step),radius=Math.ceil(width/2/pixelsPerDegree/step)+1;
  for(let i=middle-radius;i<=middle+radius;i++){
    const mark=document.createElement('span'),value=mod(i*step),isMajor=((i%major)+major)%major===0;
    mark.className='fp-optic-tick'+(isMajor?' fp-optic-major':i%5===0?' fp-optic-medium':'');mark.style.left=`${width/2+(i*step-heading)*pixelsPerDegree}px`;
    if(isMajor){const label=document.createElement('span');label.textContent=String(Math.round(toUnit(value,state.unit)));mark.append(label);}ticks.push(mark);
  }
  scale.replaceChildren(...ticks);scale.setAttribute('aria-label',t('fpBinocularBearing')+' '+angle(heading));
}
function inMap(hit){return hit&&hit.e>=0&&hit.e<=WORLD_SIZE&&hit.n>=0&&hit.n<=WORLD_SIZE;}
function nearestPoint(hit){return state.points.find(p=>Math.hypot(p.e-hit.e,p.n-hit.n)<45/scene.mapZoom);}
function mapAction(hit){
  if(!inMap(hit))return;const p=nearestPoint(hit);clearFeedback();
  if(state.handTool!=='pencil'){if(state.mapAction!=='move')toast('fpPencilNeeded');return;}
  if(state.mapAction==='point'){
    if(p)state.selected=p.id;else if(state.points.length<40){const point={id:nextId(),e:hit.e,n:hit.n,name:String.fromCharCode(65+state.points.length%26)};state.points.push(point);state.selected=point.id;}else toast('trLimit');
  }else if(state.mapAction==='connect'&&p){
    state.selected=p.id;if(connection&&connection!==p.id){if(state.lines.length<60)state.lines.push({id:nextId(),kind:'connect',a:connection,b:p.id});else toast('trLimit');connection=null;}else{connection=p.id;toast('trConnectionStart');}
  }else if(state.mapAction==='ray'){
    const id=state.items.compass==='onMap'?'compass':state.items.romer==='onMap'?'romer':null;if(!id)return toast('fpNoToolOnMap');
    if(state.lines.length<60){const line={id:nextId(),kind:'ray',origin:{e:hit.e,n:hit.n},angle:mod(state[id].angle),length:5000};state.lines.push(line);state.selected=line.id;}else toast('trLimit');
  }else if(state.mapAction==='position')state.resultPoint={e:hit.e,n:hit.n};
  else if(state.mapAction==='erase'){if(p){state.selected=p.id;removeSelected();}else{const line=state.lines.find(l=>{if(l.kind==='connect'){const a=state.points.find(p=>p.id===l.a),b=state.points.find(p=>p.id===l.b);return a&&b&&pointLineDistance(hit,a,b)<50;}const end={e:l.origin.e+Math.sin(l.angle*Math.PI/180)*l.length,n:l.origin.n+Math.cos(l.angle*Math.PI/180)*l.length};return pointLineDistance(hit,l.origin,end)<50;});if(line){state.selected=line.id;removeSelected();}}}
  updateObjects();update();
}
// Rotation grips are attached to the projected paper/instruments, inside the game.
const rotationGrips=new Map();
for(const id of ['paper','compass','romer']){
  const button=document.createElement('button');button.className='fp-rotation-grip';button.dataset.rotate=id;button.textContent='↻';button.hidden=true;root.append(button);rotationGrips.set(id,button);
  let rotation=null;
  button.addEventListener('pointerdown',event=>{
    if(event.button!==0||state.mode!=='map')return;event.preventDefault();event.stopPropagation();
    const hit=scene.mapHit(event.clientX,event.clientY);if(!hit)return;
    const center=id==='paper'?{x:0,y:0}:state[id];
    rotation={pointer:event.pointerId,x:center.x,y:center.y,start:Math.atan2(hit.x-center.x,hit.y-center.y)*180/Math.PI,initial:id==='paper'?state.paperAngle:state[id].angle};
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove',event=>{
    if(!rotation||rotation.pointer!==event.pointerId||state.mode!=='map')return;
    const hit=scene.mapHit(event.clientX,event.clientY);if(!hit)return;event.preventDefault();
    const angle=Math.atan2(hit.x-rotation.x,hit.y-rotation.y)*180/Math.PI;
    if(id==='paper')state.paperAngle=mod(state.paperAngle+angleDifference(angle,rotation.start));
    else state[id].angle=mod(rotation.initial+angleDifference(angle,rotation.start));
    clearFeedback();update();positionRotationGrips();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{rotation=null;if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);});
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.code))return;event.preventDefault();event.stopPropagation();const delta=(event.code==='ArrowRight'?1:-1)*(event.shiftKey?10:1);if(id==='paper')state.paperAngle=mod(state.paperAngle+delta);else state[id].angle=mod(state[id].angle+delta);clearFeedback();update();positionRotationGrips();});
}
function positionRotationGrips(){
  const rect=root.getBoundingClientRect();
  for(const [id,button] of rotationGrips){
    button.hidden=state.mode!=='map'||!mapAvailable(state)||(id!=='paper'&&state.items[id]!=='onMap');
    if(button.hidden)continue;
    const label=t(id==='paper'?'fpRotateMap':id==='compass'?'fpRotateCompass':'fpRotateRomer');button.title=label;button.setAttribute('aria-label',label);
    let x=MAP_SIDE*.57,y=MAP_SIDE*.57;
    if(id!=='paper'){const item=state[id],angle=item.angle*Math.PI/180,length=id==='compass'?COMPASS_LENGTH:ROMER_SIDE;x=item.x+Math.sin(angle)*(length*.5+.012);y=item.y+Math.cos(angle)*(length*.5+.012);}
    const p=scene.projectMap(WORLD_SIZE/2+x/MAP_SIDE*WORLD_SIZE,WORLD_SIZE/2+y/MAP_SIDE*WORLD_SIZE);button.style.left=`${p.x-rect.left}px`;button.style.top=`${p.y-rect.top}px`;
  }
}
setInterval(positionRotationGrips,100);
function pointLineDistance(p,a,b){const dx=b.e-a.e,dy=b.n-a.n,f=Math.max(0,Math.min(1,((p.e-a.e)*dx+(p.n-a.n)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.e-a.e-dx*f,p.n-a.n-dy*f);}
canvas.addEventListener('pointerdown',event=>{
  if(state.mode==='inspect'&&['compass','romer'].includes(state.handTool)&&event.button===0){const hit=scene.inspectHit(event.clientX,event.clientY);if(!hit)return;event.preventDefault();drag={id:event.pointerId,mode:scene.keys.has('KeyR')||state.handTool==='romer'?'handBody':'handRing',angle:hit.angle,initial:state.compass.ring,handAngle:state.handAngle};canvas.setPointerCapture(event.pointerId);return;}
  if(state.mode!=='map'||event.button!==0||drag)return;event.preventDefault();const hit=scene.mapHit(event.clientX,event.clientY);if(!hit)return;
  const point=nearestPoint(hit),instrument=scene.itemHit(hit,'compass')||scene.itemHit(hit,'romer');
  drag={id:event.pointerId,hit,startX:event.clientX,startY:event.clientY,moved:false,mode:'action',angle:Math.atan2(hit.x,hit.y)*180/Math.PI,paperAngle:state.paperAngle,rotate:scene.keys.has('KeyR')};
  if(state.mapAction==='move'){
    if(instrument){drag.item=instrument.item;drag.initial={...state[drag.item]};drag.mode=instrument.ring&&!drag.rotate?'ring':'item';drag.ringStart=instrument.angle;drag.angle=Math.atan2(hit.x-drag.initial.x,hit.y-drag.initial.y)*180/Math.PI;}
    else drag.mode='paper';
  }else if(state.mapAction==='point'&&point&&state.handTool==='pencil'){drag.mode='point';drag.point=point;state.selected=point.id;updateObjects();}
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  if(drag.mode==='handRing'||drag.mode==='handBody'){const h=scene.inspectHit(event.clientX,event.clientY);if(!h)return;if(drag.mode==='handRing')state.compass.ring=mod(drag.initial-angleDifference(h.angle,drag.angle));else state.handAngle=mod(state.handAngle+angleDifference(h.angle,drag.angle));clearFeedback();update();return;}
  const hit=scene.mapHit(event.clientX,event.clientY);if(!hit)return;event.preventDefault();if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>3)drag.moved=true;
  if(drag.mode==='ring'){const c=scene.itemHit(hit,'compass',true);if(c)state.compass.ring=mod(drag.initial.ring-angleDifference(c.angle,drag.ringStart));}
  else if(drag.mode==='item'){
    if(drag.rotate){const a=Math.atan2(hit.x-drag.initial.x,hit.y-drag.initial.y)*180/Math.PI;state[drag.item].angle=mod(drag.initial.angle+angleDifference(a,drag.angle));}
    else{state[drag.item].x=Math.max(-.1,Math.min(.1,drag.initial.x+hit.x-drag.hit.x));state[drag.item].y=Math.max(-.1,Math.min(.1,drag.initial.y+hit.y-drag.hit.y));}
  }else if(drag.mode==='paper'){
    if(drag.rotate){const a=Math.atan2(hit.x,hit.y)*180/Math.PI;state.paperAngle=mod(state.paperAngle+angleDifference(a,drag.angle));}
    else if(state.mapLocation==='surface'){const a=(state.paperAngle-state.north)*Math.PI/180,dx=hit.x-drag.hit.x,dy=hit.y-drag.hit.y;state.paperX=Math.max(-.3,Math.min(.3,state.paperX+dx*Math.cos(a)+dy*Math.sin(a)));state.paperY=Math.max(-.2,Math.min(.2,state.paperY-dx*Math.sin(a)+dy*Math.cos(a)));}
  }else if(drag.mode==='point'&&inMap(hit)){drag.point.e=hit.e;drag.point.n=hit.n;}
  clearFeedback();update();
});
canvas.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;const old=drag;drag=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(old.mode==='action'&&!old.moved)mapAction(old.hit);else update();});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{if(drag?.id===event.pointerId)drag=null;});
canvas.addEventListener('wheel',event=>{if(state.mode==='map'){event.preventDefault();scene.mapZoom=Math.max(.7,Math.min(2,scene.mapZoom-event.deltaY*.001));}},{passive:false});
document.addEventListener('languagechange',localize);
setInterval(()=>{if(!state.started||state.paused)return;campaignUI?.tick();updateBinocularScale();const p=nearestSurface(state);$('fpContext').textContent=state.helicopter.occupied?t('fpHeliExitContext'):nearHelicopter(state)?t('fpHeliContext'):state.vehicle.occupied?t('fpVehicleExitContext'):nearVehicle(state)?t('fpVehicleContext'):scene.campaignScene?.interaction(state)?'E · '+scene.campaignScene.interaction(state).name:nearTrainingBoard(state)?t('fpBoardContext'):p.d<2.25?t('fpTableContext'):state.handTool==='compass'?t('fpSightContext'):state.mapLocation==='hand'?t('fpMapContext'):document.pointerLockElement?'':t('fpClickToLook');if(state.helpers)update();},300);
campaignUI=new CampaignUI({state,scene,audio,persist,update,enterExplore,release,hasSave:!!stored&&Number.isFinite(stored.player?.e)&&Number.isFinite(stored.player?.n)});
localize();root.setAttribute('aria-busy','true');$('fpLoadProgress').value=9;$('fpLoadPercent').textContent='9 %';$('fpLoadStatus').textContent=t('fpLoadRadio');await audio.preload();
let worldProgress=0,speechProgress=0;
const loading=(label)=>{const value=Math.min(99,9+Math.floor(worldProgress*.76+speechProgress*15));$('fpLoadProgress').value=value;$('fpLoadPercent').textContent=value+' %';$('fpLoadStatus').textContent=label;};
const speechReady=campaignUI.speech.preload(value=>{speechProgress=value;loading('Sprachausgabe vorladen · '+Math.round(value*100)+' %');});
await scene.initialize(({value,key,done,total})=>{worldProgress=value;loading(t(key,{done,total}));});
if(speechProgress<1)loading('Sprachausgabe wird vorgeladen …');await speechReady;
$('fpLoadProgress').value=100;$('fpLoadPercent').textContent='100 %';$('fpLoadStatus').textContent=t('fpLoadReady');
canvas.dataset.ready='true';root.dataset.engine='babylon';root.setAttribute('aria-busy','false');$('fpLoading').dataset.ready='true';$('fpStart').disabled=false;campaignUI.speech.warmModels();
window.addEventListener('pagehide',()=>{campaignUI.speech.dispose();try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{}scene.keys.clear();audio.dispose();});
