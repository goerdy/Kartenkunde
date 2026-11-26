import {makeIndustrialDistrict,makeFireTraining} from './trainer-industrial.js';
import {orientFirstPerson} from './trainer-camera.js';
import {interiorMaterials,cockpitPanel,cockpitVent,cockpitKnob} from './trainer-cockpit.js';
import {CampaignScene} from './trainer-campaign-scene.js';
import {TrainingRoom,makeClassroomDesk} from './trainer-classroom.js';
import {WorldModels} from './trainer-models.js';
import {makeSettlementDetails} from './trainer-settlement.js';
import {stepJump} from './trainer-jump.js';
import {HelicopterView} from './trainer-helicopter-view.js';
import {flyHelicopter} from './trainer-helicopter.js';
import {WORLD_SIZE,onPavedSite,sitePoint,hallBays,FIELDS,QUARRY,VIEWPOINTS,SERVICE_SITES,STREET_SIGNS,TOWN_SIGNS,ROAD_FEATURES,BUILDINGS,WATERCOURSES,BRIDGES,MARSH,TREES,distanceToPath,waterLevel,walkingHeightAt,heightAt,inside,LANDMARKS,STATIONS,FORESTS,LAKE,LAKE_WATER_LEVEL,ROADS,mod,effectiveDeclination} from './trainer-world.js';
import {SURFACES,notebookView,resolvePicnicMove,walkingStep,turnPlayer,navigationInput,nearSurface} from './trainer-game-state.js';
import {createCanvas,drawMap,drawCompass,drawRomer,drawVehicleInstruments,MAP_SIDE,SHEET_SIDE,COMPASS_WIDTH,COMPASS_LENGTH,ROMER_SIDE} from './trainer-art.js';
import {driveVehicle,vehicleAttitude,vehiclePoint,walkerHitsVehicle} from './trainer-vehicle.js';
const B=globalThis.BABYLON,RAD=Math.PI/180,ORIGIN=STATIONS[0],BASE=heightAt(ORIGIN.e,ORIGIN.n);
if(!B)throw Error('Babylon engine not loaded');
export class TrainerScene{
  constructor(canvas,state,{onError,onMove=()=>{},onModeChange=()=>{},onFrame=()=>{}}={}){
    this.canvas=canvas;this.state=state;this.onFrame=onFrame;this.onMove=onMove;this.onModeChange=onModeChange;this.keys=new Set();this.solution=false;this.mapZoom=1;this.mapKey='';this.compassKey='';this.shadowMeshes=[];this.lastShadow=0;this.time=0;this.renderCount=0;
    this.engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,powerPreference:'high-performance',adaptToDeviceRatio:false});
    this.engine.renderEvenInBackground=false;
    this.scene=new B.Scene(this.engine);this.scene.clearColor=new B.Color4(.58,.73,.78,1);this.scene.collisionsEnabled=true;
    this.scene.fogMode=B.Scene.FOGMODE_EXP2;this.scene.fogColor=new B.Color3(.70,.82,.86);this.scene.fogDensity=.00014;
    this.scene.ambientColor=new B.Color3(.18,.2,.16);
    this.camera=new B.UniversalCamera('player-view',new B.Vector3(0,1.68,0),this.scene);this.camera.minZ=.012;this.camera.maxZ=14000;this.camera.fov=1.02;this.camera.inputs.clear();this.camera.inertia=0;
    this.scene.activeCamera=this.camera;this.scene.imageProcessingConfiguration.toneMappingEnabled=true;this.scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;this.scene.imageProcessingConfiguration.exposure=1.12;this.scene.imageProcessingConfiguration.contrast=1.08;
    this.light=new B.HemisphericLight('sky-fill',new B.Vector3(0,1,0),this.scene);this.light.intensity=.95;this.light.groundColor=B.Color3.FromHexString('#778861');
    this.sun=new B.DirectionalLight('late-morning',new B.Vector3(.45,-1,.35).normalize(),this.scene);this.sun.intensity=1.8;this.sun.diffuse=B.Color3.FromHexString('#fff3d7');this.sun.shadowMinZ=1;this.sun.shadowMaxZ=120;this.sun.orthoLeft=-35;this.sun.orthoRight=35;this.sun.orthoTop=35;this.sun.orthoBottom=-35;this.sun.autoUpdateExtends=false;
    this.shadows=new B.ShadowGenerator(2048,this.sun);this.shadows.usePercentageCloserFiltering=true;this.shadows.filteringQuality=B.ShadowGenerator.QUALITY_MEDIUM;this.shadows.bias=.00012;this.shadows.normalBias=.025;
    this.land=new B.TransformNode('fictional-world',this.scene);
    this.materials={};
    this.body=B.MeshBuilder.CreateBox('player-collider',{width:.6,height:1.68,depth:.6},this.scene);this.body.isVisible=false;this.body.isPickable=false;this.body.ellipsoid=new B.Vector3(.3,.82,.3);this.body.ellipsoidOffset=new B.Vector3(0,.84,0);
    this.applyQuality();this.resizeObserver=new ResizeObserver(()=>{if(!this.resizeFrame)this.resizeFrame=requestAnimationFrame(()=>{this.resizeFrame=0;this.engine.resize();});});this.resizeObserver.observe(canvas);
    this.engine.onContextLostObservable.add(()=>onError?.('trContextLost'));
  }
  async initialize(progress=()=>{}){
    const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
    const stage=async(value,key,work)=>{progress({value,key});await paint();await work();};
    let rejectLoad;const failure=new Promise((resolve,reject)=>{rejectLoad=reject;});failure.catch(()=>{});
    const failures=[];const observer=B.Texture.OnTextureLoadErrorObservable.add(error=>{failures.push(error);rejectLoad(Error('A landscape texture could not be loaded'));});
    try{
      await stage(12,'fpLoadMaterials',()=>this.makeMaterials());
      await stage(18,'fpLoadPlaces',async()=>{this.models=new WorldModels(this);await this.models.load();});
      await stage(22,'fpLoadTerrain',()=>this.makeLandscape());
      await stage(36,'fpLoadWater',()=>{for(const road of ROAD_FEATURES)this.makeRoute(road);this.makeWaterways();});
      await stage(50,'fpLoadForest',()=>this.makeTrees());
      await stage(64,'fpLoadPlaces',async()=>{this.makeBuildings();await this.classroom?.loadPatches();this.tableAnchors=SURFACES.map((surface,i)=>this.makeTable(surface,i));});
      await stage(74,'fpLoadEquipment',()=>{this.makeEquipment();this.makeHands();this.makeVehicle();this.helicopterView=new HelicopterView(this);});
      await stage(82,'fpLoadDetails',()=>{this.makeLocalDetails();makeSettlementDetails(this);this.campaignScene=new CampaignScene(this);this.campaignScene.update(this.state);this.makeSky();for(const material of this.scene.materials)if('useLogarithmicDepth' in material)material.useLogarithmicDepth=true;});
      await stage(86,'fpLoadMap',()=>this.render(false));
      const report=()=>{const textures=this.scene.textures.filter(texture=>!texture.isRenderTarget),done=textures.filter(texture=>texture.isReady()).length;progress({value:86+Math.floor(done/Math.max(1,textures.length)*9),key:'fpLoadTextures',done,total:textures.length});};
      const timer=setInterval(report,150);report();
      const timeout=setTimeout(()=>rejectLoad(Error('Loading timed out: '+this.scene.textures.filter(texture=>!texture.isRenderTarget&&!texture.isReady()).map(texture=>texture.name).join(', '))),120000);
      try{await Promise.race([this.scene.whenReadyAsync(),failure]);}finally{clearInterval(timer);clearTimeout(timeout);}
      if(failures.length)throw Error('Landscape textures could not be loaded');
      progress({value:97,key:'fpLoadGraphics'});await paint();this.render();await paint();
      progress({value:100,key:'fpLoadReady'});
    }finally{B.Texture.OnTextureLoadErrorObservable.remove(observer);}
  }
  startLoop(){if(this.loopStarted)return;this.loopStarted=true;this.engine.runRenderLoop(()=>{const dt=Math.min(.05,this.engine.getDeltaTime()/1000);this.step(dt);this.render();});}
  mat(name,color,{texture=null,normal=null,repeat=1,roughness=.9,metallic=0}={}){
    const m=new B.PBRMaterial(name,this.scene);m.albedoColor=B.Color3.FromHexString(color);m.roughness=roughness;m.metallic=metallic;
    if(texture){m.albedoTexture=new B.Texture(new URL(`../../../assets/trainer/textures/${texture}`,import.meta.url).href+new URL(import.meta.url).search,this.scene);m.albedoTexture.wrapU=m.albedoTexture.wrapV=B.Texture.WRAP_ADDRESSMODE;m.albedoTexture.uScale=repeat;m.albedoTexture.vScale=repeat;m.albedoTexture.anisotropicFilteringLevel=8;}
    if(normal){m.bumpTexture=new B.Texture(new URL(`../../../assets/trainer/textures/${normal}`,import.meta.url).href+new URL(import.meta.url).search,this.scene);m.bumpTexture.wrapU=m.bumpTexture.wrapV=B.Texture.WRAP_ADDRESSMODE;m.bumpTexture.uScale=repeat;m.bumpTexture.vScale=repeat;m.bumpTexture.level=.65;m.invertNormalMapY=true;}
    return m;
  }
  procedural(name,base,draw){const c=createCanvas(512);const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,512,512);let seed=19;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};draw(ctx,random);const t=new B.DynamicTexture(name,c,this.scene,true);t.wrapU=t.wrapV=B.Texture.WRAP_ADDRESSMODE;t.update();t.anisotropicFilteringLevel=8;return t;}
  makeMaterials(){
    const m=this.materials;
    m.grass=this.mat('meadow-grass','#9fdf99',{texture:'meadow-diffuse.jpg',normal:'meadow-normal.jpg'});m.grass.bumpTexture.level=.24;
    m.wheat=this.mat('ripe-wheat','#cabd72');m.wheat.albedoTexture=this.procedural('crop-furrows','#a99a55',(c,r)=>{for(let y=0;y<512;y+=12){c.fillStyle=y%24?'#cabc75':'#b3a459';c.fillRect(0,y,512,8);for(let i=0;i<160;i++){c.fillStyle='#ddcd8c';c.fillRect(r()*512,y+r()*8,1,3);}}});
    m.ploughed=this.mat('ploughed-earth','#8b7154');m.ploughed.albedoTexture=this.procedural('earth-furrows','#81694e',(c,r)=>{for(let y=0;y<512;y+=16){c.fillStyle='#a38a66';c.fillRect(0,y,512,6);for(let i=0;i<90;i++){c.fillStyle='#665540';c.fillRect(r()*512,y+r()*14,2+r()*8,2);}}});
    m.forestFloor=this.mat('forest-leaf-litter','#c7d2b8',{texture:'grass-diffuse.jpg',normal:'grass-normal.jpg'});
    m.heath=this.mat('mountain-heath','#d6d5b8',{texture:'heath-diffuse.jpg',normal:'heath-normal.jpg'});
    m.outcrop=this.mat('exposed-rock','#b7b5ac',{normal:'gravel-normal.jpg'});m.outcrop.albedoTexture=this.procedural('fractured-rock','#95988f',(c,r)=>{for(let i=0;i<160;i++){c.fillStyle=['#a4a79f','#858b82','#b4b6aa','#737e76'][i%4];c.fillRect(r()*512,r()*512,25+r()*85,5+r()*35);}c.strokeStyle='#667069';c.lineWidth=2;for(let i=0;i<45;i++){const x=r()*512,y=r()*512;c.beginPath();c.moveTo(x,y);c.lineTo(x+20,y+15);c.lineTo(x+55,y+18);c.stroke();}});

    m.wood=this.mat('weathered-oak','#d8c3a0',{texture:'wood-diffuse.jpg',normal:'wood-normal.jpg',repeat:2});
    m.bark=this.mat('tree-bark','#d8c4a9',{texture:'bark-diffuse.jpg',normal:'bark-normal.jpg',repeat:2});
    m.leaf=this.mat('foliage','#90a98a');m.leaf.roughness=1;m.leaf.backFaceCulling=false;m.leaf.albedoTexture=this.procedural('oak-leaves','#516b46',(c,r)=>{for(let i=0;i<2600;i++){c.fillStyle=['#536d47','#5e7950','#496140','#668153'][i%4];c.beginPath();c.ellipse(r()*512,r()*512,3+r()*9,2+r()*5,r()*Math.PI,0,Math.PI*2);c.fill();}});m.leaf.albedoTexture.uScale=3;m.leaf.albedoTexture.vScale=4;
    m.dirt=this.mat('path-gravel','#e4dbca',{texture:'gravel-diffuse.jpg',normal:'gravel-normal.jpg'});m.dirt.bumpTexture.level=.35;
    m.wall=this.mat('chalk-plaster','#eadfc4',{texture:'plaster-diffuse.jpg',normal:'plaster-normal.jpg',repeat:3});m.wall.bumpTexture.level=.25;
    m.roof=this.mat('clay-roof-tiles','#e0b396',{texture:'roof-diffuse.jpg',normal:'roof-normal.jpg',repeat:4});m.roof.bumpTexture.level=.45;
    m.rock=m.dirt.clone('field-stone-material');m.rock.albedoColor=B.Color3.FromHexString('#a3b5a2');
    m.stone=this.mat('stone','#b0a38a');m.stone.albedoTexture=this.procedural('stone-blocks','#a29983',(c,r)=>{for(let y=0;y<512;y+=64)for(let x=0;x<512;x+=96){c.fillStyle=`rgb(${130+r()*35},${125+r()*30},${109+r()*25})`;c.fillRect(x+(y%128?48:0),y,92,60);}});
    m.dark=this.mat('dark-metal','#293d38',{metallic:.35,roughness:.5});m.metal=this.mat('rim-metal','#82938a',{metallic:.72,roughness:.3});m.window=this.mat('window-glass','#476f7a',{metallic:.35,roughness:.2});m.water=this.mat('lake-water','#4c8f9a',{metallic:.25,roughness:.3});
    m.asphalt=this.mat('road-asphalt','#59605c');m.asphalt.albedoTexture=this.procedural('asphalt-grain','#555b58',(c,r)=>{for(let i=0;i<18000;i++){const v=60+Math.floor(r()*60);c.fillStyle=`rgb(${v},${v+3},${v+2})`;c.fillRect(r()*512,r()*512,1+r()*2,1+r()*2);}});m.roadPaint=this.mat('road-marking','#e8e6cf');m.mud=this.mat('marsh-mud','#52644a');
    m.glove=this.mat('glove','#454d3a',{roughness:1});m.sleeve=this.mat('jacket','#716b48',{roughness:1});m.yellow=this.mat('pencil-yellow','#c6a453');
  }
  box(name,size,position,material,parent=this.land,{collision=false,shadow=true}={}){const o=B.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},this.scene);o.position.set(...position);o.material=material;o.parent=parent;o.checkCollisions=collision;o.receiveShadows=true;if(shadow)this.shadowMeshes.push(o);return o;}
  cylinder(name,diameterTop,diameterBottom,height,position,material,parent=this.land,tessellation=12){const o=B.MeshBuilder.CreateCylinder(name,{diameterTop,diameterBottom,height,tessellation},this.scene);o.position.set(...position);o.material=material;o.parent=parent;o.receiveShadows=true;this.shadowMeshes.push(o);return o;}
  local(e,n,y=heightAt(e,n)){return new B.Vector3(e-ORIGIN.e,y-BASE,n-ORIGIN.n);}
  toWorld(e,n,y=heightAt(e,n)){return B.Vector3.TransformCoordinates(this.local(e,n,y),this.land.getWorldMatrix());}
  fromWorld(v){const p=B.Vector3.TransformCoordinates(v,this.land.getWorldMatrix().clone().invert());return {e:p.x+ORIGIN.e,n:p.z+ORIGIN.n};}
  makeLandscape(){
    const vertices=[],uv=[],colors=[],indices=[],steps=450,size=WORLD_SIZE+1000,groups=Array.from({length:7},()=>[]),biomes=[];
    for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++){
      const e=-500+i*size/steps,n=-500+j*size/steps,h=heightAt(e,n);vertices.push(e-ORIGIN.e,h-BASE,n-ORIGIN.n);uv.push(e/4,n/4);
      const forest=h<415&&FORESTS.some(p=>inside({e,n},p)),marsh=inside({e,n},MARSH),field=FIELDS.find(p=>inside({e,n},p.polygon));
      const slope=Math.hypot(heightAt(e+8,n)-heightAt(e-8,n),heightAt(e,n+8)-heightAt(e,n-8))/16;
      biomes.push(inside({e,n},QUARRY.polygon)||h>510||slope>.6?3:h>310?4:marsh?5:forest?6:!forest&&field?.crop==='wheat'?1:!forest&&field?.crop==='ploughed'?2:0);
      const variation=.9+.08*Math.sin(e/83)*Math.cos(n/117)+.05*Math.sin((e+n)/231),shade=forest?.73:1;colors.push(variation*.94*shade,variation*shade,variation*.88*shade,1);
      if(i<steps&&j<steps){const a=j*(steps+1)+i,b=a+steps+1;indices.push(a,a+1,b,b,a+1,b+1);}
    }
    for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2];groups[biomes[a]].push(a,b,c);}
    const ordered=groups.flat(),data=new B.VertexData();data.positions=vertices;data.indices=ordered;data.uvs=uv;data.colors=colors;data.normals=[];B.VertexData.ComputeNormals(vertices,ordered,data.normals);
    this.terrain=new B.Mesh('terrain',this.scene);data.applyToMesh(this.terrain);const materials=new B.MultiMaterial('landscape-biomes',this.scene);materials.subMaterials=[this.materials.grass,this.materials.wheat,this.materials.ploughed,this.materials.outcrop,this.materials.heath,this.materials.mud,this.materials.forestFloor];for(const material of materials.subMaterials)material.backFaceCulling=true;this.terrain.material=materials;
    this.terrain.subMeshes=[];let offset=0;groups.forEach((group,i)=>{if(group.length)new B.SubMesh(i,0,vertices.length/3,offset,group.length,this.terrain);offset+=group.length;});this.terrain.parent=this.land;this.terrain.receiveShadows=true;
    this.terrainSteps=steps;this.terrainExtent=size;
    // A fan mesh uses exactly the same lake footprint as the map.
    const center={e:LAKE.reduce((v,p)=>v+p[0],0)/LAKE.length,n:LAKE.reduce((v,p)=>v+p[1],0)/LAKE.length},lakePos=[...this.local(center.e,center.n,LAKE_WATER_LEVEL).asArray()],lakeIndices=[];
    for(const [e,n]of LAKE)lakePos.push(...this.local(e,n,LAKE_WATER_LEVEL).asArray());for(let i=1;i<=LAKE.length;i++)lakeIndices.push(0,i,i===LAKE.length?1:i+1);
    const water=new B.Mesh('lake',this.scene),waterData=new B.VertexData();waterData.positions=lakePos;waterData.indices=lakeIndices;waterData.normals=[];B.VertexData.ComputeNormals(lakePos,lakeIndices,waterData.normals);waterData.applyToMesh(water);water.material=this.materials.water;water.material.backFaceCulling=false;water.parent=this.land;
  }
  terrainHeight(e,n){
    // Match the rendered triangles when attaching narrow streams and details.
    const spacing=this.terrainExtent/this.terrainSteps,x=(e+500)/spacing,z=(n+500)/spacing,i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j,e0=i*spacing-500,n0=j*spacing-500;
    const a=heightAt(e0,n0),b=heightAt(e0+spacing,n0),c=heightAt(e0,n0+spacing),d=heightAt(e0+spacing,n0+spacing);
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  makeRibbon(name,points,width,material,elevation){
    const positions=[],uvs=[],indices=[],samples=[];
    for(let j=1;j<points.length;j++){const a=points[j-1],b=points[j],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8);for(let i=0;i<count;i++){const f=i/count;samples.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,j-1,f]);}}samples.push([...points.at(-1),points.length-2,1]);
    samples.forEach(([e,n,index,f],i)=>{const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],dx=b[0]-a[0],dn=b[1]-a[1],len=Math.hypot(dx,dn)||1;for(const sign of [-1,1]){const x=e-dn/len*width/2*sign,z=n+dx/len*width/2*sign;positions.push(x-ORIGIN.e,elevation(x,z,index,f)-BASE,z-ORIGIN.n);uvs.push((x-ORIGIN.e)/6,(z-ORIGIN.n)/6);}if(i){const k=i*2;indices.push(k-2,k,k-1,k-1,k,k+1);}});
    const data=new B.VertexData();data.positions=positions;data.indices=indices;data.uvs=uvs;data.normals=[];B.VertexData.ComputeNormals(positions,indices,data.normals);const mesh=new B.Mesh(name,this.scene);data.applyToMesh(mesh);mesh.material=material;material.backFaceCulling=false;mesh.parent=this.land;mesh.receiveShadows=true;return mesh;
  }
  makeRoute(road){
    const top=(e,n)=>Math.max(this.terrainHeight(e,n),walkingHeightAt(e,n))+.075;
    if(road.kind==='street')this.makeRibbon('town-sidewalk',road.points,road.width+3.2,this.materials.stone,(e,n)=>top(e,n)-.025);
    this.makeRibbon(road.kind==='highway'?'asphalt-road':'gravel-track',road.points,road.width,road.kind==='track'?this.materials.dirt:this.materials.asphalt,top);
    if(road.kind==='highway'){
      const markings=[];
      for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d+3<length;d+=12){const at=t=>[a[0]+(b[0]-a[0])*t/length,a[1]+(b[1]-a[1])*t/length];markings.push(this.makeRibbon('centre-line',[at(d),at(d+3)],.13,this.materials.roadPaint,(e,n)=>top(e,n)+.012));}}
      const merged=B.Mesh.MergeMeshes(markings,true,true);if(merged){merged.name='road-centre-markings';merged.parent=this.land;}
    }
  }
  makeWaterways(){
    for(const course of WATERCOURSES){
      if(course.id==='stream')this.makeRibbon('stream-bank',course.points,course.width+5,this.materials.dirt,(e,n)=>this.terrainHeight(e,n)+.08);
      const surface=this.makeRibbon(course.id==='river'?'Blaulach':'Strahlbach',course.points,course.width,this.materials.water,(e,n,i,f)=>course.id==='river'?waterLevel(course,i,f):this.terrainHeight(e,n)+.10);surface.metadata={watercourse:course.id};
    }
    for(const bridge of BRIDGES){
      const g=new B.TransformNode('Kupplungsbrücke',this.scene);g.parent=this.land;g.position=this.local(bridge.e,bridge.n,bridge.height);
      this.box('bridge-deck',[bridge.length,.6,bridge.width],[0,-.3,0],this.materials.stone,g);
      for(const sign of [-1,1]){
        this.box('bridge-guardrail',[bridge.length,.22,.16],[0,.85,sign*(bridge.width/2-.15)],this.materials.metal,g,{collision:true});
        for(let x=-bridge.length/2+2;x<bridge.length/2;x+=5)this.box('bridge-rail-post',[.13,1.05,.13],[x,.53,sign*(bridge.width/2-.15)],this.materials.metal,g,{shadow:false});
      }
      for(const x of [-15,15])this.box('bridge-pier',[2.5,4,bridge.width-1],[x,-2.2,0],this.materials.stone,g);
    }
    // Wet meadow colours, shallow pools and reeds identify the Führungssumpf.
    for(let i=0;i<22;i++){const e=4830+(i*137)%560,n=5000+(i*211)%700;if(!inside({e,n},MARSH))continue;const pool=B.MeshBuilder.CreateDisc('marsh-pool',{radius:5+i%7,tessellation:20,sideOrientation:B.Mesh.DOUBLESIDE},this.scene);pool.parent=this.land;pool.position=this.local(e,n,this.terrainHeight(e,n)+.1);pool.rotation.x=Math.PI/2;pool.scaling.x=1.7;pool.material=this.materials.water;}
  }
  makeTrees(){
    const trunk=B.MeshBuilder.CreateCylinder('tree-trunk-template',{diameterTop:.36,diameterBottom:.75,height:1,tessellation:7},this.scene);trunk.material=this.materials.bark;
    const tiers=[];for(let j=0;j<3;j++){const cone=B.MeshBuilder.CreateCylinder('pine-tier',{diameterTop:0,diameterBottom:12-j*2.5,height:.58,tessellation:9},this.scene);cone.position.y=.35+j*.18;tiers.push(cone);}
    let crown=B.Mesh.MergeMeshes(tiers,true,true);crown.name='tree-crown-template';crown.material=this.materials.leaf;trunk.setEnabled(false);crown.setEnabled(false);
    const lobes=[];for(let i=0;i<4;i++){const leaf=B.MeshBuilder.CreateIcoSphere('broadleaf-lobe',{radius:1,subdivisions:2},this.scene);leaf.scaling.set(i===0?5.8:4.5,i===0?.23:.18,i===0?5.6:4.3);leaf.position.set(Math.sin(i*2.1)*2,.55+i*.065,Math.cos(i*2.1)*2);lobes.push(leaf);}let broadleaf=B.Mesh.MergeMeshes(lobes,true,true);broadleaf.material=this.materials.leaf;broadleaf.setEnabled(false);

    const farCrown=crown;
    const treeTemplate=(key,width)=>{const source=this.models.templates.get('nature-kit/'+key),mesh=source.mesh.clone(key+'-forest-template',null,true);mesh.makeGeometryUnique();const a=source.min,b=source.max;mesh.bakeTransformIntoVertices(B.Matrix.Translation(-(a[0]+b[0])/2,-a[1],-(a[2]+b[2])/2).multiply(B.Matrix.Scaling(width/(b[0]-a[0]),1/(b[1]-a[1]),width/(b[2]-a[2]))));mesh.setEnabled(false);return mesh;};
    crown=treeTemplate('tree_pineTallA',9);broadleaf=treeTemplate('tree_oak',12);
    const chunks=new Map();for(const tree of TREES){const key=`${Math.floor(tree.e/240)},${Math.floor(tree.n/240)}`;if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(tree);}
    this.forestChunks=[];
    for(const trees of chunks.values()){
      const full=[],leaves=[],stems=[],distant=[];
      trees.forEach((tree,i)=>{const h=tree.height,y=heightAt(tree.e,tree.n)-BASE,e=tree.e-ORIGIN.e,n=tree.n-ORIGIN.n;stems.push(...B.Matrix.Compose(new B.Vector3(1,h*.55,1),B.Quaternion.Identity(),new B.Vector3(e,y+h*.275,n)).asArray());(tree.species==='broadleaf'?leaves:full).push(...B.Matrix.Compose(new B.Vector3(1,h,1),B.Quaternion.RotationYawPitchRoll(i,0,0),new B.Vector3(e,y,n)).asArray());if(Math.sin(tree.e*.73+tree.n*.33)>.8)distant.push(...B.Matrix.Compose(new B.Vector3(2.0,h,2.0),B.Quaternion.Identity(),new B.Vector3(e,y,n)).asArray());});
      const nodes=[];for(const [template,matrices,name]of [[trunk,stems,'woodland-trunks'],[crown,full,'dense-woodland'],[farCrown,distant,'distant-woodland'],[broadleaf,leaves,'broadleaf-woodland']]){const mesh=template.clone(name,null,true);mesh.makeGeometryUnique();mesh.parent=this.land;mesh.metadata={treeCount:matrices.length/16};if(matrices.length){mesh.thinInstanceSetBuffer('matrix',new Float32Array(matrices),16);mesh.thinInstanceRefreshBoundingInfo(true);}mesh.receiveShadows=true;nodes.push(mesh);}
      const tree=trees[Math.floor(trees.length/2)];this.forestChunks.push({e:tree.e,n:tree.n,nodes});
    }
  }
  makeBuildings(){
    for(const p of BUILDINGS)if(!p.service&&!p.servicePart&&!p.industrial)this.house(p.e,p.n,p.w,p.d,p.h,p.name,p.angle);
    this.makeCivicBuildings();
    makeIndustrialDistrict(this);this.fireTraining=makeFireTraining(this);
    this.rotors=[];
    for(const m of LANDMARKS){const g=new B.TransformNode(m.id,this.scene);g.parent=this.land;g.position=this.local(m.e,m.n);const mat=this.materials;
      if(m.kind==='church'){this.box('church-nave',[28,18,45],[0,9,0],mat.wall,g,{collision:true});this.roof(g,30,48,18,12);this.box('church-tower',[11,m.height*.65,11],[0,m.height*.325,-18],mat.stone,g,{collision:true});this.cylinder('steeple',0,16,m.height*.35,[0,m.height*.825,-18],mat.dark,g,4);this.box('cross',[1,7,1],[0,m.height+3,-18],mat.metal,g);this.box('crossbar',[4,1,1],[0,m.height+4,-18],mat.metal,g);}
      else if(m.kind==='tower'){this.cylinder('watchtower',17,23,m.height-10,[0,(m.height-10)/2,0],mat.stone,g,16).checkCollisions=true;this.box('tower-platform',[27,5,27],[0,m.height-12,0],mat.wood,g);this.cylinder('tower-roof',0,32,15,[0,m.height-2,0],mat.roof,g,8);}
      else if(m.kind==='water'){this.cylinder('water-column',9,14,m.height-19,[0,(m.height-19)/2,0],mat.stone,g,12).checkCollisions=true;this.cylinder('water-tank',34,30,18,[0,m.height-10,0],mat.metal,g,20);this.cylinder('tank-cap',0,35,6,[0,m.height+2,0],mat.dark,g,20);}
      else if(m.kind==='mast'){this.cylinder('mast',.6,2.4,m.height,[0,m.height/2,0],mat.metal,g,8);for(let y=15;y<m.height;y+=15){this.box('antenna',[10,.6,.6],[0,y,0],mat.metal,g);this.box('antenna',[.6,.6,10],[0,y,0],mat.metal,g);}}
      else if(m.kind==='turbine'){
        const white=this.materials.wall,hub=m.height-34;this.cylinder('wind-turbine-tower',2.4,5.5,hub,[0,hub/2,0],white,g,16).checkCollisions=true;this.box('turbine-nacelle',[4,4,10],[0,hub,1],white,g);
        const rotor=new B.TransformNode('wind-turbine-rotor',this.scene);rotor.parent=g;rotor.position.set(0,hub,-4.5);this.cylinder('rotor-hub',2,2,2,[0,0,0],this.materials.metal,rotor);
        for(let i=0;i<3;i++){const arm=new B.TransformNode('rotor-blade',this.scene);arm.parent=rotor;arm.rotation.z=i*Math.PI*2/3;const blade=this.box('tapered-blade',[1.8,31,.45],[0,17,0],white,arm);blade.rotation.z=.035;this.box('red-blade-tip',[1.85,3,.48],[0,31,0],this.materials.yellow,arm);}
        this.rotors.push(rotor);
      }else if(m.kind==='summit'){
        this.box('summit-cross',[.6,12,.6],[0,6,0],mat.wood,g,{collision:true});this.box('summit-crossbar',[6,.6,.6],[0,9,0],mat.wood,g);
      }else if(m.kind==='castle'||m.kind==='ruin'){
        const ruined=m.kind==='ruin',h=m.height;this.box('castle-keep',[14,h,14],[0,h/2,0],mat.stone,g,{collision:true});
        for(const x of [-24,24])for(const z of [-20,20]){this.cylinder('castle-tower',9,11,ruined?h*.45:h*.7,[x,ruined?h*.225:h*.35,z],mat.stone,g,12).checkCollisions=true;if(!ruined)this.cylinder('castle-roof',0,13,10,[x,h*.7+5,z],mat.roof,g,12);}
        for(const x of [-24,24])this.box('castle-curtain-wall',[2,ruined?4:10,40],[x,ruined?2:5,0],mat.stone,g,{collision:true});
        for(let x=-24;x<=24;x+=6)this.box('battlement',[2,2,2],[x,ruined?5:11,20],mat.stone,g);
        this.box('castle-back-wall',[48,ruined?4:10,2],[0,ruined?2:5,20],mat.stone,g,{collision:true});
      }else if(m.kind==='radar'){
        this.cylinder('radar-tower',6,9,33,[0,16.5,0],mat.wall,g,12).checkCollisions=true;const dome=B.MeshBuilder.CreateSphere('radar-dome',{diameter:28,segments:16},this.scene);dome.parent=g;dome.position.y=34;dome.material=mat.wall;this.box('radar-service-building',[24,5,15],[22,2.5,0],mat.wall,g,{collision:true});
      }else if(m.kind==='silo'){
        for(const x of [-10,0,10]){this.cylinder('farm-silo',8,8,28,[x,14,0],mat.metal,g,16).checkCollisions=true;this.cylinder('silo-cap',0,8.5,4,[x,30,0],mat.metal,g,16);}
      }else if(m.kind==='chimney'){
        this.cylinder('brick-chimney',3,6,m.height,[0,m.height/2,0],mat.roof,g,12).checkCollisions=true;this.box('abandoned-pump-building',[26,8,18],[20,4,0],mat.stone,g,{collision:true});this.roof(g,28,20,8,6);
      }
      else{this.cylinder('windmill-body',13,21,25,[0,12.5,0],mat.wall,g,12);this.cylinder('mill-roof',0,25,13,[0,31,0],mat.dark,g,12);const blades=new B.TransformNode('mill-blades',this.scene);blades.parent=g;blades.position.set(0,25,-11);blades.rotation.z=.55;this.box('blade',[2.2,45,.8],[0,0,0],mat.wood,blades);this.box('blade',[45,2.2,.8],[0,0,0],mat.wood,blades);}
    }
  }
  roof(parent,w,d,base,h){const pos=[-w/2,base,-d/2,w/2,base,-d/2,0,base+h,-d/2,-w/2,base,d/2,w/2,base,d/2,0,base+h,d/2],idx=[0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4],vd=new B.VertexData();vd.positions=pos;vd.indices=idx;vd.normals=[];vd.uvs=[0,0,1,0,.5,1,0,0,1,0,.5,1];B.VertexData.ComputeNormals(pos,idx,vd.normals);const o=new B.Mesh('pitched-roof',this.scene);vd.applyToMesh(o);o.material=this.materials.roof;o.material.backFaceCulling=false;o.parent=parent;this.shadowMeshes.push(o);return o;}
  house(e,n,w,d,h,name,angle=0){
    const seed=Math.abs(Math.round(e*7+n*11)),commercial=name==='Sankt Florian'&&seed%5<2;
    const key=commercial?'city-kit-commercial/building-'+ 'abcdefghijklmn'[seed%14]:'city-kit-suburban/building-type-'+ 'abcdefghijklmnopqrstu'[seed%21];
    return this.models.place(key,{e,n,w,d,h,angle:angle+180,collision:true});
  }
  signBoard(name,label,width,height,parent,position,color='#254e70',angle=0){
    const art=this.dynamicMaterial(name+'-lettering',Math.min(4096,Math.max(512,Math.ceil(width/height*256))),256);const c=art.canvas.getContext('2d'),tw=art.canvas.width;c.fillStyle=color;c.fillRect(0,0,tw,256);c.strokeStyle='#f1f1e8';c.lineWidth=8;c.strokeRect(6,6,tw-12,244);c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.font=`bold ${Math.min(155,(tw-40)/Math.max(1,label.length)/.62)}px sans-serif`;c.fillText(label,tw/2,128,tw-30);art.texture.update();
    const mesh=B.MeshBuilder.CreatePlane(name,{width,height,sideOrientation:B.Mesh.DOUBLESIDE},this.scene);mesh.parent=parent;mesh.position.set(...position);mesh.rotation.y=angle;mesh.material=art.mat;return mesh;
  }
  makeCivicBuildings(){
    const m=this.materials;
    for(const p of SERVICE_SITES){
      if(p.interior){this.classroom=new TrainingRoom(this);continue;}
      const g=new B.TransformNode(p.id+'-campus',this.scene);g.parent=this.land;g.position=this.local(p.e,p.n);g.rotation.y=(p.angle||0)*RAD;
      const accent=this.mat(p.id+'-accent',p.color),light=this.mat(p.id+'-cladding','#e2e6e1'),paving=this.mat(p.id+'-paving','#929895');
      const yard=B.MeshBuilder.CreateGround(p.id+'-forecourt',{width:p.w+14,height:68,subdivisions:16,updatable:true},this.scene);yard.parent=g;yard.position.set(0,.07,-14);yard.material=paving;const vertices=yard.getVerticesData(B.VertexBuffer.PositionKind);for(let i=0;i<vertices.length;i+=3)vertices[i+1]=this.terrainHeight(sitePoint(p,vertices[i],vertices[i+2]-14).e,sitePoint(p,vertices[i],vertices[i+2]-14).n)-heightAt(p.e,p.n)+.09;yard.updateVerticesData(B.VertexBuffer.PositionKind,vertices);yard.refreshBoundingInfo();
      if(p.id==='hospital'){
        for(let i=0;i<3;i++)this.models.place('city-kit-commercial/building-'+['k','n','j'][i],{w:28,d:p.d,h:p.h+(i===1?0:-3),parent:g,position:new B.Vector3((i-1)*28,0,0),collision:true});
      }else{this.box(p.id+'-building',[p.w,p.h,p.d],[0,p.h/2,0],light,g,{collision:true});this.box('flat-roof',[p.w+1,.45,p.d+1],[0,p.h+.2,0],m.dark,g);}
      this.box('facade-accent',[p.w,.7,.18],[0,p.h-1,-p.d/2-.12],accent,g);
      if(p.id==='fire'||p.id==='thw'||p.id==='rescue'){
        for(const [i,bay] of hallBays(p).entries()){const {x,width}=bay;this.box('sectional-door',[width,4.8,.16],[x,2.4,-p.d/2-.1],accent,g);this.box('door-glazing',[width-.5,1,.08],[x,3.3,-p.d/2-.21],m.window,g);for(let y=.8;y<4.8;y+=.8)this.box('door-joint',[width,.035,.04],[x,y,-p.d/2-.2],m.metal,g);this.signBoard('bay-number',String(i+1),.5,.3,g,[x,5.2,-p.d/2-.23]);}
      }else if(p.id!=='hospital'){
        for(let floor=0;floor<(p.id==='hospital'?3:2);floor++)for(let x=-p.w/2+4;x<p.w/2-2;x+=5)this.box('civic-window',[2.4,1.8,.12],[x,2.8+floor*4,-p.d/2-.12],m.window,g);
        this.box('entrance-canopy',[11,.3,5],[0,3,-p.d/2-2],accent,g);this.box('glass-entry',[4,2.8,.16],[0,1.4,-p.d/2-.2],m.window,g);
      }
      if(p.id==='hospital'){
        this.signBoard('clinic-courtyard-name',p.name,27,1.5,g,[0,p.h-3.5,-p.d/2-.2],p.color);
        this.box('clinic-north-canopy',[14,.35,6],[0,3,-p.d/2-2.5],accent,g);
        this.box('clinic-north-doors',[5,2.8,.15],[0,1.4,-p.d/2-.1],m.window,g);
      }
      this.signBoard(p.id+'-name',p.name,Math.min(26,p.w*.72),1.2,g,[0,p.h-.6,-p.d/2-.25],p.color);
      if(p.id==='fire'){
        this.box('hose-tower',[9,24,9],[32,12,28],light,g,{collision:true});this.box('tower-cap',[10,.6,10],[32,24,28],accent,g);for(let y=5;y<23;y+=4)for(const x of [30,34])this.box('hose-drying-louvre',[.8,2.5,.2],[x,y,23.4],m.dark,g);
      }
      if(p.id==='thw'){
        this.box('thw-administration',[34,8,30],[0,4,32],light,g,{collision:true});this.box('admin-roof',[35,.5,31],[0,8.2,32],m.dark,g);this.signBoard('thw-admin-sign','THW · Ortsverband',25,1.3,g,[0,6.6,16.85],p.color);
        for(let y=2;y<8;y+=3.8)for(let x=-13;x<17;x+=5)this.box('admin-window',[2.4,1.6,.12],[x,y,16.88],m.window,g);
        for(let x=-35;x<36;x+=8)for(let z=-10;z<12;z+=8){const panel=this.box('photovoltaic-panel',[6,.12,5],[x,p.h+.7,z],m.window,g);panel.rotation.x=-.18;}
        this.box('heat-pump',[2,1.6,1],[-19,.8,32],m.metal,g);
      }
      // Marked parking bays and a few landscaped strips give each campus an address.
      for(let x=-p.w/2;x<p.w/2;x+=3)this.box('parking-stripe',[.09,.03,5],[x,.11,-40],light,g);
      for(const x of [-p.w/2-3,p.w/2+3])this.box('planted-verge',[1.5,.2,20],[x,.12,-6],m.grass,g);
    }
  }
  makeRoadSigns(){
    for(const p of [...STREET_SIGNS,...TOWN_SIGNS]){
      const town=Object.hasOwn(p,'angle'),g=new B.TransformNode(town?'town-entry':'street-sign',this.scene);g.parent=this.land;g.position=this.local(p.e,p.n);g.rotation.y=(p.angle||0)*Math.PI/180;
      this.box('galvanised-post',[.075,2.7,.075],[0,1.35,0],this.materials.metal,g);
      this.signBoard('road-name',p.name,town?1.5:2.2,town?1:.36,g,[0,2.4,-.05],town?'#d9ad27':'#214d74');
      if(town)this.signBoard('district','Landkreis Lage',1.2,.22,g,[0,2.1,-.06],'#d9ad27');
    }
  }
  makeTable(p,i){
    if(p.kind==='classroom')return makeClassroomDesk(this,p,i);
    const g=new B.TransformNode(p.id,this.scene);g.parent=this.land;g.position=this.local(p.e,p.n);const m=this.materials;
    const pad=B.MeshBuilder.CreateGround('picnic-gravel-pad',{width:4.5,height:3.4,subdivisions:4},this.scene);pad.parent=this.land;pad.position=this.local(p.e,p.n,heightAt(p.e,p.n)+.04);pad.material=m.dirt;pad.receiveShadows=true;
    for(let plank=0;plank<5;plank++){const top=this.box('picnic-table-plank',[p.width,.065,p.depth/5-.009],[0,p.height-.035,-p.depth/2+(plank+.5)*p.depth/5],m.wood,g,{collision:false});top.checkCollisions=true;top.metadata={surface:i};}
    for(const x of [-.59,.59]){
      for(const sign of [-1,1]){const leg=this.box('picnic-a-frame',[.095,.76,.095],[x,.36,sign*.34],m.wood,g,{collision:false});leg.rotation.x=sign*.33;}
      this.box('bench-cross-support',[.11,.10,2.08],[x,.35,0],m.wood,g,{collision:false});
    }
    for(const sign of [-1,1])for(let plank=0;plank<2;plank++)this.box('picnic-bench-plank',[p.width+.22,.065,.15],[0,.445,sign*(.76+plank*.16)],m.wood,g,{collision:true});
    this.box('table-longitudinal-brace',[1.3,.08,.07],[0,.28,0],m.wood,g);const anchor=new B.TransformNode('table-map-anchor',this.scene);anchor.parent=g;anchor.position.y=p.height+.004;return anchor;
  }
  onTrack(e,n,clearance=3){for(const road of ROADS)for(let i=1;i<road.length;i++){const [ax,az]=road[i-1],[bx,bz]=road[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((e-ax)*dx+(n-az)*dz)/(dx*dx+dz*dz)));if(Math.hypot(e-ax-dx*t,n-az-dz*t)<clearance)return true;}return false;}
  makeCountryDetails(){
    const m=this.materials;
    for(const p of VIEWPOINTS){
      const g=new B.TransformNode('viewpoint-'+p.name,this.scene);g.parent=this.land;g.position=this.local(p.e,p.n);
      this.box('viewpoint-seat',[2,.13,.4],[0,.48,0],m.wood,g);this.box('viewpoint-back',[2,.45,.09],[0,.8,.17],m.wood,g);for(const x of [-.7,.7])this.box('bench-support',[.12,.5,.4],[x,.25,0],m.metal,g);
      this.box('wayfinding-post',[.12,2.2,.12],[2,1.1,0],m.wood,g);this.signBoard('viewpoint-name',p.name,1.5,.32,g,[2,2,-.08],'#375e49');
    }
    // Boulders and rocky faces break up silhouettes around summits and quarry benches.
    const locations=[];for(let i=0;i<180;i++){const a=i*2.399,r=100+(i%23)*12,e=6750+Math.cos(a)*r,n=6500+Math.sin(a)*r;if(heightAt(e,n)>390&&!this.onTrack(e,n,5))locations.push({e,n,size:2+i%7});}
    for(let i=0;i<45;i++){const a=i*2.399,r=110+i%7*18;locations.push({e:QUARRY.e+Math.cos(a)*r,n:QUARRY.n+Math.sin(a)*r,size:1+i%6});}
    for(const [i,p]of locations.entries()){const rock=B.MeshBuilder.CreateIcoSphere('mountain-boulder',{radius:p.size,subdivisions:1},this.scene);rock.parent=this.land;rock.position=this.local(p.e,p.n,heightAt(p.e,p.n)+p.size*.12);rock.scaling.set(1.5,.7,1);rock.rotation.y=i;rock.material=m.outcrop;rock.checkCollisions=true;}
    for(const [i,field]of FIELDS.entries()){
      // Hedgerows and occasional hay bales make field boundaries visible on the ground.
      const [a,b]=field.polygon;
      for(let j=0;j<10;j++){const e=a[0]+(b[0]-a[0])*j/10,n=a[1]+(b[1]-a[1])*j/10;if(this.onTrack(e,n,8))continue;const hedge=B.MeshBuilder.CreateIcoSphere('field-hedge',{radius:2.6,subdivisions:1},this.scene);hedge.parent=this.land;hedge.position=this.local(e,n,heightAt(e,n)+1);hedge.scaling.set(1.8,.6,1);hedge.material=m.leaf;}
      if(field.crop==='wheat')for(let j=0;j<6;j++){const e=a[0]+60+j*43,n=a[1]+100+(j%2)*40;if(!inside({e,n},field.polygon))continue;const bale=this.cylinder('round-hay-bale',2.2,2.2,1.5,this.local(e,n,heightAt(e,n)+1.1).asArray(),m.wheat,this.land,12);bale.rotation.z=Math.PI/2;}
    }
    const g=new B.TransformNode('quarry-workplace',this.scene);g.parent=this.land;g.position=this.local(7040,3295);this.box('quarry-cabin',[6,2.8,2.8],[0,1.4,0],m.metal,g,{collision:true});this.signBoard('quarry-warning','TRÜMMERBRUCH · Betreten auf eigene Lage',4,.5,g,[0,2,-1.45],'#ad7a25');
  }
  makeWorldFence(){
    // The existing walking/driving bounds stop the player inside this visible perimeter.
    const inset=8,span=WORLD_SIZE-inset*2,spacing=4,height=2.55;
    const texture=this.procedural('chain-link-wire','rgba(0,0,0,0)',c=>{
      c.clearRect(0,0,512,512);c.strokeStyle='#596c71';c.lineWidth=10;
      for(let x=-512;x<=1024;x+=128){c.beginPath();c.moveTo(x,0);c.lineTo(x+512,512);c.moveTo(x,0);c.lineTo(x-512,512);c.stroke();}
    });texture.hasAlpha=true;texture.wrapU=texture.wrapV=B.Texture.WRAP_ADDRESSMODE;texture.updateSamplingMode(B.Texture.BILINEAR_SAMPLINGMODE);
    const meshMaterial=new B.StandardMaterial('galvanised-chain-link',this.scene);meshMaterial.diffuseTexture=texture;meshMaterial.useAlphaFromDiffuseTexture=true;meshMaterial.transparencyMode=B.Material.MATERIAL_ALPHATEST;meshMaterial.backFaceCulling=false;meshMaterial.specularColor=new B.Color3(.3,.33,.35);
    const steel=this.mat('perimeter-galvanised-steel','#88969b',{metallic:.6,roughness:.45});
    const post=B.MeshBuilder.CreateCylinder('boundary-posts',{diameter:.075,height:height+.25,tessellation:6},this.scene);post.parent=this.land;post.material=steel;
    const postMatrices=[],messages=['ENDE DER WELT','HIC SUNT DRACONES','Ab hier: unklare Lage','Bitte nicht am Kartenrand lehnen','Sie verlassen den Übungsbereich','Hier endet der kurze Dienstweg','Drachen bitte über Funk anmelden','Jenseits: nicht maßstabsgetreu'];
    const signTemplates=messages.map((label,i)=>{const plane=this.signBoard('world-edge-warning-'+i,label,2.3,.55,this.land,[0,0,0],i%2?'#d0a42b':'#833727');plane.setEnabled(false);return plane;});
    const edges=[{e:inset,n:inset,de:1,dn:0,angle:Math.PI},{e:WORLD_SIZE-inset,n:inset,de:0,dn:1,angle:Math.PI/2},{e:WORLD_SIZE-inset,n:WORLD_SIZE-inset,de:-1,dn:0,angle:0},{e:inset,n:WORLD_SIZE-inset,de:0,dn:-1,angle:-Math.PI/2}];
    this.boundaryChunks=[];
    for(const [side,edge]of edges.entries()){
      const at=d=>({e:edge.e+edge.de*d,n:edge.n+edge.dn*d});
      for(let d=0;d<=span;d+=spacing){const p=at(d);postMatrices.push(...B.Matrix.Translation(p.e-ORIGIN.e,this.terrainHeight(p.e,p.n)-BASE+height/2,p.n-ORIGIN.n).asArray());}
      for(let start=0;start<span;start+=128){
        const end=Math.min(span,start+128),positions=[],uvs=[],indices=[],coil=[],blades=[],rail=[];
        for(let d=start;d<=end;d=Math.min(end,d+spacing)){
          const p=at(d),base=this.terrainHeight(p.e,p.n),index=positions.length/3;
          positions.push(p.e-ORIGIN.e,base-BASE,p.n-ORIGIN.n,p.e-ORIGIN.e,base+height-BASE,p.n-ORIGIN.n);uvs.push(d/.64,0,d/.64,height/.64);
          if(index)indices.push(index-2,index-1,index,index-1,index+1,index);
          rail.push(this.local(p.e,p.n,base+height));if(d===end)break;
        }
        // Concertina coil follows the terrain, with crossed razor barbs on the loops.
        const count=Math.ceil((end-start)/.65*12);
        for(let i=0;i<=count;i++){
          const d=start+(end-start)*i/count,p=at(d),a=d/.65*Math.PI*2,r=.24;
          const center=this.local(p.e-edge.dn*Math.cos(a)*r,p.n+edge.de*Math.cos(a)*r,this.terrainHeight(p.e,p.n)+height+.24+Math.sin(a)*r);coil.push(center);
          if(i%6===0){const delta=new B.Vector3(.07,.08,.035);blades.push([center.subtract(delta),center.add(delta)],[center.add(new B.Vector3(-.07,.08,-.035)),center.add(new B.Vector3(.07,-.08,.035))]);}
        }
        const data=new B.VertexData();data.positions=positions;data.uvs=uvs;data.indices=indices;data.normals=[];B.VertexData.ComputeNormals(positions,indices,data.normals);
        const fence=new B.Mesh('world-boundary-chain-link',this.scene);data.applyToMesh(fence);fence.parent=this.land;fence.material=meshMaterial;
        const wire=B.MeshBuilder.CreateLineSystem('concertina-razor-wire',{lines:[rail,coil,...blades]},this.scene);wire.parent=this.land;wire.color=new B.Color3(.52,.58,.61);
        const center=at((start+end)/2);this.boundaryChunks.push({...center,nodes:[fence,wire]});
      }
      for(let d=32;d<span;d+=256){const p=at(d),i=(Math.floor(d/256)+side*3)%messages.length,sign=signTemplates[i].clone('boundary-warning',this.land);sign.setEnabled(true);sign.position=this.local(p.e-edge.dn*.08,p.n+edge.de*.08,this.terrainHeight(p.e,p.n)+1.9);sign.rotation.y=edge.angle;}
    }
    post.thinInstanceSetBuffer('matrix',new Float32Array(postMatrices),16);post.thinInstanceRefreshBoundingInfo(true);
  }
  makeLocalDetails(){
    this.makeRoadSigns();
    this.makeWorldFence();
    this.makeCountryDetails();
    const p=STATIONS[0],m=this.materials;
    for(let i=0;i<14;i++){const e=p.e-12+(i*7.13)%25,n=p.n+7+(i*3.77)%18;if(SURFACES.some(p=>Math.hypot(p.e-e,p.n-n)<3))continue;const rock=B.MeshBuilder.CreateIcoSphere('field-stone',{radius:.16+i%4*.1,subdivisions:1},this.scene);rock.parent=this.land;rock.position=this.local(e,n,heightAt(e,n)+.08);rock.scaling.set(1.3,.6,1);rock.rotation.y=i;rock.material=m.rock;rock.checkCollisions=true;this.shadowMeshes.push(rock);}
    const post=this.box('sign-post',[.09,1.7,.09],this.local(p.e-1.9,p.n+2.6,heightAt(p.e-1.9,p.n+2.6)+.85).asArray(),m.wood,this.land,{collision:true});
    const sign=this.box('field-sign',[.9,.34,.045],[post.position.x,post.position.y+.55,post.position.z],m.wood,this.land);const text=new B.DynamicTexture('field-station-sign',{width:1024,height:384},this.scene,false),ctx=text.getContext();ctx.fillStyle='#304b3e';ctx.fillRect(0,0,1024,384);ctx.strokeStyle='#b7b58e';ctx.lineWidth=12;ctx.strokeRect(20,20,984,344);ctx.fillStyle='#e8e2bc';ctx.font='bold 100px sans-serif';ctx.textAlign='center';ctx.fillText('SANKT FLORIAN',512,150);ctx.font='42px sans-serif';ctx.fillText('ORIENTIERUNG · TRAINING',512,240);text.update();const face=B.MeshBuilder.CreatePlane('sign-face',{width:.86,height:.3},this.scene);face.parent=this.land;face.position.set(sign.position.x,sign.position.y,sign.position.z-.026);const fm=new B.StandardMaterial('sign-lettering',this.scene);fm.diffuseTexture=text;fm.emissiveColor=new B.Color3(.18,.18,.15);fm.specularColor=B.Color3.Black();face.material=fm;
    // Long grass tufts use a tiny local alpha texture and thin instances.
    const tex=this.procedural('grass-blades','rgba(0,0,0,0)',(c,r)=>{c.clearRect(0,0,512,512);for(let i=0;i<28;i++){const x=r()*512;c.strokeStyle=i%2?'#63954b':'#92b76a';c.lineWidth=3+r()*5;c.beginPath();c.moveTo(x,512);c.quadraticCurveTo(x-30,250,x+(r()-.5)*150,30+r()*240);c.stroke();}});tex.hasAlpha=true;
    const grassMat=new B.StandardMaterial('grass-tufts',this.scene);grassMat.diffuseTexture=tex;grassMat.useAlphaFromDiffuseTexture=true;grassMat.backFaceCulling=false;grassMat.transparencyMode=B.Material.MATERIAL_ALPHATEST;grassMat.specularColor=B.Color3.Black();
    const tuft=B.MeshBuilder.CreatePlane('grass-detail',{width:.55,height:.45},this.scene);tuft.parent=this.land;tuft.material=grassMat;const matrices=[];
    for(let i=0;i<1100;i++){const e=p.e-30+(i*2.719)%60,n=p.n-25+(i*7.135)%60;if(this.onTrack(e,n,3)||SURFACES.some(p=>Math.hypot(p.e-e,p.n-n)<2.8))continue;matrices.push(...B.Matrix.Compose(B.Vector3.One(),B.Quaternion.RotationYawPitchRoll(i*2.4,0,0),this.local(e,n,heightAt(e,n)+.225)).asArray());}// Local roadside clusters keep detail close to the places a walker actually visits.
    for(const road of ROAD_FEATURES)for(let j=1;j<road.points.length;j++){const a=road.points[j-1],b=road.points[j],dx=b[0]-a[0],dn=b[1]-a[1],length=Math.hypot(dx,dn);for(let d=10;d<length;d+=70)for(let k=0;k<22;k++){const sign=k%2?1:-1,offset=road.width/2+1+(k*1.71)%6,e=a[0]+dx*d/length-dn/length*sign*offset+Math.sin(k*7)*6,n=a[1]+dn*d/length+dx/length*sign*offset+Math.cos(k*3)*6;if(onPavedSite(e,n)||this.onTrack(e,n,road.width/2+.6)||heightAt(e,n)>420||BUILDINGS.some(p=>Math.abs(p.e-e)<p.w/2+2&&Math.abs(p.n-n)<p.d/2+2))continue;matrices.push(...B.Matrix.Compose(new B.Vector3(1,.7+(k%5)*.15,1),B.Quaternion.RotationYawPitchRoll(k*2.4,0,0),this.local(e,n,this.terrainHeight(e,n)+.225)).asArray());}}
    tuft.thinInstanceSetBuffer('matrix',new Float32Array(matrices),16);
  }
  makeSky(){const sky=B.MeshBuilder.CreateSphere('sky-dome',{diameter:14000,segments:20,sideOrientation:B.Mesh.BACKSIDE},this.scene);sky.isPickable=false;sky.infiniteDistance=true;const tex=this.procedural('sky-gradient','#8ab6cb',(ctx,r)=>{const gradient=ctx.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#356baf');gradient.addColorStop(.35,'#67a7d6');gradient.addColorStop(.5,'#c0dbe2');gradient.addColorStop(.65,'#67a7d6');gradient.addColorStop(1,'#356baf');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);for(let i=0;i<70;i++){const x=r()*512,y=160+r()*160;const g=ctx.createRadialGradient(x,y,0,x,y,30+r()*55);g.addColorStop(0,'rgba(255,252,235,.32)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,512,512);}});const m=new B.StandardMaterial('sky',this.scene);m.emissiveTexture=tex;m.disableLighting=true;m.backFaceCulling=false;m.fogEnabled=false;sky.material=m;sky.renderingGroupId=0;this.sky=sky;}
  dynamicMaterial(name,w,h,alpha=false){const texture=new B.DynamicTexture(name,{width:w,height:h},this.scene,true);texture.hasAlpha=alpha;const mat=new B.StandardMaterial(name+'-material',this.scene);mat.diffuseTexture=texture;mat.emissiveColor=B.Color3.White();mat.disableLighting=true;mat.specularColor=B.Color3.Black();mat.backFaceCulling=false;mat.useAlphaFromDiffuseTexture=alpha;mat.transparencyMode=alpha?B.Material.MATERIAL_ALPHABLEND:B.Material.MATERIAL_OPAQUE;return {texture,mat,canvas:texture.getContext().canvas};}
  plane(name,width,height,material,parent){const mesh=B.MeshBuilder.CreatePlane(name,{width,height,sideOrientation:B.Mesh.DOUBLESIDE},this.scene);mesh.rotation.x=Math.PI/2;mesh.material=material;mesh.parent=parent;return mesh;}
  makeEquipment(){
    this.mapRig=new B.TransformNode('hand-map-grip',this.scene);this.mapRig.parent=this.camera;
    this.paper=new B.TransformNode('map-sheet',this.scene);this.paper.parent=this.mapRig;
    const map=this.dynamicMaterial('topographic-map',2048,2048);this.mapTexture=map.texture;this.mapCanvas=map.canvas;this.sheet=this.plane('paper',SHEET_SIDE,SHEET_SIDE,map.mat,this.paper);this.sheet.metadata={item:'map'};
    this.compass=new B.TransformNode('compass',this.scene);const art=this.dynamicMaterial('compass-art',768,1280,true);this.compassTexture=art.texture;this.compassCanvas=art.canvas;this.compassPlate=this.plane('transparent-baseplate',COMPASS_WIDTH,COMPASS_LENGTH,art.mat,this.compass);this.compassPlate.position.y=.0005;this.compassPlate.metadata={item:'compass'};
    this.compassRim=B.MeshBuilder.CreateTorus('bezel-rim',{diameter:.0383,thickness:.0013,tessellation:64},this.scene);this.compassRim.parent=this.compass;this.compassRim.position.set(0,.0012,COMPASS_LENGTH*(.5-490/1280));this.compassRim.material=this.materials.metal;this.compassRim.metadata={item:'compass',part:'ring'};
    this.mirrorRoot=new B.TransformNode('mirror-hinge',this.scene);this.mirrorRoot.parent=this.compass;
    const frame=this.box('mirror-case',[.053,.055,.002],[0,.026,.047],this.materials.dark,this.mirrorRoot,{shadow:false});frame.rotation.x=.12;
    this.mirror=B.MeshBuilder.CreatePlane('sighting-mirror',{width:.046,height:.047},this.scene);this.mirror.parent=this.mirrorRoot;this.mirror.position.set(0,.026,.0456);this.mirror.rotation.x=.12;
    const mirrorMat=new B.StandardMaterial('compass-mirror',this.scene);this.mirrorTexture=new B.MirrorTexture('live-compass-reflection',512,this.scene,true);this.mirrorTexture.level=.93;this.mirrorTexture.renderList=[this.compassPlate,this.compassRim];mirrorMat.reflectionTexture=this.mirrorTexture;mirrorMat.diffuseColor=new B.Color3(.03,.04,.035);mirrorMat.specularColor=new B.Color3(.3,.3,.3);this.mirror.material=mirrorMat;
    this.box('sighting-line',[.0003,.049,.0003],[0,.026,.0445],this.materials.metal,this.mirrorRoot,{shadow:false}).rotation.x=.12;this.box('sighting-notch',[.002,.003,.002],[0,.055,.049],this.materials.dark,this.mirrorRoot,{shadow:false});
    this.romer=new B.TransformNode('frame-romer',this.scene);const romerArt=this.dynamicMaterial('frame-romer-art',1024,1024,true);drawRomer(romerArt.canvas);romerArt.texture.update();this.romerPlate=this.plane('frame-planzeiger',ROMER_SIDE,ROMER_SIDE,romerArt.mat,this.romer);this.romerPlate.metadata={item:'romer'};
    this.pencil=new B.TransformNode('pencil',this.scene);const shaft=this.cylinder('pencil-body',.006,.006,.15,[0,0,0],this.materials.yellow,this.pencil,6);shaft.rotation.z=.15;const tip=this.cylinder('pencil-tip',0,.006,.015,[0,-.082,0],this.materials.dark,this.pencil,6);tip.rotation.z=.15;
    this.binoculars=new B.TransformNode('compass-binoculars',this.scene);
    for(const x of [-.035,.035]){const barrel=this.cylinder('rubber-optic',.048,.058,.12,[x,0,0],this.materials.dark,this.binoculars,24);barrel.rotation.x=Math.PI/2;const lens=this.cylinder('objective-lens',.046,.046,.003,[x,0,.061],this.materials.window,this.binoculars,24);lens.rotation.x=Math.PI/2;}
    this.box('binocular-bridge',[.07,.025,.04],[0,0,0],this.materials.dark,this.binoculars,{shadow:false});
    this.notepad=new B.TransformNode('held-notepad',this.scene);this.notepad.parent=this.camera;
    this.box('notepad-cover',[.108,.004,.15],[0,0,0],this.materials.dark,this.notepad,{shadow:false});
    const notes=this.dynamicMaterial('notepad-page',512,768);this.notesTexture=notes.texture;this.notesCanvas=notes.canvas;this.notesPage=this.plane('notes-paper',.10,.14,notes.mat,this.notepad);this.notesPage.position.y=.0024;
    this.radio=new B.TransformNode('handheld-radio',this.scene);
    this.box('radio-body',[.055,.11,.027],[0,0,0],this.materials.dark,this.radio,{shadow:false});
    this.box('radio-screen',[.039,.024,.002],[0,.022,-.015],this.materials.glove,this.radio,{shadow:false});
    const antenna=this.cylinder('radio-antenna',.004,.006,.075,[-.017,.086,0],this.materials.dark,this.radio,10);
    for(let i=0;i<3;i++)this.box('radio-speaker',[.035,.003,.003],[0,-.006-i*.008,-.015],this.materials.metal,this.radio,{shadow:false});
    this.handGrip=new B.TransformNode('right-hand-grip',this.scene);this.handGrip.parent=this.camera;
  }
  makeHands(){
    this.leftHand=new B.TransformNode('left-gloved-hand',this.scene);this.leftHand.parent=this.camera;
    this.rightHand=new B.TransformNode('right-gloved-hand',this.scene);this.rightHand.parent=this.camera;
    // Articulated, softly rounded gloves: fingers curl around the equipment edge.
    const glove=this.materials.glove,cloth=this.materials.sleeve;
    glove.albedoColor=B.Color3.FromHexString('#59604f');
    glove.albedoTexture=this.procedural('woven-glove','#69705f',(c,r)=>{for(let y=0;y<512;y+=4){c.strokeStyle=y%8?'#626957':'#747b68';c.lineWidth=1;c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}for(let i=0;i<5000;i++){c.fillStyle=r()>.5?'#858b76':'#505747';c.fillRect(r()*512,r()*512,1,2);}});
    const pad=this.mat('glove-reinforcement','#505848',{roughness:.95});
    const seam=this.mat('glove-stitching','#747b67',{roughness:1});
    const ellipsoid=(name,root,position,size,material)=>{const mesh=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:20},this.scene);mesh.parent=root;mesh.position.set(...position);mesh.scaling.set(...size);mesh.material=material;return mesh;};
    const segment=(name,root,a,b,radius,material)=>{const start=new B.Vector3(...a),end=new B.Vector3(...b),axis=end.subtract(start);const mesh=B.MeshBuilder.CreateCapsule(name,{height:axis.length()+radius*2,radius,tessellation:16,subdivisions:3},this.scene);mesh.parent=root;mesh.position=start.add(end).scale(.5);mesh.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,axis.normalize(),new B.Quaternion());mesh.material=material;return mesh;};
    for(const [root,sign]of [[this.leftHand,-1],[this.rightHand,1]]){
      ellipsoid('glove-palm',root,[0,0,0],[.063,.029,.073],glove);
      ellipsoid('stitched-back-panel',root,[0,sign===1?-.012:.012,-.005],[.050,.008,.052],pad);
      // Different finger lengths and staggered knuckles avoid a mitten silhouette.
      for(let i=0;i<4;i++){
        const x=sign*(-.023+i*.015),length=[.033,.040,.037,.029][i],z=.022-Math.abs(i-1)*.003;
        const a=[x,0,z],b=[x,.002,z+length*.60],c=[x,sign===1?.001:-.012,z+length],d=[x,sign===1?0:-.026,z+length+(sign===1?.010:-.006)];
        segment('finger-proximal',root,a,b,.007,glove);segment('finger-middle',root,b,c,.0065,glove);segment('finger-tip',root,c,d,.006,glove);
        if(sign===-1)ellipsoid('knuckle-reinforcement',root,[x,.007,z+.007],[.012,.006,.015],pad);
      }
      const thumbRoot=new B.TransformNode('thumb-pose',this.scene);thumbRoot.parent=root;if(sign===-1)thumbRoot.position.y=.030;
      segment('thumb-base',thumbRoot,[-sign*.023,-.003,-.010],[-sign*.040,-.002,.013],.010,glove);
      segment('thumb-tip',thumbRoot,[-sign*.040,-.002,.013],[-sign*.032,-.012,.035],.008,glove);
      segment('jacket-forearm',root,[sign*.006,-.008,-.045],[sign*.040,-.055,-.17],.033,cloth);
      segment('ribbed-wrist-cuff',root,[0,-.006,-.034],[sign*.005,-.011,-.061],.026,pad);
      if(sign===-1)for(const x of [-.016,0,.016])segment('back-seam',root,[x,.015,-.021],[x,.016,.008],.0006,seam);
      root.scaling.setAll(.72);root.getChildMeshes().forEach(m=>{m.renderingGroupId=1;m.isPickable=false;});
    }
  }

  makeVehicle(){
    const m=this.materials,paint=this.mat('incident-command-red','#bf3433',{metallic:.3,roughness:.48}),rubber=this.mat('vehicle-tyres','#202726',{roughness:1});
    this.vehicleRoot=new B.TransformNode('parked-training-vehicle',this.scene);this.vehicleRoot.parent=this.land;
    const g=this.vehicleRoot,commandBlue=this.mat('incident-command-blue','#204f9f',{metallic:.28,roughness:.4});
    this.models.place('car-kit/command-suv',{w:2.0,d:4.8,h:1.96,parent:g,position:B.Vector3.Zero(),angle:180});
    const markings=this.dynamicMaterial('incident-command-lettering',1024,128),ctx=markings.canvas.getContext('2d');ctx.fillStyle='#fff6dc';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#234c83';ctx.font='bold 70px sans-serif';ctx.textAlign='center';ctx.fillText('EINSATZLEITUNG',512,89);markings.texture.update();
    for(const sign of [-1,1]){
      const lettering=B.MeshBuilder.CreatePlane('EINSATZLEITUNG',{width:2.3,height:.26},this.scene);lettering.parent=g;lettering.position.set(sign*1.005,.91,-.1);lettering.rotation.y=-sign*Math.PI/2;lettering.material=markings.mat;
    }
    this.cockpitRoot=new B.TransformNode('vehicle-interior',this.scene);this.cockpitRoot.parent=this.land;const c=this.cockpitRoot;
    const cabin=interiorMaterials(this,'command-car'),panel=(name,size,at,material=cabin.dash,parent=c)=>cockpitPanel(this,name,size,at,material,parent);
    panel('interior-hood',[1.84,.13,1.22],[0,1.04,2.13],paint);
    for(const sign of [-1,1])this.box('hood-pressed-seam',[.012,.006,.94],[sign*.60,1.109,2.13],paint,c,{shadow:false});
    panel('dashboard-top',[1.86,.13,.46],[0,1.205,1.70]);
    panel('dashboard-face',[1.86,.36,.24],[0,1.065,1.60]);
    this.box('closed-cabin-floor',[1.86,.12,3.65],[0,.34,.12],cabin.rubber,c,{shadow:false});this.box('closed-footwell',[1.86,.69,.12],[0,.63,1.65],cabin.dash,c,{shadow:false});
    this.box('cabin-headlining',[1.94,.08,2.7],[0,2.22,-.55],cabin.seat,c,{shadow:false});
    for(const sign of [-1,1]){
      const pillar=this.box('windscreen-pillar',[.043,.99,.065],[sign*.97,1.72,1.06],cabin.dash,c,{shadow:false});pillar.rotation.x=-.23;
      panel('inside-door',[.095,.69,2.02],[sign*.94,.83,-.03]);
      panel('front-footwell-side',[.10,.80,.82],[sign*.94,.78,1.32]);
      this.box('door-window-sill',[.10,.035,1.86],[sign*.92,1.19,-.02],cabin.trim,c,{shadow:false});
      panel('door-armrest',[.14,.08,.54],[sign*.85,.96,-.10]);
      this.box('door-release-handle',[.025,.035,.16],[sign*.879,1.09,.36],cabin.trim,c,{shadow:false});
      this.box('rear-cabin-pillar',[.075,1.05,.10],[sign*.94,1.68,-.91],cabin.dash,c,{shadow:false});
      panel('front-seat-cushion',[.61,.15,.67],[sign*.46,.65,-.30],cabin.seat);
      const back=panel('front-seat-back',[.61,.79,.16],[sign*.46,1.10,-.62],cabin.seat);back.rotation.x=-.10;
      panel('front-seat-headrest',[.35,.25,.12],[sign*.46,1.63,-.66],cabin.seat);
      for(const dx of [-.22,.22])this.box('seat-upholstery-piping',[.008,.58,.008],[sign*.46+dx,1.12,-.515],cabin.light,c,{shadow:false});
      cockpitVent(this,c,sign*.78,1.16,1.46,.20,cabin.trim);
    }
    this.box('windscreen-header',[1.89,.065,.11],[0,2.185,.96],cabin.dash,c,{shadow:false});
    this.box('rear-cabin-panel',[1.86,.72,.10],[0,.77,-1.54],cabin.dash,c,{shadow:false});
    panel('rearview-mirror',[.18,.055,.018],[.04,2.06,1.12],cabin.trim);
    panel('rearview-mirror-glass',[.163,.041,.003],[.04,2.06,1.108],m.window);
    panel('center-tunnel',[.28,.26,1.15],[0,.55,.05]);
    panel('center-radio-surround',[.43,.21,.035],[.51,1.065,1.445],cabin.trim);
    this.signBoard('car-radio-label','RADIO FLORIAN',.31,.052,c,[.51,1.10,1.415],'#13232b');
    this.signBoard('car-radio-functions','R · RADIO     B · BLAU     H · HORN',.34,.036,c,[.51,1.035,1.413],'#172027');
    for(const x of [.35,.67])cockpitKnob(this,c,x,1.035,1.413,.022,cabin.rubber);
    for(const x of [.37,.51,.65])cockpitKnob(this,c,x,.88,1.43,.024,cabin.trim);
    const gear=this.cylinder('gear-lever',.018,.022,.23,[.04,.78,.47],cabin.trim,c,16);gear.rotation.x=-.18;panel('gear-grip',[.055,.055,.075],[.04,.90,.45],cabin.rubber);
    for(const x of [-.53,-.31]){const pedal=panel('driver-pedal',[.10,.15,.025],[x,.50,1.15],cabin.rubber);pedal.rotation.x=-.4;}
    this.steeringWheel=new B.TransformNode('steering-wheel',this.scene);this.steeringWheel.parent=c;this.steeringWheel.position.set(-.38,1.07,.93);this.steeringWheel.rotation.x=-.34;
    const wheel=B.MeshBuilder.CreateTorus('steering-rim',{diameter:.37,thickness:.026,tessellation:64},this.scene);wheel.parent=this.steeringWheel;wheel.rotation.x=Math.PI/2;wheel.material=cabin.rubber;
    panel('steering-hub',[.135,.09,.046],[0,0,0],cabin.dash,this.steeringWheel);
    for(const sign of [-1,1]){const spoke=panel('steering-spoke',[.13,.025,.018],[sign*.105,-.022,0],cabin.trim,this.steeringWheel);spoke.rotation.z=sign*.12;}
    panel('steering-lower-spoke',[.028,.12,.018],[0,-.085,0],cabin.trim,this.steeringWheel);
    panel('instrument-binnacle',[1.10,.325,.045],[-.35,1.085,1.445],cabin.rubber);
    panel('instrument-sun-visor',[1.13,.045,.17],[-.35,1.265,1.46]);
    const cluster=this.dynamicMaterial('dashboard-analog-instruments',1536,420);this.dashboardTexture=cluster.texture;this.dashboardCanvas=cluster.canvas;
    this.dashboard=B.MeshBuilder.CreatePlane('dashboard-instruments',{width:1.055,height:.2885},this.scene);this.dashboard.parent=c;this.dashboard.position.set(-.35,1.085,1.418);this.dashboard.material=cluster.mat;
    this.blueBulbs=[];this.blueLights=[];
    this.box('blue-lightbar-base',[1.43,.08,.34],[0,2.00,-.20],m.dark,g);
    for(const sign of [-1,1]){
      const lens=this.mat(`blue-lens-${sign}`,'#1764d2',{roughness:.2,metallic:.2});lens.emissiveColor=new B.Color3(.01,.04,.12);
      this.box('blue-beacon',[.49,.21,.31],[sign*.46,2.13,-.20],lens,g);
      this.box('blue-dashboard-indicator',[.033,.024,.014],[-.35+sign*.49,1.258,1.385],lens,c,{shadow:false});this.blueBulbs.push(lens);
      const light=new B.PointLight(`blue-flash-${sign}`,B.Vector3.Zero(),this.scene);light.diffuse=new B.Color3(.08,.3,1);light.range=16;light.intensity=0;this.blueLights.push(light);
    }
    this.cockpitRoot.setEnabled(false);
  }
  updateVehicle(){
    const v=this.state.vehicle,pose=vehicleAttitude(v),position=this.local(v.e,v.n,walkingHeightAt(v.e,v.n));
    for(const root of [this.vehicleRoot,this.cockpitRoot]){root.position.copyFrom(position);root.rotation.set(-pose.pitch*RAD,v.heading*RAD,pose.roll*RAD);}
    this.vehicleRoot.setEnabled(!v.occupied);this.cockpitRoot.setEnabled(v.occupied);
    this.steeringWheel.rotation.z=-v.steer*.65;
    const flash=Math.floor(performance.now()/160)%4;this.blueLights.forEach((light,i)=>{const point=vehiclePoint(v,i===0?-.46:.46,-.2);light.position.copyFrom(this.toWorld(point.e,point.n,walkingHeightAt(v.e,v.n)+2.13));const active=v.blueLight&&(i===0?flash===0||flash===2:flash===1||flash===3);light.intensity=active?6:0;this.blueBulbs[i].emissiveColor.set(active?.12:.01,active?.8:.04,active?4:.12);});
    const key=[Math.round(v.heading*5),Math.round(v.speed*10),Math.floor((v.tripMeters||0)/100),Math.round(pose.pitch*10),Math.round(pose.roll*10),this.state.unit,effectiveDeclination(this.state)].join(',');
    if(key!==this.dashboardKey){drawVehicleInstruments(this.dashboardCanvas,this.state,pose);this.dashboardTexture.update();this.dashboardKey=key;}
    return pose;
  }
  setGroup(node,group){node.getChildMeshes().forEach(m=>m.renderingGroupId=group);}
  applyQuality(){const q=this.state.quality;this.engine.setHardwareScalingLevel(q==='low'?1.8:q==='medium'?1.3:Math.max(.8,1/Math.min(devicePixelRatio||1,1.3)));this.shadows.getShadowMap().resize(q==='high'?2048:1024);this.scene.shadowsEnabled=q!=='low';this.engine.resize();}
  step(dt){
    const s=this.state;this.time+=dt;const flightDistance=flyHelicopter(s,this.keys,dt);if(s.helicopter.occupied){if(flightDistance)this.onMove(flightDistance);return;}
    if(s.vehicle.occupied){const distance=driveVehicle(s,this.keys,dt);if(distance){s.moveDistance+=distance;this.onMove(distance);}return;}
    if(!s.paused&&s.started&&['explore','map'].includes(s.mode)){
      const {forward,right,sprint,turning}=navigationInput(s,this.keys,dt);if(turning)this.onMove(0);
      const previousOffset=s.jump.offset;stepJump(s,this.keys,dt);
      if(forward||right||s.jump.offset>0||previousOffset>0){
        this.land.rotation.y=s.north*RAD;this.land.computeWorldMatrix(true);
        const proposed=forward||right?walkingStep(s,forward,right,dt,sprint):{...s.player},airborne=Math.max(previousOffset,s.jump.offset)>.38;
        const next=walkerHitsVehicle(s.vehicle,s.player,proposed)?{...s.player}:airborne?proposed:resolvePicnicMove(s.player,proposed),before={...s.player};
        const a=this.toWorld(s.player.e,s.player.n,walkingHeightAt(s.player.e,s.player.n)+previousOffset),b=this.toWorld(next.e,next.n,walkingHeightAt(next.e,next.n)+s.jump.offset);
        this.body.position.copyFrom(a);this.body.computeWorldMatrix(true);this.body.moveWithCollisions(b.subtract(a));
        const raw=this.fromWorld(this.body.position),actual=airborne?raw:resolvePicnicMove(next,raw);s.player.e=Math.max(10,Math.min(WORLD_SIZE-10,actual.e));s.player.n=Math.max(10,Math.min(WORLD_SIZE-10,actual.n));
        const actualOffset=Math.max(0,this.body.position.y-this.toWorld(s.player.e,s.player.n,walkingHeightAt(s.player.e,s.player.n)).y);
        if(actualOffset<s.jump.offset-.015&&s.jump.velocity>0)s.jump.velocity=0;
        if(actualOffset>s.jump.offset+.015&&s.jump.velocity<0){s.jump.velocity=0;s.jump.grounded=true;}
        s.jump.offset=actualOffset;
        const d=Math.hypot(s.player.e-before.e,s.player.n-before.n);if(d>.0001){s.moveDistance+=d;this.onMove(d);}
      }
      if(s.mode==='map'&&s.mapLocation==='surface'&&!nearSurface(s)){s.mode='explore';this.keys.clear();this.onModeChange();}
    }
  }
  look(dx,dy){if(this.state.vehicle.occupied||this.state.helicopter.occupied){const v=this.state.helicopter.occupied?this.state.helicopter:this.state.vehicle,oldYaw=v.lookYaw,oldPitch=v.lookPitch;v.lookYaw=Math.max(-110,Math.min(110,v.lookYaw+dx*.105*this.state.sensitivity));v.lookPitch=Math.max(-55,Math.min(55,v.lookPitch+dy*.105*this.state.sensitivity));turnPlayer(this.state,v.lookYaw-oldYaw,v.lookPitch-oldPitch);return;}const scale=this.state.mode==='binoculars'?1/8:1;turnPlayer(this.state,dx*.105*this.state.sensitivity*scale,dy*.105*this.state.sensitivity*scale);}
  updateEquipment(){
    const s=this.state,view=notebookView(s),editing=view==='map',reading=view==='read',sighting=view==='sight',inspecting=view==='inspect';
    this.paper.setEnabled(s.mapLocation!=='stowed'&&s.mode!=='binoculars');this.mapRig.position.set(editing?0:-.07,editing?-.02:reading?-.025:-.15,editing?.30:reading?.28:.34);this.mapRig.rotation.set(editing?-1.36:reading?-1.3:-.95,0,0);
    if(s.mapLocation==='surface'){
      this.paper.parent=this.tableAnchors[s.surface];this.paper.position.set(s.paperX,.001,s.paperY);this.paper.rotation.set(0,(s.paperAngle-s.north)*RAD,0);this.setGroup(this.paper,0);
    }else{
      this.paper.parent=this.mapRig;this.paper.position.set(s.paperX*.15,0,s.paperY*.15);this.paper.rotation.set(0,(s.paperAngle-s.yaw)*RAD,0);this.setGroup(this.paper,1);
    }
    // The map/hand grip is an attachment point, not an input-device assumption.
    this.handGrip.position.set(inspecting?0:sighting?0:.105,inspecting?-.025:sighting?.005:-.125,inspecting?.17:sighting?.31:.30);this.handGrip.scaling.setAll(sighting?1.65:1);this.handGrip.rotation.set(inspecting?-1.45:sighting?-1.24:-1.0,s.handAngle*RAD,0);
    for(const id of ['compass','romer','pencil','binoculars','radio']){
      const node=this[id],loc=s.items[id];node.setEnabled(loc!=='stowed'&&s.mode!=='binoculars');
      if(loc==='onMap'){
        node.parent=this.paper;const p=s[id]||{x:0,y:0,angle:0};node.position.set(p.x,.0025,p.y);node.rotation.set(0,p.angle*RAD,0);this.setGroup(node,s.mapLocation==='surface'?0:1);
      }else{
        node.parent=this.handGrip;node.position.set(0,0,0);node.rotation.set(0,0,0);if(id==='pencil'){node.rotation.x=-.2;node.position.y=-.015;}this.setGroup(node,1);
      }
    }
    this.mirrorRoot.setEnabled(s.instrument==='mirror');
    this.notepad.setEnabled(s.notepadLocation==='hand'&&s.mode!=='notes');this.notepad.position.set(-.07,-.14,.32);this.notepad.rotation.set(-1.05,0,0);this.setGroup(this.notepad,1);
    if(this.notesKey!==s.notes){const c=this.notesCanvas.getContext('2d');c.fillStyle='#ece5cb';c.fillRect(0,0,512,768);c.strokeStyle='#98a28a';c.lineWidth=1;for(let y=80;y<750;y+=48){c.beginPath();c.moveTo(30,y);c.lineTo(490,y);c.stroke();}c.fillStyle='#394331';c.font='26px monospace';s.notes.split('\n').slice(0,13).forEach((line,i)=>c.fillText(line.slice(0,27),35,72+i*48));this.notesTexture.update();this.notesKey=s.notes;}
    this.leftHand.setEnabled(s.mode!=='binoculars'&&(s.mapLocation==='hand'||s.notepadLocation==='hand'));this.leftHand.parent=s.mapLocation==='hand'?this.paper:this.notepad;this.leftHand.position.set(s.mapLocation==='hand'?-SHEET_SIDE/2+.010:-.047,-.019,-.045);this.leftHand.rotation.set(0,0,0);
    this.rightHand.setEnabled(!!s.handTool&&s.mode!=='binoculars');this.rightHand.parent=this.handGrip;this.rightHand.position.set(.006,-.021,-.006);this.rightHand.rotation.set(0,0,0);
    const heading=s.items.compass==='onMap'?s.paperAngle+s.compass.angle:s.yaw+s.handAngle;
    const compassKey=JSON.stringify([s.unit,s.compass.ring,heading,s.north,effectiveDeclination(s),s.instrument]);if(compassKey!==this.compassKey){drawCompass(this.compassCanvas,s,heading,{held:s.items.compass==='hand'});this.compassTexture.update();this.compassKey=compassKey;}
    const mapKey=JSON.stringify([s.points,s.lines,s.resultPoint,s.selected,s.helpers||this.solution?{e:Math.round(s.player.e/3)*3,n:Math.round(s.player.n/3)*3}:null,s.station,s.helpers,effectiveDeclination(s),this.solution]);if(mapKey!==this.mapKey){drawMap(this.mapCanvas,s,this.solution);this.mapTexture.update();this.mapKey=mapKey;}
    if(s.items.compass!=='stowed'&&s.instrument==='mirror'){
      this.compass.computeWorldMatrix(true);this.mirror.computeWorldMatrix(true);const normal=B.Vector3.TransformNormal(new B.Vector3(0,0,1),this.mirror.getWorldMatrix()).normalize();this.mirrorTexture.mirrorPlane=B.Plane.FromPositionAndNormal(this.mirror.getAbsolutePosition(),normal);
    }
  }
  render(draw=true){
    const s=this.state,view=notebookView(s);this.land.rotation.y=s.north*RAD;this.land.computeWorldMatrix(true);
    this.campaignScene?.update(s);
    this.updateVehicle();this.helicopterView.update(s);
    let eye=this.toWorld(s.player.e,s.player.n,walkingHeightAt(s.player.e,s.player.n)+1.68+(s.jump?.offset||0)),body=null,lookYaw=s.yaw,lookPitch=s.pitch;
    if(s.vehicle.occupied){this.cockpitRoot.computeWorldMatrix(true);body=this.cockpitRoot.getWorldMatrix();eye=B.Vector3.TransformCoordinates(new B.Vector3(-.38,1.66,0),body);lookYaw=s.vehicle.lookYaw;lookPitch=s.vehicle.lookPitch;}
    if(s.helicopter.occupied){this.helicopterView.cockpit.computeWorldMatrix(true);body=this.helicopterView.cockpit.getWorldMatrix();eye=this.helicopterView.eye();lookYaw=s.helicopter.lookYaw;lookPitch=s.helicopter.lookPitch;}
    this.camera.position.copyFrom(eye);orientFirstPerson(this.camera,lookYaw,lookPitch,body);this.camera.fov=s.mode==='binoculars'?2*Math.atan(Math.tan(1.02/2)/8):1.02;
    if(view==='map'&&s.mapLocation==='surface'){
      const anchor=this.tableAnchors[s.surface];anchor.computeWorldMatrix(true);const target=anchor.getAbsolutePosition().add(new B.Vector3(s.paperX,0,s.paperY));const offset=B.Vector3.TransformNormal(new B.Vector3(0,.32/this.mapZoom,-.12/this.mapZoom),B.Matrix.RotationY(s.yaw*RAD));this.camera.position=target.add(offset);this.camera.setTarget(target);
    }
    if(view==='map'&&s.mapLocation==='hand')this.mapRig.scaling.setAll(this.mapZoom);else this.mapRig.scaling.setAll(1);
    const forestRange=s.quality==='high'?850:s.quality==='medium'?600:350;for(const chunk of this.forestChunks){const distance=Math.hypot(chunk.e-s.player.e,chunk.n-s.player.n);chunk.nodes[0].setEnabled(false);chunk.nodes[1].setEnabled(distance<forestRange&&chunk.nodes[1].metadata.treeCount>0);chunk.nodes[3].setEnabled(distance<forestRange&&chunk.nodes[3].metadata.treeCount>0);chunk.nodes[2].setEnabled(distance>=forestRange&&distance<4700&&chunk.nodes[2].metadata.treeCount>0);}
    for(const chunk of this.boundaryChunks||[]){const visible=Math.hypot(chunk.e-s.player.e,chunk.n-s.player.n)<900;for(const node of chunk.nodes)node.setEnabled(visible);}
    this.fireTraining?.update(this.time,s);
    for(const [i,rotor]of (this.rotors||[]).entries())rotor.rotation.z=this.time*.16+i*.8;
    this.updateEquipment();
    if(this.time-this.lastShadow>1||this.lastShadow===0){this.sun.position.copyFrom(eye.add(new B.Vector3(-22,36,-18)));this.shadows.getShadowMap().renderList=this.shadowMeshes.filter(m=>m.isEnabled()&&B.Vector3.Distance(m.getAbsolutePosition(),eye)<100);this.lastShadow=this.time;}
    this.onFrame();
    if(draw){this.scene.render();this.renderCount++;}else{this.scene.setTransformMatrix(this.camera.getViewMatrix(true),this.camera.getProjectionMatrix(true));this.paper.computeWorldMatrix(true);}
  }
  resize(){this.engine.resize();}
  invalidate(){this.mapKey='';this.compassKey='';this.dashboardKey='';}
  rayOnPlane(clientX,clientY,node){
    this.render(false);const rect=this.canvas.getBoundingClientRect(),w=this.engine.getRenderWidth(),h=this.engine.getRenderHeight(),x=(clientX-rect.left)*w/rect.width,y=(clientY-rect.top)*h/rect.height;
    const view=this.camera.getViewMatrix(true),projection=this.camera.getProjectionMatrix(true),near=B.Vector3.Unproject(new B.Vector3(x,y,0),w,h,B.Matrix.Identity(),view,projection),far=B.Vector3.Unproject(new B.Vector3(x,y,1),w,h,B.Matrix.Identity(),view,projection);
    node.computeWorldMatrix(true);const ray=new B.Ray(near,far.subtract(near).normalize()),local=B.Ray.Transform(ray,node.getWorldMatrix().clone().invert());if(Math.abs(local.direction.y)<1e-7)return null;const distance=-local.origin.y/local.direction.y;if(distance<0)return null;const p=local.origin.add(local.direction.scale(distance));return {x:p.x,y:p.z};
  }
  mapHit(clientX,clientY){const p=this.rayOnPlane(clientX,clientY,this.paper);return p?{...p,e:WORLD_SIZE/2+p.x/MAP_SIDE*WORLD_SIZE,n:WORLD_SIZE/2+p.y/MAP_SIDE*WORLD_SIZE}:null;}
  inspectHit(clientX,clientY){const p=this.rayOnPlane(clientX,clientY,this.state.handTool==='romer'?this.romer:this.compass);if(!p)return null;const cy=this.state.handTool==='romer'?0:COMPASS_LENGTH*(.5-490/1280),radius=Math.hypot(p.x,p.y-cy);return {...p,ring:radius>.0151&&radius<.0218,angle:mod(Math.atan2(p.x,p.y-cy)/RAD)};}
  projectMap(e,n){this.render(false);this.paper.computeWorldMatrix(true);const p=B.Vector3.TransformCoordinates(new B.Vector3((e-WORLD_SIZE/2)/WORLD_SIZE*MAP_SIDE,0,(n-WORLD_SIZE/2)/WORLD_SIZE*MAP_SIDE),this.paper.getWorldMatrix()),r=this.canvas.getBoundingClientRect(),screen=B.Vector3.Project(p,B.Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()));return {x:r.left+screen.x/this.engine.getRenderWidth()*r.width,y:r.top+screen.y/this.engine.getRenderHeight()*r.height};}
  itemHit(hit,id,outside=false){
    const s=this.state;if(s.items[id]!=='onMap')return null;const p=s[id],angle=-p.angle*RAD,dx=hit.x-p.x,dy=hit.y-p.y,x=dx*Math.cos(angle)+dy*Math.sin(angle),y=-dx*Math.sin(angle)+dy*Math.cos(angle);
    if(id==='romer')return Math.abs(x)<ROMER_SIDE/2&&Math.abs(y)<ROMER_SIDE/2?{item:id}:null;
    const cy=COMPASS_LENGTH*(.5-490/1280),radius=Math.hypot(x,y-cy);return outside||Math.abs(x)<COMPASS_WIDTH/2&&Math.abs(y)<COMPASS_LENGTH/2?{item:id,ring:radius>.0151&&radius<.0218,angle:mod(Math.atan2(x,y-cy)/RAD)}:null;
  }
  dispose(){this.resizeObserver.disconnect();this.engine.stopRenderLoop();this.scene.dispose();this.engine.dispose();}
}
