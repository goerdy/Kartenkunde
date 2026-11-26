import test from 'node:test';
import assert from 'node:assert/strict';
import {LAKE,LAKE_WATER_LEVEL,heightAt,deepWater} from '../modules/orientation/src/trainer-world.js';
// Same twenty-metre triangle interpolation as TrainerScene.terrainHeight.
function renderedHeight(e,n){
 const x=(e+500)/20,z=(n+500)/20,i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j,e0=i*20-500,n0=j*20-500;
 const a=heightAt(e0,n0),b=heightAt(e0+20,n0),c=heightAt(e0,n0+20),d=heightAt(e0+20,n0+20);
 return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}
test('Löschteich has a submerged basin and a closed shoreline on the rendered terrain',()=>{
 assert.ok(heightAt(2945,705)<LAKE_WATER_LEVEL-2);assert.equal(deepWater(2945,705),true);
 for(let i=0;i<LAKE.length;i++){
  const a=LAKE[i],b=LAKE[(i+1)%LAKE.length];
  for(let t=0;t<=1;t+=.025){const e=a[0]+(b[0]-a[0])*t,n=a[1]+(b[1]-a[1])*t;
   assert.ok(renderedHeight(e,n)>=LAKE_WATER_LEVEL,`Exposed water edge at ${e}, ${n}`);
  }
 }
});
