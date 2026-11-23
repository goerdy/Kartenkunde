import {magneticField} from './geomagnetism.js';
import {project,unproject,utm,zoneAt,sheetPlan,sheetGeo} from './geo.js';
import {t,getLanguage} from './i18n.js';
export function signedAngle(value){return ((value+180)%360+360)%360-180;}
export function northAt(lon,lat,crs,date=new Date()){
 // True-north tangent in page coordinates. Grid north is clockwise-positive from true north.
 const south=project(crs,[lon,lat-.00001]),north=project(crs,[lon,lat+.00001]);
 const convergence=-Math.atan2(north[0]-south[0],north[1]-south[1])*180/Math.PI;
 const field=magneticField(lon,lat,date),declination=field&&field.h>=2000?field.decl:null;
 return {lon,lat,convergence,declination,gridMagnetic:declination===null?null:signedAngle(declination-convergence),weak:!!field&&field.h<6000,expired:!field};
}
export function northSummary(p){
 const date=p.createdAt||new Date(),b=p.bounds,lon=(b.w+b.e)/2,lat=(b.s+b.n)/2,zone=zoneAt(lon,lat),crs=utm(zone,lat<0),reference=northAt(lon,lat,crs,date);
 let deviation=0,weak=reference.weak,unavailable=reference.declination===null;const zones=new Set([zone]);
 for(const s of p.sheets){const local=sheetPlan(p,s);zones.add(local.zone);for(const ll of [...sheetGeo(local,s,1),unproject(local.crs,[(s.x0+s.x1)/2,(s.y0+s.y1)/2])]){
 const n=northAt(...ll,local.crs,date);weak ||= n.weak;unavailable ||= n.declination===null;
 deviation=Math.max(deviation,Math.abs(signedAngle(n.convergence-reference.convergence)));
 if(n.declination!==null&&reference.declination!==null)deviation=Math.max(deviation,Math.abs(signedAngle(n.declination-reference.declination)),Math.abs(signedAngle(n.gridMagnetic-reference.gridMagnetic)));
 }}
 return {...reference,zone,south:lat<0,date,deviation,warning:deviation>.5||zones.size>1,weak,unavailable};
}
export function angleLabel(angle){if(angle===null)return t('northUnavailable');const a=Math.abs(angle)<.005?0:angle;return `${a>0?'+':''}${a.toLocaleString(getLanguage(),{minimumFractionDigits:2,maximumFractionDigits:2})}° / ${Math.round(a*6400/360)} ${t('northMils')}`;}
export function drawNorthDiagram(pdf,p,box){
 const n=northSummary(p),x=box.x,y=box.y,w=box.w;
 pdf.setFillColor(249,249,245);pdf.setDrawColor(148,155,142);pdf.setLineWidth(.18);pdf.rect(x,y,w,box.h,'FD');
 // The fan is schematic: ten degrees between adjacent arrows keeps it narrow
 // and readable even when the real directions differ by less than one degree.
 const directions=[{abbr:'TN',angle:0},{abbr:'GN',angle:n.convergence}];
 if(n.declination!==null)directions.push({abbr:'MN',angle:n.declination});
 directions.sort((a,b)=>a.angle-b.angle);
 const trueIndex=directions.findIndex(d=>d.abbr==='TN'),angles=Object.fromEntries(directions.map((d,i)=>[d.abbr,(i-trueIndex)*10*Math.PI/180]));
 const origin=[x+24,y+box.h-4],length=Math.min(box.h-12,20/Math.max(.01,...Object.values(angles).map(a=>Math.abs(Math.sin(a)))));
 const radial=(angle,r)=>[origin[0]+Math.sin(angle)*r,origin[1]-Math.cos(angle)*r];
 for(const d of directions){const angle=angles[d.abbr],target=radial(angle,length),ux=Math.sin(angle),uy=-Math.cos(angle),color=d.abbr==='MN'?[154,55,42]:[39,54,48];
 pdf.setDrawColor(...color);pdf.setFillColor(...color);pdf.setLineWidth(.3);pdf.line(...origin,...target);
 pdf.triangle(target[0],target[1],target[0]-ux*3-uy*.8,target[1]-uy*3+ux*.8,target[0]-ux*3+uy*.8,target[1]-uy*3-ux*.8,'F');
 pdf.setTextColor(...color);pdf.setFont('helvetica','bold');pdf.setFontSize(6);pdf.text(d.abbr,target[0],target[1]-1.5,{align:'center'});
 }
 const relations=[['TN','MN',n.declination],['TN','GN',n.convergence],['GN','MN',n.gridMagnetic]].filter(([, ,value])=>value!==null);
 for(const [i,[from,to,value]]of relations.entries()){
 const a=angles[from],b=angles[to],r=length*(.27+i*.23);pdf.setDrawColor(93,106,96);pdf.setLineWidth(.18);
 let previous=radial(a,r);for(let j=1;j<=24;j++){const point=radial(a+(b-a)*j/24,r);pdf.line(...previous,...point);previous=point;}
 // Numeric labels belong to the angle arcs, with a small paper halo.
 const center=radial((a+b)/2,r),rounded=Math.abs(value)<.005?0:value;
 const degree=`${rounded>0?'+':''}${rounded.toLocaleString(getLanguage(),{minimumFractionDigits:2,maximumFractionDigits:2})}°`,mils=`${Math.round(rounded*6400/360)} ${t('northMils')}`;
 pdf.setFont('helvetica','normal');pdf.setFontSize(5.5);const labelW=Math.max(pdf.getTextWidth(degree),pdf.getTextWidth(mils))+1.6;
 pdf.setFillColor(249,249,245);pdf.rect(center[0]-labelW/2,center[1]-2.1,labelW,4.6,'F');
 pdf.setTextColor(39,54,48);pdf.text(degree,center[0],center[1]-.2,{align:'center'});pdf.setFontSize(4.8);pdf.text(mils,center[0],center[1]+1.8,{align:'center'});
 }
 const tx=x+50,tw=w-53;
 pdf.setTextColor(39,54,48);pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.text(t('northTitle'),tx,y+4);
 const reference=`${t('northReference')}: ${n.lat.toFixed(4)}°, ${n.lon.toFixed(4)}° · UTM ${n.zone}${n.south?'S':'N'} · ${n.date.toLocaleDateString(getLanguage())} · WMM2025 (NOAA/BGS) · h = 0 m`;
 let note=t('northConvention');if(n.warning)note+=' '+t('northVariation',{angle:angleLabel(n.deviation)});if(n.unavailable)note+=' '+t(n.expired?'northExpired':'northWeak');else if(n.weak)note+=' '+t('northWeak');
 const paragraphs=[`TN: ${t('northTrue')}`,`GN: ${t('northGrid')}`,`MN: ${t('northMagnetic')}${n.declination===null?' ('+t('northUnavailable')+')':''}`,t('northSchematic'),reference,note];
 pdf.setFont('helvetica','normal');let size=5.5,lines;
 do{pdf.setFontSize(size);lines=paragraphs.map(value=>pdf.splitTextToSize(value,tw));if(lines.reduce((sum,l)=>sum+l.length*size*.42+1,0)<=box.h-10)break;size-=.2;}while(size>4.5);
 let cy=y+8;for(const paragraph of lines){pdf.text(paragraph,tx,cy);cy+=paragraph.length*size*.42+1;}
 return n;
}
