import {zoneAt,utm,project,unproject,zoneCells,sampleBox,extent} from './geo.js';
export const PLANZEIGER_TYPES=Object.freeze([{id:'frame',key:'simTypeFrame'},{id:'romer-l',key:'simTypeL',axes:true},{id:'square',key:'simTypeSquare',axes:false}]);
export function simulatorProjection(lon,lat){if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon< -180||lon>180||lat< -80||lat>84)throw Error('UTM extent');const zone=zoneAt(lon,lat),south=lat<0;return {zone,south,crs:utm(zone,south)};}
export function snapNorthing(northing,pixelsPerMetre,enabled=true,tolerance=20){const nearest=Math.round(northing/1000)*1000;return enabled&&Math.abs(northing-nearest)*pixelsPerMetre<=tolerance?{value:nearest,snapped:true}:{value:northing,snapped:false};}
export function rulerTicks(scale){if(![25000,50000].includes(Number(scale)))throw Error('Unsupported scale');const minor=Number(scale)===25000?10:20;return Array.from({length:1000/minor+1},(_,i)=>({metres:i*minor,major:(i*minor)%100===0}));}
export function gridGeometry(bounds){
 const output=[];
 for(const cell of zoneCells(bounds)){
  const crs=utm(cell.zone,cell.south),box=extent(sampleBox(cell,8).map(p=>project(crs,p)));box.x0-=1000;box.x1+=1000;box.y0-=1000;box.y1+=1000;
  const create=(axis,value)=>{const points=[];for(let i=0;i<=48;i++){const f=i/48,xy=axis==='e'?[value,box.y0+f*(box.y1-box.y0)]:[box.x0+f*(box.x1-box.x0),value];const ll=unproject(crs,xy);if(ll[0]>=cell.zoneW-1e-8&&ll[0]<=cell.zoneE+1e-8&&ll[1]>=cell.bandS-1e-8&&ll[1]<=cell.bandN+1e-8)points.push(ll);else if(points.length)break;}if(points.length>1)output.push({axis,value,zone:cell.zone,points});};
  // Fixed kilometre grid. Bounded zoom and line count prevent expensive world grids.
  for(let x=Math.ceil(box.x0/1000)*1000;x<=box.x1&&output.length<240;x+=1000)create('e',x);
  for(let y=Math.ceil(box.y0/1000)*1000;y<=box.y1&&output.length<240;y+=1000)create('n',y);
 }
 return output;
}
export function rulerCoordinate(anchor,west,north){return unproject(anchor.crs,[anchor.easting-west,anchor.northing+north]);}
// A 50 mm aperture, like the reference instrument. The physical frame is
// calibrated against the selected map scale, rather than a fixed pixel size.
export function rulerSpan(type,scale){return type==='frame'?Number(scale)*.05:1000;}
export function frameGraduations(rowScale,mapScale){
 const span=Number(mapScale)*.05,max=rowScale*.05,major=({25000:100,50000:200,100000:500,200000:1000})[rowScale],minor=major/10;
 return Array.from({length:Math.round(max/minor)+1},(_,i)=>({distance:i*minor*mapScale/rowScale,metres:i*minor,major:i%10===0}));
}
