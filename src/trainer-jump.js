// A springless FPS jump; the renderer resolves head and platform contacts.
export const JUMP_GRAVITY=18,JUMP_IMPULSE=6.2;
export function stepJump(s,keys,elapsed){
  const j=s.jump,dt=Math.min(.05,Math.max(0,elapsed)),pressed=keys.has('Space');
  if(!s.started||s.paused||s.vehicle.occupied||s.helicopter.occupied||!['explore','map'].includes(s.mode)){j.wasPressed=pressed;return j.offset;}
  if(pressed&&!j.wasPressed&&j.grounded){j.velocity=JUMP_IMPULSE;j.grounded=false;}
  j.wasPressed=pressed;j.velocity-=JUMP_GRAVITY*dt;j.offset+=j.velocity*dt;
  if(j.offset<=0){j.offset=0;j.velocity=0;j.grounded=true;}
  return j.offset;
}
