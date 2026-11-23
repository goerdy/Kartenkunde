import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTOUR_TILEJSON,CONTOUR_COLOR,contourInterval,createContourLayers} from '../src/contours.js';
import {createPQ5BasemapStyle} from '../src/pq5-basemap.js';
import {SCALES} from '../src/geo.js';
import {tkLegendLayout} from '../src/tk-legend.js';
function evaluate(expr,p){if(!Array.isArray(expr))return expr;const [op,...a]=expr,ev=x=>evaluate(x,p);switch(op){case 'get':return p[a[0]];case 'has':return Object.hasOwn(p,a[0]);case 'to-number':{const n=Number(ev(a[0]));return Number.isFinite(n)?n:a[1];}case 'all':return a.every(ev);case '!':return !ev(a[0]);case '!=':return ev(a[0])!==ev(a[1]);case '<':return ev(a[0])<ev(a[1]);case '%':return ev(a[0])%ev(a[1]);case 'abs':return Math.abs(ev(a[0]));default:throw Error(op);}}
test('Scale-dependent contours include every required source class with numeric heights, including negative and half metres',()=>{
 assert.deepEqual(SCALES.map(contourInterval),[2.5,5,10,20,50,100]);
 for(const scale of SCALES){const [minor,major,label]=createContourLayers(scale),step=contourInterval(scale);assert.ok(major.paint['line-width']>minor.paint['line-width']);assert.equal(major.paint['line-color'],CONTOUR_COLOR);
 for(let height=-100;height<=1100;height+=2.5){const p={hoehe:height,klasse:'100er'},drawn=evaluate(minor.filter,p)||evaluate(major.filter,p);assert.equal(drawn,Math.abs(height%step)<.001);assert.equal(evaluate(label.filter,p),Math.abs(height%(step*5))<.001);}
 assert.equal(evaluate(major.filter,{hoehe:'100'}),Math.abs(100%(step*5))<.001);assert.ok(!evaluate(major.filter,{}));assert.ok(!evaluate(major.filter,{hoehe:'unknown'}));
 }
});
test('Checkbox removes the source and legend; overview never downloads contours; print preserves physical weights and font size',()=>{
 const screen=createPQ5BasemapStyle({scale:25000}),print=createPQ5BasemapStyle({scale:25000},'print');assert.equal(screen.sources['height-contours'].url,CONTOUR_TILEJSON);
 for(const id of ['bm-contours-minor','bm-contours-major'])assert.equal(print.layers.find(l=>l.id===id).paint['line-width'],screen.layers.find(l=>l.id===id).paint['line-width']*4);
 assert.equal(print.layers.find(l=>l.id==='bm-contour-labels').layout['text-size'],40);
 for(const [options,mode]of [[{contours:false},'screen'],[{contours:false},'print'],[{},'overview']]){const style=createPQ5BasemapStyle(options,mode);assert.ok(!style.sources['height-contours']);assert.ok(style.layers.every(l=>l.source!=='height-contours'));}
 const legend=tkLegendLayout([210,297],186,{scale:5000},'pq5basemap');assert.equal(legend.entries.find(e=>e.contours).interval,2.5);assert.ok(!tkLegendLayout([210,297],186,{contours:false},'pq5basemap').entries.some(e=>e.contours));assert.ok(!tkLegendLayout([210,297],186,{},'pq5tk').entries.some(e=>e.contours));
});

test('Short and curved major contours receive midpoint anchors independent of text width, with print-consistent thresholds',async()=>{
 const {shortContourLabelFeatures}=await import('../src/contours.js');const project=ll=>({x:ll[0],y:ll[1]}),unproject=p=>[p.x,p.y],options={scale:50000,project,unproject,width:1000,height:1000};
 const f=(hoehe,coordinates)=>({type:'Feature',properties:{hoehe},geometry:{type:'LineString',coordinates}});
 const tiny=f(500,[[10,10],[12,10]]),curved=f(600,[[20,20],[30,20],[30,30]]),minor=f(520,[[40,40],[45,40]]),long=f(700,[[0,100],[200,100]]);
 const data=shortContourLabelFeatures([tiny,tiny,curved,minor,long],options);assert.equal(data.features.length,2);assert.deepEqual(data.features[0].geometry.coordinates,[11,10]);assert.deepEqual(data.features[1].geometry.coordinates,[30,20]);
 assert.equal(shortContourLabelFeatures([long],{...options,printScale:4}).features.length,1);
 assert.equal(shortContourLabelFeatures([tiny],{...options,width:5}).features.length,0);
 const print=createPQ5BasemapStyle({},'print');assert.equal(print.layers.find(l=>l.id==='bm-contour-short-labels').layout['text-size'],38);
});

test('Contour labels preserve source direction instead of flipping uphill numbers upright',async()=>{
 const {shortContourLabelFeatures}=await import('../src/contours.js');
 const layers=createContourLayers(50000);assert.equal(layers[2].layout['text-keep-upright'],false);
 assert.deepEqual(layers[3].layout['text-rotate'],['get','rotation']);
 for(const [end,angle] of [[[20,10],0],[[10,20],90],[[0,10],180],[[10,0],-90]]){
 const data=shortContourLabelFeatures([{properties:{hoehe:500},geometry:{type:'LineString',coordinates:[[10,10],end]}}],{project:p=>({x:p[0],y:p[1]}),unproject:p=>[p.x,p.y]});
 assert.equal(data.features[0].properties.rotation,angle);
 }
 const print=createPQ5BasemapStyle({},'print');assert.deepEqual(print.layers.find(l=>l.id==='bm-contour-short-labels').layout['text-rotate'],['get','rotation']);
});

test('Long contours stop projection early; idle events do not rebuild unchanged label data',async()=>{
 const {shortContourLabelFeatures,installShortContourLabels}=await import('../src/contours.js');const {EventEmitter}=await import('node:events');let projected=0;
 const data=shortContourLabelFeatures([{properties:{hoehe:500},geometry:{type:'LineString',coordinates:Array.from({length:10000},(_,i)=>[i*10,0])}}],{project:p=>{projected++;return {x:p[0],y:p[1]};},unproject:p=>[p.x,p.y]});assert.equal(data.features.length,0);assert.ok(projected<25);
 const map=new EventEmitter(),source={setData(){}};let queries=0;Object.assign(map,{getSource:()=>source,getStyle:()=>({}),getFilter:()=>createContourLayers(50000)[2].filter,getContainer:()=>({clientWidth:100,clientHeight:100}),querySourceFeatures:(source,options)=>{assert.deepEqual(options.filter,createContourLayers(50000)[2].filter);queries++;return [];}});
 installShortContourLabels(map);assert.equal(queries,1);map.emit('idle');map.emit('idle');assert.equal(queries,1);
 map.emit('sourcedata',{sourceId:'height-contours',isSourceLoaded:true});map.emit('sourcedata',{sourceId:'height-contours',isSourceLoaded:true});await new Promise(r=>setTimeout(r,5));assert.equal(queries,2);map.emit('idle');assert.equal(queries,2);map.emit('remove');assert.equal(map.eventNames().length,0);
});
