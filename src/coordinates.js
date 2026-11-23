import {project,unproject,sheetGeo,extent,MARGIN} from './geo.js';
import {navigationAnchors} from './navigation.js';
export function dmsLabel(value,axis){
 const total=Math.round(Math.abs(value)*3600),degrees=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;
 return `${degrees}°${String(minutes).padStart(2,'0')}'${String(seconds).padStart(2,'0')}" ${axis===0?(value<0?'W':'E'):(value<0?'S':'N')}`;
}
export function geographicTicks(p,s){
 const bounds=extent(sheetGeo(p,s,48)),ticks=[];
 for(const axis of [0,1]){
 const lo=axis===0?bounds.x0:bounds.y0,hi=axis===0?bounds.x1:bounds.y1,target=(hi-lo)*3600/3;
 const interval=[1,2,5,10,15,20,30,60,120,300,600,900,1800,3600,7200,18000,36000].filter(n=>n<=target).at(-1)||1;
 for(let seconds=Math.ceil(lo*3600/interval)*interval;seconds<=hi*3600+1e-6;seconds+=interval){
 const value=seconds/3600;
 for(const edge of axis===0?['top','bottom']:['left','right']){
 const length=axis===0?p.width:p.height;
 const xy=along=>edge==='top'?[s.x0+along/1000*p.scale,s.y1]:edge==='bottom'?[s.x0+along/1000*p.scale,s.y0]:edge==='left'?[s.x0,s.y1-along/1000*p.scale]:[s.x1,s.y1-along/1000*p.scale];
 const f=along=>unproject(p.crs,xy(along))[axis]-value;
 // Locate true meridian/parallel intersections, including curved page boundaries.
 let a=0,fa=f(a);
 for(let i=1;i<=48;i++){let b=length*i/48,fb=f(b);if(fa*fb<=0){let left=a,right=b,fl=fa;for(let j=0;j<32;j++){const mid=(left+right)/2,fm=f(mid);if(fl*fm<=0)right=mid;else{left=mid;fl=fm;}}const along=(left+right)/2;if(!ticks.some(t=>t.edge===edge&&Math.abs(t.along-along)<.01))ticks.push({edge,along,value,axis,text:dmsLabel(value,axis)});}a=b;fa=fb;}
 }
 }
 }
 return ticks;
}
export function coordinateLabels(p,s,gridLabels,neighbors={}){
 const arrows=navigationAnchors(p,neighbors),result=[];
 const add=(item)=>{const length=['top','bottom'].includes(item.edge)?p.width:p.height,half=item.text.length*1.05/2+2;
 if(item.edge==='bottom'&&item.along-half<70)return;
 if(item.along<half+3||item.along>length-half-3||arrows.some(a=>a.edge===item.edge&&Math.abs(a.along-item.along)<half+6))return;
 if(result.some(r=>r.edge===item.edge&&Math.abs(r.along-item.along)<(r.text.length+item.text.length)*1.05/2+5))return;
 result.push(item);};
 if(p.utmLabels!==false){
 for(const edge of ['bottom','left']){
 const entries=gridLabels.filter(l=>l.edge===edge&&l.axis===(edge==='bottom'?0:1)).map(l=>({...l,along:l.pt[edge==='bottom'?0:1],text:`${l.cell.zone}${l.cell.south?'S':'N'} ${Math.round(l.value)} m`,type:'utm'})).sort((a,b)=>a.along-b.along);
 const unique=entries.filter((l,i)=>!entries.slice(0,i).some(o=>Math.abs(o.along-l.along)<.1));
 const stride=Math.max(1,Math.ceil(50/(p.grid/p.scale*1000))),step=p.grid*stride;
 const preferred=unique.filter(l=>Math.abs(l.value/step-Math.round(l.value/step))<1e-6);
 for(const item of preferred)add(item);
 if(result.filter(r=>r.edge===edge).length<2)for(const item of unique)add(item);
 }
 }
 if(p.dmsLabels!==false)for(const item of geographicTicks(p,s))if(result.filter(r=>r.edge===item.edge).length<3)add({...item,type:'dms'});
 return result;
}
export function drawCoordinateLabels(pdf,p,s,gridLabels,neighbors){
 const labels=coordinateLabels(p,s,gridLabels,neighbors);pdf.setFont('helvetica','normal');pdf.setFontSize(5.5);pdf.setTextColor(42,79,106);pdf.setDrawColor(42,79,106);pdf.setLineWidth(.18);
 for(const item of labels){const a=MARGIN+item.along;
 if(item.edge==='top'){pdf.line(a,MARGIN,a,MARGIN-1.1);pdf.text(item.text,a,MARGIN-3.5,{align:'center'});}
 if(item.edge==='bottom')pdf.text(item.text,a,MARGIN+p.height+6,{align:'center'});
 if(item.edge==='left')pdf.text(item.text,MARGIN-7,a+pdf.getTextWidth(item.text)/2,{angle:90});
 if(item.edge==='right'){pdf.line(MARGIN+p.width,a,MARGIN+p.width+1.1,a);pdf.text(item.text,MARGIN+p.width+7,a+pdf.getTextWidth(item.text)/2,{angle:90});}
 }
 return labels;
}
