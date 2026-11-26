// Vehicle actions and terrain instruments have no Babylon or DOM dependency.
import {WORLD_SIZE,VEHICLE_START,angleDifference,COLLISION_BUILDINGS as BUILDINGS,LANDMARKS,deepWater,walkingHeightAt,nearbyTrees,mod,effectiveDeclination} from './trainer-world.js';
import {SURFACES} from './trainer-game-state.js';
const RAD=Math.PI/180;
export {VEHICLE_START};
export function vehiclePoint(v,lateral,forward){const a=v.heading*RAD;return {e:v.e+Math.cos(a)*lateral+Math.sin(a)*forward,n:v.n-Math.sin(a)*lateral+Math.cos(a)*forward};}
export function vehicleAttitude(v){
  const front=vehiclePoint(v,0,1.4),rear=vehiclePoint(v,0,-1.4),left=vehiclePoint(v,-.85,0),right=vehiclePoint(v,.85,0);
  return {pitch:Math.atan2(walkingHeightAt(front.e,front.n)-walkingHeightAt(rear.e,rear.n),2.8)/RAD,roll:Math.atan2(walkingHeightAt(right.e,right.n)-walkingHeightAt(left.e,left.n),1.7)/RAD};
}
export function vehicleCompass(s){return mod(s.vehicle.heading-effectiveDeclination(s));}
function circleBox(p,r,b){const a=(b.angle||0)*RAD,x=(p.e-b.e)*Math.cos(a)-(p.n-b.n)*Math.sin(a),z=(p.e-b.e)*Math.sin(a)+(p.n-b.n)*Math.cos(a);return Math.hypot(Math.max(Math.abs(x)-b.w/2,0),Math.max(Math.abs(z)-b.d/2,0))<r;}
function staticBlocked(p,r){
  if(p.e<r+10||p.e>WORLD_SIZE-r-10||p.n<r+10||p.n>WORLD_SIZE-r-10)return true;
  if(BUILDINGS.some(b=>circleBox(p,r,b))||SURFACES.some(b=>circleBox(p,r,{...b,w:b.width+.22,d:2.0})))return true;
  return LANDMARKS.some(b=>circleBox(p,r,{...b,w:b.kind==='church'?30:b.kind==='mast'?3:28,d:b.kind==='church'?46:b.kind==='mast'?3:28}));
}
export function vehicleBlocked(v,helicopter=null){
  if(helicopter?.spawned&&helicopter.altitude<walkingHeightAt(v.e,v.n)+3&&Math.hypot(v.e-helicopter.e,v.n-helicopter.n)<4.7)return true;
  for(const z of [-1.4,0,1.4]){
    const p=vehiclePoint(v,0,z);
    if(staticBlocked(p,1.04)||nearbyTrees(p.e,p.n,2).some(t=>Math.hypot(t.e-p.e,t.n-p.n)<t.radius+1.04))return true;
    for(const x of [-1.04,0,1.04]){const edge=vehiclePoint(v,x,z);if(deepWater(edge.e,edge.n))return true;}
  }
  return false;
}
export function nearVehicle(s){return Math.hypot(s.player.e-s.vehicle.e,s.player.n-s.vehicle.n)<3.4;}
export function enterVehicle(s){
  if(s.helicopter?.occupied||s.vehicle.occupied||!nearVehicle(s))return {ok:false,key:'fpTooFar'};
  s.vehicle.occupied=true;s.vehicle.speed=0;s.vehicle.steer=0;s.vehicle.lookYaw=0;s.vehicle.lookPitch=0;
  s.player={e:s.vehicle.e,n:s.vehicle.n};const yaw=mod(s.vehicle.heading+s.north);if(s.mapLocation==='hand')s.paperAngle=mod(s.paperAngle+angleDifference(yaw,s.yaw));s.yaw=yaw;s.pitch=0;s.mode='explore';return {ok:true};
}
export function exitVehicle(s){
  const v=s.vehicle;if(!v.occupied)return {ok:false,key:'fpTooFar'};
  if(Math.abs(v.speed)>.15)return {ok:false,key:'fpVehicleStop'};
  for(const [x,z]of [[-1.8,0],[1.8,0],[-1.8,-1.8],[1.8,-1.8],[0,-3.1]]){
    const p=vehiclePoint(v,x,z);
    if(deepWater(p.e,p.n)||staticBlocked(p,.31)||nearbyTrees(p.e,p.n).some(t=>Math.hypot(t.e-p.e,t.n-p.n)<t.radius+.31))continue;
    v.occupied=false;v.speed=0;v.steer=0;s.player=p;s.mode='explore';s.pitch=0;return {ok:true};
  }
  return {ok:false,key:'fpVehicleExitBlocked'};
}
export function walkerHitsVehicle(v,from,to){
  const distance=p=>{const a=-v.heading*RAD,dx=p.e-v.e,dz=p.n-v.n,x=dx*Math.cos(a)+dz*Math.sin(a),z=-dx*Math.sin(a)+dz*Math.cos(a);return Math.hypot(Math.max(Math.abs(x)-1,0),Math.max(Math.abs(z)-2.35,0));};
  return distance(to)<.31&&distance(to)<=distance(from);
}
export function driveVehicle(s,keys,seconds){
  const v=s.vehicle,oldHeading=v.heading,dt=Math.min(.05,Math.max(0,seconds));if(!v.occupied||!dt)return 0;
  if(s.paused||s.mode!=='explore'){v.speed=0;return 0;}
  const throttle=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),steering=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const brake=keys.has('Space'),toward=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
  // Strong arcade brakes: Space takes priority; opposite throttle brakes to a stop first.
  if(brake)v.speed=toward(v.speed,0,24*dt);
  else if(throttle&&v.speed*throttle<0)v.speed=toward(v.speed,0,18*dt);
  else if(throttle)v.speed=toward(v.speed,throttle>0?33.3:-5.5,5.5*dt);
  else v.speed=toward(v.speed,0,.7*dt);
  v.steer=toward(v.steer,steering,4*dt);
  const yawDelta=v.speed/2.8*Math.tan(v.steer*.5/(1+(Math.abs(v.speed)/8)**2))*dt/RAD;
  const count=Math.max(1,Math.ceil(Math.abs(v.speed)*dt/.15));let moved=0;
  for(let i=0;i<count;i++){
    const heading=mod(v.heading+yawDelta/count),a=heading*RAD,step=v.speed*dt/count,next={...v,e:v.e+Math.sin(a)*step,n:v.n+Math.cos(a)*step,heading};
    if(vehicleBlocked(next,s.helicopter)||Math.abs(walkingHeightAt(next.e,next.n)-walkingHeightAt(v.e,v.n))>Math.abs(step)*.6){v.speed=0;break;}
    moved+=Math.abs(step);v.e=next.e;v.n=next.n;v.heading=next.heading;
  }
  v.tripMeters=(Number.isFinite(v.tripMeters)?v.tripMeters:0)+moved;
  if(s.mapLocation==='hand')s.paperAngle=mod(s.paperAngle+angleDifference(v.heading,oldHeading));
  s.player={e:v.e,n:v.n};s.yaw=mod(v.heading+s.north+v.lookYaw);s.pitch=v.lookPitch;return moved;
}

export function requestVehicle(s){
  if(s.vehicle.occupied||s.helicopter?.occupied)return {ok:false,key:'fpVehicleRequestInside'};
  const heading=mod(s.yaw-s.north);
  for(const distance of [5,7,10,14])for(const offset of [35,-35,90,-90,150,-150,0,180]){
    const a=(heading+offset)*RAD,next={...s.vehicle,e:s.player.e+Math.sin(a)*distance,n:s.player.n+Math.cos(a)*distance,heading,occupied:false,speed:0,steer:0,lookYaw:0,lookPitch:0};
    const pose=vehicleAttitude(next);
    if(vehicleBlocked(next,s.helicopter)||Math.abs(pose.pitch)>18||Math.abs(pose.roll)>18)continue;
    s.vehicle=next;return {ok:true,key:'fpVehicleRequested'};
  }
  return {ok:false,key:'fpVehicleNoSpace'};
}

export function resetTrip(s){s.vehicle.tripMeters=0;}
