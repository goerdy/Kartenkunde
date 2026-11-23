import {drawExerciseOverviewPoints,exercisePrecision} from './exercise.js';
import {drawNorthDiagram} from './north.js';
import {t,getLanguage} from './i18n.js';
import {tkLegendLayout,drawTKLegend} from './tk-legend.js';
import {extent,sheetPlan,sheetPolygon,project,pdfPageNumber} from './geo.js';
import {styleName,isPQ5,isBasemap,isLGLN,styleCredit,aborted} from './render.js';
export const ATLAS_URL='https://kartenkunde.app';
const coverInk=[39,54,48],coverAccent=[154,103,48];
export function coverLayout(p){
 const [w,h]=p.paper,compact=false,m=12,gap=3,inner=w-m*2,beside=w>h;
 const sources={x:m,y:h-m-(beside?32:43),w:inner,h:beside?32:43},print={x:m,y:sources.y-gap-(beside?18:24),w:inner,h:beside?18:24};
 const hasNotes=!!p.notes?.trim(),notes=hasNotes?(beside?{x:m+108+gap,y:print.y,w:inner-108-gap,h:print.h}:{x:m,y:print.y-gap-26,w:inner,h:26}):null;
 if(notes&&beside)print.w=108;
 const contentY=50,contentH=(notes&&!beside?notes.y:print.y)-gap-contentY;
 const legendW=beside?inner*.50:inner*.50,northH=beside?46:65;
 const legend=isPQ5(p.style)?tkLegendLayout(p.paper,legendW-8,{...p.tkOptions,scale:p.scale,contours:p.contours!==false},p.style):null;
 let map,legendBox=null,north;
 if(beside){
 const sideW=legend?legendW:Math.min(136,inner*.48),sideX=m+inner-sideW;
 north={x:sideX,y:contentY+contentH-northH,w:sideW,h:northH};
 map={x:m,y:contentY,w:inner-sideW-gap,h:contentH};
 if(legend){const available=contentH-northH-gap;legend.columns=Math.max(3,Math.floor(legend.width/43));legend.rowHeight=Math.min(5,(available-17-legend.titleHeight)/Math.ceil(legend.entries.length/legend.columns));legend.fontSize=Math.min(6.5,Math.max(5,legend.rowHeight*2));legend.height=legend.titleHeight+Math.ceil(legend.entries.length/legend.columns)*legend.rowHeight;legendBox={x:sideX,y:contentY,w:sideW,h:available};}
 }else{
 if(legend){legend.columns=Math.max(2,Math.floor(legend.width/43));legend.rowHeight=4;legend.fontSize=5.8;legend.height=legend.titleHeight+Math.ceil(legend.entries.length/legend.columns)*legend.rowHeight;}
 const rowH=Math.max(northH,legend?legend.height+17:0),rowY=contentY+contentH-rowH;
 north={x:legend?m+legendW+gap:m,y:rowY,w:legend?inner-legendW-gap:inner,h:rowH};
 if(legend)legendBox={x:m,y:rowY,w:legendW,h:rowH};
 map={x:m,y:contentY,w:inner,h:rowY-gap-contentY};
 }
 return {w,h,m,compact,inner,sources,print,notes,map,legendBox,legend,north};
}

function coverText(pdf,value,x,y,size=7,bold=false){pdf.setTextColor(...coverInk);pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.text(Array.isArray(value)?value:String(value),x,y);}
function coverBox(pdf,b,title,compact){pdf.setFillColor(249,249,245);pdf.setDrawColor(148,155,142);pdf.setLineWidth(.18);pdf.rect(b.x,b.y,b.w,b.h,'FD');coverText(pdf,title,b.x+3,b.y+4,compact?5.6:6.5,true);}
function coverLines(pdf,value,x,y,w,size){pdf.setFont('helvetica','normal');pdf.setFontSize(size);const lines=pdf.splitTextToSize(value,w);coverText(pdf,lines,x,y,size);return y+lines.length*size*.4;}
export function coverScale(p,maxWidth=75){
 const maxKm=maxWidth*p.scale/1e6,magnitude=10**Math.floor(Math.log10(maxKm));const km=[5,2,1].map(n=>n*magnitude).find(n=>n<=maxKm)||magnitude/2;
 return {km,width:km*1e6/p.scale};
}
export function drawCoverScale(pdf,p,x,y,maxWidth,caption=true){
 const {km,width}=coverScale(p,maxWidth);pdf.setDrawColor(...coverInk);pdf.setLineWidth(.15);
 for(let i=0;i<4;i++){pdf.setFillColor(...(i%2?[255,255,255]:coverInk));pdf.rect(x+i*width/4,y,width/4,1.4,'FD');}
 const unit=km<1?'m':'km',distance=km<1?km*1000:km;coverText(pdf,'0',x,y-1,5);coverText(pdf,`${distance/2}`,x+width/2-1,y-1,5);coverText(pdf,`${distance} ${unit}`,x+width-2,y-1,5);
 if(caption)coverText(pdf,`${t('coverSheetScale')} · 1:${p.scale.toLocaleString(getLanguage())}`,x,y+4,5);
}
export function drawCoverQR(pdf,x,y,size){
 const code=globalThis.qrcode(0,'M');code.addData(ATLAS_URL,'Byte');code.make();const count=code.getModuleCount(),unit=size/(count+8);
 pdf.setFillColor(255,255,255);pdf.rect(x,y,size,size,'F');pdf.setFillColor(0,0,0);
 for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(code.isDark(row,col))pdf.rect(x+(col+4)*unit,y+(row+4)*unit,unit,unit,'F');
 pdf.link(x,y,size,size,{url:ATLAS_URL});
}
export async function drawAtlasCover(pdf,p,signal,render){
 const l=coverLayout(p),{w,h,m,compact}=l,fs=compact?5.3:6.3,stamp=p.createdAt||new Date();
 pdf.setDrawColor(...coverInk);pdf.setLineWidth(.45);pdf.rect(7,7,w-14,h-14);pdf.setLineWidth(.12);pdf.rect(8.4,8.4,w-16.8,h-16.8);
 coverText(pdf,'KARTENKUNDE.app',m,16,12,true);
 pdf.setFont('helvetica','bold');pdf.setFontSize(compact?16:24);let title=pdf.splitTextToSize((p.title||'KARTENKUNDE.app').trim(),l.inner);let titleSize=compact?16:24;
 if(title.length>1){titleSize=compact?11:17;pdf.setFontSize(titleSize);title=pdf.splitTextToSize((p.title||'KARTENKUNDE.app').trim(),l.inner);}if(title.length>2){title=title.slice(0,2);title[1]+=' …';}
 pdf.setTextColor(...coverInk);pdf.text(title,m,25);
 const settingY=39;pdf.setDrawColor(...coverAccent);pdf.setLineWidth(.5);pdf.line(m,settingY-3,w-m,settingY-3);
 coverText(pdf,`${styleName(p.style)} · 1:${p.scale.toLocaleString(getLanguage())} · ${p.paperName||Object.entries({A4:[210,297],A3:[297,420],A2:[420,594],A1:[594,841]}).find(([,v])=>v.includes(w)&&v.includes(h))?.[0]||`${w} × ${h} mm`} ${t(p.landscape?'landscape':'portrait')}`,m,settingY,compact?6:7,true);
 coverText(pdf,`${p.dpi} dpi · ${p.sheets.length} ${t('mapPages')} · ${t('overlap')} ${p.overlap} mm · WGS84 / UTMREF · ${t('pdfGrid')} ${p.grid/1000} km`,m,settingY+4,fs);
 if(p.exercise)coverText(pdf,`${p.exercise.solution?t('exerciseSolutionTitle'):t('exerciseWorksheet')} · ${t('exerciseCoverInfo',{count:p.exercise.points.length,precision:exercisePrecision(p.scale)})}`,m,settingY+8,fs,true);
 const outlines=p.sheets.map(s=>sheetPolygon(sheetPlan(p,s),s).map(ll=>project('EPSG:3857',ll))),all=extent(outlines.flat());
 const b=l.map,padding=1,ow=b.w-padding*2,oh=b.h-padding*2,cx=(all.x0+all.x1)/2,cyMap=(all.y0+all.y1)/2;let ew=(all.x1-all.x0)*1.08,eh=(all.y1-all.y0)*1.08;if(ew/eh<ow/oh)ew=eh*ow/oh;else eh=ew*oh/ow;Object.assign(all,{x0:cx-ew/2,x1:cx+ew/2,y0:cyMap-eh/2,y1:cyMap+eh/2});const ox=b.x+padding,oy=b.y+padding;
 pdf.setDrawColor(...coverInk);pdf.setLineWidth(.25);pdf.rect(b.x,b.y,b.w,b.h);
 const image=await render({...p,crs:'EPSG:3857',dpi:101.6,overview:true},all,Math.max(16,Math.round(ow*4)),Math.max(16,Math.round(oh*4)),signal);aborted(signal);pdf.addImage(image,'PNG',ox,oy,ow,oh);image.width=image.height=1;
 const point=xy=>[ox+(xy[0]-all.x0)/(all.x1-all.x0)*ow,oy+(all.y1-xy[1])/(all.y1-all.y0)*oh];
 for(let i=0;i<outlines.length;i++){const ring=outlines[i].map(point);pdf.setDrawColor(...coverInk);pdf.setLineWidth(.2);for(let j=0;j<ring.length;j++)pdf.line(...ring[j],...ring[(j+1)%ring.length]);const box=extent(ring);if(box.x1-box.x0>7&&box.y1-box.y0>5){const x=(box.x0+box.x1)/2,y=(box.y0+box.y1)/2;pdf.setFillColor(255,255,255);pdf.roundedRect(x-3,y-2.2,6,4.4,.6,.6,'F');coverText(pdf,pdfPageNumber(p.sheets[i]),x-1,y+1,7,true);}}
 drawExerciseOverviewPoints(pdf,p,point);
 // The overview is north-up Web Mercator: this arrow indicates true north, not UTM grid north.
 const nx=b.x+b.w-8,ny=b.y+10;pdf.setFillColor(255,255,255);pdf.rect(nx-5,ny-7,10,19,'F');coverText(pdf,'N',nx-1.4,ny-3,7,true);pdf.setFillColor(...coverInk);pdf.triangle(nx,ny,nx-2.5,ny+9,nx,ny+7,'F');pdf.setDrawColor(...coverInk);pdf.triangle(nx,ny,nx+2.5,ny+9,nx,ny+7,'S');
 if(l.legend){coverBox(pdf,l.legendBox,'',compact);drawTKLegend(pdf,l.legend,l.legendBox.x+4,l.legendBox.y+(compact?2:4));drawCoverScale(pdf,p,l.legendBox.x+4,l.legendBox.y+l.legendBox.h-6,Math.min(75,l.legendBox.w-14));}
 else{const sb={x:b.x+3,y:b.y+b.h-13,w:Math.min(b.w-6,86),h:11};pdf.setFillColor(255,255,255);pdf.rect(sb.x,sb.y,sb.w,sb.h,'F');drawCoverScale(pdf,p,sb.x+3,sb.y+5,sb.w-10);}
 drawNorthDiagram(pdf,p,l.north);
 coverBox(pdf,l.print,t('coverPrint'),compact);const paperName=Object.entries({A4:[210,297],A3:[297,420],A2:[420,594],A1:[594,841]}).find(([,v])=>v.includes(w)&&v.includes(h))?.[0]||'';const paperLabel=`${paperName} · ${w} × ${h} mm · ${t(p.landscape?'landscape':'portrait')}`;
 coverLines(pdf,t('coverPrintLine',{format:paperLabel}),l.print.x+3,l.print.y+8,l.print.w-6,fs);
 const cy=l.print.y+l.print.h-6;pdf.setDrawColor(...coverInk);pdf.setLineWidth(.25);pdf.line(m+3,cy,m+103,cy);for(let i=0;i<=10;i++)pdf.line(m+3+i*10,cy,m+3+i*10,cy+(i%5?1:2));coverText(pdf,t('pdfCheck'),m+3,cy+4,4.8);
 coverBox(pdf,l.sources,t('coverSources'),compact);const qrSize=compact?22:27,qx=l.sources.x+l.sources.w-qrSize-2,qy=l.sources.y+3,tx=m+3,tw=l.sources.w-qrSize-10;drawCoverQR(pdf,qx,qy,qrSize);
 let sy=l.sources.y+8;sy=coverLines(pdf,styleCredit(p.style)+(p.style==='bright'?` · ${t('pdfReliefSourceFull')}`:'')+(p.boundaryAttribution?` · ${p.boundaryAttribution.name||'geoBoundaries'}: ${p.boundaryAttribution.source} / ${p.boundaryAttribution.license} / ${p.boundaryAttribution.year}`:''),tx,sy,tw,fs);
 const sourceURL=isBasemap(p.style)?'bkg.bund.de · CC BY 4.0 · openstreetmap.org/copyright':isLGLN(p.style)?'creativecommons.org/licenses/by/4.0/':'openstreetmap.org/copyright · openfreemap.org';sy=coverLines(pdf,sourceURL,tx,sy+.4,tw,fs);pdf.link(tx,sy-fs*.4,tw,3,{url:isBasemap(p.style)||isLGLN(p.style)?'https://creativecommons.org/licenses/by/4.0/':'https://www.openstreetmap.org/copyright'});
 if(p.boundaryAttribution?.sourcesURL){const label='BKG VG250 · dl-de/by-2-0 · '+t('boundaryDataSources');sy=coverLines(pdf,label,tx,sy+.4,tw,fs);pdf.link(tx,sy-fs*.4,tw,3,{url:p.boundaryAttribution.sourcesURL});}
 const dataDate=isLGLN(p.style)?t('coverLGLNAge'):t('coverUnknownAge');sy=coverLines(pdf,`${t('coverPrinted')}: ${stamp.toLocaleString(getLanguage())} · ${dataDate}`,tx,sy+1,tw,fs);
 sy=coverLines(pdf,t('coverAuthor'),tx,sy+1,tw,fs);sy=coverLines(pdf,t('coverDisclaimer'),tx,sy+1,tw,fs);
 pdf.setTextColor(...coverAccent);pdf.setFontSize(fs);pdf.text(ATLAS_URL,tx,sy+1);pdf.link(tx,sy-2,Math.min(tw,pdf.getTextWidth(ATLAS_URL)),4,{url:ATLAS_URL});
 if(l.notes){coverBox(pdf,l.notes,t('notes'),compact);let ns=fs,lines;do{pdf.setFontSize(ns);lines=pdf.splitTextToSize(p.notes.trim(),l.notes.w-6);if(lines.length*ns*.4<=l.notes.h-7)break;ns-=.2;}while(ns>4);const maxLines=Math.max(1,Math.floor((l.notes.h-7)/(ns*.4))),shown=lines.slice(0,maxLines);if(shown.length<lines.length)shown[shown.length-1]+=' …';coverText(pdf,shown,l.notes.x+3,l.notes.y+7,ns);}
}
