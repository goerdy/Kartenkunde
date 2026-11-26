import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAINING_CENTER,PLAYER_START,SERVICE_SITES,BUILDINGS} from '../modules/orientation/src/trainer-world.js';
import {defaultGameState,restoreGameState,SURFACES} from '../modules/orientation/src/trainer-game-state.js';
import {nearTrainingBoard} from '../modules/orientation/src/trainer-classroom.js';

test('New starts belong to the classroom, with a nearby map workbench and shared map footprint',()=>{
 const s=defaultGameState(),r=TRAINING_CENTER;
 assert.ok(Math.abs(s.player.e-r.e)<r.w/2);assert.ok(Math.abs(s.player.n-r.n)<r.d/2);
 assert.ok(SERVICE_SITES.some(p=>p.id==='education'&&p.symbol==='A'));
 assert.ok(BUILDINGS.some(p=>p.id==='education'&&p.interior));
 assert.ok(SURFACES.some(p=>p.kind==='classroom'&&Math.hypot(s.player.e-p.e,s.player.n-p.n)<10));
});
test('Classroom migration keeps notes, lesson and active travel; subsequent journeys retain position',()=>{
 const raw={...defaultGameState(),worldLayout:2,player:{e:1515,n:2835},notes:'Nord 023°',trainingLesson:2};
 const migrated=restoreGameState(raw);assert.deepEqual(migrated.player,PLAYER_START);assert.equal(migrated.notes,raw.notes);assert.equal(migrated.trainingLesson,2);
 const next=restoreGameState({...migrated,player:{e:2450,n:1150}});assert.deepEqual(next.player,{e:2450,n:1150});
 raw.vehicle={...raw.vehicle,occupied:true};assert.deepEqual(restoreGameState(raw).player,{e:raw.vehicle.e,n:raw.vehicle.n});
 raw.vehicle.occupied=false;raw.helicopter={...raw.helicopter,occupied:true,altitude:800};assert.equal(restoreGameState(raw).helicopter.altitude,800);assert.deepEqual(restoreGameState(raw).player,{e:raw.helicopter.e,n:raw.helicopter.n});
 assert.equal(restoreGameState({...migrated,trainingLesson:Infinity}).trainingLesson,0);
});
test('Smartboard interaction requires a close, forward-facing player on foot',()=>{
 const s=defaultGameState();s.started=true;s.paused=false;s.player={e:TRAINING_CENTER.board.e,n:TRAINING_CENTER.board.n-2};s.yaw=s.north=70;
 assert.equal(nearTrainingBoard(s),true);s.yaw=250;assert.equal(nearTrainingBoard(s),false);s.yaw=70;s.player.n-=5;assert.equal(nearTrainingBoard(s),false);s.player.n+=5;s.vehicle.occupied=true;assert.equal(nearTrainingBoard(s),false);s.vehicle.occupied=false;s.mode='notes';assert.equal(nearTrainingBoard(s),false);
});
