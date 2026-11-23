import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {exerciseSnapshot,encodeExerciseSnapshot,decodeExerciseSnapshot,createExerciseShare,readExerciseShare} from '../src/exercise-share.js';
import {resolveAdministrativeReference} from '../src/admin.js';
const ctx={};vm.runInNewContext(readFileSync(new URL('../vendor/qrcode.js',import.meta.url),'utf8'),ctx);globalThis.qrcode=ctx.qrcode;
const point={lon:8.2,lat:53.6,name:'Kirche in Hohenkirchen',kind:'coordinate',precision:5,coordinate:'32UME1234545678'};
const settings={scale:25000,paper:'A3',dpi:300,overlap:10,landscape:true,style:'pq5basemap',title:'Friesland',notes:'Treffpunkt am Gerätehaus',utmLabels:false,dmsLabels:true,streetNames:false,contours:true,tkOptions:{farms:false,churches:true},exercise:{fit:false,points:Array.from({length:20},(_,i)=>({...point,lon:8.2+i*.001,name:`Kirche ${i+1} in Hohenkirchen`,kind:i%2?'place':'coordinate'}))}};
const bounds={w:8,e:9,s:53,n:54},reference={iso:'DEU',path:[{level:'ADM0',id:'DEU',name:'Deutschland'},{level:'ADM1',id:'03',name:'Niedersachsen'},{level:'ADM3',id:'03455',name:'Friesland'}]};
test('All settings and twenty tasks round-trip entirely inside link and QR without fetching or server storage',async()=>{
 const snapshot=exerciseSnapshot(settings,bounds,'de',{center:[53.5,8.3],zoom:9});const share=await createExerciseShare(snapshot);assert.ok(share.url.startsWith('https://kartenkunde.app/#uebung='));const restored=await readExerciseShare(share.url);assert.deepEqual(restored.settings,settingsWithoutExercise());assert.deepEqual(restored.exercise.points,snapshot.exercise.points);assert.deepEqual(restored.selection,bounds);assert.equal(restored.exercise.points.length,20);assert.equal(restored.view.zoom,9);
 function settingsWithoutExercise(){const {exercise,...common}=settings;return common;}
 const qr=globalThis.qrcode(0,'M');qr.addData(share.url,'Byte');qr.make();assert.ok(qr.getModuleCount()>0);
});
test('Administrative links contain identifiers and names instead of geometry and source metadata',async()=>{
 const feature={type:'Feature',properties:{bkgAGS:'03455',shapeName:'Friesland'},geometry:{type:'Polygon',coordinates:[[[8,53],[9,53],[9,54],[8,53]]]}};
 const snapshot=exerciseSnapshot({...settings,feature,boundarySelection:reference,boundaryAttribution:{long:'unused metadata'}},bounds,'de');const restored=await decodeExerciseSnapshot(await encodeExerciseSnapshot(snapshot));assert.deepEqual(restored.administrative,reference);assert.ok(!('feature'in restored.settings));assert.ok(!JSON.stringify(restored).includes('coordinates'));const legacy=exerciseSnapshot({...settings,feature},bounds,'de');assert.equal(legacy.administrative.iso,'DEU');assert.equal(legacy.administrative.path[0].id,'03455');
});
test('Administrative references resolve successive named/identified levels and reject ambiguous names',async()=>{
 const make=(id,name)=>({type:'Feature',properties:{bkgAGS:id,shapeName:name},geometry:{type:'Polygon',coordinates:[[[8,53],[9,53],[9,54],[8,53]]]}}),calls=[];
 const client={metadata:async()=>reference.path.map(p=>({boundaryType:p.level})),features:async(meta,signal,parent)=>{calls.push({level:meta.boundaryType,parent:parent?.properties.bkgAGS});const p=reference.path.find(p=>p.level===meta.boundaryType);return [make(p.id==='DEU'?'':p.id,p.name)];}};
 const result=await resolveAdministrativeReference(reference,{client});assert.equal(result.area.name,'Friesland');assert.equal(result.area.feature.properties.bkgAGS,'03455');assert.equal(calls[2].parent,'03');assert.deepEqual(result.area.reference,reference);
 await assert.rejects(resolveAdministrativeReference({iso:'DEU',path:[{level:'ADM3',id:'missing',name:'Same'}]},{client:{metadata:client.metadata,features:async()=>[make('1','Same'),make('2','Same')]}}));
});
test('Damaged links and over-limit snapshots fail explicitly without partially loading',async()=>{
 assert.equal(await readExerciseShare('https://example.com/'),null);for(const data of ['!!!','abcdef',''])await assert.rejects(decodeExerciseSnapshot(data));assert.throws(()=>exerciseSnapshot({...settings,exercise:{points:Array.from({length:21},()=>point)}},bounds,'de'));
 assert.throws(()=>exerciseSnapshot({...settings,notes:'x'.repeat(601)},bounds,'de'));

});
