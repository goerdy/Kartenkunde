import {t} from './i18n.js';
import {areaPolygons,featureBounds,clipRingToBox,ringArea,polygonIntersectsBox,coordinatesBounds} from './area-geometry.js';
import {proj4,mgrs} from './vendor.js';
export const PAPER={A4:[210,297],A3:[297,420],A2:[420,594],A1:[594,841]};
export const MARGIN=16;
export const MAX_PLAN_SHEETS=5000;
export const SCALES=[5000,10000,25000,50000,100000,200000];
export function gridSpacing(scale){return scale<=5000?100:scale<=10000?200:scale<=50000?1000:scale<=100000?2000:5000;}

export function zoneAt(lon,lat){
 let z=Math.max(1,Math.min(60,Math.floor((lon+180)/6)+1));
 if(lat>=56&&lat<64&&lon>=3&&lon<12)z=32;
 if(lat>=72&&lat<84&&lon>=0&&lon<42)z=lon<9?31:lon<21?33:lon<33?35:37;
 return z;
}
export function utm(zone,south=false){return `+proj=utm +zone=${zone} ${south?'+south ':''}+datum=WGS84 +units=m +no_defs`;}
export const project=(crs,point)=>proj4('EPSG:4326',crs,point);
export const unproject=(crs,point)=>proj4(crs,'EPSG:4326',point);
export function sampleBox(b,n=24){const a=[];for(let i=0;i<=n;i++){const t=i/n;a.push([b.w+(b.e-b.w)*t,b.s],[b.w+(b.e-b.w)*t,b.n],[b.w,b.s+(b.n-b.s)*t],[b.e,b.s+(b.n-b.s)*t]);}return a;}
export function extent(points){return {x0:Math.min(...points.map(p=>p[0])),x1:Math.max(...points.map(p=>p[0])),y0:Math.min(...points.map(p=>p[1])),y1:Math.max(...points.map(p=>p[1]))};}
export function sheetGeo(plan,sheet,n=24){const {x0,y0,x1,y1}=sheet;const pts=[];for(let i=0;i<=n;i++){const t=i/n;pts.push(unproject(plan.crs,[x0+(x1-x0)*t,y0]),unproject(plan.crs,[x0+(x1-x0)*t,y1]),unproject(plan.crs,[x0,y0+(y1-y0)*t]),unproject(plan.crs,[x1,y0+(y1-y0)*t]));}return pts;}
export function sheetPolygon(plan,s){const a=[];for(const [from,to]of [[[s.x0,s.y1],[s.x1,s.y1]],[[s.x1,s.y1],[s.x1,s.y0]],[[s.x1,s.y0],[s.x0,s.y0]],[[s.x0,s.y0],[s.x0,s.y1]]])for(let i=0;i<12;i++)a.push(unproject(plan.crs,[from[0]+(to[0]-from[0])*i/12,from[1]+(to[1]-from[1])*i/12]));return a;}
function makeLocalPlan(bounds,options){
 const b=bounds;if(!b||![b.w,b.e,b.s,b.n].every(Number.isFinite))throw Error(t('chooseFirst'));
 if(b.w< -180||b.e>180||b.e<=b.w||b.e-b.w>180)throw Error(t('dateline'));
 if(b.s< -80||b.n>84||b.n<=b.s)throw Error(t('polar'));
 const scale=Number(options.scale),overlap=Number(options.overlap);
 if(!SCALES.includes(scale)||!PAPER[options.paper]||![0,5,10,15].includes(overlap))throw Error(t('invalidSettings'));
 const paper=[...PAPER[options.paper]];if(options.landscape)paper.reverse();
 const width=paper[0]-2*MARGIN,height=paper[1]-2*MARGIN;
 const zone=options.forcedZone??zoneAt((b.w+b.e)/2,(b.s+b.n)/2),south=options.forcedSouth??((b.s+b.n)/2<0),crs=utm(zone,south);
 const box=extent(sampleBox(b).map(p=>project(crs,p)));
 if(!Object.values(box).every(Number.isFinite))throw Error(t('projectionFailed'));
 const wm=width*scale/1000,hm=height*scale/1000,stepX=wm-overlap*scale/1000,stepY=hm-overlap*scale/1000;
 const cols=Math.max(1,Math.ceil((box.x1-box.x0-wm)/stepX)+1),rows=Math.max(1,Math.ceil((box.y1-box.y0-hm)/stepY)+1);
 if(!Number.isSafeInteger(cols*rows)||cols*rows>MAX_PLAN_SHEETS)throw Error(t('sheetCountLimit',{count:MAX_PLAN_SHEETS}));
 // Centre the complete atlas footprint around the requested rectangle.
 const x0=(box.x0+box.x1-(wm+(cols-1)*stepX))/2,y1=(box.y0+box.y1+(hm+(rows-1)*stepY))/2;
 const sheets=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)sheets.push({id:r*cols+c+1,row:r,col:c,x0:x0+c*stepX,x1:x0+c*stepX+wm,y1:y1-r*stepY,y0:y1-r*stepY-hm});
 const plan={bounds:b,...options,scale,overlap,paper,width,height,wm,hm,stepX,stepY,cols,rows,zone,south,crs,sheets,grid:gridSpacing(scale)};
 // Expanded sheets must remain inside the supported projection domain, too.
 const footprint={x0:sheets[0].x0,x1:sheets.at(-1).x1,y0:sheets.at(-1).y0,y1:sheets[0].y1};
 const all=sheetGeo(plan,footprint);
 if(!options.regionalPart&&all.some(p=>p[1]<-80||p[1]>84||Math.abs(p[0]-(b.w+b.e)/2)>180))throw Error(t('sheetLimit'));
 const zones=new Set(all.map(p=>zoneAt(...p)));plan.zones=[...zones].sort((a,b)=>a-b);
 return plan;
}
export function mgrsLabel(lon,lat,precision=0){const label=mgrs.forward([Math.max(-180,Math.min(180,lon)),Math.max(-80,Math.min(83.999999,lat))],precision||5);return precision===0?label.replace(/\d{10}$/,''):label;}
export function gridReference(lon,lat){const s=mgrsLabel(lon,lat,5);return s.replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/,'$1 $2 $3 $4');}
export function haversine(a,b){const rad=Math.PI/180;const dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad;const h=Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2;return 6371008.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
// Liang–Barsky clipping, coordinates in page millimetres.
export function clipLine(a,b,w,h){let t0=0,t1=1;const dx=b[0]-a[0],dy=b[1]-a[1];const ps=[-dx,dx,-dy,dy],qs=[a[0],w-a[0],a[1],h-a[1]];for(let i=0;i<4;i++){if(ps[i]===0){if(qs[i]<0)return null;}else{const t=qs[i]/ps[i];if(ps[i]<0)t0=Math.max(t0,t);else t1=Math.min(t1,t);if(t0>t1)return null;}}return [[a[0]+t0*dx,a[1]+t0*dy],[a[0]+t1*dx,a[1]+t1*dy]];}
// Geographic UTM zone/band cells, including Norway and Svalbard exceptions.
export function zoneCells(b){const cells=[];const bands='CDEFGHJKLMNPQRSTUVWX';for(let k=0;k<bands.length;k++){const s=-80+k*8,n=k===19?84:s+8;if(n<b.s||s>b.n)continue;for(let z=1;z<=60;z++){let w=(z-1)*6-180,e=w+6;if(k===17){if(z===31)e=3;if(z===32)w=3;}
 if(k===19){if([32,34,36].includes(z))continue;if(z===31)e=9;if(z===33){w=9;e=21;}if(z===35){w=21;e=33;}if(z===37)w=33;}
 if(e<b.w||w>b.e)continue;cells.push({w:Math.max(w,b.w),e:Math.min(e,b.e),s:Math.max(s,b.s),n:Math.min(n,b.n),zone:z,band:bands[k],south:s<0,zoneW:w,zoneE:e,bandS:s,bandN:n});}}return cells.filter(c=>c.e>c.w&&c.n>c.s);}

// Kilometre digits within the MGRS 100 km square, with a two-digit rollover.
export function gridEdgeLabel(metres,spacing=1000){const unit=spacing<1000?100:1000,digits=spacing<1000?3:2,mod=10**digits;return String(((Math.round(metres/unit)%mod)+mod)%mod).padStart(digits,'0');}

export function makePlan(bounds,options){
 if(!bounds||![bounds.w,bounds.e,bounds.s,bounds.n].every(Number.isFinite))throw Error(t('chooseFirst'));
 if(bounds.s< -80||bounds.n>84)throw Error(t('polar'));
 if(!options.feature&&(bounds.w< -180||bounds.e>180||bounds.e<=bounds.w||bounds.e-bounds.w>180))throw Error(t('dateline'));
 if(bounds.n<=bounds.s||bounds.e<=bounds.w)throw Error(t('noAreaSize'));
 // Keep compact rectangle atlases continuous. Large regions use native zone/band blocks.
 const wide=(bounds.e-bounds.w)*111320*Math.cos((bounds.s+bounds.n)*Math.PI/360)>200000||(bounds.n-bounds.s)*111320>200000;
 if(!options.feature&&!wide)return makeLocalPlan(bounds,options);
 return makeRegionalPlan(bounds,options);
}
function makeRegionalPlan(bounds,options){
 const feature=options.feature||{type:'Feature',geometry:{type:'Polygon',coordinates:[[[bounds.w,bounds.s],[bounds.e,bounds.s],[bounds.e,bounds.n],[bounds.w,bounds.n],[bounds.w,bounds.s]]]},properties:{}};
 const polygons=areaPolygons(feature),polygonBounds=polygons.map(poly=>coordinatesBounds(poly[0])),sheets=[],blocks=[];let base=null;
 for(const cell of zoneCells(bounds)){
 const clipped=polygons.filter((_,i)=>{const b=polygonBounds[i];return b.w<cell.e&&b.e>cell.w&&b.s<cell.n&&b.n>cell.s;}).map(poly=>poly.map(r=>clipRingToBox(r,cell))).filter(poly=>poly[0].length>=4&&ringArea(poly[0])>1e-12);
 if(!clipped.length)continue;
 const crs=utm(cell.zone,cell.south);
 const projected=clipped.map(poly=>poly.map(r=>densifyRing(r).map(ll=>project(crs,ll))));
 const regionFeature={type:'MultiPolygon',coordinates:clipped};const b=featureBounds(regionFeature);
 const local=makeLocalPlan(b,{...options,regionalPart:true,forcedZone:cell.zone,forcedSouth:cell.south});
 // Always force the actual native zone at exceptional or boundary-centred regions.
 if(local.zone!==cell.zone||local.south!==cell.south)throw Error(t('zoneFailed'));
 base??=local;const id=blocks.length+1,kept=[];
 const polyBounds=projected.map(poly=>{const e=extent(poly[0]);return {w:e.x0,e:e.x1,s:e.y0,n:e.y1};});
 for(const sheet of local.sheets){const box={w:sheet.x0,e:sheet.x1,s:sheet.y0,n:sheet.y1};
 if(!projected.some((poly,i)=>{const b=polyBounds[i];return b.w<=box.e&&b.e>=box.w&&b.s<=box.n&&b.n>=box.s&&polygonIntersectsBox(poly,box);}))continue;
 if(sheets.length>=MAX_PLAN_SHEETS)throw Error(t('sheetCountLimit',{count:MAX_PLAN_SHEETS}));
 const entry={...sheet,crs,zone:cell.zone,south:cell.south,block:id,band:cell.band};kept.push(entry);sheets.push(entry);
 }
 if(kept.length)blocks.push({id,zone:cell.zone,band:cell.band,crs,south:cell.south,cols:local.cols,rows:local.rows});
 }
 if(!base||!sheets.length)throw Error(t('noSheets'));
 // Sorting by geographic centre gives a predictable north-to-south reading order across blocks.
 for(const sheet of sheets)sheet.center=unproject(sheet.crs,[(sheet.x0+sheet.x1)/2,(sheet.y0+sheet.y1)/2]);
 const ordered=numberSheetsTopLeft(sheets,base.stepY);sheets.length=0;for(const sheet of ordered)sheets.push(sheet);
 return {...base,...options,paper:base.paper,scale:base.scale,overlap:base.overlap,bounds,sheets,blocks,regional:true,zones:[...new Set(blocks.map(b=>b.zone))].sort((a,b)=>a-b),cols:null,rows:null};
}
function densifyRing(ring){const points=[];for(let i=1;i<ring.length;i++){const a=ring[i-1],b=ring[i],steps=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/.1));for(let k=0;k<steps;k++)points.push([a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps]);}if(points.length)points.push(points[0]);return points;}
export function sheetPlan(plan,sheet){return sheet.crs?{...plan,crs:sheet.crs,zone:sheet.zone,south:sheet.south}:plan;}

// Form visual rows before sorting west-to-east; small convergence differences must not
// reorder a complete western column after an eastern column.
export function numberSheetsTopLeft(sheets,stepY){
 const pending=[...sheets].sort((a,b)=>b.center[1]-a.center[1]||a.center[0]-b.center[0]);
 const ordered=[],tolerance=stepY/111320*.5;let row=0;
 for(let start=0;start<pending.length;){const north=pending[start].center[1];let end=start+1;while(end<pending.length&&north-pending[end].center[1]<=tolerance)end++;
 const line=pending.slice(start,end).sort((a,b)=>a.center[0]-b.center[0]);line.forEach((s,col)=>{s.atlasRow=row;s.atlasCol=col;ordered.push(s);});row++;start=end;
 }
 ordered.forEach((s,i)=>s.id=i+1);return ordered;
}
export function pdfPageNumber(sheet){return sheet.id;}
export function zoneBoundarySegments(bounds){
 const segments=[],seen=new Set();
 for(const c of zoneCells(bounds)){
 const edges=[[[c.zoneW,c.s],[c.zoneW,c.n]],[[c.zoneE,c.s],[c.zoneE,c.n]],[[c.w,c.bandS],[c.e,c.bandS]],[[c.w,c.bandN],[c.e,c.bandN]]];
 for(const [a,b]of edges){if(a[0]<bounds.w-1e-9||a[0]>bounds.e+1e-9||b[0]<bounds.w-1e-9||b[0]>bounds.e+1e-9||a[1]<bounds.s-1e-9||a[1]>bounds.n+1e-9||b[1]<bounds.s-1e-9||b[1]>bounds.n+1e-9)continue;
 const key=[a,b].map(p=>p.map(n=>n.toFixed(9)).join(',')).sort().join('/');if(!seen.has(key)){seen.add(key);segments.push([a,b]);}}
 }return segments;
}
