import {MARGIN,sheetPlan,sheetGeo,unproject,project,pdfPageNumber} from './geo.js';
const opposite={top:'bottom',bottom:'top',left:'right',right:'left'};
export function buildSheetNavigation(plan){
 const result=Object.fromEntries(plan.sheets.map(s=>[s.id,{top:[],right:[],bottom:[],left:[]}]))
 const positions=new Map(plan.sheets.map(s=>[`${s.block||0}:${s.row}:${s.col}`,s]));
 const add=(a,b,edge)=>{if(!b||a.id===b.id)return;const list=result[a.id][edge];if(!list.includes(b.id))list.push(b.id);const reverse=result[b.id][opposite[edge]];if(!reverse.includes(a.id))reverse.push(a.id);};
 for(const s of plan.sheets)for(const [edge,dr,dc]of [['top',-1,0],['bottom',1,0],['left',0,-1],['right',0,1]])add(s,positions.get(`${s.block||0}:${s.row+dr}:${s.col+dc}`),edge);
 if(plan.regional){
 // A geographic index limits cross-zone checks to nearby sheets. Never jump across
 // omitted sheets or islands simply because their page numbers are consecutive.
 const dx=Math.max(.025,Math.min(1,plan.wm/111320)),dy=Math.max(.025,Math.min(1,plan.hm/111320));
 const index=new Map(),bounds=new Map(),sheets=new Map(plan.sheets.map(s=>[s.id,s]));
 for(const s of plan.sheets){const points=sheetGeo(sheetPlan(plan,s),s,4);const b={w:Math.min(...points.map(p=>p[0])),e:Math.max(...points.map(p=>p[0])),s:Math.min(...points.map(p=>p[1])),n:Math.max(...points.map(p=>p[1]))};bounds.set(s.id,b);
 for(let x=Math.floor(b.w/dx);x<=Math.floor(b.e/dx);x++)for(let y=Math.floor(b.s/dy);y<=Math.floor(b.n/dy);y++){const key=`${x}:${y}`;if(!index.has(key))index.set(key,[]);index.get(key).push(s);}}
 for(const s of plan.sheets){const local=sheetPlan(plan,s),cx=(s.x0+s.x1)/2,cy=(s.y0+s.y1)/2;
 for(const edge of ['top','bottom','left','right'])for(let i=0;i<12;i++){const f=.12+.76*i/11;let point;if(edge==='top')point=[s.x0+(s.x1-s.x0)*f,s.y1+1];if(edge==='bottom')point=[s.x0+(s.x1-s.x0)*f,s.y0-1];if(edge==='left')point=[s.x0-1,s.y0+(s.y1-s.y0)*f];if(edge==='right')point=[s.x1+1,s.y0+(s.y1-s.y0)*f];
 const ll=unproject(local.crs,point),candidates=index.get(`${Math.floor(ll[0]/dx)}:${Math.floor(ll[1]/dy)}`)||[];
 for(const target of candidates){if(target.block===s.block)continue;const b=bounds.get(target.id);if(ll[0]<b.w||ll[0]>b.e||ll[1]<b.s||ll[1]>b.n)continue;
 const q=project(target.crs,ll);if(q[0]<target.x0||q[0]>target.x1||q[1]<target.y0||q[1]>target.y1)continue;
 const center=project(local.crs,target.center||unproject(target.crs,[(target.x0+target.x1)/2,(target.y0+target.y1)/2]));
 if(edge==='right'&&center[0]<=cx+1||edge==='left'&&center[0]>=cx-1||edge==='top'&&center[1]<=cy+1||edge==='bottom'&&center[1]>=cy-1)continue;
 add(s,target,edge);
 }
 }
 }
 for(const entry of Object.values(result))for(const edge of Object.keys(entry))entry[edge].sort((a,b)=>{const aa=sheets.get(a).center,bb=sheets.get(b).center;return edge==='top'||edge==='bottom'?aa[0]-bb[0]:bb[1]-aa[1];});
 }
 return result;
}
export function navigationAnchors(plan,neighbors){const anchors=[];for(const edge of ['top','right','bottom','left']){const ids=neighbors?.[edge]||[];ids.forEach((id,i)=>{const vertical=edge==='left'||edge==='right',span=vertical?plan.height:plan.width,along=span/2+(i-(ids.length-1)/2)*12;anchors.push({edge,id,page:pdfPageNumber({id}),along});});}return anchors;}
export function drawNeighborArrows(pdf,plan,neighbors){
 for(const a of navigationAnchors(plan,neighbors)){const along=a.along+MARGIN;pdf.setDrawColor(37,65,57);pdf.setLineWidth(.3);pdf.setTextColor(37,65,57);pdf.setFontSize(7);pdf.setFont('helvetica','bold');let x,y;
 if(a.edge==='top'){x=along;y=MARGIN-4;pdf.line(x,MARGIN-.5,x,y);pdf.line(x,y,x-1,y+1.3);pdf.line(x,y,x+1,y+1.3);pdf.text(String(a.page),x,MARGIN-6,{align:'center'});pdf.link?.(x-4,MARGIN-9,8,9,{pageNumber:a.page+1+(plan.mapPageOffset||0)});}
 if(a.edge==='bottom'){x=along;y=plan.paper[1]-MARGIN+5;pdf.line(x,plan.paper[1]-MARGIN+.5,x,y);pdf.line(x,y,x-1,y-1.3);pdf.line(x,y,x+1,y-1.3);pdf.text(String(a.page),x,plan.paper[1]-MARGIN+8,{align:'center'});pdf.link?.(x-4,plan.paper[1]-MARGIN,8,10,{pageNumber:a.page+1+(plan.mapPageOffset||0)});}
 if(a.edge==='left'){x=MARGIN-6;y=along;pdf.line(MARGIN-.5,y,x,y);pdf.line(x,y,x+1.3,y-1);pdf.line(x,y,x+1.3,y+1);pdf.text(String(a.page),MARGIN-8.5,y,{align:'center',angle:90});pdf.link?.(MARGIN-11,y-4,11,8,{pageNumber:a.page+1+(plan.mapPageOffset||0)});}
 if(a.edge==='right'){x=plan.paper[0]-MARGIN+6;y=along;pdf.line(plan.paper[0]-MARGIN+.5,y,x,y);pdf.line(x,y,x-1.3,y-1);pdf.line(x,y,x-1.3,y+1);pdf.text(String(a.page),plan.paper[0]-MARGIN+9,y,{align:'center',angle:90});pdf.link?.(plan.paper[0]-MARGIN,y-4,11,8,{pageNumber:a.page+1+(plan.mapPageOffset||0)});}
 pdf.setFont('helvetica','normal');
 }
}
