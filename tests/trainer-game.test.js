import test from 'node:test';
import assert from 'node:assert/strict';
import {INVENTORY,SURFACES,resolvePicnicMove,defaultGameState,restoreGameState,equipSlot,closeNotepad,notebookView,slotStatus,nearSurface,placeMap,attachTool,takeTool,recallNavigation,turnPlayer,walkingStep,navigationInput,seedGameTask,assessGame,taskCourse} from '../modules/orientation/src/trainer-game-state.js';
import {mod,STATIONS,LANDMARKS,magneticBearing,effectiveDeclination,ROADS} from '../modules/orientation/src/trainer-world.js';

test('Inventory slots stay fixed and held equipment remains in its assigned slot',()=>{
  assert.deepEqual(INVENTORY.map(p=>p.id),['map','compass','romer','pencil','notepad','binoculars',null,null,'radio']);
  const s=defaultGameState();assert.equal(equipSlot(s,1).ok,true);equipSlot(s,2);assert.equal(s.mapLocation,'hand');assert.equal(s.handTool,'compass');assert.equal(slotStatus(s,'map'),'hand');assert.equal(slotStatus(s,'compass'),'hand');assert.equal(INVENTORY[1].slot,2);
  const snapshot={...s.items};assert.equal(equipSlot(s,8).ok,false);assert.deepEqual(s.items,snapshot);
});
test('Only one right-hand tool is held; the left hand retains its map',()=>{
  const s=defaultGameState();equipSlot(s,1);equipSlot(s,2);s.compass.ring=72;equipSlot(s,3);assert.equal(s.handTool,'romer');assert.equal(s.items.compass,'stowed');assert.equal(s.mapLocation,'hand');equipSlot(s,2);assert.equal(s.compass.ring,72);equipSlot(s,2);assert.equal(s.handTool,null);assert.equal(s.mapLocation,'hand');
});
test('Tools follow a carried map and retain transforms and ring settings on the table',()=>{
  const s=defaultGameState();s.player={e:SURFACES[0].e,n:SURFACES[0].n-1.9};equipSlot(s,1);equipSlot(s,2);s.compass.ring=213;s.compass.x=.025;assert.equal(attachTool(s).ok,true);assert.equal(slotStatus(s,'compass'),'onHandMap');assert.equal(s.handTool,null);assert.equal(placeMap(s).ok,true);assert.equal(slotStatus(s,'compass'),'onTableMap');assert.equal(s.compass.ring,213);assert.equal(s.compass.x,.025);assert.equal(takeTool(s,'compass').ok,true);assert.equal(s.items.compass,'hand');assert.equal(s.compass.ring,213);
});
test('Placed equipment cannot be recalled from a distant table',()=>{
  const s=defaultGameState();s.player={e:SURFACES[0].e,n:SURFACES[0].n-1.9};equipSlot(s,1);equipSlot(s,2);attachTool(s);placeMap(s);s.player.n-=20;assert.equal(nearSurface(s),false);assert.equal(equipSlot(s,1).ok,false);assert.equal(equipSlot(s,2).ok,false);assert.equal(takeTool(s,'compass').ok,false);assert.equal(s.mapLocation,'surface');assert.equal(s.items.compass,'onMap');
});
test('Notepad uses slot five and never fills observations automatically',()=>{
  const s=defaultGameState();equipSlot(s,1);equipSlot(s,2);s.compass.ring=123;equipSlot(s,5);assert.equal(s.notepadLocation,'hand');assert.equal(s.mapLocation,'hand');assert.equal(s.handTool,'compass');assert.equal(s.items.compass,'hand');assert.equal(s.items.pencil,'stowed');assert.equal(s.notes,'');assert.equal(slotStatus(s,'notepad'),'hand');s.notes='Kirche: 123°\nTurm: 42°';equipSlot(s,1);assert.equal(s.notepadLocation,'stowed');assert.equal(s.notes,'Kirche: 123°\nTurm: 42°');assert.equal(s.compass.ring,123);
});
test('Walking is frame bounded and diagonal speed equals forward speed',()=>{
  const s=defaultGameState(),a=walkingStep(s,1,0,.05),b=walkingStep(s,1,1,.05),distance=p=>Math.hypot(p.e-s.player.e,p.n-s.player.n);assert.ok(Math.abs(distance(a)-distance(b))<1e-8);assert.ok(distance(a)>.15&&distance(a)<.17);assert.ok(distance(walkingStep(s,1,0,.05,true))>.39);assert.deepEqual(walkingStep(s,1,0,100),a);s.yaw=90;assert.ok(walkingStep(s,1,0,.05).e>s.player.e);s.north=90;assert.ok(walkingStep(s,1,0,.05).n>s.player.n);
});
test('Turning rotates only a hand-held map; a table map stays in world coordinates',()=>{
  const s=defaultGameState();equipSlot(s,1);s.paperAngle=10;turnPlayer(s,30,100);assert.equal(s.paperAngle,40);assert.equal(s.pitch,75);s.player={e:SURFACES[0].e,n:SURFACES[0].n-1.9};placeMap(s);turnPlayer(s,30,-200);assert.equal(s.paperAngle,40);assert.equal(s.pitch,-75);
});
test('Map course uses the task origin, sighting and resection use the current position',()=>{
  const s=defaultGameState(),origin={...s.player};seedGameTask(s,'course');const start=taskCourse(s);s.player.e+=300;assert.equal(taskCourse(s),start);assert.deepEqual(s.points[0],{id:'task-a',...origin,name:'A'});s.task='sight';const target=magneticBearing(s.player,LANDMARKS[s.target],0);s.compass.ring=target;s.yaw=target;assert.equal(assessGame(s).passed,true);s.task='cross';s.resultPoint={...s.player};assert.equal(assessGame(s).passed,true);s.player.n+=150;assert.equal(assessGame(s).passed,false);
});
test('A persisted session restores notes and inventory without duplicating held tools',()=>{
  const s=defaultGameState();equipSlot(s,1);equipSlot(s,2);s.notes='Peilung 012°';const restored=restoreGameState(JSON.parse(JSON.stringify(s)));assert.equal(restored.notes,s.notes);assert.equal(restored.mapLocation,'hand');assert.equal(restored.handTool,'compass');assert.equal(restored.items.compass,'hand');assert.equal(restored.started,false);assert.equal(restored.paused,true);
  const bad=restoreGameState({...s,player:{e:Infinity,n:-40},items:{compass:'hand',romer:'hand',pencil:'hand'},notes:'x'.repeat(13000)});assert.equal(Object.values(bad.items).filter(v=>v==='hand').length,1);assert.equal(bad.notes.length,12000);assert.ok(Number.isFinite(bad.player.e));
});
test('Old prototype sessions migrate drawings while resetting obsolete grips',()=>{
  const s=restoreGameState({version:1,station:1,points:[{id:'a',e:50,n:70,name:'A'}],compass:{x:.5,ring:50},view:'table'});assert.equal(s.version,2);assert.equal(s.points.length,1);assert.equal(s.mapLocation,'stowed');assert.deepEqual(s.player,defaultGameState().player);
});

test('Binoculars occupy slot six, replace the right tool and cannot attach to a map',()=>{const s=defaultGameState();equipSlot(s,1);equipSlot(s,2);equipSlot(s,6);assert.equal(s.handTool,'binoculars');assert.equal(s.items.compass,'stowed');assert.equal(s.mapLocation,'hand');assert.equal(attachTool(s).ok,false);const restored=restoreGameState(JSON.parse(JSON.stringify(s)));assert.equal(restored.handTool,'binoculars');equipSlot(s,6);assert.equal(s.items.binoculars,'stowed');});

test('Picnic areas are separated from every road centerline',()=>{for(const p of SURFACES)for(const road of ROADS)for(let i=1;i<road.length;i++){const [ax,ay]=road[i-1],[bx,by]=road[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((p.e-ax)*dx+(p.n-ay)*dy)/(dx*dx+dy*dy)));assert.ok(Math.hypot(p.e-ax-dx*t,p.n-ay-dy*t)>5,'Picnic area clears the track and its edges');}});

test('Map work permits walking and turns the body with its held map, leaving table maps fixed',()=>{const s=defaultGameState();equipSlot(s,1);s.mode='map';s.yaw=20;s.paperAngle=35;s.compass.ring=123;const input=navigationInput(s,new Set(['KeyW','KeyD']),.04);assert.equal(s.yaw,23);assert.equal(s.paperAngle,38);assert.equal(input.forward,1);assert.equal(input.right,0);assert.equal(input.turning,true);assert.equal(s.compass.ring,123);const next=walkingStep(s,input.forward,input.right,.04);assert.ok(Math.hypot(next.e-s.player.e,next.n-s.player.n)>0);s.mapLocation='surface';navigationInput(s,new Set(['KeyA']),.04);assert.equal(s.yaw,20);assert.equal(s.paperAngle,38);s.mode='explore';const normal=navigationInput(s,new Set(['KeyD']),.04);assert.equal(normal.right,1);assert.equal(s.yaw,20);});

test('Picnic collision blocks entry, slides along edges and permits retreat',()=>{
  const p=SURFACES[0],start={e:p.e,n:p.n-3};
  let position=start;
  for(let i=0;i<100;i++)position=resolvePicnicMove(position,{e:position.e,n:position.n+.08});
  assert.ok(position.n<p.n-1.3);
  const away=resolvePicnicMove(position,{e:position.e,n:position.n-.08});assert.ok(away.n<position.n);
  const slide=resolvePicnicMove(position,{e:position.e+.08,n:position.n+.08});assert.ok(slide.e>position.e);assert.equal(slide.n,position.n);
  const crossing=resolvePicnicMove(start,{e:p.e,n:p.n+3});assert.ok(crossing.n<p.n-1.3);
  for(const offset of [{e:0,n:0},{e:.8,n:.8},{e:-.8,n:-.8}]){
    const trapped={e:p.e+offset.e,n:p.n+offset.n},recovered=resolvePicnicMove(trapped,trapped);
    assert.ok(Math.abs(recovered.e-p.e)>=1.219999||Math.abs(recovered.n-p.n)>=1.304999);
    assert.deepEqual(resolvePicnicMove(recovered,recovered),recovered);
  }
});

test('Radio uses fixed slot nine and recalls table equipment without erasing map work',()=>{
  const s=defaultGameState();s.player={e:SURFACES[0].e,n:SURFACES[0].n-1.9};equipSlot(s,1);equipSlot(s,2);attachTool(s);equipSlot(s,3);attachTool(s);placeMap(s);s.points=[{id:'a',name:'A',e:6000,n:6100}];s.compass.ring=123;s.player={e:6000,n:6100};
  equipSlot(s,9);assert.equal(s.mode,'radio');assert.equal(s.handTool,'radio');assert.equal(INVENTORY[8].id,'radio');assert.equal(s.items.radio,'hand');
  recallNavigation(s);assert.equal(s.mapLocation,'stowed');assert.equal(s.items.compass,'stowed');assert.equal(s.items.romer,'stowed');assert.equal(s.items.radio,'hand');assert.equal(s.points[0].id,'a');assert.equal(s.compass.ring,123);
  equipSlot(s,9);assert.equal(s.mode,'explore');assert.equal(s.items.radio,'stowed');
});

test('Notebook overlays map editing and restores the previous view, selected slot and tools exactly',()=>{
 for(const table of [false,true]){const s=defaultGameState();s.started=true;s.paused=false;equipSlot(s,1);equipSlot(s,3);if(table){s.player={e:SURFACES[0].e,n:SURFACES[0].n-1};attachTool(s);placeMap(s);}s.mode='map';s.romer.angle=123;s.paperAngle=75;const before={mapLocation:s.mapLocation,items:{...s.items},handTool:s.handTool,slot:s.activeSlot};equipSlot(s,5);assert.equal(s.mode,'notes');assert.equal(notebookView(s),'map');assert.equal(s.paused,true);assert.deepEqual(s.items,before.items);closeNotepad(s);assert.equal(s.mode,'map');assert.equal(s.paused,false);assert.equal(s.notepadLocation,'stowed');assert.equal(s.activeSlot,before.slot);assert.equal(s.handTool,before.handTool);assert.equal(s.mapLocation,before.mapLocation);assert.equal(s.paperAngle,75);assert.equal(s.romer.angle,123);assert.deepEqual(s.items,before.items);}
});
