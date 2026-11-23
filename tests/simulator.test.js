import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {simulatorProjection,snapNorthing,rulerTicks,gridGeometry,rulerCoordinate,PLANZEIGER_TYPES,rulerSpan,frameGraduations} from '../src/simulator-geometry.js';
import {project} from '../src/geo.js';
import {EXTERNAL_SERVICES} from '../src/services.js';
const context={};vm.runInNewContext(readFileSync(new URL('../vendor/proj4.js',import.meta.url),'utf8'),context);globalThis.proj4=context.proj4;
test('Simulator projects natural UTM zones, including Norway, Svalbard and southern false northing',()=>{
 for(const [lon,lat,zone,south]of [[7.9,53.67,32,false],[5,60,32,false],[18,78,33,false],[151,-33,56,true]]){const p=simulatorProjection(lon,lat);assert.equal(p.zone,zone);assert.equal(p.south,south);const xy=project(p.crs,[lon,lat]),ll=rulerCoordinate({...p,easting:xy[0],northing:xy[1]},1000,1000),back=project(p.crs,ll);assert.ok(Math.abs(back[0]-xy[0]+1000)<.001);assert.ok(Math.abs(back[1]-xy[1]-1000)<.001);}
 assert.throws(()=>simulatorProjection(0,85));
});
test('Horizontal grid line snapping uses screen distance and remains optional at every zoom',()=>{
 assert.deepEqual(snapNorthing(432015,.5),{value:432000,snapped:true});assert.deepEqual(snapNorthing(432060,.5),{value:432060,snapped:false});assert.deepEqual(snapNorthing(432015,.5,false),{value:432015,snapped:false});assert.deepEqual(snapNorthing(432015,2),{value:432015,snapped:false});
});
test('Planzeiger divisions encode 100 m majors and 20/10 m subdivisions over exactly one kilometre',()=>{
 assert.equal(rulerTicks(50000).length,51);assert.equal(rulerTicks(25000).length,101);for(const scale of [25000,50000]){const ticks=rulerTicks(scale);assert.equal(ticks.at(-1).metres,1000);assert.equal(ticks.filter(t=>t.major).length,11);}assert.throws(()=>rulerTicks(10000));assert.equal(new Set(PLANZEIGER_TYPES.map(p=>p.id)).size,PLANZEIGER_TYPES.length);
});
test('Displayed grid lines retain exact kilometre coordinates and native zones at a boundary',()=>{
 const lines=gridGeometry({w:5.98,e:6.02,s:50,n:50.04});assert.ok(lines.some(l=>l.zone===31));assert.ok(lines.some(l=>l.zone===32));assert.ok(lines.length<240);for(const line of lines){assert.equal(line.value%1000,0);for(const point of line.points){const xy=project(simulatorProjection(point[0],point[1]).crs,point);assert.ok(Math.abs(xy[line.axis==='e'?0:1]-line.value)<.01);}}
});
test('Service diagnostics catalogue has unique IDs, bounded representative requests and no user supplied endpoints',()=>{
 assert.equal(new Set(EXTERNAL_SERVICES.map(s=>s.id)).size,EXTERNAL_SERVICES.length);for(const source of EXTERNAL_SERVICES){assert.ok(source.home);assert.ok(source.purpose);assert.ok(source.license);assert.ok(source.url.startsWith('https://')||source.id==='proxy');}const postpass=EXTERNAL_SERVICES.find(s=>s.id==='postpass');assert.ok(new URL(postpass.url).searchParams.get('data').includes('postpass_pointlinepolygon'));assert.ok(EXTERNAL_SERVICES.find(s=>s.id==='overpass').url.includes('data='));
});

test('Reference frame has a 50 mm aperture and four physical calibrations for both map scales',()=>{
 for(const mapScale of [25000,50000]){const span=rulerSpan('frame',mapScale);assert.equal(span/mapScale,.05);for(const row of [25000,50000,100000,200000]){const ticks=frameGraduations(row,mapScale);assert.equal(ticks[0].distance,0);assert.equal(ticks.at(-1).distance,span);assert.equal(ticks.at(-1).metres,row*.05);for(const tick of ticks)assert.ok(Math.abs(tick.distance/mapScale-tick.metres/row)<1e-12);}}
});
