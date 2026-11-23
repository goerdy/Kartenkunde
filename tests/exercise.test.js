import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {parseExerciseCoordinate,exerciseCoordinate,exerciseBounds,exercisePointSheets,outsideExercisePoints,drawExerciseSheetPoints,normalizeExercisePoints,validateExercisePlan} from '../src/exercise.js';
import {exercisePageLayout,exerciseTaskPageCount,createExerciseSolutionPDF} from '../src/exercise-pdf.js';
import {createPDF} from '../src/pdf.js';
import {makePlan,PAPER,MARGIN} from '../src/geo.js';
import {PLANZEIGER_ART} from '../src/planzeiger-art.js';
import {setLanguage} from '../src/i18n.js';
const ctx={atob,btoa,TextEncoder,TextDecoder,console,Uint8Array,Uint8ClampedArray,ArrayBuffer};
for(const name of ['proj4','mgrs','qrcode','jspdf'])vm.runInNewContext(readFileSync(new URL(`../vendor/${name}.js`,import.meta.url),'utf8'),ctx);
Object.assign(globalThis,{proj4:ctx.proj4,mgrs:ctx.mgrs,qrcode:ctx.qrcode,jspdf:ctx.jspdf});
const base={paper:'A4',scale:50000,overlap:10,landscape:false,dpi:150,style:'pq5basemap',title:'Übung'};
const a={id:'a',...parseExerciseCoordinate('32U ME 12345 45678'),name:'MARKED OBJECT',kind:'coordinate'},b={id:'b',...parseExerciseCoordinate('32U ME 13345 46678'),name:'SECRET SEARCH ANSWER',kind:'place'};
function plan(points=[a,b],options={}){return makePlan(exerciseBounds(points,options.scale||base.scale),{...base,...options,exercise:{points,fit:true,solutions:true}});}
test('UTMREF accepts formatted input, preserves entered cell precision, validates digits and returns requested 3/4 digit fields',()=>{
 const p=parseExerciseCoordinate('32u me 12345 45678');assert.equal(p.precision,5);assert.equal(exerciseCoordinate(p,50000),'32U ME 123 456');assert.equal(exerciseCoordinate(p,25000),'32U ME 1234 4567');
 for(const value of ['','32O ME 123 456','61U ME 123 456','32U II 123 456','32U ME 1234 456','32U ME 123456 456789','<script>'])assert.throws(()=>parseExerciseCoordinate(value),value);
 assert.equal(parseExerciseCoordinate('32UME123456').precision,3);assert.throws(()=>exerciseCoordinate(p,10000));
});
test('Auto bounds include a margin around all points, work for one point and reject date-line spans',()=>{
 const bounds=exerciseBounds([a,b],50000);for(const p of [a,b])assert.ok(p.lon>bounds.w&&p.lon<bounds.e&&p.lat>bounds.s&&p.lat<bounds.n);
 const single=exerciseBounds([a],25000);assert.ok(single.e>single.w&&single.n>single.s);assert.equal(exerciseBounds([],50000),null);assert.throws(()=>exerciseBounds([{lon:-179,lat:10},{lon:179,lat:10}],50000));
});
test('Points are assigned to actual native sheets, outside points are flagged, and participant maps contain no exercise markers',()=>{
 const p=plan(),outside={...a,lon:0,lat:0};assert.ok(exercisePointSheets(p,a).length);assert.equal(outsideExercisePoints(p,[a,b,outside]).length,1);
 const labels=[],pdf=new Proxy({getTextWidth:s=>s.length,text:v=>labels.push(v)}, {get:(o,k)=>o[k]||(()=>{})});for(const sheet of p.sheets)drawExerciseSheetPoints(pdf,p,sheet,MARGIN);assert.deepEqual(labels,[]);
 const zoned=plan([{...a,lon:5.99,lat:50},{...b,lon:6.01,lat:50}],{paper:'A1'});for(const point of zoned.exercise.points)assert.ok(exercisePointSheets(zoned,point).length);
});
test('Combined task and guide pages fit all supported sizes, both orientations and both exercise scales',()=>{
 for(const dimensions of Object.values(PAPER))for(const landscape of [true,false])for(const scale of [25000,50000]){const p={paper:landscape?[...dimensions].reverse():dimensions,landscape,scale,exercise:{points:Array.from({length:100},()=>a)}},l=exercisePageLayout(p);assert.ok(l.capacity>=1);assert.ok(l.tasks.y+l.capacity*l.rowH<=l.h-16+.001);assert.ok(l.guide.y+l.guide.h<=p.paper[1]-16);assert.ok(l.guide.x+l.guide.w<l.tasks.x);assert.ok(l.guide.y<l.tasks.y);assert.equal(exerciseTaskPageCount(p),Math.ceil(100/l.capacity));}
 for(const scale of [25000,50000]){const art=PLANZEIGER_ART[scale];assert.equal(art.width,art.panelWidth*4);assert.ok(art.height>40);const svg=readFileSync(new URL(`../assets/planzeiger/planzeiger-${scale}.svg`,import.meta.url),'utf8');assert.ok(svg.includes(`width="${art.width}mm"`));const grid=art.shapes.find(s=>s.type==='rect'&&s.w===s.h&&s.w===1e6/scale);assert.equal(grid.w*scale,1000000);}
});
test('Participant PDF contains tasks and fixed guide without search answers; separate answer PDF contains them',async()=>{
 setLanguage('de');const texts=[],pageTexts=[],ctor=ctx.jspdf.jsPDF;globalThis.jspdf={jsPDF:function(...args){const pdf=new ctor(...args),original=pdf.text;pdf.text=function(value,...rest){texts.push(...(Array.isArray(value)?value:[value]).map(String));pageTexts.push({page:this.internal.getCurrentPageInfo().pageNumber,value:String(value)});return original.call(this,value,...rest);};return pdf;}};
 const render=async()=>({width:4,height:4,data:new Uint8ClampedArray(64).fill(255)}),p=plan(),student=await createPDF(p,{render});assert.equal(student.getNumberOfPages(),1+p.sheets.length+exerciseTaskPageCount(p));assert.ok(texts.includes(a.name));assert.ok(pageTexts.some(p=>p.page===2&&p.value===a.name));assert.ok(!pageTexts.some(p=>p.page===2&&p.value.includes('BLATT')));assert.ok(!pageTexts.some(p=>p.page>1+exerciseTaskPageCount(plan())&&p.value===a.name));assert.ok(!texts.some(value=>value.includes(b.name)));assert.ok(texts.includes('32U ME 133 466'));assert.ok(texts.some(value=>value.includes('Planzeiger')));
 texts.length=0;const solution=await createExerciseSolutionPDF({...p,createdAt:new Date('2026-11-22T12:00:00Z')},{render:()=>{throw Error('Answer key must not load a map');}});assert.equal(solution.getNumberOfPages(),1);assert.ok(!texts.some(value=>value.includes('Planzeiger')));assert.ok(texts.some(value=>value.includes('22.11.2026')&&value.includes('kartenkunde.app')));assert.ok(texts.includes(b.name));assert.ok(texts.includes('32U ME 123 456'));
 globalThis.jspdf=ctx.jspdf;
});
test('Restored exercise data rejects malformed coordinates and unbounded names',()=>{const result=normalizeExercisePoints([null,{lon:Infinity,lat:0},{lon:9,lat:50,name:'x'.repeat(1000),kind:'invalid'}]);assert.equal(result.length,1);assert.equal(result[0].name.length,80);assert.equal(result[0].kind,'coordinate');});

test('Invalid exercises fail before rendering any map',async()=>{let calls=0;const render=async()=>{calls++;throw Error('must not render');};const p=plan();await assert.rejects(createPDF({...p,scale:10000},{render}));await assert.rejects(createPDF({...p,exercise:{points:[]}},{render}));await assert.rejects(createPDF({...p,exercise:{points:[{...a,lon:0,lat:0}]}},{render}));assert.equal(calls,0);});

test('Answer keys paginate all solutions without empty first page on every paper and orientation',async()=>{for(const paper of Object.keys(PAPER))for(const landscape of [false,true]){const p=plan(Array.from({length:20},(_,i)=>({...a,id:String(i),name:`Hof ${i+1}`})),{paper,landscape}),pdf=await createExerciseSolutionPDF(p);const capacity=Math.floor((p.paper[1]-16-48)/17);assert.equal(pdf.getNumberOfPages(),Math.ceil(20/capacity));}});

test('Exercises allow exactly twenty points, reject twenty-one and fit one worksheet in every format',()=>{for(const paper of Object.keys(PAPER))for(const landscape of [false,true]){const p=plan(Array.from({length:20},()=>a),{paper,landscape});validateExercisePlan(p);assert.equal(exerciseTaskPageCount(p),1);assert.throws(()=>validateExercisePlan({...p,exercise:{points:[...p.exercise.points,a]}}));}assert.equal(normalizeExercisePoints(Array.from({length:21},()=>a)).length,20);});
