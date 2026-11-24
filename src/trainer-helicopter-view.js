import {heightAt,mod,effectiveDeclination} from './trainer-world.js';
import {helicopterAGL} from './trainer-helicopter.js';
const B=globalThis.BABYLON,RAD=Math.PI/180;
export class HelicopterView{
  constructor(view){
    this.view=view;const scene=view.scene,m=view.materials,root=this.root=new B.TransformNode('yellow-rescue-helicopter',scene);root.parent=view.land;
    const yellow=view.mat('rescue-yellow','#f3c619',{metallic:.2,roughness:.4}),red=view.mat('rescue-red','#bc3729'),glass=view.mat('helicopter-canopy','#234954',{metallic:.5,roughness:.12});
    const box=(name,size,at,material,parent=root)=>view.box(name,size,at,material,parent,{shadow:true}),sphere=(name,scale,at,material)=>{const mesh=B.MeshBuilder.CreateSphere(name,{diameter:2,segments:24},scene);mesh.parent=root;mesh.scaling.set(...scale);mesh.position.set(...at);mesh.material=material;mesh.checkCollisions=true;view.shadowMeshes.push(mesh);return mesh;};
    sphere('rescue-fuselage',[1.15,.94,2.15],[0,1.8,-.2],yellow);sphere('curved-front-canopy',[1.08,.76,1.21],[0,1.95,1.35],glass);
    box('canopy-center-frame',[.08,1.45,.08],[0,2.03,2.45],yellow);box('canopy-roof-frame',[1.8,.09,.12],[0,2.62,1.94],yellow);
    sphere('belly-fairing',[.92,.36,1.7],[0,.96,.2],yellow);
    const tail=view.cylinder('tapered-tail-boom',.22,.7,4.9,[0,2.05,-4.1],yellow,root,16);tail.rotation.x=-Math.PI/2;
    box('tail-fin',[.12,1.8,.95],[0,2.7,-6.35],yellow);box('tailplane',[2.5,.12,.65],[0,2.15,-5.7],red);
    for(const sign of [-1,1]){
      box('landing-skid',[.14,.15,4.4],[sign*1.22,.18,.05],m.dark);
      for(const z of [-.9,1.1]){const strut=box('skid-strut',[.11,.95,.11],[sign*.94,.61,z],m.metal);strut.rotation.z=sign*.55;}
      box('cabin-door-frame',[.10,1.5,.08],[sign*1.1,1.8,.1],yellow);box('cabin-door-handle',[.07,.05,.27],[sign*1.17,1.65,-.15],m.dark);
      box('rescue-contrast-band',[.03,.26,2.5],[sign*1.12,1.36,-.2],red);
      view.signBoard('rescue-side-label','LUFTRETTUNG',1.9,.28,root,[sign*1.17,1.55,-.4],'#9b2d23',-sign*Math.PI/2);
      const window=box('cabin-side-window',[.03,.65,.95],[sign*1.12,2.1,-.6],glass);
      sphere('engine-cowling',[.38,.4,1.05],[sign*.48,2.62,-.85],yellow);
      const exhaust=view.cylinder('turbine-exhaust',.22,.3,.7,[sign*.48,2.65,-1.95],m.dark,root,12);exhaust.rotation.x=Math.PI/2;
    }
    view.cylinder('rotor-mast',.16,.2,.85,[0,3.04,-.25],m.metal,root,12);
    this.mainRotor=new B.TransformNode('main-rotor',scene);this.mainRotor.parent=root;this.mainRotor.position.set(0,3.48,-.25);
    for(let i=0;i<4;i++){const arm=new B.TransformNode('rotor-arm',scene);arm.parent=this.mainRotor;arm.rotation.y=i*Math.PI/2;box('main-rotor-blade',[.28,.045,4.9],[0,0,2.65],m.dark,arm);box('rotor-tip',[.28,.05,.35],[0,0,4.92],yellow,arm);}
    this.tailRotor=new B.TransformNode('tail-rotor',scene);this.tailRotor.parent=root;this.tailRotor.position.set(.32,2.85,-6.35);this.tailRotor.rotation.y=Math.PI/2;
    for(let i=0;i<4;i++){const blade=box('tail-rotor-blade',[.12,1.65,.06],[0,0,0],red,this.tailRotor);blade.rotation.z=i*Math.PI/4;}
    this.beacon=view.mat('helicopter-red-beacon','#9c2920');this.beacon.emissiveColor=new B.Color3(.5,0,0);box('anti-collision-beacon',[.14,.12,.14],[0,3.01,-1.15],this.beacon);
    this.cockpit=new B.TransformNode('helicopter-cockpit',scene);this.cockpit.parent=view.land;const c=this.cockpit;
    box('helicopter-cabin-floor',[2.15,.18,3.7],[0,.58,.1],m.dark,c);box('closed-instrument-bulkhead',[2.1,.85,.18],[0,.99,1.62],m.dark,c);
    box('cockpit-console',[1.90,.3,.30],[0,1.64,1.85],m.dark,c);
    for(const sign of [-1,1]){box('helicopter-side-door',[.09,.85,2.5],[sign*1.05,1.0,.1],yellow,c);const frame=box('helicopter-windscreen-frame',[.065,1.48,.08],[sign*.94,2.0,1.73],yellow,c);frame.rotation.x=-.24;box('overhead-frame',[.10,.08,2.4],[sign*.87,2.76,.4],yellow,c);box('pilot-seat',[.6,.13,.65],[sign*.48,.76,.04],m.glove,c);box('seat-back',[.6,.88,.13],[sign*.48,1.1,-.35],m.glove,c);}
    box('windscreen-central-bar',[.055,1.45,.07],[0,2.0,2.02],yellow,c);box('cockpit-roof',[2.05,.09,1.7],[0,2.82,-.05],yellow,c);
    const stick=view.cylinder('cyclic-control',.035,.045,.5,[-.48,1.08,.65],m.dark,c,12);stick.rotation.x=.12;box('cyclic-grip',[.12,.07,.05],[-.48,1.33,.68],m.dark,c);
    const art=view.dynamicMaterial('helicopter-flight-instruments',1280,360);this.texture=art.texture;this.canvas=art.canvas;
    const panel=B.MeshBuilder.CreatePlane('helicopter-instrument-panel',{width:1.5,height:.422},scene);panel.parent=c;panel.position.set(-.25,1.63,1.685);panel.material=art.mat;
    this.draw(view.state);root.setEnabled(false);c.setEnabled(false);
  }
  draw(state){
    const h=state.helicopter,c=this.canvas.getContext('2d'),agl=helicopterAGL(h),heading=mod(h.heading-effectiveDeclination(state));
    c.fillStyle='#152329';c.fillRect(0,0,1280,360);c.fillStyle='#f3c619';c.textAlign='left';c.font='bold 27px sans-serif';c.fillText('LUFTRETTUNG · GELÄNDENAVIGATION',30,37);
    const gauges=[['km/h',Math.abs(h.speed)*3.6,320],['m AGL',agl,800],['m MSL',h.altitude,1500],['KOMPASS',heading,360]];
    gauges.forEach(([label,value,max],i)=>{const x=170+i*310,y=183,r=105;c.fillStyle='#090f12';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle='#b5bdba';c.lineWidth=3;c.stroke();for(let tick=0;tick<=10;tick++){const a=(-225+tick*27)*RAD;c.strokeStyle='#d7ded9';c.lineWidth=2;c.beginPath();c.moveTo(x+Math.cos(a)*(r-10),y+Math.sin(a)*(r-10));c.lineTo(x+Math.cos(a)*(r-21),y+Math.sin(a)*(r-21));c.stroke();}const a=(-225+Math.min(1,value/max)*270)*RAD;c.strokeStyle='#f3c619';c.lineWidth=4;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*(r-28),y+Math.sin(a)*(r-28));c.stroke();c.fillStyle='#e9f0e9';c.textAlign='center';c.font='bold 26px monospace';c.fillText(String(Math.round(value)).padStart(3,'0')+(i===3?'°':''),x,y+57);c.font='18px sans-serif';c.fillText(label,x,y+82);});
    c.fillStyle='#d1ddda';c.font='18px sans-serif';c.textAlign='center';c.fillText('W/S VOR/ZURÜCK   A/D DREHEN   SPACE ↑   STRG ↓   SHIFT SCHNELL   E EIN/AUS',640,338);this.texture.update();
  }
  update(state){
    const h=state.helicopter,v=this.view;
    for(const node of [this.root,this.cockpit]){node.position=v.local(h.e,h.n,h.altitude);node.rotation.set(-h.pitch*RAD,h.heading*RAD,h.roll*RAD);}
    this.root.setEnabled(h.spawned&&!h.occupied);this.cockpit.setEnabled(h.occupied);
    this.mainRotor.rotation.y=h.rotorPhase*RAD;this.tailRotor.rotation.z=h.rotorPhase*RAD*4;this.beacon.emissiveColor.set(h.rotor>.1&&Math.floor(v.time*2)%2?2:.15,0,0);
    const key=[Math.round(h.speed*4),Math.round(h.altitude),Math.round(h.heading),Math.round(helicopterAGL(h)),effectiveDeclination(state)].join(',');if(this.key!==key){this.draw(state);this.key=key;}
  }
  eye(){this.cockpit.computeWorldMatrix(true);return B.Vector3.TransformCoordinates(new B.Vector3(-.47,2.04,.5),this.cockpit.getWorldMatrix());}
}
