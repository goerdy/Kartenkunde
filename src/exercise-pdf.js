import {applyPDFMonochrome} from './monochrome.js';
import {PLANZEIGER_ART} from './planzeiger-art.js';
import {exerciseCoordinate,exercisePrecision,exercisePointSheets,validateExercisePlan} from './exercise.js';
import {ATLAS_URL} from './cover.js';
import {jsPDF} from './vendor.js';
import {aborted,MAP_STYLES} from './render.js';
import {t,getLanguage} from './i18n.js';
export function exercisePageLayout(plan){
 const [w,h]=plan.paper,m=16,inner=w-2*m,top=40,gap=6,guide={x:m,y:top,w:(inner-gap)/2,h:h-m-top};
 const tasks={x:guide.x+guide.w+gap,y:top+8,w:guide.w,h:guide.h-8},rowH=Math.min(12,tasks.h/20),capacity=20;
 return {w,h,m,inner,guide,tasks,side:guide.w>=110,top,rowH,capacity};
}
export function exerciseTaskPageCount(plan){return plan.exercise?.points.length?Math.ceil(plan.exercise.points.length/exercisePageLayout(plan).capacity):0;}
export function drawPlanzeigerArt(pdf,scale,x,y,width=176,step=null){
 const art=PLANZEIGER_ART[scale],factor=width/(step===null?art.width:art.panelWidth);
 for(const original of art.shapes){
 if(step!==null&&original.step!==step)continue;const shape={...original};if(step!==null){for(const key of ['x','x1','x2'])if(key in shape)shape[key]-=art.panelWidth*step;}pdf.setDrawColor(shape.color);pdf.setLineWidth((shape.width||.2)*factor);if(shape.fill)pdf.setFillColor(shape.fill);
 if(shape.type==='line')pdf.line(x+shape.x1*factor,y+shape.y1*factor,x+shape.x2*factor,y+shape.y2*factor);
 if(shape.type==='rect')pdf.rect(x+shape.x*factor,y+shape.y*factor,shape.w*factor,shape.h*factor,shape.fill?'FD':'S');
 if(shape.type==='circle')pdf.circle(x+shape.x*factor,y+shape.y*factor,shape.r*factor,shape.fill?'FD':'S');
 if(shape.type==='text'){pdf.setTextColor(shape.color);pdf.setFont('helvetica','normal');pdf.setFontSize(shape.size*factor);pdf.text(shape.value,x+shape.x*factor,y+shape.y*factor);}
 }
}
function exerciseText(pdf,value,x,y,size=8,bold=false){pdf.setTextColor(37,65,57);pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.text(String(value),x,y);}
export function drawExerciseGuide(pdf,plan,l){
 const b=l.guide;pdf.setDrawColor(148,155,142);pdf.setFillColor(249,249,245);pdf.setLineWidth(.2);pdf.rect(b.x,b.y,b.w,b.h,'FD');exerciseText(pdf,t('exerciseGuideTitle'),b.x+3,b.y+5,7,true);
 const cols=l.side?2:1,rows=4/cols,cellW=(b.w-6)/cols,cellH=(b.h-22)/rows;
 for(let i=0;i<4;i++){
 const x=b.x+3+(i%cols)*cellW,y=b.y+10+Math.floor(i/cols)*cellH;
 const art=PLANZEIGER_ART[plan.scale],aw=Math.min(cellW-3,(cellH-17)*art.panelWidth/art.height),ah=aw/art.panelWidth*art.height;
 drawPlanzeigerArt(pdf,plan.scale,x+(cellW-3-aw)/2,y,aw,i);
 const tx=x,ty=y+ah+3,tw=cellW-3;
 pdf.setFontSize(6.3);pdf.setFont('helvetica','normal');pdf.setTextColor(37,65,57);
 const lines=pdf.splitTextToSize(`${i+1}. ${t(`exerciseGuideStep${i+1}`)}`,tw);pdf.text(lines,tx,ty);
 }
 pdf.setFontSize(6);pdf.setFont('helvetica','normal');const precision=pdf.splitTextToSize(t('exerciseGuidePrecision',{scale:plan.scale.toLocaleString(getLanguage()),precision:exercisePrecision(plan.scale),metres:plan.scale===25000?10:100}),b.w-6);pdf.text(precision,b.x+3,b.y+b.h-7);

}
export function appendExercisePages(pdf,plan,{solution=false,signal}={}){
 if(!plan.exercise)return;exercisePrecision(plan.scale);const l=exercisePageLayout(plan),points=plan.exercise.points,count=exerciseTaskPageCount(plan);
 for(let page=0;page<count;page++){aborted(signal);pdf.addPage(plan.paper,plan.landscape?'landscape':'portrait');pdf.setDrawColor(37,65,57);pdf.setLineWidth(.3);pdf.rect(9,9,l.w-18,l.h-18);
 exerciseText(pdf,solution?t('exerciseSolutionTitle'):t('exerciseWorksheet'),l.m,18,13,true);pdf.setFontSize(9);const title=pdf.splitTextToSize(plan.title||'KARTENKUNDE.app',l.inner-40);exerciseText(pdf,title[0],l.m,24,9);pdf.setFontSize(7);pdf.text(`1:${plan.scale.toLocaleString(getLanguage())} · ${page+1}/${count}`,l.w-l.m,30,{align:'right'});if(!solution){exerciseText(pdf,t('exerciseParticipant')+' __________________________',l.m,34,8);exerciseText(pdf,t('exerciseDate')+' __________________',l.m+l.inner*.57,34,8);}
 const box=l.tasks,nrW=7,coordW=box.w*.45,coordX=box.x+nrW,placeX=coordX+coordW;
 exerciseText(pdf,t('exerciseNumber'),box.x+1,box.y-3,6.5,true);exerciseText(pdf,t('exerciseCoordinateAnswer'),coordX+1,box.y-3,6.5,true);exerciseText(pdf,t('exercisePlaceAnswer'),placeX+1,box.y-3,6.5,true);
 for(let row=0;row<l.capacity;row++){const i=page*l.capacity+row;if(i>=points.length)break;const point=points[i],y=box.y+row*l.rowH,kind=point.kind==='coordinate';
 pdf.setDrawColor(165,174,163);pdf.setLineWidth(.15);pdf.rect(box.x,y,box.w,l.rowH);pdf.line(coordX,y,coordX,y+l.rowH);pdf.line(placeX,y,placeX,y+l.rowH);
 exerciseText(pdf,String(i+1),box.x+1,y+4,7);
 if(!kind||solution)exerciseText(pdf,exerciseCoordinate(point,plan.scale),coordX+1,y+4,6.5,solution);
 if(kind||solution){pdf.setFont('helvetica','normal');let size=7,lines;do{pdf.setFontSize(size);lines=pdf.splitTextToSize(point.name,box.x+box.w-placeX-2);if(lines.length*size*.4<=l.rowH-2)break;size-=.25;}while(size>4);pdf.text(lines,placeX+1,y+3);}
 }


 drawExerciseGuide(pdf,plan,l);exerciseText(pdf,'KARTENKUNDE.app · kartenkunde.app',l.m,l.h-5,6);pdf.link?.(l.m,l.h-8,80,4,{url:ATLAS_URL});
 }
}
export async function createExerciseSolutionPDF(plan,{signal}={}){
 validateExercisePlan(plan);aborted(signal);
 const p={...plan,createdAt:plan.createdAt||new Date()},pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,precision:6});
 if(MAP_STYLES[p.style]?.monochrome)applyPDFMonochrome(pdf);
 pdf.setProperties({title:`${p.title||'KARTENKUNDE.app'} · ${t('exerciseSolutionTitle')}`,creator:'KARTENKUNDE.app',subject:t('exerciseSolutionTitle'),creationDate:p.createdAt});
 const w=210,h=297,m=16,inner=w-2*m,top=48,rowH=10.8,points=p.exercise.points;
 const givenX=m+10,answerX=givenX+72,sheetX=w-m-22;
 pdf.setDrawColor(37,65,57);pdf.setLineWidth(.3);pdf.rect(9,9,w-18,h-18);
 exerciseText(pdf,t('exerciseSolutionTitle'),m,18,13,true);pdf.setFontSize(10);pdf.setFont('helvetica','bold');
 pdf.text(pdf.splitTextToSize(p.title||'KARTENKUNDE.app',inner).slice(0,2),m,25);
 exerciseText(pdf,t('exerciseCreatedAt',{date:p.createdAt.toLocaleString(getLanguage())}),m,37,7);
 pdf.setFont('helvetica','normal');pdf.setFontSize(7);pdf.text(`1:${p.scale.toLocaleString(getLanguage())}`,w-m,42,{align:'right'});
 exerciseText(pdf,t('exerciseNumber'),m+1,46,7,true);
 exerciseText(pdf,t('exerciseGiven'),givenX+2,46,8,true);
 exerciseText(pdf,t('exerciseSoughtSolution'),answerX+2,46,8,true);
 exerciseText(pdf,t('pdfSheet'),sheetX+2,46,7,true);
 // Fit complete cell contents, including long object names, without clipping lines.
 const cell=(value,x,y,width,bold=false)=>{
  pdf.setFont('helvetica',bold?'bold':'normal');let size=8,lines;
  do{pdf.setFontSize(size);lines=pdf.splitTextToSize(value,width-4);if(lines.length*size*.3528*1.15<=rowH-2)break;size-=.25;}while(size>5);
  pdf.setTextColor(37,65,57);pdf.text(lines,x+2,y+rowH/2-(lines.length-1)*size*.3528*1.15/2+size*.3528*.33,{lineHeightFactor:1.15});
 };
 for(let i=0;i<points.length;i++){
  aborted(signal);const point=points[i],y=top+i*rowH,coordinate=exerciseCoordinate(point,p.scale),findCoordinate=point.kind==='coordinate';
  pdf.setFillColor(i%2?249:242,i%2?249:246,i%2?245:241);pdf.rect(m,y,inner,rowH,'F');
  // The requested answer is bold; the given value remains regular weight.
  cell(String(i+1),m,y,givenX-m);
  cell(findCoordinate?point.name:coordinate,givenX,y,answerX-givenX);
  cell(findCoordinate?coordinate:point.name,answerX,y,sheetX-answerX,true);
  cell(exercisePointSheets(p,point).join(', '),sheetX,y,w-m-sheetX);
  pdf.setDrawColor(180,187,180);pdf.setLineWidth(.15);pdf.line(m,y+rowH,w-m,y+rowH);
 }
 exerciseText(pdf,'KARTENKUNDE.app · kartenkunde.app',m,h-5,6);pdf.link?.(m,h-8,80,4,{url:ATLAS_URL});

 pdf.exportWarnings=[];return pdf;
}

export function createExerciseLinkPDF(plan,url){
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true}),w=210,h=297,m=16;
 pdf.setProperties({title:`${plan.title||'KARTENKUNDE.app'} · ${t('exerciseLinkTitle')}`,creator:'KARTENKUNDE.app'});
 pdf.setDrawColor(37,65,57);pdf.rect(9,9,w-18,h-18);exerciseText(pdf,t('exerciseLinkTitle'),m,20,15,true);
 pdf.setFontSize(11);pdf.setFont('helvetica','bold');const title=pdf.splitTextToSize(plan.title||'KARTENKUNDE.app',w-2*m);pdf.text(title.slice(0,2),m,28);
 exerciseText(pdf,t('exerciseCreatedAt',{date:(plan.createdAt||new Date()).toLocaleString(getLanguage())}),m,42,7);
 pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text(pdf.splitTextToSize(t('exerciseLinkHint'),w-2*m),m,51);
 const code=globalThis.qrcode(0,'M');code.addData(url,'Byte');code.make();const count=code.getModuleCount(),size=145,unit=size/(count+8),x=(w-size)/2,y=68;
 pdf.setFillColor(255,255,255);pdf.rect(x,y,size,size,'F');pdf.setFillColor(0,0,0);
 for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(code.isDark(row,col))pdf.rect(x+(col+4)*unit,y+(row+4)*unit,unit,unit,'F');pdf.link(x,y,size,size,{url});
 exerciseText(pdf,t('exerciseLinkOpen'),m,225,11,true);pdf.link(m,220,w-2*m,9,{url});
 pdf.setFontSize(6.5);pdf.setFont('helvetica','normal');const lines=pdf.splitTextToSize(url,w-2*m),shown=lines.slice(0,15);pdf.text(shown,m,233);pdf.link(m,229,w-2*m,Math.min(42,shown.length*3),{url});
 if(lines.length>15){pdf.addPage('a4','portrait');exerciseText(pdf,t('exerciseLinkTitle'),m,20,12,true);pdf.setFontSize(6.5);pdf.setFont('helvetica','normal');const all=pdf.splitTextToSize(url,w-2*m);for(let i=0;i<all.length;i+=105){if(i)pdf.addPage('a4','portrait');pdf.text(all.slice(i,i+105),m,30);pdf.link(m,25,w-2*m,Math.min(255,all.slice(i,i+105).length*3),{url});}}
 exerciseText(pdf,'KARTENKUNDE.app · kartenkunde.app',m,h-5,6);return pdf;
}
