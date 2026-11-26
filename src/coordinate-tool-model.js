import {zoneAt,utm,project,unproject} from './geo.js';
import {mgrs} from './vendor.js';
const invalid=()=>{throw Error('coordinateInvalid');};
export function decimal(value){const s=String(value).trim().replace(',','.');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))invalid();return Number(s);}
export function validPoint(lon,lat){if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)invalid();return [lon,lat];}
export function parseDMS(value,latitude){
 const match=String(value).trim().toUpperCase().match(/^([+-]?\d+(?:[.,]\d+)?)\s*°\s*(\d+(?:[.,]\d+)?)\s*['′]\s*(\d+(?:[.,]\d+)?)\s*["″]\s*([NSEW])?$/);
 if(!match)invalid();const degree=decimal(match[1]),minute=decimal(match[2]),second=decimal(match[3]),direction=match[4];
 if(minute>=60||second>=60||direction&&!(latitude?'NS':'EW').includes(direction)||direction&&degree<0)invalid();
 const sign=direction?('SW'.includes(direction)?-1:1):(match[1].startsWith('-')?-1:1);
 return sign*(Math.abs(degree)+minute/60+second/3600);
}
export function parseCoordinate(format,values){
 if(format==='mgrs'){
  const code=values.code.toUpperCase().replace(/\s/g,''),m=code.match(/^(\d{1,2}[C-HJ-NP-X])([A-HJ-NP-Z]{2})(\d{2,10})$/);
  if(!m||m[3].length%2)invalid();let point;try{point=mgrs.toPoint(code);}catch{invalid();}
  validPoint(...point);const precision=m[3].length/2;
  if(point[1]<-80||point[1]>=84||mgrs.forward(point,precision)!==code)invalid();
  // Validate using the library's cell centre, then return the exact UTM grid origin.
  // This locates the southwest corner without changing the stated input precision.
  const zone=Number(m[1].slice(0,-1)),south=m[1].at(-1)<'N',crs=utm(zone,south),step=10**(5-precision);
  const xy=project(crs,point).map(value=>Math.floor(value/step)*step);
  return unproject(crs,xy);
 }
 if(format==='utm'){
  const zone=decimal(values.zone),east=decimal(values.east),north=decimal(values.north),south=values.hemisphere==='S';
  if(!Number.isInteger(zone)||zone<1||zone>60||!['N','S'].includes(values.hemisphere)||east<100000||east>=1000000||north<0||north>10000000)invalid();
  const point=unproject(utm(zone,south),[east,north]);validPoint(...point);
  if(point[1]<-80||point[1]>=84||south&&point[1]>0.00001||!south&&point[1]<-0.00001)invalid();return point;
 }
 if(!['decimal','dms'].includes(format))invalid();
 return validPoint(format==='dms'?parseDMS(values.lon,false):decimal(values.lon),format==='dms'?parseDMS(values.lat,true):decimal(values.lat));
}
export function dms(value,latitude){const units=Math.round(Math.abs(value)*360000),degrees=Math.floor(units/360000),minutes=Math.floor(units%360000/6000),seconds=(units%6000/100).toFixed(2);return `${degrees}° ${String(minutes).padStart(2,'0')}′ ${seconds.padStart(5,'0')}″ ${latitude?(value<0?'S':'N'):(value<0?'W':'E')}`;}
export function coordinateFormats(lon,lat){
 validPoint(lon,lat);const result={decimal:`${lat.toFixed(6)}°, ${lon.toFixed(6)}°`,dms:`${dms(lat,true)} · ${dms(lon,false)}`,mgrs:null,utm:null};
 if(lat>=-80&&lat<84){const zone=zoneAt(lon,lat),[east,north]=project(utm(zone,lat<0),[lon,lat]);result.utm=`${zone}${lat<0?'S':'N'} · E ${east.toFixed(1)} m · N ${north.toFixed(1)} m`;result.mgrs=mgrs.forward([lon,lat],4).replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{4})(\d{4})$/,'$1 $2 $3 $4');}return result;
}

export const POINT_STORAGE_KEY='kartenkunde-coordinate-points-v1';
export function readStoredPoints(storage){
 try{const data=JSON.parse(storage.getItem(POINT_STORAGE_KEY));if(!Array.isArray(data?.points)||data.points.length>5000)return [];
 const ids=new Set();return data.points.filter(p=>{if(!Number.isSafeInteger(p?.id)||p.id<1||p.id>=Number.MAX_SAFE_INTEGER||ids.has(p.id)||!Array.isArray(p.position)||p.position.length!==2)return false;try{validPoint(...p.position);}catch{return false;}ids.add(p.id);return true;}).map(p=>({id:p.id,position:[...p.position],...(typeof p.reference==='string'&&/^(\d{1,2}[C-HJ-NP-X]) [A-HJ-NP-Z]{2} (\d{1,5}) (\d{1,5})$/.test(p.reference)&&p.reference.split(' ')[2].length===p.reference.split(' ')[3].length?{reference:p.reference}:{})}));
 }catch{return [];}
}
export function storePoints(storage,points){try{storage.setItem(POINT_STORAGE_KEY,JSON.stringify({points:points.map(({id,position,reference})=>({id,position,...(reference?{reference}:{})}))}));return true;}catch{return false;}}
// Google Maps copies latitude, longitude, with decimal points and a comma separator.
export function parseDecimalPair(value){
 const text=String(value).trim(),parts=text.includes(';')?text.split(';'):text.split(',');
 if(parts.length!==2)invalid();const lat=decimal(parts[0]),lon=decimal(parts[1]);validPoint(lon,lat);return {lat:parts[0].trim(),lon:parts[1].trim()};
}
