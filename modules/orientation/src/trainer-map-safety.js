import {helicopterAGL} from './trainer-helicopter.js';
// A hover is still flight: navigation belongs to the copilot until landed and stopped.
export function mapUseWarning(state){
 const h=state.helicopter;
 if(h?.occupied&&(Math.abs(h.speed)>.15||Math.abs(h.verticalSpeed)>.1||helicopterAGL(h)>.5))return 'fpMapFlyingWarning';
 if(state.vehicle?.occupied&&Math.abs(state.vehicle.speed)>.15)return 'fpMapDrivingWarning';
 return null;
}
