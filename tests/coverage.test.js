import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageRegion,outsideMapCoverage} from '../src/coverage.js';
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
test('Partial coverage warns while worldwide styles and missing selections never warn',()=>{
 assert.equal(outsideMapCoverage('pq5basemap',{w:5.7,e:7,s:50.7,n:51}),true);
 for(const style of ['pq5tk','pq5gray','liberty','bright','positron','plain','fiord','dark','mono'])assert.equal(outsideMapCoverage(style,box(16.37,48.21)),false);
 assert.equal(outsideMapCoverage('pq5basemap',null),false);
});
