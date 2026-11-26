// Flight, landing and recall are independent of rendering and input devices.
import {CAMPUS,WORLD_SIZE,COLLISION_BUILDINGS as BUILDINGS,LANDMARKS,STATIONS,deepWater,heightAt,nearbyTrees,mod,angleDifference} from './trainer-world.js';
const RAD=Math.PI/180,approach=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
export function defaultHelicopter(){return {spawned:true,occupied:false,radioOn:false,e:CAMPUS.helipad.e,n:CAMPUS.helipad.n,altitude:heightAt(CAMPUS.helipad.e,CAMPUS.helipad.n),heading:180,speed:0,verticalSpeed:0,rotor:0,rotorPhase:0,lookYaw:0,lookPitch:0,pitch:0,roll:0};}
export function helicopterAGL(h){return Math.max(0,h.altitude-heightAt(h.e,h.n));}
export function helicopterObstacle(e,n,altitude,radius=3){
  if(e<radius+10||n<radius+10||e>WORLD_SIZE-radius-10||n>WORLD_SIZE-radius-10)return true;
  if(altitude<heightAt(e,n)-.05)return true;
  for(const b of BUILDINGS){const a=(b.angle||0)*RAD,dx=e-b.e,dn=n-b.n,x=dx*Math.cos(a)-dn*Math.sin(a),z=dx*Math.sin(a)+dn*Math.cos(a);if(altitude<heightAt(b.e,b.n)+b.h+5&&Math.abs(x)<b.w/2+radius&&Math.abs(z)<b.d/2+radius)return true;}
  for(const b of LANDMARKS)if(altitude<heightAt(b.e,b.n)+b.height+3&&Math.hypot(e-b.e,n-b.n)<radius+(b.kind==='turbine'?35:b.kind==='mast'?2:b.kind==='castle'?35:17))return true;
  return nearbyTrees(e,n,radius+7).some(t=>Math.hypot(t.e-e,t.n-n)<radius+5&&altitude<heightAt(t.e,t.n)+t.height+1);
}
export function landingClear(e,n,s){
  const y=heightAt(e,n),r=7;
  if(deepWater(e,n)||helicopterObstacle(e,n,y,r)||Math.hypot(e-s.vehicle.e,n-s.vehicle.n)<11)return false;
  if(STATIONS.some(p=>Math.hypot(e-p.e-9,n-p.n-8)<10))return false;
  for(const [dx,dn]of [[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,-r]])if(deepWater(e+dx,n+dn)||Math.abs(heightAt(e+dx,n+dn)-y)>1.1)return false;
  return true;
}
export function requestHelicopter(s){
  if(s.helicopter.occupied)return {ok:false,key:'fpHeliLandFirst'};
  const heading=mod(s.yaw-s.north);
  for(const radius of [14,20,28,40,60,90])for(const offset of [70,-70,110,-110,150,-150,0,180]){const a=(heading+offset)*RAD,e=s.player.e+Math.sin(a)*radius,n=s.player.n+Math.cos(a)*radius;if(!landingClear(e,n,s))continue;
    Object.assign(s.helicopter,defaultHelicopter(),{spawned:true,e,n,heading,altitude:heightAt(e,n),radioOn:s.helicopter.radioOn===true});return {ok:true,key:'fpHeliRequested'};}
  return {ok:false,key:'fpHeliNoSpace'};
}
export function nearHelicopter(s){const h=s.helicopter;return h.spawned&&helicopterAGL(h)<.2&&Math.hypot(h.e-s.player.e,h.n-s.player.n)<4.5;}
export function enterHelicopter(s){
  if(s.vehicle.occupied||!nearHelicopter(s))return {ok:false,key:'fpTooFar'};
  const h=s.helicopter;h.occupied=true;h.speed=h.verticalSpeed=h.lookYaw=h.lookPitch=0;
  const yaw=mod(h.heading+s.north);if(s.mapLocation==='hand')s.paperAngle=mod(s.paperAngle+angleDifference(yaw,s.yaw));s.yaw=yaw;s.pitch=0;s.player={e:h.e,n:h.n};s.mode='explore';return {ok:true,key:'fpHeliEntered'};
}
export function exitHelicopter(s){
  const h=s.helicopter;if(!h.occupied)return {ok:false,key:'fpTooFar'};
  if(helicopterAGL(h)>.15||Math.abs(h.speed)>.3||Math.abs(h.verticalSpeed)>.1)return {ok:false,key:'fpHeliLandFirst'};
  for(const distance of [3.2,4.1])for(const side of [-1,1]){const a=h.heading*RAD,e=h.e+Math.cos(a)*distance*side,n=h.n-Math.sin(a)*distance*side;
    if(deepWater(e,n)||helicopterObstacle(e,n,heightAt(e,n),.35))continue;
    h.occupied=false;h.speed=h.verticalSpeed=0;s.player={e,n};s.pitch=0;s.mode='explore';return {ok:true,key:'fpHeliExited'};
  }
  return {ok:false,key:'fpVehicleExitBlocked'};
}
export function flyHelicopter(s,keys,elapsed){
  const h=s.helicopter,dt=Math.max(0,Math.min(.05,elapsed));if(!dt||!h.spawned)return 0;
  if(s.paused||!s.started){h.speed=h.verticalSpeed=0;return 0;}
  h.rotor=approach(h.rotor,h.occupied?1:0,dt*.35);h.rotorPhase=mod(h.rotorPhase+dt*h.rotor*1500);
  if(!h.occupied)return 0;
  if(s.mode!=='explore'){h.speed=h.verticalSpeed=0;return 0;}
  const turn=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),up=Number(keys.has('Space'))-Number(keys.has('ControlLeft')||keys.has('ControlRight'));
  const beforeYaw=h.heading;h.heading=mod(h.heading+turn*42*dt);s.yaw=mod(s.yaw+angleDifference(h.heading,beforeYaw));if(s.mapLocation==='hand')s.paperAngle=mod(s.paperAngle+angleDifference(h.heading,beforeYaw));
  h.speed=approach(h.speed,h.rotor>.65&&helicopterAGL(h)>1.5?forward*(forward<0?12:keys.has('ShiftLeft')||keys.has('ShiftRight')?300/3.6:42):0,dt*(forward?9:12));
  h.verticalSpeed=approach(h.verticalSpeed,h.rotor>.65?up*8:0,dt*6);
  const newAltitude=Math.min(1500,h.altitude+h.verticalSpeed*dt),ground=heightAt(h.e,h.n);
  // Descent is refused over a building or canopy; terrain itself is a landing surface.
  if(h.verticalSpeed<0&&helicopterObstacle(h.e,h.n,Math.max(ground,newAltitude),3)){h.verticalSpeed=0;}else h.altitude=Math.max(ground,newAltitude);
  if(h.altitude<=ground+.001&&h.verticalSpeed<0)h.verticalSpeed=0;
  const distance=h.speed*dt,a=h.heading*RAD,steps=Math.max(1,Math.ceil(Math.abs(distance)/.5));let moved=0;
  for(let i=0;i<steps;i++){const e=h.e+Math.sin(a)*distance/steps,n=h.n+Math.cos(a)*distance/steps;if(helicopterObstacle(e,n,h.altitude,3)||Math.hypot(e-s.vehicle.e,n-s.vehicle.n)<4&&h.altitude<heightAt(s.vehicle.e,s.vehicle.n)+3){h.speed=0;break;}h.e=e;h.n=n;moved+=Math.abs(distance/steps);}
  // No water landings: maintain a small clearance until the pilot reaches solid ground.
  if(deepWater(h.e,h.n)&&helicopterAGL(h)<2){h.altitude=heightAt(h.e,h.n)+2;h.verticalSpeed=Math.max(0,h.verticalSpeed);}
  h.pitch=approach(h.pitch,Math.max(-12,Math.min(8,-h.speed*.24)),dt*14);h.roll=approach(h.roll,-turn*Math.min(13,Math.abs(h.speed)*.4),dt*20);
  s.player={e:h.e,n:h.n};return moved;
}
export function restoreHelicopter(raw,vehicleOccupied=false){
  const h=defaultHelicopter();if(!raw?.spawned||!Number.isFinite(raw.e)||!Number.isFinite(raw.n)||raw.e<18||raw.n<18||raw.e>WORLD_SIZE-18||raw.n>WORLD_SIZE-18)return h;
  h.radioOn=raw.radioOn===true;h.spawned=true;h.e=raw.e;h.n=raw.n;h.heading=Number.isFinite(raw.heading)?mod(raw.heading):35;h.altitude=Math.max(heightAt(h.e,h.n),Math.min(1500,Number.isFinite(raw.altitude)?raw.altitude:heightAt(h.e,h.n)));h.occupied=raw.occupied===true&&!vehicleOccupied;h.rotor=h.occupied?1:0;
  return h;
}
