import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultGameState,restoreGameState} from '../modules/orientation/src/trainer-game-state.js';
import {stepJump} from '../modules/orientation/src/trainer-jump.js';
const ready=()=>{const s=defaultGameState();s.started=true;s.paused=false;return s;};
test('Jump rises and returns to the ground; holding Space cannot repeat or double-jump',()=>{
 const s=ready(),keys=new Set(['Space']);let peak=0;for(let i=0;i<50;i++){stepJump(s,keys,.02);peak=Math.max(peak,s.jump.offset);}assert.ok(peak>.9&&peak<1.2);assert.equal(s.jump.offset,0);assert.equal(s.jump.grounded,true);stepJump(s,keys,.02);assert.equal(s.jump.offset,0);stepJump(s,new Set(),.02);stepJump(s,keys,.02);assert.ok(s.jump.offset>0);
});
test('Space remains climb/brake inside aircraft/car; pause freezes jumps and restore starts grounded',()=>{
 for(const occupant of ['vehicle','helicopter']){const s=ready();s[occupant].occupied=true;stepJump(s,new Set(['Space']),.05);assert.equal(s.jump.offset,0);}
 const s=ready();stepJump(s,new Set(['Space']),.05);s.paused=true;const height=s.jump.offset;stepJump(s,new Set(),.05);assert.equal(s.jump.offset,height);assert.equal(restoreGameState(JSON.parse(JSON.stringify(s))).jump.offset,0);
});
