import test from 'node:test';
import assert from 'node:assert/strict';
import {INDUSTRY,INDUSTRIAL_BUILDINGS,INDUSTRIAL_FENCES,CAMPUS,FIRE_TRAINING,SERVICE_SITES,PARKED_VEHICLES,ROAD_FEATURES,BUILDINGS,sitePoint,hallBays,heightAt,distanceToPath} from '../modules/orientation/src/trainer-world.js';
import {defaultGameState,restoreGameState} from '../modules/orientation/src/trainer-game-state.js';
import {vehicleBlocked,driveVehicle} from '../modules/orientation/src/trainer-vehicle.js';
import {mapUseWarning} from '../modules/orientation/src/trainer-map-safety.js';
import {PRACTICE} from '../modules/orientation/src/trainer-campaign.js';
test('Industrial buildings sit on the shared graded site; the fence has one driveable north entrance',()=>{
 for(const p of INDUSTRIAL_BUILDINGS){assert.ok(Math.abs(p.e-INDUSTRY.e)+p.w/2<INDUSTRY.w/2);assert.ok(Math.abs(p.n-INDUSTRY.n)+p.d/2<INDUSTRY.d/2);assert.equal(heightAt(p.e,p.n),INDUSTRY.height);assert.equal(vehicleBlocked({e:p.e,n:p.n,heading:0}),true);}
 assert.equal(INDUSTRIAL_FENCES.length,5);const s=defaultGameState();Object.assign(s.vehicle,{e:INDUSTRY.gate.e,n:INDUSTRY.gate.n+12,heading:180,occupied:true});s.started=true;s.paused=false;
 assert.equal(vehicleBlocked(s.vehicle),false);assert.equal(vehicleBlocked({...s.vehicle,e:INDUSTRY.gate.e-12,n:INDUSTRY.gate.n}),true);
 for(let i=0;i<80;i++)driveVehicle(s,new Set(['KeyW']),.05);assert.ok(s.vehicle.n<INDUSTRY.gate.n-20,'Car crosses entrance instead of hitting an invisible fence');
 assert.ok(ROAD_FEATURES.some(r=>r.name==='An der Schnittstelle'&&distanceToPath(INDUSTRY.gate.e,INDUSTRY.gate.n,r.points).distance<1));
});
test('Hall fronts face the courtyard and each fleet vehicle aligns with its actual numbered bay',()=>{
 const centre={e:1600,n:2835};
 for(const site of SERVICE_SITES.filter(p=>['fire','thw','rescue','hospital'].includes(p.id))){const front=sitePoint(site,0,-site.d/2-1);assert.ok(Math.hypot(front.e-centre.e,front.n-centre.n)<Math.hypot(site.e-centre.e,site.n-centre.n));}
 for(const v of PARKED_VEHICLES.filter(p=>['fire','thw','rescue'].includes(p.site))){const site=SERVICE_SITES.find(p=>p.id===v.site),bay=hallBays(site)[v.bay];assert.deepEqual({e:v.e,n:v.n},sitePoint(site,bay.x,-site.d/2-10));assert.equal(v.angle,site.angle||0);}
 const halls=SERVICE_SITES.filter(p=>['fire','thw'].includes(p.id));assert.ok(halls[1].e-halls[0].e<120);
 assert.equal(heightAt(FIRE_TRAINING.e,FIRE_TRAINING.n),CAMPUS.height);
 // Existing final-mission signs and the clinic contact remain outside the moved buildings.
 for(const point of PRACTICE.find(p=>p.id==='p10').sites.filter(p=>p.id!=='Helipad'))assert.ok(!BUILDINGS.some(b=>Math.abs(b.e-point.e)<b.w/2&&Math.abs(b.n-point.n)<b.d/2));
});
test('Map advice distinguishes moving and reversing cars, flight/hover, and safely parked vehicles',()=>{
 const s=defaultGameState();assert.equal(mapUseWarning(s),null);s.vehicle.occupied=true;s.vehicle.speed=6;assert.equal(mapUseWarning(s),'fpMapDrivingWarning');s.vehicle.speed=-2;assert.equal(mapUseWarning(s),'fpMapDrivingWarning');s.vehicle.speed=0;assert.equal(mapUseWarning(s),null);
 s.vehicle.occupied=false;s.vehicle.speed=10;assert.equal(mapUseWarning(s),null);s.helicopter.occupied=true;s.helicopter.altitude+=20;assert.equal(mapUseWarning(s),'fpMapFlyingWarning');s.helicopter.altitude=heightAt(s.helicopter.e,s.helicopter.n);assert.equal(mapUseWarning(s),null);s.helicopter.verticalSpeed=1;assert.equal(mapUseWarning(s),'fpMapFlyingWarning');
});

test('Old saves inside newly positioned halls are freed without losing equipment, notes or campaign progress',()=>{
 const old=defaultGameState();old.worldLayout=3;old.notes='123 Grad';old.player={e:1650,n:2905};old.mapLocation='hand';old.campaign.trainingDone=2;
 const restored=restoreGameState(old);assert.notDeepEqual(restored.player,old.player);assert.equal(restored.notes,old.notes);assert.equal(restored.mapLocation,'hand');assert.equal(restored.campaign.trainingDone,2);assert.equal(restored.worldLayout,4);
 old.vehicle.occupied=true;old.vehicle.e=1650;old.vehicle.n=2905;const driving=restoreGameState(old);assert.equal(driving.vehicle.occupied,true);assert.equal(vehicleBlocked(driving.vehicle),false);
});
