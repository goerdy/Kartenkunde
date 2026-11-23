import {t} from './i18n.js';
export const TK_POWER_COLOR='#d02030';
export const TK_FEATURE_KEYS=['peaks','farms','churches','wind','transmitters','castles','ruins','waterTowers','chimneys','substations','pylons','powerLines','militaryAreas','lighthouses','locks','hospitals','fireStations','police','viewTowers','cemeteries'];
export const TK_DEFAULT_OPTIONS=Object.fromEntries(TK_FEATURE_KEYS.map(key=>[key,true]));
export function normalizeTKOptions(options={}){return Object.fromEntries(TK_FEATURE_KEYS.map(key=>[key,options?.[key]!==false]));}
export function tkFeatureClass(tags={}){
 if(tags.natural==='peak')return 'peak';
 if(tags.landuse==='military'||['barracks','training_area','airfield','naval_base','danger_area','range'].includes(tags.military))return 'military';
 if(tags.amenity==='hospital'||tags.healthcare==='hospital')return 'hospital';
 if(tags.amenity==='fire_station')return 'fireStation';
 if(tags.amenity==='police')return 'police';
 if(tags.landuse==='cemetery'||tags.amenity==='grave_yard')return 'cemetery';
 if(['tower','mast'].includes(tags.man_made)&&tags['tower:type']==='observation')return 'viewTower';
 if(tags.power==='line')return 'powerLine';
 if(tags.power==='minor_line')return 'minorPowerLine';
 if(tags.power==='substation')return 'substation';
 if(tags.power==='tower')return 'pylon';
 if(tags.man_made==='lighthouse')return 'lighthouse';
 if(tags.waterway==='lock_gate'||tags.lock==='yes')return 'lock';
 if(tags.historic==='ruins'||tags.ruins==='yes'||tags.ruins==='castle')return 'ruin';
 if(tags.historic==='castle'||tags.historic==='fort')return 'castle';
 if(tags.place==='farm')return tags.name?.trim()?'farm':null;
 if(tags['generator:source']==='wind'||tags.man_made==='windmill')return 'wind';
 if(['church','chapel','cathedral'].includes(tags.building)||tags['tower:type']==='bell_tower'||tags.amenity==='place_of_worship'&&tags.religion==='christian')return 'church';
 if(tags.man_made==='water_tower')return 'waterTower';
 if(tags.man_made==='chimney')return 'chimney';
 if(tags.man_made==='communications_tower'||['mast','tower'].includes(tags.man_made)&&(tags['tower:type']==='communication'||tags.man_made==='mast'||Object.keys(tags).some(key=>key.startsWith('communication:')&&tags[key]!=='no')))return 'transmitter';
 return null;
}
export const TK_CLASS_OPTIONS={peak:'peaks',farm:'farms',church:'churches',wind:'wind',transmitter:'transmitters',castle:'castles',ruin:'ruins',waterTower:'waterTowers',chimney:'chimneys',substation:'substations',pylon:'pylons',powerLine:'powerLines',minorPowerLine:'powerLines',military:'militaryAreas',lighthouse:'lighthouses',lock:'locks',hospital:'hospitals',fireStation:'fireStations',police:'police',viewTower:'viewTowers',cemetery:'cemeteries'};
export const TK_TAG_FILTERS=[{natural:'peak'},{place:'farm'},{power:'generator','generator:source':'wind'},{man_made:'windmill'},{building:'church'},{building:'chapel'},{building:'cathedral'},{'tower:type':'bell_tower'},{amenity:'place_of_worship',religion:'christian'},{man_made:'mast'},{man_made:'tower'},{man_made:'communications_tower'},{historic:'castle'},{historic:'fort'},{historic:'ruins'},{ruins:'yes'},{man_made:'water_tower'},{man_made:'chimney'},{power:'substation'},{power:'tower'},{power:'line'},{power:'minor_line'},{landuse:'military'},{military:'barracks'},{military:'training_area'},{military:'airfield'},{military:'naval_base'},{military:'danger_area'},{military:'range'},{man_made:'lighthouse'},{waterway:'lock_gate'},{lock:'yes'},{amenity:'hospital'},{healthcare:'hospital'},{amenity:'fire_station'},{amenity:'police'},{'tower:type':'observation',man_made:'tower'},{'tower:type':'observation',man_made:'mast'},{landuse:'cemetery'},{amenity:'grave_yard'}];
export function tkPostpassSQL(box,{farms=true}={}){
 if(!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite)||box[0]<-90||box[2]>90||box[1]<-180||box[3]>180||box[2]<=box[0]||box[3]<=box[1]||box[2]-box[0]>2||box[3]-box[1]>4)throw Error(t('invalidDetailBounds'));
 const [s,w,n,e]=box,filters=TK_TAG_FILTERS.filter(tags=>farms||tags.place!=='farm').map(tags=>`tags @> '${JSON.stringify(tags)}'::jsonb`).join(' OR ');
 return `SELECT osm_id, osm_type, tags, CASE WHEN tags->>'power' IN ('line','minor_line') OR tags->>'landuse'='military' OR tags ? 'military' OR tags->>'landuse'='cemetery' OR tags->>'amenity'='grave_yard' THEN geom ELSE ST_PointOnSurface(geom) END AS geom FROM postpass_pointlinepolygon WHERE geom && ST_MakeEnvelope(${w},${s},${e},${n},4326) AND (${filters})`;
}
export function tkOverpassQuery(box,{farms=true}={}){return `[out:json][timeout:10];(${TK_TAG_FILTERS.filter(tags=>farms||tags.place!=='farm').map(tags=>`nwr${Object.entries(tags).map(([key,value])=>`[${JSON.stringify(key)}=${JSON.stringify(value)}]`).join('')}(${box.join(',')});`).join('')});out body geom;`;}

export const TK_SYMBOL_CLASSES=Object.keys(TK_CLASS_OPTIONS).filter(kind=>!['farm','powerLine','minorPowerLine','military'].includes(kind));
export function tkGeometryAllowed(kind,geometry){
 const finiteCoords=value=>Array.isArray(value)&&value.length>0&&(typeof value[0]==='number'?value.length===2&&value.every(Number.isFinite):value.every(finiteCoords));
 if(!geometry||!finiteCoords(geometry.coordinates))return false;
 if(kind==='cemetery')return ['Point','Polygon','MultiPolygon'].includes(geometry.type);
 if(kind==='military')return ['Polygon','MultiPolygon'].includes(geometry.type);
 if(['powerLine','minorPowerLine'].includes(kind))return ['LineString','MultiLineString'].includes(geometry.type);
 return geometry.type==='Point';
}
export function tkOSMGeometry(element,kind){
 if(['powerLine','minorPowerLine'].includes(kind)){
 const line=element.geometry?.filter(p=>Number.isFinite(p.lon)&&Number.isFinite(p.lat)).map(p=>[p.lon,p.lat]);
 return line?.length>=2?{type:'LineString',coordinates:line}:null;
 }
 if(kind==='military'||kind==='cemetery'&&element.geometry?.length>=4){
 const ring=element.geometry?.map(p=>[p.lon,p.lat]);
 if(!ring||ring.length<4||ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])return null;
 return {type:'Polygon',coordinates:[ring]};
 }
 const lon=element.lon??element.center?.lon,lat=element.lat??element.center?.lat;
 if(Number.isFinite(lon)&&Number.isFinite(lat))return {type:'Point',coordinates:[lon,lat]};
 const points=element.geometry||element.members?.flatMap(member=>member.geometry||[])||[];
 const valid=points.filter(p=>Number.isFinite(p.lon)&&Number.isFinite(p.lat));
 return valid.length?{type:'Point',coordinates:[(Math.min(...valid.map(p=>p.lon))+Math.max(...valid.map(p=>p.lon)))/2,(Math.min(...valid.map(p=>p.lat))+Math.max(...valid.map(p=>p.lat)))/2]}:null;
}
