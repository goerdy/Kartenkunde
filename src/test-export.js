import {MAP_STYLES,styleName,styleCredit,renderMap,aborted,breathe} from './render.js';
import {project,utm,zoneAt,gridReference,gridEdgeLabel} from './geo.js';
import {jsPDF} from './vendor.js';
import {t,getLanguage} from './i18n.js';
// Fixed OSM reference locations: farm node N2971306472 and fire station W353816344.
export const TEST_EXPORT_LOCATIONS=[
 {name:'Pulvermacherei',lon:7.8826294,lat:53.6725554},
 {name:'Feuerwache 1 · Wilhelmshaven',lon:8.115275724,lat:53.5213328}
];
export function testExportPanel(style,location){
 const zone=zoneAt(location.lon,location.lat),crs=utm(zone),[x,y]=project(crs,[location.lon,location.lat]);
 return {plan:{style,crs,zone,south:false,scale:50000,width:100,height:100,wm:5000,hm:5000,dpi:300,grid:1000,tkOptions:{},contours:true,streetNames:false,warnings:new Set()},sheet:{id:1,x0:x-2500,x1:x+2500,y0:y-2500,y1:y+2500}};
}
export function testExportLayout(count=Object.keys(MAP_STYLES).length){
 const rows=Math.ceil(count/2),paper=rows<=6?[594,841]:[841,1189],columns=paper[0]===594?4:6,rowCount=Math.ceil(count*2/columns);
 if(rowCount*126+60>paper[1])throw Error(t('imageLimit'));
 return {paper,columns,rows:rowCount,left:(paper[0]-(columns*100+(columns-1)*20))/2,top:65,pitchX:120,pitchY:126};
}
function panelGrid(pdf,plan,sheet,x,y){
 const ink=MAP_STYLES[plan.style]?.monochrome?[73,73,73]:[42,79,106];
 pdf.setDrawColor(...ink);pdf.setLineWidth(.1);pdf.setFont('helvetica','normal');pdf.setFontSize(6);pdf.setTextColor(...ink);
 for(let value=Math.ceil(sheet.x0/1000)*1000;value<sheet.x1;value+=1000){const a=x+(value-sheet.x0)/50;pdf.line(a,y,a,y+100);pdf.text(gridEdgeLabel(value,1000),a,y+103,{align:'center'});}
 for(let value=Math.ceil(sheet.y0/1000)*1000;value<sheet.y1;value+=1000){const a=y+(sheet.y1-value)/50;pdf.line(x,a,x+100,a);pdf.text(gridEdgeLabel(value,1000),x-2,a+1,{align:'right'});}
 pdf.setDrawColor(37,65,57);pdf.setLineWidth(.2);pdf.rect(x,y,100,100);
}
export async function createMapTestPDF({signal,onProgress=()=>{},render=renderMap,createdAt=new Date(),commit='',build=''}={}){
 aborted(signal);const styles=Object.keys(MAP_STYLES),layout=testExportLayout(styles.length),pdf=new jsPDF({orientation:'portrait',unit:'mm',format:layout.paper,compress:true,precision:6}),total=styles.length*2,failures=[];
 pdf.setProperties({title:'KARTENKUNDE.app · '+t('techTestTitle'),creator:'KARTENKUNDE.app',creationDate:createdAt});
 pdf.setTextColor(37,65,57);pdf.setFont('helvetica','bold');pdf.setFontSize(24);pdf.text('KARTENKUNDE.app',24,25);pdf.setFontSize(15);pdf.text(t('techTestTitle'),24,35);
 pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(t('techTestDetails'),24,43);pdf.setFontSize(8);pdf.text(`${createdAt.toLocaleString(getLanguage())} · ${[commit.slice(0,12),build].filter(Boolean).join(' · ')}`,24,49);
 for(let i=0;i<styles.length;i++)for(let j=0;j<TEST_EXPORT_LOCATIONS.length;j++){
 aborted(signal);const style=styles[i],location=TEST_EXPORT_LOCATIONS[j],index=i*2+j,x=layout.left+(index%layout.columns)*layout.pitchX,y=layout.top+Math.floor(index/layout.columns)*layout.pitchY,{plan,sheet}=testExportPanel(style,location);
 onProgress(index,total,`${styleName(style)} · ${location.name}`);
 pdf.setTextColor(37,65,57);pdf.setFont('helvetica','bold');pdf.setFontSize(10);pdf.text(styleName(style),x,y-12);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text(location.name,x,y-7);pdf.setFontSize(6);pdf.text(gridReference(location.lon,location.lat),x,y-3);
 let image;
 try{
 image=await render(plan,sheet,Math.round(100*300/25.4),Math.round(100*300/25.4),signal);aborted(signal);pdf.addImage(image,'PNG',x,y,100,100,undefined,'FAST');
 }catch(error){
 aborted(signal);failures.push({style,location:location.name,message:error.message});pdf.setFillColor(255,242,240);pdf.rect(x,y,100,100,'F');pdf.setTextColor(145,35,25);pdf.setFontSize(9);pdf.text(t('techTestFailed'),x+5,y+12);pdf.setFontSize(7);pdf.text(pdf.splitTextToSize(error.message,90),x+5,y+20);
 }finally{if(image){image.width=1;image.height=1;}}
 if(plan.warnings.size){pdf.setFillColor(255,244,210);pdf.rect(x+1,y+83,98,16,'F');pdf.setTextColor(125,65,10);pdf.setFontSize(6);pdf.text(pdf.splitTextToSize([...plan.warnings].join(' '),94).slice(0,6),x+3,y+87);}
 panelGrid(pdf,plan,sheet,x,y);
 pdf.setFontSize(5);pdf.setTextColor(37,65,57);pdf.text(pdf.splitTextToSize(styleCredit(style),100).slice(0,3),x,y+108);
 for(const warning of plan.warnings)failures.push({style,location:location.name,message:warning});
 await breathe();
 }
 const [w,h]=layout.paper;pdf.setDrawColor(37,65,57);pdf.rect(12,12,w-24,h-24);pdf.setFontSize(8);pdf.setTextColor(37,65,57);pdf.text(t('techTestPrint'),24,h-25);pdf.text('kartenkunde.app',w-24,h-25,{align:'right'});pdf.link(w-70,h-29,46,5,{url:'https://kartenkunde.app/'});
 pdf.exportWarnings=failures;onProgress(total,total,t('created'));return pdf;
}
