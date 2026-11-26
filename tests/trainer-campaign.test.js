import {gridDigits,coordinateText,coordinateCell,spokenCoordinates} from '../modules/orientation/src/trainer-grid.js';
import {speechPlan} from '../modules/orientation/src/trainer-speech-plan.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultGameState,restoreGameState} from '../modules/orientation/src/trainer-game-state.js';
import {TRAINING,PRACTICE,MISSIONS,defaultCampaign,restoreCampaign,currentMission,advanceCampaign,observeCampaign,assessCampaign,completeCampaign,campaignHint,reportText} from '../modules/orientation/src/trainer-campaign.js';
import {magneticBearing,effectiveDeclination,LANDMARKS,deepWater,BUILDINGS,visibleFrom,nearbyTrees} from '../modules/orientation/src/trainer-world.js';
const fresh=()=>{const s=defaultGameState();s.started=true;s.paused=false;return s;};
function answers(s){const m=currentMission(s),c=s.campaign;c.talked=['instructor',...(m.sites||[]).filter(p=>['person','gauge','mast'].includes(p.kind)).map(p=>p.id)];c.evidence=['romer','compass','north-compass','north-landmark','sight-church','sight-tower'];
 for(const site of m.sites||[]){s.player={e:site.e,n:site.n};observeCampaign(s);}
 c.entries[m.id]={};for(const f of m.fields){let n=f.expected;
  if(f.type==='coordinate'){const p=m.sites.find(p=>p.id===f.id.slice(0,-2));n=gridDigits(p[f.id.slice(-1)]);}
  if(f.type==='bearing')n=m.id==='t6'?magneticBearing(m.start,LANDMARKS[f.id.startsWith('church')?0:1],effectiveDeclination(s)):magneticBearing(m.sites[0],m.sites[1],effectiveDeclination(s));
  c.entries[m.id][f.id]=String(n);
 }
}
test('All sixteen distinct missions complete in order; active missions and premature practice cannot be skipped',()=>{
 const s=fresh();assert.equal(advanceCampaign(s,'practice').ok,false);const completed=[];
 for(const mission of MISSIONS){const start=advanceCampaign(s);assert.equal(start.ok,true,mission.id);assert.equal(s.campaign.active,mission.id);assert.equal(advanceCampaign(s).ok,false);answers(s);assert.equal(assessCampaign(s).ok,true,mission.id);assert.equal(completeCampaign(s).ok,true,mission.id);completed.push(mission.id);assert.equal(completeCampaign(s).ok,false);}
 assert.equal(new Set(completed).size,16);assert.equal(s.campaign.trainingDone,6);assert.equal(s.campaign.practiceDone,10);assert.equal(advanceCampaign(s).ok,false);
});
test('Missing visits, interviews, measurements and incorrect notebook fields are rejected',()=>{
 const s=fresh();advanceCampaign(s);assert.equal(assessCampaign(s).ok,true);answers(s);completeCampaign(s);advanceCampaign(s);answers(s);s.campaign.entries.t2.scale='5000';assert.equal(assessCampaign(s).ok,false);s.campaign.entries.t2.scale='';assert.equal(assessCampaign(s).ok,false);answers(s);completeCampaign(s);
 advanceCampaign(s);s.campaign.talked=['instructor'];assert.equal(assessCampaign(s).ok,false);answers(s);completeCampaign(s);advanceCampaign(s);answers(s);s.campaign.evidence=[];assert.equal(assessCampaign(s).ok,false);answers(s);s.campaign.entries.t4['P2-e']='01499';assert.equal(assessCampaign(s).ok,false);
 s.campaign={...defaultCampaign(),trainingDone:6};advanceCampaign(s);answers(s);s.campaign.seen.pop();assert.equal(assessCampaign(s).ok,false);answers(s);s.campaign.entries.p1['Schaden2-n']='08001';assert.equal(assessCampaign(s).ok,false);
 s.campaign={...defaultCampaign(),trainingDone:6,practiceDone:2};advanceCampaign(s);answers(s);s.campaign.talked=[];assert.equal(assessCampaign(s).ok,false);
});
test('North orientation observes actual map, needle and landmark alignment and use of instruments',()=>{
 const s=fresh();s.campaign={...defaultCampaign(),trainingDone:2};advanceCampaign(s);s.mapLocation='hand';s.paperAngle=0;s.north=0;s.items.compass='hand';s.handTool='compass';observeCampaign(s);assert.ok(s.campaign.evidence.includes('north-compass'));assert.ok(!s.campaign.evidence.includes('north-landmark'));
 s.yaw=magneticBearing(s.player,LANDMARKS[0],0)+20;s.paperAngle=4;observeCampaign(s);assert.ok(s.campaign.evidence.includes('north-landmark'));
 const before=JSON.stringify(s.campaign.evidence);s.paused=true;s.items.romer='hand';observeCampaign(s);assert.equal(JSON.stringify(s.campaign.evidence),before);
});
test('Campaign persistence bounds malformed input, preserves drafts and prevents invalid active chronology',()=>{
 const s=fresh();advanceCampaign(s);s.campaign.entries.t1={bad:'ignored'};s.notes='Freie Notizen';s.campaign.log=[{role:'self',text:'Kommen.'}];const r=restoreGameState(JSON.parse(JSON.stringify(s)));assert.equal(r.campaign.active,'t1');assert.equal(r.notes,s.notes);assert.deepEqual(r.campaign.log,s.campaign.log);
 for(const active of [3,{},[],null,'p5'])assert.equal(restoreCampaign({version:1,active,trainingDone:0,practiceDone:99}).active,null);
 const raw=restoreCampaign({version:1,trainingDone:6,practiceDone:2,active:'p3',entries:{p3:{injured:'2','Unfall-e':'05650'}},seen:['Unfall'],talked:['Unfall']});assert.equal(raw.active,'p3');assert.equal(raw.entries.p3.injured,'2');
});
test('Failed next-station requests never teleport occupied vehicles or aircraft; hints and reports do not reveal answers',()=>{
 const s=fresh(),position={...s.player};s.helicopter.occupied=true;assert.equal(advanceCampaign(s).ok,false);assert.deepEqual(s.player,position);s.helicopter.occupied=false;advanceCampaign(s);assert.match(campaignHint(s),/Ausbilderin/);assert.equal(s.campaign.hints.t1,1);assert.match(reportText(s),/Einführung/);
});
test('Training peil targets are visible and every scenario is on land or a usable bridge',()=>{
 assert.equal(TRAINING.length,6);assert.equal(PRACTICE.length,10);
 for(const m of MISSIONS)for(const p of [...(m.start?[m.start]:[]),...(m.sites||[])]){assert.equal(deepWater(p.e,p.n),false,m.id);assert.ok(p.e>0&&p.e<8000&&p.n>0&&p.n<8000);}
 const cross=TRAINING[5];assert.equal(visibleFrom(cross.start,LANDMARKS[0]),true);assert.equal(visibleFrom(cross.start,LANDMARKS[1]),true);
});

test('UTMREF preserves leading zeroes, truncates grid cells, speaks the complete designation and migrates old notebook values',()=>{
 assert.equal(coordinateText({e:12345,n:12345}),'32U KA 123 123');assert.equal(gridDigits(1450),'014');assert.deepEqual(coordinateCell('014'),{lower:1400,size:100,precision:3});assert.equal(coordinateCell('14'),null);
 assert.equal(spokenCoordinates('32U KA 123 123'),'zweiunddreißig Ulrich Kaufmann Anton eins zwei drei eins zwei drei');assert.equal(speechPlan('32U KA 123 123').filter(p=>p.text).map(p=>p.text).join(' '),'zweiunddreißig Ulrich Kaufmann Anton eins zwei drei eins zwei drei');
 const raw=restoreCampaign({version:1,trainingDone:3,active:'t4',entries:{t4:{'P2-e':'01450','P2-n':'02300'}}});assert.equal(raw.entries.t4['P2-e'],'014');assert.equal(raw.entries.t4['P2-n'],'023');
 const s=fresh();s.campaign={...defaultCampaign(),trainingDone:3};advanceCampaign(s);answers(s);s.campaign.talked=[];assert.equal(assessCampaign(s).ok,true);assert.match(reportText(s),/32U KA 014 023/);
 s.campaign.entries.t4['P2-e']='0145';assert.equal(assessCampaign(s).ok,false);s.campaign.entries.t4['P2-n']='0230';assert.equal(assessCampaign(s).ok,true);s.campaign.entries.t4['P2-e']='0200';assert.match(assessCampaign(s).message,/östlich/);
});
test('Correct reports do not require the instructor; checkpoint mission verifies the number on a physical sign',()=>{
 const s=fresh();s.campaign={...defaultCampaign(),trainingDone:1};advanceCampaign(s);answers(s);s.campaign.talked=[];assert.equal(completeCampaign(s).ok,true);
 s.campaign={...defaultCampaign(),trainingDone:4};advanceCampaign(s);const m=currentMission(s);assert.equal(m.fields.length,1);assert.equal(m.fields[0].type,'number');assert.match(m.sites[0].reading,/17/);answers(s);s.campaign.talked=s.campaign.talked.filter(v=>v!=='instructor');assert.equal(assessCampaign(s).ok,true);s.campaign.entries.t5.checkpoint='12';assert.match(assessCampaign(s).message,/zu niedrig/);
});

test('Cross bearings accept correct results from either compass or binoculars without an instrument-mode lock',()=>{
 for(const mode of ['card','mirror','binoculars']){const s=fresh();s.campaign={...defaultCampaign(),trainingDone:5};advanceCampaign(s);answers(s);s.campaign.evidence=[];s.campaign.talked=[];s.instrument=mode==='mirror'?'mirror':'base';s.mode=mode==='binoculars'?'binoculars':'explore';assert.equal(assessCampaign(s).ok,true,mode);s.campaign.entries.t6['church-bearing']='999';assert.equal(assessCampaign(s).ok,false,mode);}
});

test('Two-digit bearings are accepted with a polite three-digit reminder; leading zeroes remove the reminder',()=>{
 const s=fresh();s.campaign={...defaultCampaign(),trainingDone:6,practiceDone:8};advanceCampaign(s);answers(s);const bearing=Number(s.campaign.entries.p9.course);assert.ok(bearing<100);s.campaign.entries.p9.course=String(Math.round(bearing));const result=assessCampaign(s);assert.equal(result.ok,true);assert.match(result.formatHint,/immer dreistellig/);assert.equal(completeCampaign(s).ok,true);assert.equal(s.campaign.practiceDone,9);
 s.campaign.active='p9';s.campaign.entries.p9.course=String(Math.round(bearing)).padStart(3,'0');assert.equal(assessCampaign(s).ok,true);assert.equal(assessCampaign(s).formatHint,'');
 const plan=speechPlan('32U KA 123 123');assert.deepEqual(plan.find(p=>p.pause),{pause:250});assert.equal(plan[0].text,'zweiunddreißig Ulrich');assert.equal(plan[2].text,'Kaufmann Anton');
});


test('Multiple reported locations accept every order and return feedback for each entered pair',()=>{
 for(const id of ['p1','p8','p9','p10']){
  const s=fresh();s.campaign.active=id;answers(s);const m=currentMission(s),original={...s.campaign.entries[id]};
  const permutations=items=>items.length?items.flatMap(item=>permutations(items.filter(other=>other!==item)).map(rest=>[item,...rest])):[[]];
  for(const order of permutations(m.sites)){
   for(let i=0;i<m.sites.length;i++)for(const axis of ['e','n'])s.campaign.entries[id][m.sites[i].id+'-'+axis]=original[order[i].id+'-'+axis];
   assert.equal(assessCampaign(s).ok,true,id);
  }
 }
 const s=fresh();s.campaign.active='p1';answers(s);const entries=s.campaign.entries.p1;
 entries['Schaden2-e']='020';entries['Schaden3-e']='070';
 const result=assessCampaign(s);assert.equal(result.ok,false);
 assert.match(result.message,/Koordinate 1 ist korrekt/);assert.match(result.message,/Koordinate 2 ist zu ungenau/);assert.match(result.message,/Koordinate 3 liegt komplett daneben/);
 answers(s);
 const current=s.campaign.entries.p1;for(const axis of ['e','n'])current['Schaden2-'+axis]=current['Schaden1-'+axis];
 assert.equal(assessCampaign(s).ok,false,'Duplicate pairs cannot satisfy two different sites');
});
