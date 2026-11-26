import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {orientFirstPerson} from '../modules/orientation/src/trainer-camera.js';
const scope={console:{log(){}},setTimeout,clearTimeout,performance,window:{addEventListener(){},removeEventListener(){}}};
vm.runInNewContext(readFileSync(new URL('../vendor/babylon.js',import.meta.url),'utf8'),scope);
const B=globalThis.BABYLON=scope.BABYLON,RAD=Math.PI/180;
function camera(){const engine=new B.NullEngine(),scene=new B.Scene(engine),camera=new B.UniversalCamera('look-test',B.Vector3.Zero(),scene);camera.inputs.clear();return {engine,camera};}
const direction=(camera,axis)=>B.Vector3.TransformNormal(axis,camera.getViewMatrix(true).clone().invert()).normalize();
test('A full horizontal turn keeps a level horizon at every pitch, including after banked flight and table viewing',()=>{
 const {engine,camera:c}=camera();
 try{
  for(const pitch of [-70,-25,0,20,70]){
   const bank=B.Matrix.RotationYawPitchRoll(.7,-.2,.35);orientFirstPerson(c,25,12,bank);c.getViewMatrix(true);
   c.setTarget(new B.Vector3(0,-2,.2));c.getViewMatrix(true);
   for(let yaw=0;yaw<=720;yaw+=5){
    orientFirstPerson(c,yaw,pitch);const forward=direction(c,B.Axis.Z),right=direction(c,B.Axis.X);
    assert.ok(Math.abs(forward.y+Math.sin(pitch*RAD))<1e-6,`Pitch changed at ${yaw}°`);
    assert.ok(Math.abs(right.y)<1e-6,`Horizon rolled at ${yaw}°`);
   }
  }
 }finally{engine.dispose();}
});
test('Mouse head turns use vehicle-local axes on a slope and preserve its physical banking',()=>{
 const {engine,camera:c}=camera();
 try{
  for(const heading of [0,45,170,350])for(const pitch of [-20,0,25])for(const roll of [-15,0,15]){
   const body=B.Matrix.RotationYawPitchRoll(heading*RAD,pitch*RAD,roll*RAD);
   for(const yaw of [-110,-45,0,70,110])for(const lookPitch of [-55,0,55]){
    orientFirstPerson(c,yaw,lookPitch,body);
    const local=new B.Vector3(Math.sin(yaw*RAD)*Math.cos(lookPitch*RAD),-Math.sin(lookPitch*RAD),Math.cos(yaw*RAD)*Math.cos(lookPitch*RAD));
    const expected=B.Vector3.TransformNormal(local,body).normalize();
    assert.ok(B.Vector3.Dot(direction(c,B.Axis.Z),expected)>1-1e-6,'Head/body composition');
   }
  }
 }finally{engine.dispose();}
});
