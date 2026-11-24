import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageRegion,mapCoverageFraction,outsideMapCoverage} from '../src/coverage.js';
const box=(x,y,d=.005)=>({w:x-d,e:x+d,s:y-d,n:y+d});
test('Regional maps warn outside their territory, including foreign areas inside their bounding boxes',()=>{
 for(const style of ['lgln50','lgln50gray']){
 assert.equal(coverageRegion(style),'lowerSaxony');
 assert.equal(outsideMapCoverage(style,box(9.74,52.37)),false); // Hanover
 assert.equal(outsideMapCoverage(style,box(7.91,53.67)),false); // Wangerland
 assert.equal(outsideMapCoverage(style,box(10.12,54.32)),true); // Kiel
 assert.equal(outsideMapCoverage(style,box(7.63,51.96)),true); // Münster, inside old WMS bbox
 }
 assert.equal(outsideMapCoverage('pq5basemap',box(13.40,52.52)),false);
 assert.equal(outsideMapCoverage('pq5basemap',box(11.58,48.14)),false);
 assert.equal(outsideMapCoverage('pq5basemap',box(5.69,50.85)),true); // Maastricht, inside DE bbox
 assert.equal(outsideMapCoverage('pq5basemap',box(16.37,48.21)),true);
});
test('A foreign edge does not warn when most of the viewport is covered',()=>{
 assert.equal(outsideMapCoverage('pq5basemap',{w:5.7,e:7,s:50.7,n:51}),false);
 for(const style of ['pq5tk','pq5gray','liberty','bright','positron','plain','mono'])assert.equal(outsideMapCoverage(style,box(16.37,48.21)),false);
 assert.equal(outsideMapCoverage('pq5basemap',null),false);
});
test('Coastal views warn only when more than half their area is outside',()=>{
 const mostlyLand={w:7.7,e:8.2,s:53.5,n:53.8},mostlySea={w:7.7,e:8.2,s:53.6,n:54};
 for(const style of ['pq5basemap','lgln50','lgln50gray']){
  assert.ok(mapCoverageFraction(style,mostlyLand)>.5);
  assert.equal(outsideMapCoverage(style,mostlyLand),false);
  assert.ok(mapCoverageFraction(style,mostlySea)<.5);
  assert.equal(outsideMapCoverage(style,mostlySea),true);
 }
});
test('Wrapped world copies agree and invalid bounds do not produce a warning',()=>{
 const b=box(7.91,53.67);
 assert.ok(Math.abs(mapCoverageFraction('pq5basemap',b)-mapCoverageFraction('pq5basemap',{...b,w:b.w+360,e:b.e+360}))<1e-6);
 assert.equal(outsideMapCoverage('pq5basemap',{...b,e:b.w}),false);
 assert.equal(outsideMapCoverage('pq5basemap',{...b,n:NaN}),false);
});
