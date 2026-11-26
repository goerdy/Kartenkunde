import {TRAINING_POINTS,TRAINING_CENTER,heightAt,walkingHeightAt,bearing,angleDifference} from './trainer-world.js';
import {currentMission} from './trainer-campaign.js';
const B=globalThis.BABYLON;
export class CampaignScene{
 constructor(host){this.host=host;this.key='';this.people=[];this.instructor=this.person('Ausbilderin',true);this.instructor.position=host.local(1458.1,2954.5);this.instructor.metadata={id:'instructor',name:'Ausbilderin',role:'instructor'};this.root=null;
  for(const p of TRAINING_POINTS){const g=new B.TransformNode(p.name,host.scene);g.parent=host.land;g.position=host.local(p.e+2,p.n+2);host.box('training-point-post',[.08,1.9,.08],[0,.95,0],host.materials.wood,g);host.signBoard('training-point-name',p.name,1.3,.35,g,[0,1.7,-.04],'#3d6556');}
 }

 person(name,female=false){
  const h=this.host,g=new B.TransformNode(name,h.scene);g.parent=h.land;
  const navy=h.mat(name+'-jacket','#244a68'),trousers=h.mat(name+'-trousers','#273846'),skin=h.mat(name+'-skin','#d9ad88'),hair=h.mat(name+'-hair',female?'#563b2c':'#615348'),boot=h.materials.dark,accent=female?h.mat('instructor-accent','#ca4b43'):h.mat('civilian-orange','#dc8d37');
  const box=(name,size,pos,mat)=>h.box(name,size,pos,mat,g,{shadow:true});
  const capsule=(name,diameter,height,pos,material)=>{const o=B.MeshBuilder.CreateCapsule(name,{radius:diameter/2,height,tessellation:8,subdivisions:1},h.scene);o.parent=g;o.position.set(...pos);o.material=material;h.shadowMeshes.push(o);return o;};
  for(const sign of [-1,1]){capsule('npc-trouser-leg',.15,.78,[sign*.105,.47,0],trousers);box('npc-boot',[.17,.13,.29],[sign*.105,.065,.06],boot);const arm=capsule('npc-jacket-arm',.12,.54,[sign*.27,1.12,.01],navy);arm.rotation.z=sign*.10;capsule('npc-hand',.09,.14,[sign*.295,.82,.04],skin);}
  capsule('npc-jacket',.40,.67,[0,1.08,0],female?navy:accent);box('npc-jacket-zip',[.012,.48,.012],[0,1.11,.197],h.materials.metal);box('npc-shoulder-yoke',[.37,.075,.24],[0,1.34,.04],accent);
  capsule('npc-neck',.105,.15,[0,1.45,0],skin);const head=B.MeshBuilder.CreateSphere('npc-face',{diameter:.255,segments:10},h.scene);head.scaling.set(.88,1.18,.94);head.parent=g;head.position.set(0,1.64,.02);head.material=skin;
  const cap=B.MeshBuilder.CreateSphere('npc-hair',{diameter:.27,segments:10,slice:.6},h.scene);cap.parent=g;cap.position.set(0,1.70,-.015);cap.material=hair;
  for(const sign of [-1,1])box('npc-eye',[.024,.014,.012],[sign*.05,1.66,.133],boot);box('npc-nose',[.028,.038,.026],[0,1.62,.144],skin);box('npc-mouth',[.042,.009,.009],[0,1.57,.137],hair);
  if(female){const bun=B.MeshBuilder.CreateSphere('npc-hair-bun',{diameter:.14,segments:8},h.scene);bun.parent=g;bun.position.set(0,1.73,-.15);bun.material=hair;box('npc-instructor-badge',[.13,.06,.015],[-.10,1.24,.2],h.materials.roadPaint);}
  h.signBoard('npc-name',name,.8,.12,g,[0,2.0,0],'#294f58',Math.PI);return g;
 }
 rebuild(s){
  this.root?.dispose(false,false);for(const npc of this.people)npc.dispose();this.people=[];this.host.shadowMeshes=this.host.shadowMeshes.filter(m=>!m.isDisposed());this.root=new B.TransformNode('active-incident',this.host.scene);this.root.parent=this.host.land;const h=this.host,m=currentMission(s),mat=h.materials;
  for(const p of m?.sites||[]){if(m.id.startsWith('t')&&m.id!=='t5')continue;const g=new B.TransformNode('incident:'+p.id,h.scene);g.parent=this.root;g.position=h.local(p.e+(p.id==='Helipad'?15:0),p.n,walkingHeightAt(p.e,p.n));g.metadata={site:p};
   if(p.kind==='smoke'){
    const smoke=h.mat('training-smoke','#6d736e');smoke.alpha=.70;
    for(let i=0;i<8;i++){const o=B.MeshBuilder.CreateSphere('smoke-plume',{diameter:3+i*.7,segments:8},h.scene);o.parent=g;o.position.set(Math.sin(i)*1.5,1+i*3,Math.cos(i));o.scaling.y=1.4;o.material=smoke;}
    h.box('smoke-source',[2,.3,2],[0,.15,0],mat.dark,g);
   }else if(p.kind==='damage'){
    h.cylinder('road-pothole',1.9,1.9,.035,[0,.10,0],mat.dark,g,16);for(const x of [-1.4,1.4])h.models.place('car-kit/cone',{w:.38,d:.38,h:.65,parent:g,position:new B.Vector3(x,.08,0)});
   }else if(p.kind==='person'){
    const npc=this.person(p.person||'Ansprechpartner',false);npc.position=h.local(p.e+1.5,p.n+1.5,walkingHeightAt(p.e+1.5,p.n+1.5));npc.metadata={id:p.id,name:p.person,role:'person',site:p};this.people.push(npc);
    if(m.id==='p3')h.models.place('car-kit/sedan',{w:1.9,d:4.4,h:1.5,parent:g,position:new B.Vector3(-2,0,0),angle:25});
   }else if(p.kind==='mast'){const pole=h.box('damaged-pole',[.24,5,.24],[0,2.5,0],mat.wood,g);pole.rotation.z=.18;}
   if(p.kind!=='person'&&p.kind!=='smoke'&&p.kind!=='damage'){
    h.box('mission-sign-post',[.09,1.9,.09],[0,.95,0],mat.metal,g);h.signBoard('mission-sign',p.reading||p.label,2.5,.45,g,[0,1.8,-.05],'#3a6555');
   }
  }
  // Newly generated materials must use the same world-depth convention.
  for(const material of h.scene.materials)if('useLogarithmicDepth'in material)material.useLogarithmicDepth=true;
 }
 update(s){
  const m=currentMission(s),key=m?.id||'';if(key!==this.key||!this.root){this.key=key;this.rebuild(s);}
  const inside=Math.abs(s.player.e-TRAINING_CENTER.e)<14&&Math.abs(s.player.n-TRAINING_CENTER.n)<12,training=m?.id.startsWith('t')||!m&&s.campaign.trainingDone>0&&s.campaign.trainingDone<6;
  this.instructor.setEnabled(!s.vehicle.occupied&&!s.helicopter.occupied&&(inside||training));
  if(inside)this.instructor.position=this.host.local(1458.1,2954.5);
  else if(training){const target=this.host.local(s.player.e+2.8,s.player.n+1.5);if(B.Vector3.Distance(this.instructor.position,target)>8)this.instructor.position.copyFrom(target);else this.instructor.position=B.Vector3.Lerp(this.instructor.position,target,.08);this.instructor.position.y=this.host.local(s.player.e+2.8,s.player.n+1.5).y;}
  for(const npc of [this.instructor,...this.people]){npc.computeWorldMatrix(true);const p=this.host.fromWorld(npc.getAbsolutePosition());npc.rotation.y=(bearing(p,s.player))*Math.PI/180;}
 }
 interaction(s){
  if(s.mode!=='explore'||s.vehicle.occupied||s.helicopter.occupied)return null;
  for(const npc of [this.instructor,...this.people]){if(!npc.isEnabled())continue;npc.computeWorldMatrix(true);const p=this.host.fromWorld(npc.getAbsolutePosition());if(Math.hypot(s.player.e-p.e,s.player.n-p.n)<3.2&&Math.abs(angleDifference(s.yaw-s.north,bearing(s.player,p)))<55)return npc.metadata;}
  for(const p of currentMission(s)?.sites||[])if(p.dialog||p.reading){if(Math.hypot(p.e-s.player.e,p.n-s.player.n)<3.2)return {id:p.id,name:p.label,role:'person',site:p};}
  return null;
 }
}
