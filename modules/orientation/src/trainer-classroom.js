import {drawPatchFabric,loadPatchWall} from './trainer-patch-wall.js';
import {TRAINING_CENTER as ROOM,angleDifference} from './trainer-world.js';
import {createCanvas,drawMap,drawRomer,SIZE,PAD,INNER} from './trainer-art.js';
const B=globalThis.BABYLON;
export function nearTrainingBoard(state){
 return state.mode==='explore'&&!state.paused&&!state.vehicle.occupied&&!state.helicopter.occupied&&Math.abs(state.player.e-ROOM.board.e)<2.6&&state.player.n<ROOM.board.n&&ROOM.board.n-state.player.n<3&&Math.abs(angleDifference(state.yaw,state.north))<65;
}
export function makeClassroomDesk(host,p,index){
 const g=new B.TransformNode(p.id,host.scene);g.parent=host.land;g.position=host.local(p.e,p.n);const m=host.materials;
 const top=host.box('classroom-worktable',[p.width,.06,p.depth],[0,p.height-.03,0],m.wood,g,{collision:true});top.metadata={surface:index};
 for(const x of [-.66,.66])for(const z of [-.31,.31])host.box('classroom-table-leg',[.04,p.height-.06,.04],[x,(p.height-.06)/2,z],m.metal,g);
 const anchor=new B.TransformNode('table-map-anchor',host.scene);anchor.parent=g;anchor.position.y=p.height+.004;return anchor;
}
export class TrainingRoom{
 constructor(host){
  this.host=host;this.lesson=-1;const m=host.materials;
  this.root=new B.TransformNode('training-centre-interior',host.scene);this.root.parent=host.land;this.root.position=host.local(ROOM.e,ROOM.n);const g=this.root;
  const wall=host.mat('classroom-warm-plaster','#eee9da',{}),trim=host.mat('classroom-sage-trim','#3d6556'),floor=host.mat('classroom-floor','#b8b4a1'),oak=host.mat('classroom-desk-oak','#bea37a'),seat=host.mat('classroom-chair-fabric','#3e6175');
  wall.albedoTexture=host.procedural('classroom-painted-plaster','#eeeadd',(c,r)=>{for(let i=0;i<18000;i++){const v=231+Math.floor(r()*14);c.fillStyle=`rgb(${v},${v-2},${v-9})`;c.fillRect(r()*512,r()*512,1,1);}});wall.albedoTexture.uScale=3;wall.albedoTexture.vScale=3;
  const ceiling=host.mat('classroom-clean-ceiling','#f5f3eb');
  floor.albedoTexture=host.procedural('classroom-floor-tiles','#c4c2af',(c,r)=>{c.strokeStyle='#b0ae9c';c.lineWidth=2;for(let i=0;i<512;i+=128){c.strokeRect(i,0,128,512);c.strokeRect(0,i,512,128);}for(let i=0;i<1800;i++){c.fillStyle=r()>.5?'#ceccba':'#bcbba8';c.fillRect(r()*512,r()*512,1,1);}});floor.albedoTexture.uScale=5;floor.albedoTexture.vScale=4;
  const box=(name,size,pos,material=wall,collision=false)=>host.box(name,size,pos,material,g,{collision});
  // The entrance is genuinely open: two wall wings and a lintel, never a solid house collider.
  const wing=(ROOM.w-ROOM.doorWidth)/2;
  box('training-front-west',[wing,ROOM.h,.28],[-(ROOM.doorWidth+wing)/2,ROOM.h/2,-9]);
  box('training-front-east',[wing,ROOM.h,.28],[(ROOM.doorWidth+wing)/2,ROOM.h/2,-9]);
  box('training-door-lintel',[ROOM.doorWidth,ROOM.h-ROOM.doorHeight,.28],[0,(ROOM.h+ROOM.doorHeight)/2,-9]);
  // Explicit collision volumes also catch jumps and stop movement through windows.
  for(const name of ['training-front-west','training-front-east','training-door-lintel'])host.scene.getMeshByName(name).checkCollisions=true;
  box('training-back-wall',[22,ROOM.h,.28],[0,ROOM.h/2,9],wall,true);
  box('training-west-wall',[.28,ROOM.h,18],[-11,ROOM.h/2,0],wall,true);
  for(const z of [-8,0,8])box('training-east-pier',[.28,ROOM.h,z===0?4:2],[11,ROOM.h/2,z],wall,true);
  box('training-east-sill',[.28,1.1,18],[11,.55,0],wall,true);box('training-east-header',[.28,.8,18],[11,4.1,0],wall,true);
  const glass=host.mat('classroom-window-glass','#adc8d0',{roughness:.13});glass.alpha=.23;glass.backFaceCulling=false;
  for(const z of [-4.5,4.5]){box('training-east-window',[.055,2.6,5],[11,2.4,z],glass,true);for(const dz of [-2.5,0,2.5])box('training-window-frame',[.12,2.7,.055],[10.9,2.4,z+dz],trim);}
  box('training-flat-roof',[22.8,.24,18.8],[0,4.62,0],trim,true);
  box('training-white-ceiling',[21.7,.08,17.7],[0,4.43,0],ceiling,true);
  box('classroom-floor',[21.72,.06,17.72],[0,.055,0],floor);
  for(const x of [-10.8,10.8])box('classroom-skirting',[.05,.13,17.7],[x,.14,0],trim);
  for(const x of [-1.38,1.38])box('training-door-frame',[.12,2.95,.36],[x,1.47,-9.02],trim);
  host.signBoard('training-centre-sign','AUSBILDUNGSZENTRUM',10,.65,g,[0,3.9,-9.17],'#385e50');
  host.signBoard('training-room-sign','BEVÖLKERUNGSSCHUTZ · KARTENKUNDE.APP',6,.32,g,[0,3.25,-9.17],'#385e50');
  box('training-entrance-canopy',[5,.14,2.4],[0,3,-10.1],trim);
  // Wall map uses exactly the same authored topo sheet as the carried map.
  const mapArt=host.dynamicMaterial('classroom-wall-map',2048,2048);drawMap(mapArt.canvas,{...host.state,points:[],lines:[],resultPoint:null,selected:null,helpers:false});mapArt.texture.update();this.topo=mapArt;
  box('topo-wall-map-frame',[.10,3.45,3.45],[-10.78,2.25,3],trim);
  const map=B.MeshBuilder.CreatePlane('classroom-topographic-wall-map',{width:3.3,height:3.3,sideOrientation:B.Mesh.DOUBLESIDE},host.scene);map.parent=g;map.position.set(-10.70,2.25,3);map.rotation.y=-Math.PI/2;map.material=mapArt.mat;
  host.signBoard('wall-map-caption','SANKT FLORIAN · TOPOGRAFISCHE KARTE 1 : 50 000',3.3,.22,g,[-10.67,.48,3],'#385e50',-Math.PI/2);
  this.makeTeachingPoster('classroom-contours-poster',-10.7,2.2,-3.3,-Math.PI/2,'HÖHENLINIEN & GELÄNDE',c=>{
   c.strokeStyle='#957454';c.lineWidth=7;for(let i=0;i<6;i++){c.beginPath();c.ellipse(440,430,300-i*42,180-i*24,-.25,0,Math.PI*2);c.stroke();}c.fillStyle='#5c684f';c.font='29px sans-serif';c.fillText('Eng beieinander = steil',90,730);c.fillText('Weit auseinander = flach',90,790);c.fillText('Äquidistanz: 10 m',90,850);
  });
  this.makeTeachingPoster('classroom-compass-poster',6.4,2.45,8.77,0,'KARTE · KOMPASS · NORDEN',c=>{
   c.save();c.translate(450,490);for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.fillStyle=i===0?'#b74636':i%2?'#a6b2a3':'#426354';c.beginPath();c.moveTo(0,-230);c.lineTo(-24,0);c.lineTo(24,0);c.fill();c.restore();}c.restore();c.fillStyle='#38594b';c.font='bold 42px sans-serif';for(const [l,x,y]of [['N',435,220],['O',720,510],['S',435,800],['W',140,510]])c.fillText(l,x,y);c.font='28px sans-serif';c.fillText('Nordrichtung und Marschrichtung unterscheiden',55,920);
  });
  this.makeTeachingPoster('classroom-planzeiger-poster',10.76,2.4,0,Math.PI/2,'UTMREF & PLANZEIGER',c=>{
   // Enlarge the same topo map and physical instrument by exactly the same factor.
   const pixelsPerMetre=.18,zoom=pixelsPerMetre/(INNER/8000);
   const at=(e,n)=>[100+(e-1000)*pixelsPerMetre,940-n*pixelsPerMetre];
   c.save();c.beginPath();c.rect(50,170,890,730);c.clip();
   c.drawImage(mapArt.canvas,100-1000*pixelsPerMetre-PAD*zoom,940-(SIZE-PAD)*zoom,SIZE*zoom,SIZE*zoom);
   c.restore();c.strokeStyle='#7a9da4';c.lineWidth=2;c.strokeRect(50,170,890,730);
   // Keep the original lower-right zero on the lower northing grid line.
   // Slide the right aperture edge through P; read east at the western grid line.
   const [ox,oy]=at(4400,1000),side=.078*50000*pixelsPerMetre,zero=side*(1-.014/.078);
   const frame=createCanvas(1024,1024);drawRomer(frame);
   c.save();c.translate(ox,oy);c.drawImage(frame,-zero,-zero,side,side);c.restore();
   c.fillStyle='#315267';c.font='bold 25px sans-serif';c.textAlign='center';
   for(let km=2;km<=5;km++)c.fillText(String(km).padStart(2,'0'),at(km*1000,0)[0],198);
   c.textAlign='left';for(let km=1;km<=4;km++)c.fillText(String(km).padStart(2,'0'),60,at(0,km*1000)[1]+8);
   c.textAlign='right';c.fillText('N ↑',930,153);
   const [px,py]=at(4400,1800),west=at(4000,1000)[0];
   c.save();c.setLineDash([9,6]);c.strokeStyle='#a43128';c.lineWidth=3;c.beginPath();c.moveTo(west,oy);c.lineTo(ox,oy);c.lineTo(px,py);c.stroke();c.restore();
   c.strokeStyle='#a43128';c.lineWidth=3;c.beginPath();c.arc(ox,oy,9,0,Math.PI*2);c.stroke();
   c.fillStyle='#a43128';c.beginPath();c.arc(px,py,8,0,Math.PI*2);c.fill();c.textAlign='left';c.font='bold 29px sans-serif';c.fillText('P',px+15,py-12);
   const label=(text,x,y)=>{c.font='bold 24px sans-serif';c.lineWidth=5;c.strokeStyle='#f0edde';c.strokeText(text,x,y);c.fillStyle='#a43128';c.fillText(text,x,y);};
   label('400 m',west-18,oy-14);label('800 m',ox-110,py-12);
   c.fillStyle='#385e50';c.textAlign='left';c.font='bold 25px sans-serif';c.fillText('Untere Kante auf Nordlinie 01 · rechte Innenkante durch P',60,941);
   c.font='25px sans-serif';c.fillText('Ost: 04 km + 400 m → 044',60,983);c.fillText('Nord: 01 km + 800 m → 018',510,983);
   c.font='bold 35px sans-serif';c.fillText('P: 32U KA 044 018',60,1040);

  });
  // Smartboard: physical frame, pen tray and three in-world lesson screens.
  box('smartboard-frame',[4.8,2.8,.14],[0,2.7,8.72],m.dark);
  const display=host.dynamicMaterial('smartboard-screen',1920,1080);this.display=display;
  this.screen=B.MeshBuilder.CreatePlane('classroom-smartboard',{width:4.62,height:2.60},host.scene);this.screen.parent=g;this.screen.position.set(0,2.7,8.63);this.screen.material=display.mat;
  box('smartboard-pen-tray',[1.1,.05,.12],[0,1.25,8.61],m.metal);
  for(const x of [-.3,.3])box('smartboard-stylus',[.14,.014,.014],[x,1.28,8.58],trim);
  this.setLesson(host.state.trainingLesson||0);
  // Six paired desks leave a generous, uninterrupted route from the door to the board.
  for(const z of [-3.5,0,3.5])for(const x of [-4.2,4.2]){
   box('classroom-desk',[2.8,.065,1.0],[x,.78,z],oak,true);
   for(const dx of [-1.18,1.18])for(const dz of [-.36,.36])box('classroom-desk-leg',[.045,.73,.045],[x+dx,.365,z+dz],m.metal);
   for(const dx of [-.65,.65])this.chair(x+dx,z-1.05,seat,box);
   const paper=B.MeshBuilder.CreatePlane('desk-practice-map',{width:.60,height:.60,sideOrientation:B.Mesh.DOUBLESIDE},host.scene);paper.parent=g;paper.position.set(x-.65,.817,z);paper.rotation.x=Math.PI/2;paper.material=mapArt.mat;
   box('desk-notebook',[.24,.015,.32],[x+.65,.82,z],m.roadPaint);box('desk-pencil',[.20,.012,.012],[x+.62,.84,z],m.yellow);
  }
  host.signBoard('classroom-exit-sign','AUSGANG ↓',1.6,.30,g,[0,3.1,-8.80],'#356d4e',Math.PI);
  host.signBoard('map-workbench-sign','KARTENARBEIT · E',2,.25,g,[-7.5,1.7,-7.5],'#385e50',Math.PI);
  // Display cabinet, teaching equipment and a small welcome corner.
  box('training-material-shelf',[1.8,1.85,.55],[-8.8,.98,7.9],oak,true);
  for(let i=0;i<5;i++)box('training-ring-binder',[.17,.45,.32],[-9.4+i*.27,1.45,7.54],i%2?trim:seat);
  box('training-first-aid-case',[.45,.34,.18],[-8.5,2.1,7.9],trim);
  host.signBoard('training-first-aid-symbol','+',.22,.22,g,[-8.5,2.1,7.78],'#356d4e');
  // Community patch collection on a physical black fabric board beside the smartboard.
  box('community-patch-wall-frame',[4.94,2.34,.08],[-5.3,2.65,8.75],m.dark);
  const patchArt=host.dynamicMaterial('community-patch-wall-art',2400,1100);drawPatchFabric(patchArt.canvas);patchArt.texture.update();this.patchWallArt=patchArt;
  const patchWall=B.MeshBuilder.CreatePlane('community-patch-wall',{width:4.8,height:2.2},host.scene);patchWall.parent=g;patchWall.position.set(-5.3,2.65,8.69);patchWall.material=patchArt.mat;
  host.signBoard('community-patch-wall-title','Patchwand',4.8,.34,g,[-5.3,4.04,8.69],'#27322b');
  host.signBoard('community-patch-wall-invitation','Sende uns ein Bild von eurem Patch an patch@kartenkunde.app',4.8,.30,g,[-5.3,1.28,8.69],'#27322b');
  for(const x of [-5,5]){
   box('classroom-ceiling-light',[3,.04,.55],[x,4.34,0],m.roadPaint);
   const light=new B.PointLight('classroom-fill',new B.Vector3(x,3.6,0),host.scene);light.parent=g;light.diffuse=B.Color3.FromHexString('#fff4d8');light.intensity=1.2;light.range=14;
   light.includedOnlyMeshes=g.getChildMeshes();
  }
 }
 async loadPatches(){
  try{this.patchCollection=await loadPatchWall(this.patchWallArt);}catch(error){console.warn('Patchwand:',error.message);this.patchCollection={count:0,unavailable:true};}
 }
 chair(x,z,material,box){
  const m=this.host.materials;box('classroom-chair-seat',[.48,.08,.48],[x,.48,z],material,true);box('classroom-chair-back',[.48,.48,.065],[x,.80,z-.23],material,true);
  for(const dx of [-.19,.19])for(const dz of [-.18,.18])box('classroom-chair-leg',[.03,.43,.03],[x+dx,.22,z+dz],m.metal);
 }
 makeTeachingPoster(name,x,y,z,angle,title,draw){
  const host=this.host,art=host.dynamicMaterial(name,1000,1100),c=art.canvas.getContext('2d');c.fillStyle='#f0edde';c.fillRect(0,0,1000,1100);c.fillStyle='#385e50';c.fillRect(0,0,1000,130);c.fillStyle='#fff';c.font='bold 37px sans-serif';c.fillText(title,55,84);draw(c);art.texture.update();
  const p=B.MeshBuilder.CreatePlane(name,{width:2.5,height:2.75,sideOrientation:B.Mesh.DOUBLESIDE},host.scene);p.parent=this.root;p.position.set(x,y,z);p.rotation.y=angle;p.material=art.mat;
 }
 setLesson(index){
  this.lesson=((index%3)+3)%3;const c=this.display.canvas.getContext('2d');c.fillStyle='#152c35';c.fillRect(0,0,1920,1080);c.fillStyle='#d8b778';c.font='bold 36px sans-serif';c.fillText('AUSBILDUNGSZENTRUM · KARTENKUNDE.APP',80,84);
  const lessons=[['Willkommen zur Kartenkunde',['1  Karte · 2  Kompass · 3  Planzeiger','4  Bleistift · 5  Notizblock · 6  Fernglas','9  Funkgerät · E  Interaktion · Tab  Einsatzbuch','WASD bewegen · Maus umsehen · V Vollbild']],['Die Karte einnorden',['Karte und Kompass aus dem Inventar nehmen.','Kartenkante und Kompasskante parallel ausrichten.','Karte drehen, bis Nadel und Nordmarkierung passen.','Am Kartentisch üben oder mit F in der Hand arbeiten.']],['Marschzahl & Kreuzpeilung',['Zwei Punkte auf der Karte bestimmen.','Kompass anlegen und Marschrichtung einstellen.','Mit dem Peilkompass eine Landmarke anvisieren.','Peilungen im Notizblock festhalten.']]];
  const [title,lines]=lessons[this.lesson];c.fillStyle='#f3f1e5';c.font='bold 76px sans-serif';c.fillText(title,80,205);c.font='36px sans-serif';lines.forEach((line,i)=>c.fillText(line,85,330+i*104));
  c.drawImage(this.topo.canvas,1390,300,450,450);c.fillStyle='#6fc5ab';c.fillRect(80,820,1760,4);c.fillStyle='#e4dec9';c.font='34px sans-serif';c.fillText('Am Smartboard: E → nächstes Thema',80,900);c.font='27px sans-serif';c.fillText('Durch den offenen Eingang geht es zum Hof, Fahrzeug und Hubschrauber.',80,978);c.fillText(`${this.lesson+1} / 3`,1740,1030);this.display.texture.update();
 }
}
