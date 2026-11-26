import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CAMPUS,PLAYER_START,VEHICLE_START,SERVICE_SITES,BUILDINGS,PARKED_VEHICLES,heightAt} from '../modules/orientation/src/trainer-world.js';
import {defaultGameState,restoreGameState,SURFACES} from '../modules/orientation/src/trainer-game-state.js';
import {landingClear,helicopterObstacle} from '../modules/orientation/src/trainer-helicopter.js';
import {vehicleBlocked,driveVehicle} from '../modules/orientation/src/trainer-vehicle.js';

test('Campus provides a clear default landing pad, command parking and a reachable table',()=>{
 const s=defaultGameState(),h=s.helicopter;
 assert.deepEqual(s.player,PLAYER_START);assert.deepEqual({e:h.e,n:h.n},{e:CAMPUS.helipad.e,n:CAMPUS.helipad.n});
 assert.equal(h.spawned,true);assert.equal(landingClear(h.e,h.n,s),true);assert.equal(helicopterObstacle(h.e,h.n,h.altitude),false);assert.equal(vehicleBlocked(s.vehicle),false);
 for(const p of SERVICE_SITES.filter(p=>p.id!=='police')){assert.ok(Math.abs(p.e-CAMPUS.e)<CAMPUS.w/2);assert.ok(Math.abs(p.n-CAMPUS.n)<CAMPUS.d/2);assert.equal(heightAt(p.e,p.n),CAMPUS.height);}
 assert.ok(SURFACES.some(t=>Math.hypot(t.e-s.player.e,t.n-s.player.n)<35));
 s.started=true;s.paused=false;s.vehicle.occupied=true;
 for(let i=0;i<100;i++)driveVehicle(s,new Set(['KeyW']),.05);
 assert.ok(s.vehicle.n<VEHICLE_START.n-30,'Command car can leave its parking place without colliding with the campus fleet');
 for(const p of PARKED_VEHICLES)assert.equal(vehicleBlocked({...s.vehicle,e:p.e,n:p.n}),true);
});
test('The first classroom visit migrates once, retaining notes and placed map equipment',()=>{
 const raw={...defaultGameState(),worldLayout:undefined,player:{e:1950,n:1650},vehicle:{e:1955,n:1648},helicopter:{spawned:false},notes:'Peilung 123°',mapLocation:'surface'};
 const restored=restoreGameState(raw);assert.deepEqual(restored.player,PLAYER_START);assert.equal(restored.vehicle.e,VEHICLE_START.e);assert.equal(restored.helicopter.e,CAMPUS.helipad.e);assert.equal(restored.notes,raw.notes);assert.equal(restored.mapLocation,'surface');
 raw.worldLayout=3;raw.player={e:2400,n:1500};assert.deepEqual(restoreGameState(raw).player,raw.player);
});
test('All four local Kenney packs retain licenses and the deployed model library checksum',()=>{
 const manifest=JSON.parse(readFileSync('assets/trainer/kenney/manifest.json','utf8'));
 assert.deepEqual(new Set(manifest.packs.map(p=>p.id)),new Set(['car-kit','city-kit-commercial','nature-kit','city-kit-suburban']));
 for(const pack of manifest.packs)assert.match(readFileSync(`assets/trainer/kenney/${pack.id}-LICENSE.txt`,'utf8'),/CC0|Creative Commons Zero/i);
 for(const file of manifest.files)assert.equal(createHash('sha256').update(readFileSync(file.path)).digest('hex'),file.sha256);
 const {models}=JSON.parse(readFileSync('assets/trainer/kenney/models.json','utf8'));assert.ok(Object.keys(models).length>=75);
 for(const pack of manifest.packs)assert.ok(Object.keys(models).some(key=>key.startsWith(pack.id+'/')));
});
