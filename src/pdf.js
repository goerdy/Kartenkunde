import {drawExerciseSheetPoints,validateExercisePlan} from './exercise.js';
import {appendExercisePages,exerciseTaskPageCount} from './exercise-pdf.js';
import {drawCoordinateLabels} from './coordinates.js';
import {drawAtlasCover,drawCoverScale,ATLAS_URL} from './cover.js';
import {applyPDFMonochrome} from './monochrome.js';
import {tkLegendLayout,drawTKLegend} from './tk-legend.js';
import {t,getLanguage} from './i18n.js';
import {jsPDF} from './vendor.js';
import {MARGIN,extent,sheetGeo,sampleBox,project,unproject,utm,zoneCells,clipLine,mgrsLabel,gridReference,gridEdgeLabel,sheetPlan,sheetPolygon,zoneBoundarySegments,pdfPageNumber} from './geo.js';
import {buildSheetNavigation,navigationAnchors,drawNeighborArrows} from './navigation.js';
import {areaPolygons,clipRingToBox,interiorPoint} from './area-geometry.js';
import {renderMap,styleName,isPQ5,isBasemap,MAP_STYLES,isLGLN,styleCredit,reliefCredit,aborted,breathe} from './render.js';
const ink=[37,65,57],gridInk=[42,79,106];
function text(pdf,t,x,y,size=8){pdf.setFontSize(size);pdf.setTextColor(...ink);pdf.text(String(t),x,y);}
function wrap(pdf,t,x,y,w,size=8){pdf.setFontSize(size);const lines=pdf.splitTextToSize(t,w);pdf.text(lines,x,y);return y+lines.length*size*.42;}
export async function createPDF(plan,{signal,onProgress=()=>{},render=renderMap}={}){
 validateExercisePlan(plan);
 plan={...plan,createdAt:new Date(),warnings:new Set()};
 const pdf=new jsPDF({orientation:plan.landscape?'landscape':'portrait',unit:'mm',format:plan.paper,compress:true,precision:6});
 if(MAP_STYLES[plan.style]?.monochrome)applyPDFMonochrome(pdf);
 pdf.setProperties({title:plan.title||'KARTENKUNDE.app',subject:`KARTENKUNDE.app | WGS84 UTMREF | 1:${plan.scale}`,creator:'KARTENKUNDE.app',author:'KARTENKUNDE.app'});
 onProgress(0,plan.sheets.length+1,t('overviewLoading'));
 const navigation=buildSheetNavigation(plan);
 await drawAtlasCover(pdf,plan,signal,render);
 plan.mapPageOffset=exerciseTaskPageCount(plan);
 appendExercisePages(pdf,plan,{signal});
 for(let i=0;i<plan.sheets.length;i++){
 aborted(signal);const s=plan.sheets[i];onProgress(i+1,plan.sheets.length+1,t('pageLoading',{page:s.id,count:plan.sheets.length}));
 const pxw=Math.round(plan.width*plan.dpi/25.4),pxh=Math.round(plan.height*plan.dpi/25.4);
 const local=sheetPlan(plan,s);
 const image=await render(local,s,pxw,pxh,signal);aborted(signal);
 pdf.addPage(plan.paper,plan.landscape?'landscape':'portrait');pdf.addImage(image,'PNG',MARGIN,MARGIN,plan.width,plan.height,undefined,'FAST',0);image.width=1;image.height=1;
 const references=drawGrid(pdf,local,s,navigation[s.id]);
 drawExerciseSheetPoints(pdf,plan,s,MARGIN);
 pdf.setDrawColor(...ink);pdf.setLineWidth(.2);pdf.rect(MARGIN,MARGIN,plan.width,plan.height);
 drawSheetHeader(pdf,plan,s,references);
 drawCoverScale(pdf,plan,MARGIN,plan.paper[1]-9,Math.min(65,plan.width/2-12),false);
 if(plan.warnings.size){pdf.setFontSize(4.5);pdf.text(t('farmWarningShort'),plan.paper[0]-MARGIN,plan.paper[1]-8,{align:'right'});}
 const footY=plan.paper[1]-5,licenseURL=isBasemap(plan.style)||isLGLN(plan.style)?'https://creativecommons.org/licenses/by/4.0/':'https://www.openstreetmap.org/copyright';
 const credits=styleCredit(plan.style)+(isBasemap(plan.style)?' · CC BY 4.0 / ODbL':isLGLN(plan.style)?' · creativecommons.org/licenses/by/4.0/':' · openstreetmap.org/copyright')+(plan.boundaryAttribution?` · ${plan.boundaryAttribution.name==='BKG VG250'?plan.boundaryAttribution.source+' / dl-de/by-2-0':'geoBoundaries'}`:'')+(plan.style==='bright'?' · Mapzen / AWS Terrain Tiles':'');
 const footer=t('pdfFooter',{date:plan.createdAt.toLocaleString(getLanguage()),credits})+' · kartenkunde.app';
 pdf.setFont('helvetica','normal');pdf.setFontSize(6);const measured=pdf.getTextWidth(footer),size=Math.min(6,6*(plan.paper[0]-2*MARGIN)/measured);
 text(pdf,footer,MARGIN,footY,size);pdf.link?.(MARGIN,footY-2,plan.paper[0]-2*MARGIN,3,{url:licenseURL});const linkWidth=pdf.getTextWidth('kartenkunde.app');pdf.link?.(MARGIN+pdf.getTextWidth(footer)-linkWidth,footY-2,linkWidth,3,{url:ATLAS_URL});
 drawNeighborArrows(pdf,plan,navigation[s.id]);
 await breathe();
 }
 onProgress(plan.sheets.length+1,plan.sheets.length+1,t('pdfReady'));pdf.exportWarnings=[...plan.warnings];return pdf;
}
export function drawSheetHeader(pdf,plan,sheet,references){
 const right=plan.paper[0]-MARGIN,rightWidth=Math.min(62,plan.width*.43),leftWidth=Math.min(plan.width-rightWidth-5,plan.width/2-10);
 pdf.setTextColor(...ink);pdf.setFont('helvetica','normal');pdf.setFontSize(6);pdf.text('KARTENKUNDE.app',MARGIN,6);
 const sheetLabel=`${t('pdfSheet')} ${pdfPageNumber(sheet)}`,title=(plan.title||'KARTENKUNDE.app').trim();
 pdf.setFont('helvetica','bold');pdf.setFontSize(10);const suffix=` · ${sheetLabel}`;let short=title;
 while(short.length>1&&pdf.getTextWidth(short+suffix)>leftWidth)short=short.slice(0,-1);
 if(short!==title)short=short.slice(0,-1)+'…';
 pdf.text(short+suffix,MARGIN,10);
 pdf.setFontSize(8);const scale=`1:${plan.scale.toLocaleString(getLanguage())}`,datum='WGS84';pdf.setFont('helvetica','normal');const dw=pdf.getTextWidth(datum);pdf.text(datum,right,6,{align:'right'});pdf.setFont('helvetica','bold');pdf.text(scale,right-dw-3,6,{align:'right'});
 const zone=references.join(' · ');pdf.setFontSize(7.5);const zw=pdf.getTextWidth(zone);if(zw>rightWidth)pdf.setFontSize(7.5*rightWidth/zw);pdf.text(zone,right,10,{align:'right'});pdf.setFont('helvetica','normal');
}
export function drawGrid(pdf,p,s,neighbors={}){
 const geo=sheetGeo(p,s,24),ex=extent(geo),b={w:ex.x0,e:ex.x1,s:ex.y0,n:ex.y1};
 const toPage=ll=>{const a=project(p.crs,ll);return [(a[0]-s.x0)/p.scale*1000,(s.y1-a[1])/p.scale*1000];};
 const labels=[];
 const addLabel=(pt,value,axis,cell)=>{const edge=Math.abs(pt[0])<.02?'left':Math.abs(pt[0]-p.width)<.02?'right':Math.abs(pt[1])<.02?'top':Math.abs(pt[1]-p.height)<.02?'bottom':null;if(edge)labels.push({pt,value,axis,edge,cell});};
 for(const cell of zoneCells(b)){
 const crs=utm(cell.zone,cell.south),e=extent(sampleBox(cell).map(a=>project(crs,a)));
 pdf.setDrawColor(...gridInk);pdf.setLineWidth(.12);
 // Each grid line is sampled in its own native UTM zone, then reprojected to the atlas.
 for(const axis of [0,1]){
 const lo=axis===0?e.x0:e.y0,hi=axis===0?e.x1:e.y1;
 for(let value=Math.ceil(lo/p.grid)*p.grid;value<=hi;value+=p.grid){
 const otherLo=(axis===0?e.y0:e.x0)-p.grid,otherHi=(axis===0?e.y1:e.x1)+p.grid;
 const steps=Math.max(40,Math.ceil((otherHi-otherLo)/250));let previous=null;
 for(let i=0;i<=steps;i++){
 const v=otherLo+(otherHi-otherLo)*i/steps,ll=unproject(crs,axis===0?[value,v]:[v,value]);
 const inside=ll[0]>=cell.w-1e-9&&ll[0]<=cell.e+1e-9&&ll[1]>=cell.s-1e-9&&ll[1]<=cell.n+1e-9;
 const point=toPage(ll);
 if(inside&&previous?.inside){const segment=clipLine(previous.point,point,p.width,p.height);if(segment){pdf.line(segment[0][0]+MARGIN,segment[0][1]+MARGIN,segment[1][0]+MARGIN,segment[1][1]+MARGIN);addLabel(segment[0],value,axis,cell);addLabel(segment[1],value,axis,cell);}}
 // Find exact native-zone boundary intersection instead of leaving a sampling gap.
 else if(previous&&inside!==previous.inside){let a=previous.ll,bb=ll;for(let j=0;j<18;j++){const mid=[(a[0]+bb[0])/2,(a[1]+bb[1])/2];const mIn=mid[0]>=cell.w&&mid[0]<=cell.e&&mid[1]>=cell.s&&mid[1]<=cell.n;if(mIn===previous.inside)a=mid;else bb=mid;}const boundary=toPage([(a[0]+bb[0])/2,(a[1]+bb[1])/2]);const seg=clipLine(inside?boundary:previous.point,inside?point:boundary,p.width,p.height);if(seg){pdf.line(seg[0][0]+MARGIN,seg[0][1]+MARGIN,seg[1][0]+MARGIN,seg[1][1]+MARGIN);addLabel(seg[0],value,axis,cell);addLabel(seg[1],value,axis,cell);}}
 previous={ll,point,inside};
 }
 }
 }
 }
 // Draw only real GZD edges, never the artificial bounding box of a clipped cell.
 pdf.setDrawColor(...gridInk);pdf.setLineWidth(.45);pdf.setLineDashPattern?.([2,1],0);
 for(const [a,boundaryEnd]of zoneBoundarySegments(b)){let previous=null;for(let i=0;i<=80;i++){const point=toPage([a[0]+(boundaryEnd[0]-a[0])*i/80,a[1]+(boundaryEnd[1]-a[1])*i/80]);if(previous){const line=clipLine(previous,point,p.width,p.height);if(line)pdf.line(line[0][0]+MARGIN,line[0][1]+MARGIN,line[1][0]+MARGIN,line[1][1]+MARGIN);}previous=point;}}
 pdf.setLineDashPattern?.([],0);
 // All coordinate and square labels stay outside the map field.
 const occupied=[],arrows=navigationAnchors(p,neighbors);pdf.setFont('helvetica','normal');
 for(const l of labels){const horizontal=l.edge==='top'||l.edge==='bottom';const along=horizontal?l.pt[0]:l.pt[1];if(along<5||along>(horizontal?p.width:p.height)-5||arrows.some(a=>a.edge===l.edge&&Math.abs(a.along-along)<6))continue;if(occupied.some(o=>o.edge===l.edge&&Math.abs(o.along-along)<13))continue;occupied.push({edge:l.edge,along});const val=gridEdgeLabel(l.value,p.grid);pdf.setFontSize(7);pdf.setTextColor(...gridInk);const x=l.pt[0]+MARGIN,y=l.pt[1]+MARGIN;if(l.edge==='top')pdf.text(val,x,y-1,{align:'center'});if(l.edge==='bottom')pdf.text(val,x,y+3,{align:'center'});if(l.edge==='left')pdf.text(val,x-3,y+.8,{align:'center'});if(l.edge==='right')pdf.text(val,x+3,y+.8,{align:'center'});}
 drawCoordinateLabels(pdf,p,s,labels,neighbors);
 return gridSquareReferences(p,s);
}

export function gridSquareReferences(p,s){
 const border=sheetGeo(p,s,24),e=extent(border),bounds={w:e.x0,e:e.x1,s:e.y0,n:e.y1},references=new Set();
 for(const cell of zoneCells(bounds)){
 const native=utm(cell.zone,cell.south),limits=extent(sampleBox(cell).map(ll=>project(native,ll)));
 for(let east=Math.floor(limits.x0/100000)*100000;east<=limits.x1;east+=100000)for(let north=Math.floor(limits.y0/100000)*100000;north<=limits.y1;north+=100000){
 const square={x0:east,x1:east+100000,y0:north,y1:north+100000};let ring=sheetPolygon({crs:native},square);
 ring=clipRingToBox(ring,cell);if(ring.length<4)continue;
 ring=ring.map(ll=>{const xy=project(p.crs,ll);return [(xy[0]-s.x0)/p.scale*1000,(s.y1-xy[1])/p.scale*1000];});
 ring=clipRingToBox(ring,{w:0,e:p.width,s:0,n:p.height});if(ring.length<4)continue;
 const point=interiorPoint([ring]),ll=unproject(p.crs,[s.x0+point[0]*p.scale/1000,s.y1-point[1]*p.scale/1000]);
 references.add(mgrsLabel(...ll,0).replace(/^(\d{1,2}[A-Z])([A-Z]{2})$/,'$1 $2'));
 }
 }return [...references].sort();
}
