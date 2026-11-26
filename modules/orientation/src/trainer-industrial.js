import {INDUSTRY,INDUSTRIAL_BUILDINGS,INDUSTRIAL_FENCES,FIRE_TRAINING,heightAt} from './trainer-world.js';
const B=globalThis.BABYLON;
export function makeIndustrialDistrict(host){
 const m=host.materials,root=new B.TransformNode('industrial-district',host.scene);root.parent=host.land;root.position=host.local(INDUSTRY.e,INDUSTRY.n);
 const steel=host.mat('industrial-galvanised-steel','#8a9b9e',{metallic:.65,roughness:.45}),cladding=host.mat('industrial-corrugated-cladding','#688b93'),brick=host.mat('industrial-brick','#956755'),yellow=host.mat('industrial-safety-yellow','#e3b940'),dark=host.mat('industrial-black-trim','#27373c'),paving=host.mat('industrial-yard-asphalt','#5a6263');
 cladding.albedoTexture=host.procedural('ribbed-factory-metal','#728f94',c=>{for(let x=0;x<512;x+=16){c.fillStyle='#59767f';c.fillRect(x,0,3,512);c.fillStyle='#9bafb0';c.fillRect(x+3,0,2,512);}c.fillStyle='#526f77';for(let y=0;y<512;y+=128)c.fillRect(0,y,512,2);});
 cladding.albedoColor=B.Color3.White();
 paving.albedoTexture=host.procedural('industrial-asphalt-grain','#646e70',(c,r)=>{for(let i=0;i<14000;i++){const v=65+r()*50;c.fillStyle=`rgba(${v},${v+5},${v+7},.5)`;c.fillRect(r()*512,r()*512,1+r()*2,1+r()*2);}c.strokeStyle='#454f52';c.lineWidth=1;c.beginPath();c.moveTo(60,0);c.lineTo(90,220);c.lineTo(30,360);c.stroke();});paving.albedoColor=B.Color3.White();paving.albedoTexture.uScale=35;paving.albedoTexture.vScale=28;
 const apron=B.MeshBuilder.CreateGround('industrial-paved-yard',{width:INDUSTRY.w,height:INDUSTRY.d},host.scene);apron.parent=root;apron.position.y=.045;apron.material=paving;apron.receiveShadows=true;
 const box=(name,size,at,mat=steel,parent=root,collision=false)=>host.box(name,size,at,mat,parent,{collision,shadow:true});
 for(const p of INDUSTRIAL_BUILDINGS){
  const g=new B.TransformNode('industrial-'+p.kind,host.scene);g.parent=root;g.position.set(p.e-INDUSTRY.e,0,p.n-INDUSTRY.n);g.metadata={industrial:true,kind:p.kind};
  const localBox=(name,size,at,mat=cladding,collision=false)=>box(name,size,at,mat,g,collision);
  if(p.kind==='tank'){
   host.cylinder('industrial-storage-tank',p.w,p.w,p.h,[0,p.h/2,0],steel,g,32).checkCollisions=true;
   host.cylinder('tank-domed-roof',0,p.w+.3,2,[0,p.h+1,0],steel,g,32);
   for(const y of [1,p.h*.5,p.h-.4])host.cylinder('tank-horizontal-band',p.w+.08,p.w+.08,.25,[0,y,0],dark,g,32);
   for(const x of [-.4,.4])localBox('tank-access-ladder',[.07,p.h,.07],[x,p.h/2,-p.d/2-.15],yellow);
   for(let y=.35;y<p.h;y+=.4)localBox('tank-ladder-rung',[.8,.055,.055],[0,y,-p.d/2-.15],yellow);
   host.signBoard('tank-identification',p.name,3,1,g,[0,8,-p.d/2-.1],'#334d5e');
  }else if(p.kind==='chimney'){
   host.cylinder('industrial-chimney',4,6,p.h,[0,p.h/2,0],brick,g,24).checkCollisions=true;
   for(const y of [p.h-9,p.h-3])host.cylinder('chimney-white-band',4.3,4.5,2,[0,y,0],m.roadPaint,g,24);
  }else if(p.kind==='container'){
   localBox('shipping-container',[p.w,p.h,p.d],[0,p.h/2,0],cladding,true);
   for(let x=-p.w/2+.2;x<p.w/2;x+=.45)for(const z of [-p.d/2-.02,p.d/2+.02])localBox('container-corrugation',[.055,p.h-.2,.06],[x,p.h/2,z],steel);
   host.signBoard('container-number','LAGE / '+Math.round(p.e),4,.65,g,[0,1.6,-p.d/2-.06],'#486773');
  }else{
   localBox('industrial-building-shell',[p.w,p.h,p.d],[0,p.h/2,0],p.kind==='office'?brick:cladding,true);
   localBox('industrial-roof',[p.w+1,.4,p.d+1],[0,p.h+.2,0],dark);
   if(p.kind==='office'||p.kind==='gatehouse'){
    for(let x=-p.w/2+2;x<p.w/2-1;x+=4)for(let y=2;y<p.h;y+=3.5)localBox('industrial-office-glazing',[2.5,1.5,.1],[x,y,-p.d/2-.1],m.window);
    localBox('industrial-entry-canopy',[5,.2,3],[0,2.9,-p.d/2-1.3],dark);
   }else{
    // Loading doors face the internal service lane, towards the north.
    for(let x=-p.w/2+12;x<p.w/2;x+=24){
     localBox('warehouse-loading-door',[7,5,.2],[x,2.5,p.d/2+.12],dark);localBox('loading-door-glazing',[6,1,.08],[x,3.3,p.d/2+.24],m.window);
     for(const dx of [-4.2,4.2])localBox('loading-bollard',[.25,1.2,.25],[x+dx,.6,p.d/2+1.2],yellow);
     localBox('loading-bay-marking',[.12,.025,12],[x-5,.09,p.d/2+7],m.roadPaint);
    }
    for(let x=-p.w/2+6;x<p.w/2;x+=12){localBox('roof-sawtooth-frame',[7,1.8,p.d-4],[x,p.h+1,0],dark);const skylight=localBox('industrial-roof-skylight',[5,.15,p.d-5],[x,p.h+2,0],m.window);skylight.rotation.z=-.2;}
    for(let x=-p.w/2+8;x<p.w/2;x+=16)localBox('roof-extract-vent',[2,1.7,2],[x,p.h+2.8,0],steel);
   }
   host.signBoard('industrial-business-name',p.name,Math.min(28,p.w-1),p.kind==='gatehouse'?.55:1.8,g,[0,p.h-1,p.d/2+.25],'#254d5e',Math.PI);
  }
 }
 // Tank farm containment and overhead pipework. All structural supports are physical.
 for(const z of [64,97])box('tank-farm-bund',[105,.7,.35],[-120,.35,z],m.stone);
 for(const x of [-171,-69])box('tank-farm-bund',[.35,.7,33],[x,.35,80],m.stone);
 for(const x of [-150,-120,-90]){
  const pipe=host.cylinder('tank-outlet-pipe',.55,.55,38,[x,1.4,53],yellow,root,12);pipe.rotation.x=Math.PI/2;
  const valve= B.MeshBuilder.CreateTorus('tank-valve-wheel',{diameter:1.1,thickness:.1,tessellation:16},host.scene);valve.parent=root;valve.position.set(x,2.2,51);valve.material=brick;
 }
 for(const x of [-65,-10,45]){for(const z of [42,47])box('pipe-rack-leg',[.24,6,.24],[x,3,z],steel,root,true);box('pipe-rack-cross-member',[.3,.25,7],[x,6,44.5],steel);}
 for(let z=42;z<48;z+=1.2){const pipe=host.cylinder('elevated-process-pipeline',.35,.35,150,[-25,6.5,z],z%2?yellow:steel,root,12);pipe.rotation.z=Math.PI/2;}
 for(const x of [-35,-25,-15]){box('process-pump-base',[3,.5,2],[x,.25,62],m.stone);host.cylinder('process-pump-motor',.9,.9,1.8,[x,1,62],dark,root,12);}
 // Planted strips and break areas distinguish the offices from the production apron.
 for(const [x,z,w,d]of [[-110,135,160,12],[130,135,130,10]]){box('industrial-green-strip',[w,.10,d],[x,.10,z],m.grass);for(let i=0;i<5;i++)host.models.place('nature-kit/plant_bushLarge',{e:INDUSTRY.e+x-w/2+10+i*w/5,n:INDUSTRY.n+z,w:2.5,d:2,h:1.2});}
 for(const e of [2275,2310,2345,2380])host.models.place('nature-kit/tree_oak',{e,n:2984,w:4,d:4,h:6});
 // Continuous mesh fence, with exactly one sixteen-metre entrance in the north.
 const texture=host.procedural('industrial-mesh-wire','rgba(0,0,0,0)',c=>{c.clearRect(0,0,512,512);c.strokeStyle='#91a4a8';c.lineWidth=5;for(let x=-512;x<=1024;x+=128){c.beginPath();c.moveTo(x,0);c.lineTo(x+512,512);c.moveTo(x,0);c.lineTo(x-512,512);c.stroke();}});texture.hasAlpha=true;texture.uScale=4;texture.vScale=2;
 const wire=new B.StandardMaterial('industrial-chain-link',host.scene);wire.diffuseTexture=texture;wire.useAlphaFromDiffuseTexture=true;wire.transparencyMode=B.Material.MATERIAL_ALPHATEST;wire.backFaceCulling=false;
 const fenceTemplate=B.MeshBuilder.CreatePlane('industrial-fence-template',{width:4,height:2.6},host.scene);fenceTemplate.material=wire;fenceTemplate.setEnabled(false);
 for(const f of INDUSTRIAL_FENCES){
  const horizontal=f.w>f.d,len=horizontal?f.w:f.d;
  for(let distance=0;distance<len;distance+=4){const length=Math.min(4,len-distance),e=f.e+(horizontal?distance+length/2-len/2:0),n=f.n+(horizontal?0:distance+length/2-len/2);
   const mesh=fenceTemplate.createInstance('industrial-chain-link-panel');mesh.setEnabled(true);mesh.parent=root;mesh.position.set(e-INDUSTRY.e,1.3,n-INDUSTRY.n);mesh.rotation.y=horizontal?0:Math.PI/2;mesh.scaling.x=length/4;
   box('industrial-fence-post',[.08,2.8,.08],[e-INDUSTRY.e-(horizontal?length/2:0),1.4,n-INDUSTRY.n-(horizontal?0:length/2)],steel);
  }
  const hit=box('industrial-fence-collision',[f.w,f.h,f.d],[f.e-INDUSTRY.e,f.h/2,f.n-INDUSTRY.n],steel,root,true);hit.isVisible=false;
 }
 for(const x of [-8.3,8.3]){box('industrial-gate-post',[.3,5.2,.3],[x,2.6,150],dark,root,true);box('open-sliding-gate',[14,2.2,.12],[x<0?-16:16,1.1,150.15],steel);}
 host.signBoard('industrial-main-gate',INDUSTRY.name,13,1.2,root,[0,4.5,150.1],'#275468',Math.PI);
 host.signBoard('industrial-safety-sign','WERKSGELÄNDE · ZUFAHRT FREIHALTEN',9,.75,root,[22,1.6,150.3],'#a17e25',Math.PI);
 for(let z=115;z<147;z+=8)box('gate-lane-centerline',[.12,.03,4],[0,.09,z],m.roadPaint);
 for(let x=88;x<145;x+=3)box('industrial-office-parking',[.09,.03,5],[x,.09,76],m.roadPaint);
 return root;
}

export function makeFireTraining(host){
 const p=FIRE_TRAINING,m=host.materials,g=new B.TransformNode('fire-training-building',host.scene);g.parent=host.land;g.position=host.local(p.e,p.n);g.metadata={trainingFire:true};
 const brick=host.mat('training-fire-brick','#9b7260'),concrete=host.mat('training-fire-concrete','#9c9c8d'),black=host.mat('training-fire-soot','#202528'),steel=host.mat('training-ladder-steel','#a7b3ad',{metallic:.65,roughness:.4});
 brick.albedoTexture=host.procedural('training-brick-courses','#a28270',(c,r)=>{for(let y=0;y<512;y+=32)for(let x=-32;x<512;x+=64){c.fillStyle=r()>.5?'#96715d':'#aa806b';c.fillRect(x+(y/32%2)*32+2,y+2,60,28);}});brick.albedoTexture.uScale=4;brick.albedoTexture.vScale=2;
 brick.albedoColor=B.Color3.White();
 const box=(name,size,at,mat=concrete,collision=false)=>host.box(name,size,at,mat,g,{collision,shadow:true});
 box('training-burn-house-shell',[p.w,p.h,p.d],[0,p.h/2,0],brick,true);
 box('training-fire-roof',[p.w+1,.4,p.d+1],[0,p.h+.2,0],concrete);
 for(const y of [4,8]){box('training-concrete-floor-band',[p.w+.12,.35,p.d+.12],[0,y,0],concrete);for(const x of [-7,0,7]){box('training-window-soot',[3.4,3.6,.06],[x,y+2.2,p.d/2+.04],black);box('training-window-opening',[2.2,2.3,.1],[x,y+1.8,p.d/2+.09],black);box('training-window-sill',[2.7,.2,.45],[x,y+.6,p.d/2+.22],concrete);}}
 box('training-house-door',[2.4,2.9,.12],[0,1.45,p.d/2+.11],black);
 host.signBoard('training-fire-building-sign','FEUERWEHR · ÜBUNGSHAUS',14,.8,g,[0,3.35,p.d/2+.14],'#873e2d',Math.PI);
 host.signBoard('training-controlled-fire-sign','KONTROLLIERTER ÜBUNGSBRAND',9,.6,g,[0,.95,18],'#97762c',Math.PI);
 for(const x of [-4.5,4.5])box('training-warning-post',[.08,1.5,.08],[x,.75,18],steel);
 // A real sloped extension ladder with rails and closely spaced rungs to the roof.
 const ladder=new B.TransformNode('fire-training-extension-ladder',host.scene);ladder.parent=g;ladder.position.set(7,0,13);ladder.rotation.x=-.31;
 for(const x of [-.45,.45])host.box('ladder-side-rail',[.085,13.6,.09],[x,6.8,0],steel,ladder,{shadow:true});
 for(let y=.25;y<13.5;y+=.32)host.box('ladder-rung',[.9,.065,.08],[0,y,0],steel,ladder,{shadow:true});
 for(const x of [-.48,.48])box('ladder-stabilizer-foot',[.4,.09,.4],[7+x,.05,13],black);
 const roofRail=(x,z,w,d)=>box('training-roof-guardrail',[w,.07,d],[x,13.2,z],steel);
 roofRail(0,-8,22,.06);roofRail(-11,0,.06,16);roofRail(11,0,.06,16);
 for(const x of [-11,0,11])for(const z of [-8,8])box('roof-railing-post',[.07,1.2,.07],[x,12.6,z],steel);
 // Hose and hydrant help identify this as a working training site, rather than an incident.
 const hose=B.MeshBuilder.CreateTube('training-fire-hose',{path:[[1450,2863],[1455,2860],[1447,2855],[1452,2851]].map(([e,n])=>new B.Vector3(e-p.e,.12,n-p.n)),radius:.09,tessellation:8},host.scene);hose.parent=g;hose.material=host.mat('training-hose','#c6b68a');
 host.cylinder('training-hydrant',.35,.45,1.05,[-15,.525,12],host.mat('training-hydrant-red','#bd4030'),g,12);
 for(const x of [-16,-8,0,8,16])host.models.place('car-kit/cone',{e:p.e+x,n:p.n+22,w:.45,d:.45,h:.7});
 const makeTexture=(name,flame)=>{const tex=host.procedural(name,'rgba(0,0,0,0)',c=>{c.clearRect(0,0,512,512);const gradient=c.createRadialGradient(256,flame?330:256,0,256,256,240);gradient.addColorStop(0,flame?'rgba(255,255,205,1)':'rgba(235,235,235,.65)');gradient.addColorStop(.3,flame?'rgba(255,205,55,.95)':'rgba(210,210,210,.45)');gradient.addColorStop(.65,flame?'rgba(255,65,8,.65)':'rgba(170,170,170,.25)');gradient.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gradient;c.fillRect(0,0,512,512);});tex.hasAlpha=true;return tex;};
 const fireTexture=makeTexture('training-flame-sprite',true),smokeTexture=makeTexture('training-smoke-sprite',false),systems=[],emitters=[];
 for(const x of [-7,0]){
  // Vector emitters keep particles renderable even when their invisible source is not an active mesh.
  const anchor=new B.TransformNode('training-fire-origin',host.scene);anchor.parent=g;anchor.position.set(x,5.3,8.35);anchor.computeWorldMatrix(true);const emitter=anchor.getAbsolutePosition().clone();emitters.push({anchor,emitter});
  const fire=new B.ParticleSystem('controlled-training-flames',80,host.scene);fire.useLogarithmicDepth=true;fire.particleTexture=fireTexture;fire.emitter=emitter;fire.minEmitBox=new B.Vector3(-.8,-.4,-.1);fire.maxEmitBox=new B.Vector3(.8,.3,.15);fire.direction1=new B.Vector3(-.1,1,.1);fire.direction2=new B.Vector3(.1,2,.6);fire.minLifeTime=.35;fire.maxLifeTime=1.1;fire.minSize=.5;fire.maxSize=1.5;fire.minScaleX=.7;fire.maxScaleX=1.1;fire.minScaleY=1.5;fire.maxScaleY=2.4;fire.emitRate=38;fire.minEmitPower=1.5;fire.maxEmitPower=2.4;fire.gravity=new B.Vector3(0,1,0);fire.color1=new B.Color4(1,.8,.35,1);fire.color2=new B.Color4(1,.3,.05,.8);fire.colorDead=new B.Color4(.3,.04,0,0);fire.blendMode=B.ParticleSystem.BLENDMODE_ADD;fire.start();systems.push(fire);
  const smoke=new B.ParticleSystem('controlled-training-smoke',140,host.scene);smoke.useLogarithmicDepth=true;smoke.particleTexture=smokeTexture;smoke.emitter=emitter;smoke.minEmitBox=new B.Vector3(-.6,.1,0);smoke.maxEmitBox=new B.Vector3(.6,1,.5);smoke.direction1=new B.Vector3(.15,1,.1);smoke.direction2=new B.Vector3(.5,1.4,.5);smoke.minLifeTime=5;smoke.maxLifeTime=9;smoke.minSize=1.4;smoke.maxSize=3.2;smoke.minEmitPower=1.5;smoke.maxEmitPower=2.5;smoke.gravity=new B.Vector3(.05,.12,.02);smoke.minAngularSpeed=-.25;smoke.maxAngularSpeed=.3;smoke.emitRate=12;smoke.color1=new B.Color4(.3,.32,.33,.7);smoke.color2=new B.Color4(.47,.46,.43,.55);smoke.colorDead=new B.Color4(.7,.7,.65,0);smoke.addSizeGradient(0,.5);smoke.addSizeGradient(1,3);smoke.blendMode=B.ParticleSystem.BLENDMODE_STANDARD;smoke.start();systems.push(smoke);
 }
 const glow=new B.PointLight('training-fire-glow',host.local(p.e-3,p.n+9,heightAt(p.e,p.n)+5.8),host.scene);glow.parent=host.land;glow.diffuse=new B.Color3(1,.3,.04);glow.range=16;glow.intensity=1.6;
 let running=true;
 return {root:g,systems,update(time,state){for(const {anchor,emitter}of emitters){anchor.computeWorldMatrix(true);emitter.copyFrom(anchor.getAbsolutePosition());}const near=Math.hypot(state.player.e-p.e,state.player.n-p.n)<800;if(near!==running){for(const ps of systems)near?ps.start():ps.stop();running=near;}glow.setEnabled(near);if(near)glow.intensity=1.4+.3*Math.sin(time*17)+.15*Math.sin(time*31);}};
}
