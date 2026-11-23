import {setLanguage} from '../src/i18n.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makePlan,project,unproject,zoneAt,zoneCells,clipLine,mgrsLabel,PAPER,gridEdgeLabel,gridSpacing,MARGIN,SCALES,sheetPlan,zoneBoundarySegments,numberSheetsTopLeft,pdfPageNumber} from '../src/geo.js';
// Test-only UTM numerical adapter from the independently implemented mgrs equations.
// This exercises pagination without downloading the production proj4js library.
setLanguage('de');
const source=readFileSync(new URL('../vendor/mgrs.js',import.meta.url),'utf8');
const context={};vm.runInNewContext(source,context);globalThis.mgrs=context.mgrs;
const raw={};vm.runInNewContext(source.replace(/((?:const |let |var )?)LongOrigin = \(ZoneNumber - 1\)/, 'if (ll.zone) ZoneNumber=ll.zone;\n  $1LongOrigin = (ZoneNumber - 1)').replace(/(northing|easting): Math\.(?:round|trunc)\((UTMNorthing|UTMEasting)\)/g,'$1: $2').replace('exports.forward = forward;','exports.forward = forward; exports.rawForward=LLtoUTM; exports.rawInverse=UTMtoLL;'),raw);
const reference=raw.mgrs;
globalThis.proj4=(from,to,p)=>{if(to==='EPSG:3857')return [6378137*p[0]*Math.PI/180,6378137*Math.log(Math.tan(Math.PI/4+p[1]*Math.PI/360))];if(from==='EPSG:3857')return [p[0]/6378137*180/Math.PI,(2*Math.atan(Math.exp(p[1]/6378137))-Math.PI/2)*180/Math.PI];const def=from==='EPSG:4326'?to:from;const zone=Number(def.match(/\+zone=(\d+)/)?.[1]);const south=def.includes('+south');if(from==='EPSG:4326'){const r=reference.rawForward({lon:p[0],lat:p[1],zone});return [r.easting,r.northing-(p[1]<0?10000000:0)+(south?10000000:0)];}const r=reference.rawInverse({easting:p[0],northing:p[1],zoneNumber:zone,zoneLetter:south?'M':'N'});return [r.lon,r.lat];};
const opts={scale:50000,paper:'A4',landscape:false,overlap:10,dpi:150,style:'liberty'};
test('WGS84 UTM control point and MGRS designation',()=>{const p=project('+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs',[9,0]);assert.ok(Math.abs(p[0]-500000)<.00001);assert.ok(Math.abs(p[1])<.00001);assert.equal(mgrsLabel(9,0,5),'32NNF0000000000');assert.equal(mgrsLabel(-77.0365,38.8977,0),'18SUJ');});
test('Norway, Svalbard, equator and longitude endpoints',()=>{assert.equal(zoneAt(4,60),32);assert.equal(zoneAt(8,75),31);assert.equal(zoneAt(15,75),33);assert.equal(zoneAt(25,75),35);assert.equal(zoneAt(40,75),37);assert.equal(zoneAt(180,10),60);assert.equal(zoneAt(-180,10),1);const c=zoneCells({w:2,e:13,s:58,n:61});assert.equal(c.length,3);assert.equal(c.find(c=>c.zone===31).e,3);assert.equal(c.find(c=>c.zone===32).w,3);const eq=zoneCells({w:8,e:10,s:-1,n:1});assert.deepEqual(eq.map(c=>c.south),[true,false]);});
test('All 48 paper/orientation/scale combinations have exact physical map dimensions',()=>{for(const [paper,size]of Object.entries(PAPER))for(const landscape of [true,false])for(const scale of SCALES){const p=makePlan({w:9,e:9.001,s:50,n:50.001},{...opts,paper,landscape,scale});const d=landscape?[size[1],size[0]]:size;assert.deepEqual(p.paper,d);assert.ok(Math.abs(p.wm/scale*1000-(d[0]-2*MARGIN))<1e-8);assert.ok(Math.abs(p.hm/scale*1000-(d[1]-2*MARGIN))<1e-8);assert.equal(p.grid,gridSpacing(scale));}});
test('Multi-page atlas covers all geographic edges and keeps exact overlap',()=>{const b={w:8.95,e:9.22,s:49.95,n:50.10},p=makePlan(b,opts);assert.ok(p.sheets.length>1);const first=p.sheets[0],last=p.sheets.at(-1);for(let i=0;i<=12;i++)for(const ll of [[b.w+(b.e-b.w)*i/12,b.s],[b.w+(b.e-b.w)*i/12,b.n],[b.w,b.s+(b.n-b.s)*i/12],[b.e,b.s+(b.n-b.s)*i/12]]){const [x,y]=project(p.crs,ll);assert.ok(x>=first.x0&&x<=last.x1&&y>=last.y0&&y<=first.y1);}const right=p.sheets.find(s=>s.row===0&&s.col===1);assert.ok(Math.abs((first.x1-right.x0)/p.scale*1000-10)<1e-8);for(const s of p.sheets){assert.ok(Math.abs((s.x1-s.x0)/p.scale*1000-p.width)<1e-7);assert.ok(Math.abs((s.y1-s.y0)/p.scale*1000-p.height)<1e-7);}});
test('Southern hemisphere and cross-zone atlases',()=>{const south=makePlan({w:151.20,e:151.21,s:-33.87,n:-33.86},opts);assert.equal(south.south,true);assert.equal(south.zone,56);assert.ok(south.sheets[0].y0>0);const crossing=makePlan({w:5.98,e:6.02,s:50,n:50.02},opts);assert.ok(crossing.zones.includes(31)&&crossing.zones.includes(32));const back=unproject(south.crs,project(south.crs,[151.205,-33.865]));assert.ok(Math.abs(back[0]-151.205)<1e-7);assert.ok(Math.abs(back[1]+33.865)<1e-7);});
test('Invalid and unsupported selections never produce a misleading atlas',()=>{for(const b of [null,{w:0,e:1,s:83.99,n:85},{w:179,e:181,s:10,n:11},{w:8,e:8,s:50,n:51}])assert.throws(()=>makePlan(b,opts));});
test('Grid segments clip to the map frame exactly',()=>{assert.deepEqual(clipLine([-10,20],[110,20],100,80),[[0,20],[100,20]]);assert.deepEqual(clipLine([50,-5],[50,100],100,80),[[50,0],[50,80]]);assert.equal(clipLine([-10,2],[-1,8],100,80),null);});

test('MGRS frame labels use only the two kilometre digits within the 100 km square',()=>{assert.equal(gridEdgeLabel(456000),'56');assert.equal(gridEdgeLabel(5789000),'89');assert.equal(gridEdgeLabel(499000),'99');assert.equal(gridEdgeLabel(500000),'00');assert.equal(gridEdgeLabel(501000),'01');assert.equal(gridEdgeLabel(6250000),'50');});

test('National-sized regions exceed the old page cap and use regional UTM sheets',()=>{
 const bounds={w:5.8,e:15,s:47.3,n:55.1};const p=makePlan(bounds,{...opts,paper:'A1',scale:100000});
 assert.ok(p.sheets.length>24);assert.equal(p.regional,true);assert.deepEqual(p.paper,[594,841]);assert.ok(p.zones.includes(31)&&p.zones.includes(32)&&p.zones.includes(33));
 for(const s of p.sheets){const local=sheetPlan(p,s);assert.equal(local.zone,s.zone);assert.equal(local.crs,s.crs);assert.ok(Math.abs((s.x1-s.x0)/p.scale*1000-p.width)<1e-7);assert.ok(Math.abs((s.y1-s.y0)/p.scale*1000-p.height)<1e-7);}
});
test('An administrative multipolygon includes islands and omits empty intervening sheets',()=>{
 const rect=(w,s,e,n)=>[[[w,s],[e,s],[e,n],[w,n],[w,s]]];
 const feature={type:'Feature',geometry:{type:'MultiPolygon',coordinates:[rect(9,50,9.02,50.02),rect(9.5,50,9.52,50.02)]}};
 const p=makePlan({w:9,e:9.52,s:50,n:50.02},{...opts,feature,overlap:0});const full=makePlan({w:9,e:9.52,s:50,n:50.02},{...opts,overlap:0});assert.ok(p.sheets.length<full.sheets.length);
 for(const ll of [[9.01,50.01],[9.51,50.01]])assert.ok(p.sheets.some(s=>{const a=project(s.crs,ll);return a[0]>=s.x0&&a[0]<=s.x1&&a[1]>=s.y0&&a[1]<=s.y1;}));
});

test('PDF export renders each regional sheet in its own projection and creates a shared overview',async()=>{
 const {createPDF}=await import('../src/pdf.js');const renderCalls=[];
 class PDFRecorder{
 constructor(){this.pages=1;this.labels=[];this.lines=[];}
 triangle(){}getTextWidth(value){return value.length;}setProperties(){}setFontSize(){}setTextColor(){}setFont(){}setDrawColor(){}setLineWidth(){}setFillColor(){}roundedRect(){}rect(){}link(){}addImage(image,format){assert.equal(format,'PNG');}
 splitTextToSize(t){return [t];}
 text(t,x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));this.labels.push(t);}
 line(...values){assert.ok(values.every(Number.isFinite));this.lines.push(values);}
 addPage(){this.pages++;}
 }
 const feature={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[5.99,50],[6.01,50],[6.01,50.01],[5.99,50.01],[5.99,50]]]}};
 const p=makePlan({w:5.99,e:6.01,s:50,n:50.01},{...opts,feature,title:'Test',notes:'',boundaryAttribution:{source:'Fixture',license:'Test',year:'2026'}});
 vm.runInThisContext(readFileSync(new URL('../vendor/qrcode.js',import.meta.url),'utf8'));
 const previous=globalThis.jspdf;globalThis.jspdf={jsPDF:PDFRecorder};try{
 const pdf=await createPDF(p,{render:async(local,sheet,width,height)=>{assert.ok(width>0&&height>0);renderCalls.push({local,sheet});return {width,height};}});
 assert.equal(pdf.pages,p.sheets.length+1);assert.equal(renderCalls.length,p.sheets.length+1);assert.equal(renderCalls[0].local.crs,'EPSG:3857');for(let i=0;i<p.sheets.length;i++)assert.equal(renderCalls[i+1].local.crs,p.sheets[i].crs);
 assert.ok(pdf.labels.some(t=>String(t).includes('geoBoundaries')));assert.ok(pdf.labels.some(t=>t==='Kontrollstrecke: exakt 100 mm'));assert.ok(pdf.lines.length>0);
 }finally{globalThis.jspdf=previous;}
});

test('Real grid-zone boundaries include zone and band edges but never the clipped sheet bounding box',()=>{
 assert.deepEqual(zoneBoundarySegments({w:8.9,e:9.1,s:50,n:50.1}),[]);
 const crossing=zoneBoundarySegments({w:5.9,e:6.1,s:50,n:50.1});assert.equal(crossing.length,1);assert.deepEqual(crossing[0],[[6,50],[6,50.1]]);
 const band=zoneBoundarySegments({w:8.9,e:9.1,s:47.9,n:48.1});assert.equal(band.length,1);assert.equal(band[0][0][1],48);assert.equal(band[0][1][1],48);
 const norway=zoneBoundarySegments({w:2.9,e:3.1,s:60,n:60.1});assert.equal(norway.length,1);assert.equal(norway[0][0][0],3);
});
test('Numbering forms west-to-east rows despite small latitude differences across UTM projections',()=>{
 const entries=[{name:'NE',center:[10,50.001]},{name:'SW',center:[9,49.90]},{name:'NW',center:[9,50]},{name:'SE',center:[10,49.899]}];
 const sorted=numberSheetsTopLeft(entries,11000);assert.deepEqual(sorted.map(s=>s.name),['NW','NE','SW','SE']);assert.deepEqual(sorted.map(s=>s.id),[1,2,3,4]);assert.deepEqual(sorted.map(s=>pdfPageNumber(s)),[1,2,3,4]);
});
test('Navigation uses adjacent sheets and cannot jump over missing areas',async()=>{
 const {buildSheetNavigation}=await import('../src/navigation.js');const p=makePlan({w:9,e:9.4,s:50,n:50.3},opts);const nav=buildSheetNavigation(p);const map=new Map(p.sheets.map(s=>[`${s.row}:${s.col}`,s]));
 for(const s of p.sheets)for(const [side,dr,dc]of [['top',-1,0],['right',0,1],['bottom',1,0],['left',0,-1]]){const target=map.get(`${s.row+dr}:${s.col+dc}`);assert.deepEqual(nav[s.id][side],target?[target.id]:[]);}
 const row=[{id:1,row:0,col:0},{id:2,row:0,col:2}];const missing=buildSheetNavigation({sheets:row});assert.deepEqual(missing[1].right,[]);assert.deepEqual(missing[2].left,[]);
 const crossing=makePlan({w:5.99,e:6.01,s:50,n:50.01},{...opts,feature:{type:'Polygon',coordinates:[[[5.99,50],[6.01,50],[6.01,50.01],[5.99,50.01],[5.99,50]]]}});const crossNav=buildSheetNavigation(crossing);assert.ok(Object.values(crossNav).some(n=>n.right.length||n.left.length));
});
test('Square references remain in the page header; the map grid has no centre badges or labels',async()=>{
 const {drawGrid}=await import('../src/pdf.js');
 for(const bounds of [{w:8.99,e:9.01,s:50,n:50.01},{w:5.99,e:6.01,s:50,n:50.01}]){
 const p=makePlan(bounds,opts),s=p.sheets[0],labels=[];let width=0,thickLines=0;
 const pdf={getTextWidth(v){return v.length;},setDrawColor(){},setLineWidth(w){width=w;},setLineDashPattern(){},setFont(){},setFontSize(){},setTextColor(){},line(){if(width===.45)thickLines++;},text(value,x,y){labels.push({value,x,y});},roundedRect(){assert.fail('No badge is allowed in the map field');}};
 const references=drawGrid(pdf,{...p,utmLabels:false,dmsLabels:false},s);assert.ok(references.length);assert.ok(references.every(r=>/^\d{1,2}[A-Z] [A-Z]{2}$/.test(r)));
 for(const l of labels){assert.match(l.value,/^\d{2}$/);assert.ok(l.x<MARGIN||l.x>MARGIN+p.width||l.y<MARGIN||l.y>MARGIN+p.height);}
 if(bounds.w>8)assert.equal(thickLines,0);else assert.ok(thickLines>0);
 }
});
test('Edge arrows show map sheet numbers and link to their physical PDF pages',async()=>{
 const {drawNeighborArrows}=await import('../src/navigation.js');const p={width:210-2*MARGIN,height:297-2*MARGIN,paper:[210,297]},labels=[],links=[],lines=[];
 const pdf={setDrawColor(){},setLineWidth(){},setTextColor(){},setFontSize(){},setFont(){},line(...xy){lines.push(xy);},text(value,x,y){labels.push({value,x,y});},link(x,y,w,h,target){links.push(target.pageNumber);}};
 drawNeighborArrows(pdf,p,{top:[1],right:[5,6],bottom:[8],left:[3]});assert.deepEqual(links,[2,6,7,9,4]);links.length=0;drawNeighborArrows(pdf,{...p,mapPageOffset:2},{top:[1],right:[5,6],bottom:[8],left:[3]});assert.deepEqual(links,[4,8,9,11,6]);assert.deepEqual(labels.map(l=>l.value),['1','5','6','8','3','1','5','6','8','3']);for(const l of labels)assert.ok(l.x<MARGIN||l.x>210-MARGIN||l.y<MARGIN||l.y>297-MARGIN);for(const [x,y,xx,yy]of lines)assert.ok((x<MARGIN&&xx<MARGIN)||(x>210-MARGIN&&xx>210-MARGIN)||(y<MARGIN&&yy<MARGIN)||(y>297-MARGIN&&yy>297-MARGIN));
});

test('LGLN PDFs attribute every page and link the licence without OSM source claims',async()=>{
 const {createPDF}=await import('../src/pdf.js');
 class Recorder{
 constructor(){this.pages=[[]];this.licenseLinks=0;}
 triangle(){}getTextWidth(value){return value.length;}setProperties(){}setFontSize(){}setTextColor(){}setFont(){}setDrawColor(){}setLineWidth(){}setFillColor(){}roundedRect(){}rect(){}addImage(image,format){assert.equal(format,'PNG');}line(){}setLineDashPattern(){}
 splitTextToSize(value){return [value];}text(value){this.pages.at(-1).push(String(value));}
 addPage(){this.pages.push([]);}link(x,y,w,h,target){if(target.url==='https://creativecommons.org/licenses/by/4.0/')this.licenseLinks++;}
 }
 vm.runInThisContext(readFileSync(new URL('../vendor/qrcode.js',import.meta.url),'utf8'));
 const previous=globalThis.jspdf;globalThis.jspdf={jsPDF:Recorder};
 try{for(const style of ['lgln50','lgln50gray']){
 const plan=makePlan({w:9.7,e:9.71,s:52.35,n:52.36},{...opts,style,title:'Hannover'});
 const pdf=await createPDF(plan,{render:async()=>({width:100,height:100})});
 for(const page of pdf.pages){assert.ok(page.some(label=>label.includes('GeoBasis-DE/LGLN')&&label.includes('CC BY 4.0')&&label.includes('Daten geändert')));assert.ok(!page.some(label=>label.includes('OpenStreetMap')||label.includes('OpenFreeMap')));}
 assert.equal(pdf.licenseLinks,pdf.pages.length);
 }}finally{globalThis.jspdf=previous;}
});

test('Missing additional farm names do not block PDF output and remain visible as a warning',async()=>{
 const {createPDF}=await import('../src/pdf.js');
 class Recorder{
 constructor(){this.labels=[];}triangle(){}getTextWidth(value){return value.length;}setProperties(){}setFontSize(){}setTextColor(){}setFont(){}setDrawColor(){}setLineWidth(){}setFillColor(){}roundedRect(){}rect(){}addImage(){}line(){}setLineDashPattern(){}addPage(){}link(){}
 splitTextToSize(value){return [value];}text(value){this.labels.push(String(value));}
 }
 vm.runInThisContext(readFileSync(new URL('../vendor/qrcode.js',import.meta.url),'utf8'));
 const previous=globalThis.jspdf;globalThis.jspdf={jsPDF:Recorder};
 try{
 const plan=makePlan({w:9.7,e:9.71,s:52.35,n:52.36},{...opts,style:'pq5tk',title:'Fixture'});
 const pdf=await createPDF(plan,{render:async local=>{local.warnings.add('Additional farm service unavailable');return {width:100,height:100};}});
 assert.deepEqual(pdf.exportWarnings,['Additional farm service unavailable']);assert.ok(pdf.labels.some(text=>text.includes('Hofnamen / Symbole unvollständig')));
 }finally{globalThis.jspdf=previous;}
});

test('Sub-kilometre grid labels preserve the MGRS hundred-metre digit',()=>{assert.equal(gridEdgeLabel(448200,200),'482');assert.equal(gridEdgeLabel(448300,100),'483');assert.equal(gridEdgeLabel(499900,100),'999');assert.equal(gridEdgeLabel(500000,100),'000');assert.deepEqual(SCALES.map(gridSpacing),[100,200,1000,1000,2000,5000]);});
