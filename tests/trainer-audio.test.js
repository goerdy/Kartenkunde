import test from 'node:test';
import assert from 'node:assert/strict';
import {TrainerAudio} from '../modules/orientation/src/trainer-audio.js';
function radio(storage){
 const audio=new TrainerAudio(storage),sources=[],levels=[];
 audio.program={firstAnnouncementSeconds:.2,announcementIntervalSeconds:.3};
 audio.context={createBufferSource(){const source={connect(){},start(...args){this.startArgs=args;sources.push(this);},stop(){this.stopped=true;this.onended?.();}};return source;},createGain(){return {gain:{value:0,setTargetAtTime(value){levels.push(value);}},connect(){},disconnect(){}};}};
 audio.musicGain={gain:{setTargetAtTime(){}}};audio.master={};audio.announcements=[{src:'first.ogg',buffer:'first'},{src:'second.ogg',buffer:'second'}];
 let time=0;const tick=(active=true,attenuation=1)=>{time+=.1;audio.context.currentTime=time;audio.updateRadio(active,attenuation,time);};
 return {audio,sources,levels,tick};
}
test('Radio rotates announcements repeatedly with a music interval after each finished clip',()=>{
 const {audio,sources,tick}=radio();for(let i=0;i<4;i++)tick();assert.equal(sources.length,1);assert.equal(sources[0].buffer,'first');
 for(let i=0;i<10;i++)tick();assert.equal(sources.length,1,'Never overlap clips');sources[0].onended();
 tick();tick();assert.equal(sources.length,1);tick();tick();assert.equal(sources[1].buffer,'second');sources[1].onended();
 for(let i=0;i<5;i++)tick();assert.equal(sources[2].buffer,'first','Playlist loops after its last item');
});
test('Muted, paused, distant and higher-priority speech do not consume radio announcement time',()=>{
 const {audio,sources,tick}=radio();for(let i=0;i<20;i++)tick(false);for(let i=0;i<20;i++)tick(true,.001);
 audio.externalSpeech=true;for(let i=0;i<20;i++)tick();assert.equal(sources.length,0);
 audio.externalSpeech=false;for(let i=0;i<4;i++)tick();assert.equal(sources.length,1);
 audio.externalSpeech=true;tick();assert.equal(sources[0].stopped,true);assert.equal(audio.announcementIndex||0,0);
 audio.externalSpeech=false;tick();assert.equal(sources[1].buffer,'first','Interrupted entry remains queued');
});
test('Spoken radio follows vehicle distance and stopping an old clip cannot clear a newer one',()=>{
 const {audio,sources,levels,tick}=radio();for(let i=0;i<4;i++)tick(true,.4);assert.equal(audio.voiceGain.gain.value,.4);
 tick(true,.2);assert.equal(levels.at(-1),.2);tick(false);assert.equal(audio.voice,null);
 tick();const current=audio.voice;sources[0].onended();assert.equal(audio.voice,current);
});

function storage(){const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),data};}
test('Reload resumes the next announcement and the remaining music interval, even after playlist reordering',()=>{
 const saved=storage(),first=radio(saved);for(let i=0;i<4;i++)first.tick();first.sources[0].onended();first.tick();first.audio.saveRadioProgress();
 const record=JSON.parse(saved.getItem('kartenkunde-radio-florian-v1'));assert.equal(record.next,'second.ogg');assert.ok(record.wait>0&&record.wait<.3);
 const next=radio(saved);next.audio.announcements.reverse();next.audio.restoreRadioProgress();assert.equal(next.audio.announcementIndex,0);assert.equal(next.audio.nextAnnouncementAt,record.wait);
 for(let i=0;i<5;i++)next.tick();assert.equal(next.sources[0].buffer,'second','Resume by stable filename, not old playlist index');
});
test('Interrupted clips resume at their playback offset; completion advances the persisted entry',()=>{
 const saved=storage(),first=radio(saved);for(let i=0;i<12;i++)first.tick();first.tick(false);
 const record=JSON.parse(saved.getItem('kartenkunde-radio-florian-v1'));assert.equal(record.next,'first.ogg');assert.ok(record.offset>.5);assert.equal(record.wait,0);
 const next=radio(saved);next.audio.restoreRadioProgress();next.tick();assert.equal(next.sources[0].buffer,'first');assert.equal(next.sources[0].startArgs[1],record.offset);
 next.sources[0].onended();assert.equal(JSON.parse(saved.getItem('kartenkunde-radio-florian-v1')).next,'second.ogg');assert.equal(JSON.parse(saved.getItem('kartenkunde-radio-florian-v1')).offset,0);
});
test('Corrupt, missing or blocked storage and removed radio clips do not break playback',()=>{
 const cases=['not JSON','null',JSON.stringify({version:1,next:'first.ogg',offset:-1,wait:0}),JSON.stringify({version:1,next:'removed.ogg',offset:3,wait:0})];
 for(const value of cases){const saved=storage();saved.setItem('kartenkunde-radio-florian-v1',value);const {audio,sources,tick}=radio(saved);audio.restoreRadioProgress();for(let i=0;i<4;i++)tick();assert.equal(sources[0].buffer,'first');}
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('full');}},r=radio(broken);assert.doesNotThrow(()=>r.audio.restoreRadioProgress());for(let i=0;i<4;i++)r.tick();assert.equal(r.sources.length,1);assert.doesNotThrow(()=>r.sources[0].onended());
});

test('Vehicle radios are silent outside, keep separate switch states and resume after re-entry',()=>{
 const r=radio(),s={vehicle:{occupied:true,radioOn:true},helicopter:{occupied:false,radioOn:false}};let time=0;
 const tick=()=>{time+=.1;r.audio.context.currentTime=time;r.audio.updateCabinRadio(s,true,time);};
 for(let i=0;i<10;i++)tick();assert.equal(r.sources.length,1);s.vehicle.occupied=false;tick();assert.equal(r.audio.voice,null);assert.equal(s.vehicle.radioOn,true);
 for(let i=0;i<10;i++)tick();assert.equal(r.sources.length,1,'Parked car cannot be heard, even when its radio remains switched on');
 s.helicopter.occupied=true;tick();assert.equal(r.audio.voice,null,'Helicopter has its own off switch');s.helicopter.radioOn=true;tick();assert.equal(r.sources.length,2);assert.ok(r.sources[1].startArgs[1]>.5);
 s.helicopter.occupied=false;tick();assert.equal(r.audio.voice,null);assert.equal(s.helicopter.radioOn,true);
 s.vehicle.occupied=true;tick();assert.equal(r.sources.length,3);s.vehicle.radioOn=false;tick();assert.equal(r.audio.voice,null);assert.equal(s.helicopter.radioOn,true);
});
