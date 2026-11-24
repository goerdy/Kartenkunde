import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultGameState,restoreGameState,INVENTORY} from '../src/trainer-game-state.js';
import {heightAt,BUILDINGS,nearbyTrees} from '../src/trainer-world.js';
import {requestHelicopter,enterHelicopter,exitHelicopter,flyHelicopter,helicopterAGL,helicopterObstacle,landingClear} from '../src/trainer-helicopter.js';
const keys=(...codes)=>new Set(codes);
function ready(){const s=defaultGameState();s.started=true;s.paused=false;assert.equal(requestHelicopter(s).ok,true);s.player={e:s.helicopter.e+3.2,n:s.helicopter.n};assert.equal(enterHelicopter(s).ok,true);return s;}
const steps=(s,input,count)=>{for(let i=0;i<count;i++)flyHelicopter(s,keys(...input),.05);};
test('Slot nine is fixed; radio summons one helicopter only onto a clear landing site',()=>{
 const s=defaultGameState();assert.equal(INVENTORY[7].id,null);assert.equal(INVENTORY[8].id,'radio');assert.equal(s.helicopter.spawned,false);
 assert.equal(requestHelicopter(s).ok,true);assert.ok(landingClear(s.helicopter.e,s.helicopter.n,s));const original=s.helicopter;
 assert.equal(requestHelicopter(s).ok,true);assert.equal(s.helicopter,original);assert.equal(helicopterAGL(s.helicopter),0);
});
test('Rotor spin-up precedes climb; hover, descent, landing and ground exit work',()=>{
 const s=ready(),h=s.helicopter;steps(s,['Space'],10);assert.equal(helicopterAGL(h),0);steps(s,['Space'],100);assert.ok(helicopterAGL(h)>15);
 assert.equal(exitHelicopter(s).ok,false);steps(s,[],50);const y=h.altitude;steps(s,[],20);assert.equal(h.altitude,y);
 steps(s,['ControlLeft'],200);steps(s,[],30);assert.ok(helicopterAGL(h)<.01);assert.equal(exitHelicopter(s).ok,true);assert.equal(h.occupied,false);
});
test('Boost flight reaches 300 km/h, mouse look is separate and map follows heading changes',()=>{
 const s=ready(),h=s.helicopter;h.rotor=1;h.heading=180;s.yaw=180;h.altitude=1000;
 steps(s,['KeyW','ShiftLeft'],240);assert.ok(Math.abs(h.speed*3.6-300)<.01);assert.ok(h.n<1600);
 s.mapLocation='hand';s.paperAngle=25;const yaw=s.yaw,angle=s.paperAngle;steps(s,['KeyD'],2);assert.ok(s.yaw>yaw);assert.ok(s.paperAngle>angle);
});
test('Menus suspend flight without losing altitude, and restored flight never resumes velocity',()=>{
 const s=ready(),h=s.helicopter;h.rotor=1;h.altitude=800;h.speed=80;h.verticalSpeed=8;s.paused=true;const before={e:h.e,n:h.n,altitude:h.altitude};steps(s,['KeyW','Space'],10);assert.deepEqual({e:h.e,n:h.n,altitude:h.altitude},before);assert.equal(h.speed,0);assert.equal(h.verticalSpeed,0);
 const restored=restoreGameState(JSON.parse(JSON.stringify(s)));assert.equal(restored.helicopter.occupied,true);assert.equal(restored.helicopter.altitude,800);assert.equal(restored.helicopter.speed,0);assert.deepEqual(restored.player,{e:h.e,n:h.n});
 s.vehicle.occupied=true;assert.equal(restoreGameState(JSON.parse(JSON.stringify(s))).helicopter.occupied,false);
});
test('Flight avoids buildings, canopy and world boundary, while allowing overflight above obstacles',()=>{
 const b=BUILDINGS.find(p=>p.name==='Krankenhaus Sankt Florian'),y=heightAt(b.e,b.n);assert.equal(helicopterObstacle(b.e,b.n,y+3),true);assert.equal(helicopterObstacle(b.e,b.n,y+100),false);assert.equal(helicopterObstacle(5,100,1000),true);
 const trees=nearbyTrees(2050,1720,50),t=trees[0];assert.ok(t);assert.equal(helicopterObstacle(t.e,t.n,heightAt(t.e,t.n)+10),true);assert.equal(helicopterObstacle(t.e,t.n,heightAt(t.e,t.n)+100),false);
});
test('Water landing is refused and time steps are bounded',()=>{
 const s=ready(),h=s.helicopter;h.e=4300;h.n=3425;h.altitude=heightAt(h.e,h.n)+15;h.rotor=1;steps(s,['ControlLeft'],120);assert.ok(helicopterAGL(h)>=2);assert.equal(exitHelicopter(s).ok,false);
 const a=ready(),b=JSON.parse(JSON.stringify(a));a.helicopter.rotor=b.helicopter.rotor=1;a.helicopter.altitude=b.helicopter.altitude=500;flyHelicopter(a,keys('Space'),.05);flyHelicopter(b,keys('Space'),5);assert.equal(a.helicopter.altitude,b.helicopter.altitude);
});
