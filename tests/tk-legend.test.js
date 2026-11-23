import test from 'node:test';
import assert from 'node:assert/strict';
import {tkLegendLayout,drawTKLegend} from '../src/tk-legend.js';
import {TK_FEATURE_KEYS,TK_SYMBOL_CLASSES} from '../src/tk-features.js';
import {tkSymbolGeometry,militaryHatchPixels} from '../src/tk-symbols.js';
import {createPQ5TKOverviewStyle} from '../src/pq5-tk.js';
import {PAPER} from '../src/geo.js';
test('Legend includes enabled categories and draws within its measured area on every paper format',()=>{
 for(const dimensions of Object.values(PAPER))for(const landscape of [true,false]){
 const paper=landscape?[dimensions[1],dimensions[0]]:dimensions,width=(paper[0]-24)*(landscape?.48:1),layout=tkLegendLayout(paper,width,{});const labels=[];
 const pdf={setTextColor(){},setFont(){},setFontSize(){},text(text,x,y){labels.push({text,x,y});},setDrawColor(){},setLineWidth(){},setLineDashPattern(){},setFillColor(){},triangle(){},rect(){},line(){}};
 drawTKLegend(pdf,layout,12,40);for(const label of labels){assert.ok(label.x>=12&&label.x<12+width);assert.ok(label.y>=40&&label.y<=40+layout.height);}
 assert.ok(layout.entries.some(e=>e.military));assert.ok(layout.entries.some(e=>e.symbol==='substation'));assert.ok(layout.entries.some(e=>e.symbol==='lock'));
 }
 const off=Object.fromEntries(TK_FEATURE_KEYS.map(key=>[key,false]));assert.equal(tkLegendLayout([210,297],186,off).entries.length,8);
});
test('Overview has no supplemental sources or dense farm/street/landmark labels',()=>{
 const style=createPQ5TKOverviewStyle();assert.equal(style.metadata['pq5:overview'],true);assert.ok(!style.sources['named-farms']);for(const layer of style.layers)if(layer.source)assert.ok(style.sources[layer.source]);
 for(const id of ['tk-small-settlements','tk-named-farms','tk-landmarks','tk-road-refs','tk-military-fill','tk-powerLine'])assert.ok(!style.layers.some(layer=>layer.id===id));
});
test('Legend and raster icons share finite vector geometry; military hatch has transparent gaps',()=>{
 for(const kind of TK_SYMBOL_CLASSES){const shapes=tkSymbolGeometry(kind);assert.ok(shapes.length);for(const shape of shapes)for(const point of shape.points)assert.ok(point.every(Number.isFinite));}
 const image=militaryHatchPixels(),alpha=[];for(let i=3;i<image.data.length;i+=4)alpha.push(image.data[i]);assert.ok(alpha.some(a=>a===0));assert.ok(alpha.some(a=>a>0));
});

test('POI pixels use a CPU canvas once per symbol and remain intact when a map changes its image buffer',async()=>{
 const {tkSymbolPixels}=await import('../src/tk-symbols.js'),previous=globalThis.document;let reads=0,canvases=0;
 globalThis.document={createElement:()=>{canvases++;return {getContext:(type,options)=>{assert.equal(type,'2d');assert.deepEqual(options,{willReadFrequently:true});return {scale(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},getImageData(){reads++;return {data:new Uint8ClampedArray(64*64*4).fill(17)};}};}};}};
 try{const first=tkSymbolPixels('peak');assert.equal(first.data[0],17);first.data[0]=0;const second=tkSymbolPixels('peak');assert.equal(second.data[0],17);assert.notEqual(first.data,second.data);assert.equal(reads,1);assert.equal(canvases,1);}finally{globalThis.document=previous;}
});
