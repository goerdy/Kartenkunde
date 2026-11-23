import {mgrs} from './vendor.js';
import {project,unproject,sheetPlan,zoneAt,utm} from './geo.js';
import {inFeature} from './area-geometry.js';
import {t} from './i18n.js';
export const EXERCISE_SCALES=[25000,50000];
export function exercisePrecision(scale){if(!EXERCISE_SCALES.includes(Number(scale)))throw Error(t('exerciseScaleError'));return Number(scale)===25000?4:3;}
export function exerciseCoordinate(point,scale){const code=mgrs.forward([point.lon,point.lat],exercisePrecision(scale));return code.replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d+)$/,(_,zone,square,digits)=>`${zone} ${square} ${digits.slice(0,digits.length/2)} ${digits.slice(digits.length/2)}`);}
export function parseExerciseCoordinate(value){
 const code=String(value).toUpperCase().replace(/\s+/g,'');const match=code.match(/^([1-9]|[1-5]\d|60)([C-HJ-NP-X])([A-HJ-NP-Z]{2})(\d{2,10})$/);
 if(!match||match[4].length%2)throw Error(t('exerciseCoordinateError'));
 try{const [lon,lat]=mgrs.toPoint(code),precision=match[4].length/2;if(!Number.isFinite(lon)||!Number.isFinite(lat)||lat< -80||lat>=84||lon< -180||lon>180||mgrs.forward([lon,lat],precision)!==code)throw Error();return {lon,lat,precision,coordinate:code};}catch{throw Error(t('exerciseCoordinateError'));}
}
export function normalizeExercisePoints(values){if(!Array.isArray(values))return [];return values.slice(0,20).filter(p=>p&&Number.isFinite(p.lon)&&Number.isFinite(p.lat)&&p.lon>=-180&&p.lon<=180&&p.lat>=-80&&p.lat<84).map((p,i)=>({id:String(p.id||`point-${i}`),name:String(p.name||'').trim().slice(0,80),kind:p.kind==='place'?'place':'coordinate',lon:p.lon,lat:p.lat,precision:Math.max(1,Math.min(5,Number(p.precision)||5)),coordinate:String(p.coordinate||'')}));}
export function exerciseBounds(points,scale){
 exercisePrecision(scale);if(!points.length)return null;const lon=points.reduce((sum,p)=>sum+p.lon,0)/points.length,lat=points.reduce((sum,p)=>sum+p.lat,0)/points.length;
 if(Math.max(...points.map(p=>p.lon))-Math.min(...points.map(p=>p.lon))>180)throw Error(t('dateline'));
 const pad=Number(scale)*.012,dy=pad/110574,dx=pad/(111320*Math.max(.1,Math.cos(lat*Math.PI/180)));
 return {w:Math.max(-180,Math.min(...points.map(p=>p.lon))-dx),e:Math.min(180,Math.max(...points.map(p=>p.lon))+dx),s:Math.max(-80,Math.min(...points.map(p=>p.lat))-dy),n:Math.min(83.99999,Math.max(...points.map(p=>p.lat))+dy)};
}
export function exercisePointSheets(plan,point){return plan.sheets.filter(sheet=>{const [x,y]=project(sheetPlan(plan,sheet).crs,[point.lon,point.lat]);return x>=sheet.x0-.001&&x<=sheet.x1+.001&&y>=sheet.y0-.001&&y<=sheet.y1+.001;}).map(s=>s.id);}
export function outsideExercisePoints(plan,points){const b=plan.bounds;return points.filter(p=>p.lon<b.w||p.lon>b.e||p.lat<b.s||p.lat>b.n||plan.feature&&!inFeature([p.lon,p.lat],plan.feature)||!exercisePointSheets(plan,p).length);}
export function exerciseSheetMarker(pdf,x,y,number,width,height){
 pdf.setDrawColor(139,35,25);pdf.setTextColor(139,35,25);pdf.setFillColor(255,255,255);pdf.setLineWidth(.3);pdf.circle(x,y,1.8,'FD');pdf.line(x-2.5,y,x+2.5,y);pdf.line(x,y-2.5,x,y+2.5);pdf.setFont('helvetica','bold');pdf.setFontSize(8);const label=String(number),tw=pdf.getTextWidth(label)+2,tx=Math.min(width-tw-1,Math.max(1,x+2.5)),ty=Math.min(height-3,Math.max(3,y-2.5));pdf.rect(tx,ty-2.7,tw,3.5,'F');pdf.text(label,tx+1,ty);pdf.setFont('helvetica','normal');
}
// Participant maps deliberately contain no exercise markers.
export function drawExerciseSheetPoints(){}
export function drawExerciseOverviewPoints(pdf,plan,toPage){if(!plan.exercise?.solution)return;plan.exercise.points.forEach((p,i)=>{const [x,y]=toPage(project('EPSG:3857',[p.lon,p.lat]));exerciseSheetMarker(pdf,x,y,i+1,plan.paper[0]-12,plan.paper[1]-12);});}

export function validateExercisePlan(plan){
 if(!plan.exercise)return;exercisePrecision(plan.scale);const points=plan.exercise.points;
 if(!Array.isArray(points)||!points.length)throw Error(t('exerciseNeedPoints'));
 if(points.length>20)throw Error(t('exercisePointLimit'));
 for(const point of points){if(!point.name?.trim())throw Error(t('exerciseNameRequired'));if(!Number.isFinite(point.lon)||!Number.isFinite(point.lat)||point.lon< -180||point.lon>180||point.lat< -80||point.lat>=84)throw Error(t('exerciseCoordinateError'));}
 const missing=outsideExercisePoints(plan,points);if(missing.length)throw Error(t('exerciseOutsideSummary',{points:missing.map(p=>p.name).join(', ')}));
}
