import {supportRequest,supportReply} from './trainer-radio-text.js';
import {GRID_COMPACT} from './trainer-grid.js';
import {TRAINING,PRACTICE,INTRO,LESSONS,COORDINATE_HELP,currentMission,advanceCampaign,completeCampaign,assessCampaign,campaignHint,reportText,observeCampaign} from './trainer-campaign.js';
import {PLAYER_START,TRAINING_CENTER,mod} from './trainer-world.js';
import {TrainingSpeech,radioExchange,RADIO_NAMES} from './trainer-speech.js';
import {requestVehicle} from './trainer-vehicle.js';
import {requestHelicopter} from './trainer-helicopter.js';
import {recallNavigation} from './trainer-game-state.js';
import {t} from '../host.js';
const $=id=>document.getElementById(id),names={...RADIO_NAMES,instructor:'Ausbilderin',person:'Ansprechpartner'};
export class CampaignUI{
 constructor({state,scene,audio,persist,update,enterExplore,release,hasSave}){
  Object.assign(this,{state,scene,audio,persist,update,enterExplore,release});this.lastTranscript=[];
  this.speech=new TrainingSpeech({preferences:()=>state.speech,enabled:()=>state.soundEnabled,onLine:line=>this.line(line),onBusy:busy=>this.busy(busy),onVoices:()=>this.voices(),onStatus:text=>{$('fpSpeechStatus').textContent=text;},duck:active=>{audio.externalSpeech=active;}});
  $('fpContinue').disabled=true;$('fpContinue').hidden=!hasSave;$('fpContinue').onclick=()=>enterExplore();
  $('fpStart').onclick=()=>this.startCentre();
  $('fpNextAssignment').onclick=()=>this.radio('next');$('fpCampaignReport').onclick=()=>this.radio('report');$('fpCampaignHint').onclick=()=>this.radio('hint');$('fpRepeatStation').onclick=()=>this.radio('station');
  $('fpRequestVehicle').onclick=()=>this.radio('vehicle');$('fpRequestHelicopter').onclick=()=>this.radio('helicopter');$('fpRecallMaterial').onclick=()=>this.radio('material');
  $('fpSpeechNext').onclick=() =>this.speech.next();$('fpDialogNext').onclick=()=>this.speech.next();$('fpDialogClose').onclick=()=>this.closeDialog();
  for(const [id,action] of [['fpInstructorOrder','order'],['fpInstructorCheck','check'],['fpInstructorExplain','explain']])$(id).onclick=()=>this.instructorAction(action);
  $('fpDialogReplay').onclick=()=>this.replay();$('fpRadioReplay').onclick=()=>this.replay();
  $('fpSpeechEnabled').checked=state.speech.enabled;$('fpSpeechEnabled').onchange=()=>{state.speech.enabled=$('fpSpeechEnabled').checked;if(!state.speech.enabled)this.speech.next();persist();};
  for(const role of ['instructor','dispatch','self'])$('fpVoice-'+role).onchange=()=>{state.speech[role+'Voice']=$('fpVoice-'+role).value;persist();};
  $('fpCampaignFields').addEventListener('input',event=>{const field=event.target.dataset.field,m=currentMission(state);if(!m?.fields.some(f=>f.id===field))return;(state.campaign.entries[m.id]??={})[field]=event.target.value.slice(0,80);persist();});
  this.voices();this.refresh();
 }
 startCentre(){
  this.speech.cancel();const s=this.state;s.vehicle.occupied=false;s.vehicle.speed=0;s.helicopter.occupied=false;s.helicopter.speed=s.helicopter.verticalSpeed=0;
  s.player={...PLAYER_START};s.yaw=s.north;s.pitch=0;Object.assign(s.jump,{offset:0,velocity:0,grounded:true,wasPressed:false});
  if(!s.campaign.active&&s.campaign.trainingDone===0)advanceCampaign(s,'training');this.scene.keys.clear();this.enterExplore();this.refresh();
 }
 busy(value){
  this.inConversation=value;for(const button of document.querySelectorAll('[data-radio-action]'))button.disabled=value;
  $('fpSpeechNext').hidden=!value;$('fpDialogNext').hidden=!value;$('fpDialogReplay').disabled=value;$('fpRadioReplay').disabled=value||!this.lastTranscript.length;
  $('fpSpeechStatus').textContent=value?'Funkgespräch läuft …':'Funkkanal frei';
 }
 line(line){
  this.state.campaign.log.push({role:line.role,text:line.text});this.state.campaign.log=this.state.campaign.log.slice(-80);
  const row=document.createElement('p'),label=document.createElement('strong');label.textContent=(names[line.role]||line.role)+': ';row.append(label,document.createTextNode(line.text));$('fpTranscript').append(row);while($('fpTranscript').children.length>80)$('fpTranscript').firstChild.remove();$('fpTranscript').scrollTop=$('fpTranscript').scrollHeight;
  $('fpLiveSpeech').textContent=(names[line.role]||'')+': '+line.text;
  if(this.state.mode==='dialogue')$('fpDialogueText').textContent=line.text;this.persist();
 }
 voices(){
  for(const role of ['instructor','dispatch','self']){const select=$('fpVoice-'+role),voice=this.speech.chooseVoice(role);select.replaceChildren();const option=document.createElement('option');option.value=voice.name;option.textContent=voice.name+' · Piper';select.append(option);select.disabled=true;}
  $('fpVoiceStatus').textContent='Piper läuft lokal im Browser. Ausbilderin: Ramona · Leitstelle: Karlsson · Spieler: Thorsten. Beim ersten Sprechen wird die jeweilige Stimme geladen und für weitere Besuche zwischengespeichert.';
 }
 refresh(){
  const s=this.state,c=s.campaign,m=currentMission(s);$('fpAssignmentBrief').textContent=m?.brief||c.lastFeedback||'Sprechen Sie mit der Ausbilderin oder fordern Sie über Funk den nächsten Auftrag an.';
  $('fpCampaignTitle').textContent=m?.id.startsWith('p')?'Einsatzübungen':'Ausbildungskampagne';
  const list=$('fpAssignmentList');list.replaceChildren();
  for(const [items,done]of [[TRAINING,c.trainingDone],[PRACTICE,c.practiceDone]])for(const [index,item]of items.entries()){
   const li=document.createElement('li');li.textContent=(index<done?'✓ ':item.id===c.active?'▶ ':'○ ')+item.title;li.dataset.status=index<done?'done':item.id===c.active?'active':'locked';if(item.id===c.active)li.setAttribute('aria-current','step');list.append(li);
  }
  if(this.shownMission!==c.active){const active=list.querySelector('[aria-current]');if(active)list.scrollTop=Math.max(0,active.offsetTop-list.offsetTop-70);this.shownMission=c.active;}
  $('fpNextAssignment').textContent=c.trainingDone<6?'Nächste Ausbildungsstation anfordern':'Neuen Einsatzauftrag anfordern';
  $('fpRepeatStation').hidden=!m?.start;$('fpCampaignResult').textContent=c.lastFeedback;
  const evidence=m?.id==='t3'?['north-compass','north-landmark'].map((v,i)=>(c.evidence.includes(v)?'✓ ':'○ ')+(i?'Landmarkenverfahren':'Kompassverfahren')).join(' · '):m?.sites?.map(p=>(c.seen.includes(p.id)?'✓ ':'○ ')+p.label).join(' · ')||'';
  $('fpAssignmentEvidence').textContent=evidence;this.renderNotebook();this.persist();
 }
 renderNotebook(){
  const m=currentMission(this.state),box=$('fpCampaignFields');if(box.contains(document.activeElement))return;
  box.replaceChildren();$('fpCampaignNotesTitle').textContent=m?m.title:'Kein aktiver Auftrag';$('fpCampaignGridHelp').textContent=COORDINATE_HELP;
  if(!m)return;
  const unordered=m.fields.filter(f=>f.type==='coordinate').length>2;let coordinateIndex=0;
  if(unordered)$('fpCampaignGridHelp').textContent+=' Die Reihenfolge der Punkte ist frei. Rückmeldungen beziehen sich auf die Nummern Ihrer Einträge.';
  const fieldInput=f=>{const label=document.createElement('label');label.textContent=(unordered&&f.type==='coordinate'?(f.id.endsWith('-e')?'Ostwert':'Nordwert'):f.label)+(f.type==='bearing'?' · dreistellig, z. B. 045':'');const input=document.createElement('input');input.type='text';input.inputMode=f.type==='coordinate'?'numeric':'decimal';input.maxLength=f.type==='coordinate'?4:80;input.dataset.field=f.id;input.value=this.state.campaign.entries[m.id]?.[f.id]||'';input.placeholder=f.type==='coordinate'?'___':f.type==='bearing'?'000':'…';if(f.type==='coordinate')input.pattern='[0-9]{3,4}';label.append(input);return label;};
  for(const f of m.fields){
   if(f.type!=='coordinate'){box.append(fieldInput(f));continue;}
   if(f.id.endsWith('-n'))continue;
   const group=document.createElement('fieldset'),legend=document.createElement('legend'),prefix=document.createElement('strong'),row=document.createElement('div');legend.textContent=unordered?'Koordinate '+(++coordinateIndex):f.id.slice(0,-2);prefix.textContent=GRID_COMPACT;row.className='fp-coordinate-row';row.append(prefix,fieldInput(f),fieldInput(m.fields.find(n=>n.id===f.id.slice(0,-1)+'n')));group.append(legend,row);group.className='fp-coordinate-group';box.append(group);
  }
  if(!m.fields.length){const p=document.createElement('p');p.textContent='Diese Station wird anhand Ihrer Arbeit mit den Instrumenten geprüft. Die Ausbilderin hilft Ihnen bei Bedarf. Abschluss über Funk melden.';box.append(p);}
 }
 tick(){if(observeCampaign(this.state))this.refresh();}
 openRadio(){this.refresh();this.voices();}
 cancel(){this.speech.cancel();this.pending=null;}
 async radio(action){
  if(this.inConversation)return;const s=this.state,preview=structuredClone(s);let request,response,commit=()=>{};
  if(action==='vehicle'||action==='helicopter'){
   const vehicle=action==='vehicle',result=vehicle?requestVehicle(preview):requestHelicopter(preview);request=supportRequest(action);response=supportReply(action,result);
   if(result.ok)commit=()=>Object.assign(vehicle?s.vehicle:s.helicopter,vehicle?preview.vehicle:preview.helicopter);
  }else if(action==='material'){
   const result=recallNavigation(preview);request='Benötige mein Navigationsmaterial wieder am Mann.';response=result.ok?'Verstanden. Ihr Navigationsmaterial wird an Sie zurückgegeben.':'Verstanden. '+t(result.key);if(result.ok)commit=()=>recallNavigation(s);
  }else if(action==='next'){
   const result=advanceCampaign(preview);request=s.campaign.trainingDone<6?'Erbitte den nächsten Ausbildungsauftrag.':'Erbitte einen neuen Einsatzauftrag.';response=result.ok?'Verstanden. Ihr Auftrag lautet: '+result.message:result.message;
   if(result.ok)commit=()=>{advanceCampaign(s);s.mode='radio';s.paused=true;this.scene.keys.clear();this.scene.render(false);};
  }else if(action==='report'){
   request=reportText(s);const result=assessCampaign(s);response=result.message;commit=()=>completeCampaign(s);
  }else if(action==='hint'){
   request='Erbitte einen Hinweis zum aktuellen Auftrag.';response='Verstanden. '+campaignHint(preview);commit=()=>campaignHint(s);
  }else if(action==='station'){
   const m=currentMission(s);request='Erbitte erneutes Aufsuchen der aktuellen Ausbildungsstation.';const allowed=!!m?.start&&!s.vehicle.occupied&&!s.helicopter.occupied;
   response=allowed?'Verstanden. Sie werden mit Ihrer Ausbilderin zum Ausbildungsort versetzt.':'Ein Wechsel ist derzeit nicht möglich. Steigen Sie zuerst sicher aus dem Fahrzeug aus.';
   if(allowed)commit=()=>{s.player={...m.start};s.yaw=s.north;s.pitch=0;Object.assign(s.jump,{offset:0,velocity:0,grounded:true,wasPressed:false});this.scene.keys.clear();};
  }else return;
  const lines=radioExchange(request,response);this.lastTranscript=lines;this.pending=action;
  await this.speech.play(lines,()=>{commit();this.pending=null;this.refresh();this.update();});
 }
 speakPerson(person){
  if(this.inConversation)return;const s=this.state,m=currentMission(s);let text;
  this.dialogPerson=person;$('fpInstructorActions').hidden=person.role!=='instructor';
  if(person.role==='instructor')text=m?.id.startsWith('t')?LESSONS[Number(m.id.slice(1))-1]:s.campaign.trainingDone===0?INTRO:'Willkommen im Ausbildungszentrum für Bevölkerungsschutz von Kartenkunde.app. Aufträge und Hinweise erhalten Sie über das Funkgerät auf Platz neun. Ihren aktuellen Auftrag sehen Sie links. Mit fünf öffnen Sie Ihren Notizblock.';
  else text=person.site?.dialog||person.site?.reading||person.name;
  s.mode='dialogue';s.paused=true;s.vehicle.speed=0;this.release();this.update();$('fpDialogue').hidden=false;$('fpDialogueTitle').textContent=person.name||'Gespräch';$('fpDialogueText').textContent=text;
  this.lastTranscript=[{role:person.role,text}];this.speech.play(this.lastTranscript,()=>{if(s.campaign.active===m?.id&&!s.campaign.talked.includes(person.id))s.campaign.talked.push(person.id);this.refresh();});$('fpDialogClose').focus();
 }
 instructorAction(action){
  if(this.dialogPerson?.role!=='instructor')return;this.speech.cancel();const s=this.state,m=currentMission(s)||PRACTICE[s.campaign.practiceDone-1]||TRAINING[s.campaign.trainingDone-1];let text;
  if(action==='order')text=m?.brief||'Fordern Sie über das Funkgerät den nächsten Auftrag an.';
  else if(action==='check'){const review=structuredClone(s);if(!review.campaign.active&&m)review.campaign.active=m.id;const result=assessCampaign(review);text=result.ok?'Ihre Ergebnisse sind richtig. Sie können sie jetzt über das Funkgerät an die Leitstelle melden.'+(result.formatHint?' '+result.formatHint:''):result.message;s.campaign.lastFeedback=text;this.refresh();}
  else text=m?.id.startsWith('t')?LESSONS[Number(m.id.slice(1))-1]:m?[m.brief,...m.hints].join(' '):INTRO;
  this.lastTranscript=[{role:'instructor',text}];this.speech.play(this.lastTranscript,()=>this.refresh());
 }
 closeDialog(){this.cancel();$('fpDialogue').hidden=true;this.enterExplore();}
 replay(){if(!this.inConversation&&this.lastTranscript.length)this.speech.play(this.lastTranscript);}
}
