import test from 'node:test';
import assert from 'node:assert/strict';
import {LANDMARKS,STATIONS,mod,bearing,angleDifference,toUnit,fromUnit,pointAlong,intersectRays,visibleFrom,defaultState,restoreState,assess,expectedCourse} from '../src/trainer-world.js';
import {trainerMessages} from '../src/trainer-messages.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

test('Compass angles cross north correctly and convert degrees / 6400 mil',()=>{
  assert.equal(mod(-1),359);assert.equal(angleDifference(1,359),2);assert.equal(angleDifference(359,1),-2);
  for(const a of [0,.5,90,180,359.99])assert.ok(Math.abs(angleDifference(fromUnit(toUnit(a,'mil'),'mil'),a))<1e-8);
  assert.equal(bearing({e:0,n:0},{e:0,n:10}),0);assert.equal(bearing({e:0,n:0},{e:10,n:0}),90);
});
test('Back bearings from known landmarks intersect at the hidden observer',()=>{
  for(const s of STATIONS){const [a,b]=LANDMARKS;const p=intersectRays(a,bearing(a,s),b,bearing(b,s));assert.ok(Math.hypot(p.e-s.e,p.n-s.n)<1e-7);}
  assert.equal(intersectRays({e:0,n:0},0,{e:20,n:0},180),null);
});
test('Each fixed station has multiple visible well-separated sighting targets',()=>{
  for(const station of STATIONS){const visible=LANDMARKS.filter(p=>visibleFrom(station,p));assert.ok(visible.length>=3,station.id);assert.ok(visible.some(a=>visible.some(b=>Math.abs(angleDifference(bearing(station,a),bearing(station,b)))>40)));}
});
test('Magnetic offset, world rotation and map orientation stay independent',()=>{
  const s=defaultState();s.task='orient';s.north=130;s.paperAngle=130;s.advanced=true;s.declination=12;assert.equal(assess(s).passed,true);
  s.task='course';s.compass.ring=expectedCourse(s);assert.equal(assess(s).passed,true);s.north=233;s.paperAngle=74;assert.equal(assess(s).passed,true);
  const before=expectedCourse(s);s.declination+=10;assert.ok(Math.abs(angleDifference(expectedCourse(s),before)+10)<1e-6);
});
test('Sight exercise checks both heading and independently set bezel',()=>{
  const s=defaultState();s.task='sight';s.north=45;s.advanced=true;s.declination=8;s.compass.ring=expectedCourse(s);s.yaw=mod(s.north+s.declination+s.compass.ring);assert.equal(assess(s).passed,true);
  s.compass.ring=mod(s.compass.ring+15);assert.equal(assess(s).passed,false);
  s.compass.ring=mod(expectedCourse(s)-2);s.yaw=mod(s.north+s.declination+expectedCourse(s)+2);assert.equal(assess(s).passed,false,'needle alignment must also stay within tolerance');
});
test('Position assessment never moves the submitted marker and uses 100 m tolerance',()=>{
  const s=defaultState();s.task='cross';assert.equal(assess(s).kind,'missing');s.resultPoint=pointAlong(STATIONS[0],70,99);const before={...s.resultPoint};assert.equal(assess(s).passed,true);assert.deepEqual(s.resultPoint,before);s.resultPoint=pointAlong(STATIONS[0],70,101);assert.equal(assess(s).passed,false);
});
test('Stored sessions bound inputs and reject malformed coordinates and references',()=>{
  const s=restoreState({version:1,station:99,north:NaN,zoom:100,points:[{id:'a',e:20,n:30},{e:Infinity,n:20}],lines:[{kind:'connect',a:'a',b:'absent'}],compass:{x:999,ring:721}});
  assert.equal(s.station,0);assert.equal(s.zoom,1);assert.equal(s.points.length,1);assert.equal(s.lines.length,0);assert.equal(s.compass.x,.55);assert.equal(s.compass.ring,1);
});
test('All trainer text and template labels resolve in all three languages',()=>{
  const keys=Object.keys(trainerMessages.de);for(const lang of ['en','fr'])assert.deepEqual(Object.keys(trainerMessages[lang]),keys);
  const source=['templates/trainer.html','src/trainer.js','src/trainer-art.js','src/trainer-boot.js','src/trainer-game-state.js'].map(p=>readFileSync(p,'utf8')).join('\n');
  for(const match of source.matchAll(/(?:data-i18n(?:-label|-placeholder)?="|\bt\(')((?:tr|fp)[A-Za-z]+)/g))for(const lang of ['de','en','fr'])assert.ok(trainerMessages[lang][match[1]],`${lang}: ${match[1]}`);
});
test('Babylon engine and local CC0 textures match their pinned checksums',()=>{
  const manifest=JSON.parse(readFileSync('assets/trainer/dependencies.json','utf8'));
  const engine=readFileSync('vendor/babylon.js');assert.equal(manifest.babylon.version,'9.37.2');assert.equal(createHash('sha256').update(engine).digest('hex'),manifest.babylon.sha256);assert.match(readFileSync('vendor/babylon-LICENSE.md','utf8'),/Apache License/);
  for(const texture of manifest.textures){assert.equal(texture.license,'CC0-1.0');assert.equal(createHash('sha256').update(readFileSync(texture.file)).digest('hex'),texture.sha256);}
});

test('Radio program ships local PCM music, licensing and valid announcement paths',()=>{
 const base=new URL('../assets/trainer/radio/',import.meta.url),program=JSON.parse(readFileSync(new URL('program.json',base),'utf8'));
 for(const name of [program.music,...program.announcements.map(a=>a.src)]){assert.match(name,/^[a-z0-9_-]+\.(wav|mp3|ogg)$/i);assert.ok(readFileSync(new URL(name,base)).length>44);}
 const wav=readFileSync(new URL(program.music,base));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.ok(wav.readUInt32LE(40)/wav.readUInt32LE(28)>30);
 assert.match(readFileSync(new URL('LICENSE.txt',base),'utf8'),/CC0 1.0/);
});

test('Topo contours cover the mountain summit and retain ten-metre intervals',async()=>{
 const {contours}=await import('../src/trainer-art.js');const lines=contours(),summit=lines.filter(p=>p.level===650);
 assert.ok(summit.length>0,'Peak must remain visible above the former 130 m contour limit');
 assert.ok(summit.every(p=>p.points.every(([e,n])=>Math.hypot(e-6750,n-6500)<150)));
 assert.ok(lines.every(p=>p.level%10===0));
});
