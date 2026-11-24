import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_SIZE,MAP_SCALE,VEHICLE_START,STATIONS,BUILDINGS,SETTLEMENTS,PLACE_LABELS,TREES,WATERCOURSES,BRIDGES,deepWater,walkingHeightAt,treeBlocks,restoreState,mod,angleDifference} from '../src/trainer-world.js';
import {defaultGameState,restoreGameState,walkingStep} from '../src/trainer-game-state.js';
import {vehiclePoint,vehicleAttitude,vehicleCompass,vehicleBlocked,enterVehicle,exitVehicle,driveVehicle,walkerHitsVehicle,requestVehicle,resetTrip} from '../src/trainer-vehicle.js';
const keys=(...codes)=>new Set(codes);
const driving=()=>{const s=defaultGameState();s.player=vehiclePoint(s.vehicle,-1.8,0);s.started=true;s.paused=false;assert.equal(enterVehicle(s).ok,true);return s;};

test('Expanded shared geography includes two distinct settlements, dense woodland and named terrain',()=>{
  assert.equal(WORLD_SIZE,8000);assert.equal(MAP_SCALE,50000);assert.equal(SETTLEMENTS.length,2);assert.ok(BUILDINGS.filter(b=>b.name==='Sankt Florian').length>40);assert.ok(BUILDINGS.filter(b=>b.name==='Kupplingen').length>=12);assert.ok(TREES.length>40000);
  for(const name of ['Rüstholz','Führungssumpf','Feldherrenhügel','Tal der Tränen','Funkloch','Löschteich','Kupplungsbrücke'])assert.ok(PLACE_LABELS.some(p=>p.name===name),name);
  const restored=restoreState({version:1,points:[{id:'north',e:7200,n:7100}]});assert.equal(restored.points.length,1);
  assert.equal(WATERCOURSES[1].points.at(-1)[0],WATERCOURSES[0].points[2][0]);assert.equal(WATERCOURSES[1].points.at(-1)[1],WATERCOURSES[0].points[2][1]);
});
test('Deep river blocks walking outside the bridge, whose ramps and deck can be crossed',()=>{
  const bridge=BRIDGES[0];assert.equal(deepWater(bridge.e,bridge.n),false);assert.equal(deepWater(4300,1200),true);
  const s=defaultGameState();s.player={e:bridge.e-110,n:bridge.n};s.yaw=90;
  for(let i=0;i<2800;i++)s.player=walkingStep(s,1,0,.05);
  assert.ok(s.player.e>bridge.e+110,JSON.stringify(s.player));assert.equal(walkingHeightAt(bridge.e,bridge.n),bridge.height);
});
test('Trunks block approaching walkers while allowing escape from a saved overlap',()=>{
  const tree=TREES.find(t=>t.e>2700&&t.n>4000);assert.ok(tree);
  const center={e:tree.e,n:tree.n},near={e:tree.e+.1,n:tree.n};assert.equal(treeBlocks(near,center),true);assert.equal(treeBlocks(center,near),false);
});
test('Vehicle can be entered nearby, accelerates above walking speed, steers and brakes',()=>{
  const s=driving(),start={...s.player};for(let i=0;i<60;i++)driveVehicle(s,keys('KeyW'),.05);
  assert.ok(s.vehicle.speed>8);assert.ok(Math.hypot(s.player.e-start.e,s.player.n-start.n)>12);
  const heading=s.vehicle.heading;for(let i=0;i<12;i++)driveVehicle(s,keys('KeyW','KeyD'),.05);assert.ok(angleDifference(s.vehicle.heading,heading)>0);
  assert.equal(exitVehicle(s).key,'fpVehicleStop');for(let i=0;i<80;i++)driveVehicle(s,keys('Space'),.05);assert.equal(s.vehicle.speed,0);assert.equal(exitVehicle(s).ok,true);assert.equal(s.vehicle.occupied,false);
});
test('Menus stop driving; time steps are bounded and reverse is possible',()=>{
  const a=driving(),b=driving();driveVehicle(a,keys('KeyW'),100);driveVehicle(b,keys('KeyW'),.05);assert.deepEqual(a.vehicle,b.vehicle);
  a.paused=true;const before={...a.player};driveVehicle(a,keys('KeyW'),.05);assert.deepEqual(a.player,before);assert.equal(a.vehicle.speed,0);
  a.paused=false;driveVehicle(a,keys('KeyS'),.05);assert.ok(a.vehicle.speed<0);a.mode='map';driveVehicle(a,keys('KeyW'),.05);assert.equal(a.vehicle.speed,0);
});
test('Vehicle footprint crosses the bridge and rejects water, buildings and tree trunks',()=>{
  const bridge=BRIDGES[0];assert.equal(vehicleBlocked({...VEHICLE_START,e:bridge.e,n:bridge.n,heading:90}),false);
  assert.equal(vehicleBlocked({...VEHICLE_START,e:4300,n:1200,heading:0}),true);
  const house=BUILDINGS[0];assert.equal(vehicleBlocked({...VEHICLE_START,e:house.e,n:house.n}),true);
  const tree=TREES.find(t=>t.e>2700&&t.n>4000);assert.equal(vehicleBlocked({...VEHICLE_START,e:tree.e,n:tree.n}),true);
  assert.equal(walkerHitsVehicle(VEHICLE_START,vehiclePoint(VEHICLE_START,-2,0),vehiclePoint(VEHICLE_START,-1,0)),true);
});
test('Vehicle dashboard separates heading from world rotation and measures both terrain axes',()=>{
  const s=driving();s.vehicle.heading=80;s.north=123;assert.equal(vehicleCompass(s),80);s.advanced=true;s.declination=7;assert.equal(vehicleCompass(s),73);
  const east={...s.vehicle,e:6250,n:6000,heading:90},north={...east,heading:0},a=vehicleAttitude(east),b=vehicleAttitude(north);
  assert.ok(Math.abs(a.pitch)>0.1&&Math.abs(a.roll)>0.1);assert.ok(Math.abs(a.pitch-b.roll)<.03);assert.ok(Math.abs(a.roll+b.pitch)<.03);
  const bridge=BRIDGES[0],flat=vehicleAttitude({...s.vehicle,e:bridge.e,n:bridge.n,heading:90});assert.equal(flat.pitch,0);assert.equal(flat.roll,0);
});
test('Vehicle persistence preserves position and occupancy but never resumes speed',()=>{
  const s=driving();s.vehicle.speed=12;s.vehicle.lookYaw=45;const restored=restoreGameState(s);assert.equal(restored.vehicle.occupied,true);assert.equal(restored.vehicle.speed,0);assert.equal(restored.vehicle.lookYaw,45);assert.deepEqual(restored.player,s.player);
  const invalid=restoreGameState({...s,vehicle:{...s.vehicle,e:Infinity}});assert.equal(invalid.vehicle.occupied,false);assert.equal(invalid.vehicle.e,VEHICLE_START.e);
});

test('Radio relocates the one vehicle to a nearby safe spot and rejects an occupied request',()=>{
  const s=defaultGameState();s.vehicle.e=7000;s.vehicle.n=7000;const player={...s.player};assert.equal(requestVehicle(s).ok,true);assert.ok(Math.hypot(s.vehicle.e-s.player.e,s.vehicle.n-s.player.n)<=14.01);assert.equal(vehicleBlocked(s.vehicle),false);assert.deepEqual(s.player,player);
  s.vehicle.occupied=true;const before={...s.vehicle};assert.equal(requestVehicle(s).ok,false);assert.deepEqual(s.vehicle,before);
});

test('Trip meter counts only completed movement, includes reverse, persists and resets independently',()=>{
  const s=driving();let travelled=0;for(let i=0;i<40;i++)travelled+=driveVehicle(s,keys('KeyW'),.05);assert.ok(travelled>9);assert.ok(Math.abs(s.vehicle.tripMeters-travelled)<1e-8);
  const before=s.vehicle.tripMeters;for(let i=0;i<70;i++)travelled+=driveVehicle(s,keys('KeyS'),.05);assert.ok(s.vehicle.tripMeters>before);assert.ok(Math.abs(s.vehicle.tripMeters-travelled)<1e-8);
  s.paused=true;const paused=s.vehicle.tripMeters;driveVehicle(s,keys('KeyW'),.05);assert.equal(s.vehicle.tripMeters,paused);
  const restored=restoreGameState(s);assert.equal(restored.vehicle.tripMeters,s.vehicle.tripMeters);const position={e:s.vehicle.e,n:s.vehicle.n};resetTrip(s);assert.equal(s.vehicle.tripMeters,0);assert.deepEqual({e:s.vehicle.e,n:s.vehicle.n},position);
});

test('Town services have physical footprints and signs use names of actual streets',async()=>{
 const {SERVICE_SITES,STREET_SIGNS,ROAD_FEATURES,distanceToPath}=await import('../src/trainer-world.js');
 assert.deepEqual(SERVICE_SITES.map(p=>p.id),['fire','police','hospital','thw']);
 for(const site of SERVICE_SITES){assert.ok(BUILDINGS.some(b=>b.service&&b.e===site.e&&b.n===site.n));assert.equal(vehicleBlocked({...VEHICLE_START,e:site.e,n:site.n}),true);}
 for(const sign of STREET_SIGNS)assert.ok(ROAD_FEATURES.some(r=>r.name===sign.name&&distanceToPath(sign.e,sign.n,r.points).distance<8));
 for(const b of BUILDINGS.filter(b=>b.name==='Sankt Florian'))assert.ok(ROAD_FEATURES.some(r=>['street','highway'].includes(r.kind)&&distanceToPath(b.e,b.n,r.points).distance<31),'House has a nearby street frontage');
 const s=defaultGameState();s.vehicle.radioOn=true;assert.equal(restoreGameState(JSON.parse(JSON.stringify(s))).vehicle.radioOn,true);
});

test('Authored landscape has a real summit, a valley, a quarry and individually selectable wind turbines',async()=>{
 const {heightAt,LANDMARKS,QUARRY,FIELDS}=await import('../src/trainer-world.js');
 assert.ok(heightAt(6750,6500)>600);assert.ok(heightAt(6750,6500)-heightAt(4700,6600)>500);
 assert.ok(heightAt(3250,3250)-heightAt(4300,3400)>85);
 assert.ok(heightAt(QUARRY.e,QUARRY.n)<heightAt(QUARRY.e+350,QUARRY.n)-20);
 const turbines=LANDMARKS.filter(p=>p.kind==='turbine');assert.equal(turbines.length,3);assert.equal(new Set(turbines.map(p=>p.id)).size,3);
 assert.ok(TREES.length>120000);assert.ok(TREES.some(p=>p.species==='broadleaf'&&p.roadside));assert.ok(TREES.every(p=>heightAt(p.e,p.n)<420));assert.ok(FIELDS.length>=8);
 const raw=defaultGameState();raw.target=LANDMARKS.length-1;assert.equal(restoreGameState(raw).target,LANDMARKS.length-1);
});
