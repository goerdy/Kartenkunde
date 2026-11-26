import {interiorMaterials,cockpitPanel,cockpitVent,cockpitKnob} from './trainer-cockpit.js';
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
    const cabin=interiorMaterials(view,'rescue-helicopter'),panel=(name,size,at,material=cabin.dash,parent=c)=>cockpitPanel(view,name,size,at,material,parent);
    const bar=(name,points,radius=.022,material=cabin.trim)=>{const mesh=B.MeshBuilder.CreateTube(name,{path:points.map(p=>new B.Vector3(...p)),radius,tessellation:12,cap:B.Mesh.CAP_ALL},scene);mesh.parent=c;mesh.material=material;return mesh;};
    view.box('helicopter-cabin-floor',[2.15,.12,3.65],[0,.58,.05],cabin.rubber,c,{shadow:false});
    panel('closed-instrument-bulkhead',[2.05,.76,.12],[0,1.02,1.93]);
    for(const x of [-.53,.53]){panel('pilot-knee-access-panel',[.69,.43,.018],[x,1.03,1.857],cabin.seat);cockpitVent(view,c,x,1.05,1.839,.26,cabin.trim);}
    panel('cockpit-console',[1.80,.48,.30],[0,1.445,2.02]);
    panel('instrument-panel-satin-surround',[1.53,.465,.035],[-.22,1.49,1.845],cabin.trim);
    panel('instrument-panel-glare-shield',[1.86,.055,.35],[0,1.725,1.98]);
    for(const sign of [-1,1]){
      panel('helicopter-door-lower-panel',[.085,.68,2.42],[sign*1.06,.98,.05]);
      panel('helicopter-front-footwell-side',[.09,.75,.82],[sign*1.06,.98,1.59]);
      bar('curved-canopy-side-frame',[[sign*1.05,1.27,2.0],[sign*1.03,2.1,2.04],[sign*.87,2.83,1.30],[sign*.87,2.87,-.85]],.027);
      bar('lower-canopy-sill',[[sign*1.02,1.25,2.15],[sign*1.08,1.28,.10],[sign*1.05,1.3,-1.1]],.024);
      view.box('door-internal-handle',[.045,.035,.20],[sign*1.005,1.30,-.10],cabin.trim,c,{shadow:false});
      panel('pilot-seat',[.61,.16,.67],[sign*.48,.86,-.08],cabin.seat);
      const back=panel('pilot-seat-back',[.61,.80,.15],[sign*.48,1.27,-.43],cabin.seat);back.rotation.x=-.08;
      panel('pilot-headrest',[.36,.24,.13],[sign*.48,1.78,-.47],cabin.seat);
      for(const dx of [-.18,.18])view.box('pilot-harness',[.042,.63,.013],[sign*.48+dx,1.29,-.338],cabin.rubber,c,{shadow:false});
      for(const dx of [-.14,.14]){const pedal=panel('anti-torque-pedal',[.19,.05,.11],[sign*.48+dx,.79,1.20],cabin.trim);pedal.rotation.x=-.25;}
      cockpitVent(view,c,sign*.78,1.57,1.846,.16,cabin.trim);
      const stick=view.cylinder('cyclic-control',.028,.035,.48,[sign*.48,1.08,.63],cabin.trim,c,16);stick.rotation.x=.16;
      panel('cyclic-grip',[.055,.13,.055],[sign*.48,1.35,.68],cabin.rubber);
      panel('cyclic-trigger',[.018,.035,.015],[sign*.48+.035,1.38,.672],red);
    }
    bar('windscreen-central-bar',[[0,1.27,2.45],[0,2.20,2.44],[0,2.84,1.82]],.015);
    bar('windscreen-upper-cross-member',[[-.87,2.83,1.30],[0,2.84,1.82],[.87,2.83,1.30]],.025);
    view.box('cockpit-roof',[2.05,.065,2.05],[0,2.92,-.10],cabin.dash,c,{shadow:false});
    panel('rear-cabin-bulkhead',[2.08,1.50,.10],[0,1.43,-1.56],cabin.seat);
    panel('overhead-switch-panel',[.58,.055,.53],[0,2.855,.52],cabin.trim);
    for(const x of [-.19,-.06,.07,.20])for(const z of [.38,.55,.72])view.box('overhead-rocker-switch',[.045,.018,.055],[x,2.816,z],cabin.rubber,c,{shadow:false});
    panel('center-avionics-pedestal',[.28,.30,.83],[0,1.0,.77]);
    view.signBoard('helicopter-radio-console','FM · FLORIAN · R',.22,.065,c,[0,1.10,.338],'#13252d');
    for(const x of [-.075,.075])cockpitKnob(view,c,x,1.01,.338,.025,cabin.rubber);
    const collective=view.cylinder('collective-control',.032,.032,.42,[-.84,1.03,-.05],cabin.trim,c,16);collective.rotation.x=-1.03;panel('collective-grip',[.06,.055,.16],[-.84,1.15,.14],cabin.rubber);
    const art=view.dynamicMaterial('helicopter-flight-instruments',1800,540);this.texture=art.texture;this.canvas=art.canvas;
    const instruments=B.MeshBuilder.CreatePlane('helicopter-instrument-panel',{width:1.45,height:.435},scene);instruments.parent=c;instruments.position.set(-.22,1.49,1.823);instruments.material=art.mat;
    this.draw(view.state);root.setEnabled(false);c.setEnabled(false);
  }
  draw(state){
    const h=state.helicopter,c=this.canvas.getContext('2d'),agl=helicopterAGL(h),heading=mod(h.heading-effectiveDeclination(state));
    const w=this.canvas.width,hh=this.canvas.height;c.fillStyle='#141b22';c.fillRect(0,0,w,hh);
    c.fillStyle='#93a5ad';c.textAlign='left';c.font='bold 25px sans-serif';c.fillText('D-HKKA  /  RESCUE',30,38);
    c.fillStyle=h.rotor>.65?'#81caa5':'#caa66b';c.textAlign='right';c.fillText('ROTOR '+Math.round(h.rotor*100)+' %',w-30,38);
    const label=(text,x,y,size=30,color='#e5eced')=>{c.fillStyle=color;c.font=`${size}px sans-serif`;c.textAlign='center';c.fillText(text,x,y);};
    const dial=(x,title)=>{const r=183,y=287,ring=c.createLinearGradient(x-r,y-r,x+r,y+r);ring.addColorStop(0,'#7e8c93');ring.addColorStop(.45,'#26323b');ring.addColorStop(1,'#65747b');c.fillStyle=ring;c.beginPath();c.arc(x,y,r+9,0,Math.PI*2);c.fill();c.fillStyle='#080f15';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();label(title,x,448,23,'#b7c5cb');return {x,y,r};};
    const tick=(g,a,major)=>{c.strokeStyle='#d0dce0';c.lineWidth=major?4:2;c.beginPath();c.moveTo(g.x+Math.sin(a)*(g.r-10),g.y-Math.cos(a)*(g.r-10));c.lineTo(g.x+Math.sin(a)*(g.r-(major?34:22)),g.y-Math.cos(a)*(g.r-(major?34:22)));c.stroke();};
    const needle=(g,a)=>{c.save();c.translate(g.x,g.y);c.rotate(a);c.fillStyle='#f2d78a';c.beginPath();c.moveTo(0,-g.r+46);c.lineTo(-5,25);c.lineTo(5,25);c.closePath();c.fill();c.fillStyle='#8899a0';c.beginPath();c.arc(0,0,11,0,Math.PI*2);c.fill();c.restore();};
    const speed=dial(230,'FAHRT · km/h');
    for(let n=0;n<=320;n+=10){const a=(-130+n/320*260)*RAD;tick(speed,a,n%40===0);if(n%40===0)label(String(n),speed.x+Math.sin(a)*123,speed.y-Math.cos(a)*123+11,29);}
    needle(speed,(-130+Math.min(320,Math.abs(h.speed)*3.6)/320*260)*RAD);label(String(Math.round(Math.abs(h.speed)*3.6)).padStart(3,'0'),speed.x,390,38);
    const attitude=dial(680,'FLUGLAGE');c.save();c.beginPath();c.arc(attitude.x,attitude.y,attitude.r-7,0,Math.PI*2);c.clip();c.translate(attitude.x,attitude.y);c.rotate(-h.roll*RAD);c.translate(0,h.pitch*3);
    c.fillStyle='#42788f';c.fillRect(-300,-500,600,500);c.fillStyle='#765e42';c.fillRect(-300,0,600,500);c.strokeStyle='#e6e8db';c.lineWidth=4;c.beginPath();c.moveTo(-300,0);c.lineTo(300,0);c.stroke();
    for(let pitch=-20;pitch<=20;pitch+=5)if(pitch){c.beginPath();const width=pitch%10===0?55:28;c.moveTo(-width,pitch*3);c.lineTo(width,pitch*3);c.stroke();if(pitch%10===0)label(String(Math.abs(pitch)),width+25,pitch*3+8,22);}
    c.restore();c.strokeStyle='#f5dc83';c.lineWidth=7;c.beginPath();c.moveTo(attitude.x-105,attitude.y);c.lineTo(attitude.x-30,attitude.y);c.lineTo(attitude.x,attitude.y+18);c.lineTo(attitude.x+30,attitude.y);c.lineTo(attitude.x+105,attitude.y);c.stroke();
    const altitude=dial(1130,'HÖHE MSL · m');for(let n=0;n<10;n++){const a=n*Math.PI/5;tick(altitude,a,true);label(String(n),altitude.x+Math.sin(a)*123,altitude.y-Math.cos(a)*123+11,29);}
    needle(altitude,(h.altitude%1000)/1000*Math.PI*2);label(String(Math.round(h.altitude)).padStart(3,'0'),altitude.x,390,38);
    c.fillStyle='#09151b';c.beginPath();c.roundRect(1370,80,400,415,16);c.fill();label('MAG. KURS',1570,123,25,'#9eb5bf');
    const headingText=String(Math.round(heading)%360).padStart(3,'0')+'°';label(headingText,1570,194,56,'#b9e8d1');
    c.strokeStyle='#536671';c.lineWidth=2;c.beginPath();c.moveTo(1400,225);c.lineTo(1740,225);c.stroke();
    label('HÖHE ÜBER GRUND',1570,270,23,'#9eb5bf');label(Math.round(agl)+' m',1570,331,44,'#e3eac3');
    label('STEIGEN / SINKEN',1570,392,23,'#9eb5bf');label((h.verticalSpeed>=0?'+':'')+h.verticalSpeed.toFixed(1)+' m/s',1570,452,38);
    label('R · RADIO FLORIAN · '+(h.radioOn?'AN':'AUS'),900,38,24,h.radioOn?'#9cdbac':'#92a0a7');
    this.texture.update();
  }

  update(state){
    const h=state.helicopter,v=this.view;
    for(const node of [this.root,this.cockpit]){node.position=v.local(h.e,h.n,h.altitude);node.rotation.set(-h.pitch*RAD,h.heading*RAD,h.roll*RAD);}
    this.root.setEnabled(h.spawned&&!h.occupied);this.cockpit.setEnabled(h.occupied);
    this.mainRotor.rotation.y=h.rotorPhase*RAD;this.tailRotor.rotation.z=h.rotorPhase*RAD*4;this.beacon.emissiveColor.set(h.rotor>.1&&Math.floor(v.time*2)%2?2:.15,0,0);
    const key=[Math.round(h.speed*4),Math.round(h.altitude),Math.round(h.heading),Math.round(helicopterAGL(h)),Math.round(h.pitch*4),Math.round(h.roll*4),Math.round(h.verticalSpeed*10),Math.round(h.rotor*100),h.radioOn,effectiveDeclination(state)].join(',');if(this.key!==key){this.draw(state);this.key=key;}
  }
  eye(){this.cockpit.computeWorldMatrix(true);return B.Vector3.TransformCoordinates(new B.Vector3(-.47,2.12,.38),this.cockpit.getWorldMatrix());}
}
