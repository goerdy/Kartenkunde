import {TOWN_PARK,CAMPUS,onPavedSite,sitePoint,PARKED_VEHICLES,BUILDINGS,SERVICE_SITES,ROAD_FEATURES,heightAt,distanceToPath} from './trainer-world.js';
const B=globalThis.BABYLON;
export function makeSettlementDetails(host){
 const m=host.materials,models=host.models;
 const place=(key,e,n,w,d,h,angle=0)=>models.place(key,{e,n,w,d,h,angle});
 const ground=(name,e,n,w,d,mat,lift=.14)=>{const mesh=B.MeshBuilder.CreateGround(name,{width:w,height:d,subdivisions:8,updatable:true},host.scene);mesh.parent=host.land;mesh.position=host.local(e,n);mesh.material=mat;const pos=mesh.getVerticesData(B.VertexBuffer.PositionKind);for(let i=0;i<pos.length;i+=3)pos[i+1]=host.terrainHeight(e+pos[i],n+pos[i+2])-heightAt(e,n)+lift;mesh.updateVerticesData(B.VertexBuffer.PositionKind,pos,true);mesh.receiveShadows=true;return mesh;};
 const paving=host.mat('campus-brushed-concrete','#a3aaa5');
 paving.albedoTexture=host.procedural('campus-concrete','#8d9691',(c,r)=>{for(let i=0;i<12000;i++){const v=130+Math.floor(r()*32);c.fillStyle=`rgb(${v},${v+5},${v+2})`;c.fillRect(r()*512,r()*512,1,1);}c.strokeStyle='#78817d';c.lineWidth=2;c.strokeRect(0,0,512,512);});paving.albedoTexture.uScale=55;paving.albedoTexture.vScale=44;
 ground('population-protection-campus',CAMPUS.e,CAMPUS.n,CAMPUS.w,CAMPUS.d,paving,.025);
 // Central lawn islands break up the large apron and protect pedestrian approaches.
 for(const [e,n,w,d]of [[1450,2760,30,50],[1600,2825,12,25],[1830,2840,18,210],[1640,2995,280,12]]){
  ground('landscaped-campus-island',e,n,w,d,m.grass);
  for(let i=0;i<Math.max(2,w/15);i++)place('nature-kit/plant_bushLarge',e-w/2+5+i*13,n,3,2,1.3,i*53);
 }
 const pad= CAMPUS.helipad,ring=B.MeshBuilder.CreateTorus('helipad-white-circle',{diameter:26,thickness:.24,tessellation:80},host.scene);ring.parent=host.land;ring.position=host.local(pad.e,pad.n,heightAt(pad.e,pad.n)+.1);ring.material=m.roadPaint;
 const padRoot=new B.TransformNode('Luftrettung-Helipad',host.scene);padRoot.parent=host.land;padRoot.position=host.local(pad.e,pad.n);
 host.box('helipad-H-left',[.6,.04,8],[-2.5,.10,0],m.roadPaint,padRoot);host.box('helipad-H-right',[.6,.04,8],[2.5,.10,0],m.roadPaint,padRoot);host.box('helipad-H-cross',[5,.04,.6],[0,.10,0],m.roadPaint,padRoot);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;host.box('helipad-edge-light',[.22,.15,.22],[Math.sin(a)*15,.15,Math.cos(a)*15],m.roadPaint,padRoot,{shadow:false});}
 host.signBoard('campus-welcome','BEVÖLKERUNGSSCHUTZ · SANKT FLORIAN',16,1.6,host.land,host.local(1502,3015,heightAt(1502,3015)+2.8).asArray(),'#284b6a');
 for(const sign of [-1,1])host.box('campus-sign-post',[.15,3.5,.15],host.local(1502+sign*6,3015,heightAt(1502+sign*6,3015)+1.75).asArray(),m.metal,host.land);
 host.signBoard('campus-wayfinding','FEUERWEHR · THW · RETTUNG · KLINIK',12,1,host.land,host.local(1502,3015,heightAt(1502,3015)+1.4).asArray(),'#284b6a');
 // Windsock, approach lights and safety line make the landing area recognisable from the air.
 const sock=new B.TransformNode('helipad-windsock',host.scene);sock.parent=host.land;sock.position=host.local(1770,2865);
 host.box('windsock-mast',[.10,6,.10],[0,3,0],m.metal,sock);
 const orange=host.mat('rescue-orange','#ed862d');for(let i=0;i<5;i++){const segment=B.MeshBuilder.CreateCylinder('windsock-stripe',{height:.45,diameterTop:.8-i*.10,diameterBottom:.7-i*.10,tessellation:12},host.scene);segment.parent=sock;segment.position.set(.3+i*.43,5.9-i*.08,0);segment.rotation.z=-Math.PI/2-.15;segment.material=i%2?m.roadPaint:orange;}
 for(const p of SERVICE_SITES.filter(p=>p.id!=='police')){
  const front=-p.d/2;
  for(let i=0;i<5;i++)host.box('campus-pedestrian-crossing',[2.5,.025,.5],host.local(sitePoint(p,-5+i*2.7,front-21).e,sitePoint(p,-5+i*2.7,front-21).n,CAMPUS.height+.11).asArray(),m.roadPaint,host.land,{shadow:false});
 }
 // Static emergency fleet; the command vehicle and rescue helicopter remain independent interactive vehicles.
 for(const p of PARKED_VEHICLES){const g=models.place('car-kit/'+p.model,{...p,collision:true});if(p.model.startsWith('thw')){for(const sign of [-1,1])host.signBoard('thw-fleet-name','THW',2,.5,g,[sign*(p.w/2+.02),p.h*.65,0],'#1b4c99',-sign*Math.PI/2);}}
 for(let x=1518;x<1570;x+=3){host.box('command-parking-stripe',[.09,.025,6],host.local(x,2840,heightAt(x,2840)+.09).asArray(),m.roadPaint,host.land,{shadow:false});}
 // A planted town square gives the otherwise large blocks a place to linger.
 const park=TOWN_PARK;ground('town-square-lawn',park.e,park.n,park.w,park.d,m.grass);
 ground('town-square-paving',park.e,park.n,48,48,paving,.22);
 const square=new B.TransformNode('Platz-der-Lagebesprechung',host.scene);square.parent=host.land;square.position=host.local(park.e,park.n);
 host.cylinder('fountain-basin',6,6,.55,[0,.28,0],m.stone,square,32);host.cylinder('fountain-water',5.4,5.4,.06,[0,.59,0],m.water,square,32);host.cylinder('fountain-centre',.45,.6,2,[0,1,0],m.stone,square,16);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;place('nature-kit/tree_oak',park.e+Math.sin(a)*48,park.n+Math.cos(a)*48,8,8,11,i*39);}
 for(const sign of [-1,1]){host.box('park-bench-seat',[3,.15,.55],[sign*12,.48,0],m.wood,square);host.box('park-bench-back',[3,.7,.10],[sign*12,.9,.24],m.wood,square);for(const x of [-1,1])host.box('park-bench-leg',[.15,.5,.4],[sign*12+x,.25,0],m.metal,square);place('city-kit-commercial/detail-parasol-b',park.e+sign*17,park.n+14,4,4,3);}
 for(const sign of [-1,1])host.box('square-name-post',[.08,1.7,.08],[sign*1.7,.85,-24],m.metal,square);
 host.signBoard('town-square-name',park.name,4,.5,square,[0,1.5,-24],'#31594b');
 // Town street furniture, gardens and a mixed vehicle population.
 let index=0;
 for(const p of BUILDINGS.filter(b=>!b.service&&!b.servicePart&&!b.industrial&&b.name!=='Hof Wasserhalt')){
  const i=index++,a=(p.angle||0)*Math.PI/180,front={e:p.e-Math.sin(a)*(p.d/2+4),n:p.n-Math.cos(a)*(p.d/2+4)};
  const garden=host.models.place('city-kit-suburban/planter',{e:front.e,n:front.n,w:2,d:.8,h:.65,angle:p.angle||0});
  if(i%2===0)models.place('city-kit-suburban/fence-low',{e:p.e+Math.sin(a)*(p.d/2+3),n:p.n+Math.cos(a)*(p.d/2+3),w:p.w*.8,d:.2,h:1,angle:p.angle||0});
  if(i%3===0){place('nature-kit/tree_oak',p.e+p.w/2+5,p.n,7,7,9,i*43);place('nature-kit/plant_bush',p.e-p.w/2-2,p.n,2,2,1.2,i*37);}
  if(i%4===0){place('car-kit/'+['sedan','suv','taxi','hatchback-sports'][i%7%4],front.e+Math.cos(a)*6,front.n-Math.sin(a)*6,1.9,4.4,1.7,p.angle||0);}
  if(i%5===0){const lamp=new B.TransformNode('town-streetlight',host.scene);lamp.parent=host.land;lamp.position=host.local(front.e,front.n);host.box('lamp-pole',[.10,4.7,.10],[0,2.35,0],m.metal,lamp);host.box('lamp-head',[.65,.15,.3],[.22,4.7,0],m.roadPaint,lamp);}
  if(i%7===0&&p.name==='Sankt Florian'){place('city-kit-commercial/detail-parasol-a',front.e-4,front.n,3,3,2.7);host.signBoard('local-shop',['BÄCKEREI · LANGE LEITUNG','CAFÉ ZUR KALTEN LAGE','APOTHEKE AM LAGEZENTRUM'][i%3],Math.min(8,p.w*.55),.65,garden,[0,1.1,0],'#486756');}
 }
 // Curated verges around populated roads, picnic stops and the campus: flowers, boulders and shrubs.
 for(let i=0;i<900;i++){
  const road=ROAD_FEATURES[i%ROAD_FEATURES.length],seg=i%(road.points.length-1),t=((i*0.61803398875)%1),a=road.points[seg],b=road.points[seg+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),side=i%2?1:-1,offset=road.width/2+3+(i%9)*.65;
  const e=a[0]+(b[0]-a[0])*t-(b[1]-a[1])/len*offset*side,n=a[1]+(b[1]-a[1])*t+(b[0]-a[0])/len*offset*side;
  if(onPavedSite(e,n,10)||BUILDINGS.some(p=>Math.abs(e-p.e)<p.w/2+4&&Math.abs(n-p.n)<p.d/2+4))continue;
  const key=i%13===0?'rock_largeB':i%5===0?'plant_bush':i%3===0?'flower_yellowA':i%3===1?'flower_purpleA':'grass_large',h=key.startsWith('rock')?1.2:key==='plant_bush'?1.3:.5;
  place('nature-kit/'+key,e,n,h*1.3,h*1.2,h,i*41);
 }
}
