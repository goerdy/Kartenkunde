import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {magneticField} from '../src/geomagnetism.js';
import {northAt,northSummary,signedAngle,angleLabel} from '../src/north.js';
import {dmsLabel,geographicTicks,coordinateLabels} from '../src/coordinates.js';
import {makePlan,PAPER,SCALES,unproject,sheetPlan,MARGIN,utm} from '../src/geo.js';
import {drawGrid} from '../src/pdf.js';
import {setLanguage} from '../src/i18n.js';
const ctx={};vm.runInNewContext(readFileSync(new URL('../vendor/proj4.js',import.meta.url),'utf8'),ctx);globalThis.proj4=ctx.proj4;
vm.runInNewContext(readFileSync(new URL('../vendor/mgrs.js',import.meta.url),'utf8'),ctx);globalThis.mgrs=ctx.mgrs;
const options={paper:'A4',scale:50000,overlap:10,landscape:false,dpi:150,style:'pq5basemap'};
const dateFor=year=>{const y=Math.floor(year);return new Date(Date.UTC(y,0,1)+(year-y)*(Date.UTC(y+1,0,1)-Date.UTC(y,0,1)));};
test('Offline WMM2025 matches all 12 NOAA reference cases, including both hemispheres and altitude',()=>{
 const rows=readFileSync(new URL('./wmm2025-noaa.txt',import.meta.url),'utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#')).map(l=>l.trim().split(/\s+/).map(Number));assert.equal(rows.length,12);
 for(const [year,alt,lat,lon,x,y,z,h,f,incl,decl]of rows){const field=magneticField(lon,lat,dateFor(year),alt);for(const [key,target]of Object.entries({x,y,z,h,f,incl,decl}))assert.ok(Math.abs(field[key]-target)<(key==='incl'||key==='decl'?.011:.11),`${year} ${lat} ${lon} ${key}: ${field[key]} != ${target}`);}
});
test('WMM matches 100 worldwide upstream reference points over the complete model period',()=>{
 const lines=readFileSync(new URL('./wmm2025-reference.csv',import.meta.url),'utf8').trim().split('\n').slice(1);assert.ok(lines.length>=100);
 for(const line of lines){const [year,alt,lat,lon,x,y,z,h,f,incl,decl]=line.split(',').map(Number),field=magneticField(lon,lat,dateFor(year),alt);for(const [key,target]of Object.entries({x,y,z,h,f,incl,decl}))assert.ok(Math.abs(field[key]-target)<(key==='incl'||key==='decl'?.011:5),`${year} ${lat} ${lon} ${key}`);}
});
test('Model expiration and invalid dates never silently extrapolate',()=>{for(const date of [new Date('2024-12-31'),new Date('2030-01-01'),new Date('invalid')])assert.equal(magneticField(9,50,date),null);assert.ok(magneticField(9,50,new Date('2029-12-31T23:59:59Z')));});
test('Grid convergence signs are correct east/west of the meridian in both hemispheres',()=>{
 const date=new Date('2026-01-01');for(const lat of [50,-50]){assert.ok(Math.abs(northAt(9,lat,utm(32,lat<0),date).convergence)<.00001);for(const lon of [8,10]){const n=northAt(lon,lat,utm(32,lat<0),date);assert.equal(Math.sign(n.convergence),Math.sign((lon-9)*lat));assert.ok(Math.abs(n.convergence-(lon-9)*Math.sin(lat*Math.PI/180))<.001);assert.ok(Math.abs(n.gridMagnetic-signedAngle(n.declination-n.convergence))<1e-9);}}
 setLanguage('de');assert.ok(angleLabel(360/6400).includes('1 Strich'));assert.equal(signedAngle(359),-1);
});
test('Only large spatial changes or multiple sheet zones require a cover warning',()=>{
 const small=makePlan({w:8.1,e:8.11,s:49.4,n:49.41},options);small.createdAt=new Date('2026-01-01');assert.equal(northSummary(small).warning,false);
 const large=makePlan({w:5.9,e:12.1,s:49,n:50},{...options,scale:200000,paper:'A1'});large.createdAt=small.createdAt;assert.equal(northSummary(large).warning,true);
});
test('DMS handles rounding carries, hemispheres, and no sixty-second values',()=>{assert.equal(dmsLabel(49+59/60+59.9/3600,1),'50°00\'00" N');assert.equal(dmsLabel(-8.5,0),'8°30\'00" W');assert.equal(dmsLabel(-33.25,1),'33°15\'00" S');});
test('Geographic edge ticks intersect the actual indicated meridian or parallel at every scale and hemisphere',()=>{
 for(const [lon,lat]of [[8.1,49.4],[151.2,-33.8],[5.99,50],[20,75]])for(const scale of SCALES){const p=makePlan({w:lon,e:lon+.001,s:lat,n:lat+.001},{...options,scale}),s=p.sheets[0],local=sheetPlan(p,s),ticks=geographicTicks(local,s);assert.ok(ticks.length>=2);
 for(const tick of ticks){const xy=tick.edge==='top'?[s.x0+tick.along/1000*scale,s.y1]:tick.edge==='bottom'?[s.x0+tick.along/1000*scale,s.y0]:tick.edge==='left'?[s.x0,s.y1-tick.along/1000*scale]:[s.x1,s.y1-tick.along/1000*scale];assert.ok(Math.abs(unproject(local.crs,xy)[tick.axis]-tick.value)<1e-8);}}
});
test('Additional frame labels fit all formats, preserve map dimensions and respect toggles and arrows',()=>{
 for(const paper of Object.keys(PAPER))for(const landscape of [false,true])for(const scale of SCALES){const p=makePlan({w:8.1,e:8.101,s:49.4,n:49.401},{...options,paper,landscape,scale}),s=p.sheets[0],texts=[],neighbors={top:[2],left:[2],right:[2],bottom:[2]},pdf=new Proxy({getTextWidth:v=>v.length,text:(...v)=>texts.push(v)}, {get:(o,k)=>o[k]||(()=>{})});drawGrid(pdf,p,s,neighbors);assert.ok(texts.some(v=>v[0].includes(' m')));assert.ok(texts.some(v=>v[0].includes('°')),`${paper} ${landscape} ${scale}`);for(const [value,x,y]of texts){assert.ok(x>0&&x<p.paper[0],`${paper} ${value} x ${x}`);assert.ok(y>0&&y<p.paper[1]);}const before=[p.width,p.height];drawGrid(pdf,{...p,utmLabels:false,dmsLabels:false},s,neighbors);assert.deepEqual([p.width,p.height],before);assert.deepEqual(coordinateLabels({...p,utmLabels:false,dmsLabels:false},s,[],neighbors),[]);}
 assert.equal(PAPER.A5,undefined);assert.throws(()=>makePlan({w:8,e:8.1,s:49,n:49.1},{...options,paper:'A5'}));
});
