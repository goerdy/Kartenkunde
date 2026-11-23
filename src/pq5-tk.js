import {addStreetNameFallback} from './street-labels.js';
import {normalizeTKOptions,TK_CLASS_OPTIONS,TK_SYMBOL_CLASSES,TK_POWER_COLOR} from './tk-features.js';
// Original cartography for OpenMapTiles data; no LGLN raster tiles or symbols.
export const PQ5_TK_COLORS={paper:'#fffff2',field:'#ffffdf',ink:'#1c211b',forest:'#b4df8c',meadow:'#e4ffc1',water:'#bce5ec',waterLine:'#007cf0',built:'#f5bac7',building:'#34312b',major:'#ffed49',secondary:'#fff35a',motorway:'#f38f8e',boundary:'#9e6f99',terrain:'#8b6948'};
// MapLibre places symbols from the topmost style layer first. Reserve room for
// populated places before farms, peaks, contour numbers and other POIs.
export function prioritizeSettlementLabels(layers){
 const ids=['tk-overview-places','tk-small-settlements','tk-villages','tk-towns','tk-cities','bm-cities','tk-countries'];
 const places=ids.map(id=>layers.find(l=>l.id===id)).filter(Boolean);
 for(const layer of places){layer.layout['text-variable-anchor']=['center','top','bottom','left','right'];layer.layout['text-radial-offset']=.5;}
 return [...layers.filter(l=>!ids.includes(l.id)),...places];
}
export function createPQ5TKStyle(options={}){
 const enabled=normalizeTKOptions(options);
 const c=PQ5_TK_COLORS,layers=[];
 const cls=(...values)=>['in',['get','class'],['literal',values]];
 const widths=(...stops)=>['interpolate',['exponential',1.5],['zoom'],...stops];
 const fill=(id,sourceLayer,color,filter,minzoom=0)=>layers.push({id,type:'fill',source:'osm','source-layer':sourceLayer,minzoom,...(filter?{filter}:{}),paint:{'fill-color':color}});
 const line=(id,sourceLayer,color,width,filter,minzoom=0,paint={})=>layers.push({id,type:'line',source:'osm','source-layer':sourceLayer,minzoom,...(filter?{filter}:{}),layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':color,'line-width':width,...paint}});
 const label=(id,sourceLayer,filter,minzoom,size,color=c.ink,extra={})=>layers.push({id,type:'symbol',source:'osm','source-layer':sourceLayer,minzoom,...(filter?{filter}:{}),layout:{'text-field':['coalesce',['get','name:latin'],['get','name'],['get','name:nonlatin'],''],'text-font':['Noto Sans Regular'],'text-size':size,'text-max-width':9,'text-padding':3,...extra},paint:{'text-color':color,'text-halo-color':c.paper,'text-halo-width':1.1,'text-halo-blur':.2}});
 layers.push({id:'tk-paper',type:'background',paint:{'background-color':c.paper}});
 fill('tk-residential','landuse',c.built,cls('residential','commercial','industrial'),7);
 fill('tk-fields','landuse',c.field,cls('farmland'),7);
 fill('tk-cemetery','landuse','#cceaa5',cls('cemetery'),11);
 fill('tk-grass','landcover',c.meadow,cls('grass'),6);
 fill('tk-parks','park',c.meadow,null,9);
 fill('tk-forest','landcover',c.forest,cls('wood'),5);
 fill('tk-sand','landcover','#f3e9c5',cls('sand'),7);
 fill('tk-glacier','landcover','#edf6f7',cls('ice','glacier'),5);
 fill('tk-water','water',c.water);
 line('tk-shore','water',c.waterLine,.7,null,8);
 // Include even unnamed ditches and drains. These classes arrive in data tiles at z13+.
 // Surface waters remain blue; intermittent and underground stretches use blue dashes.
 const surfaceWater=['all',['!=',['get','intermittent'],1],['!=',['get','brunnel'],'tunnel']];
 line('tk-rivers','waterway',c.waterLine,widths(8,.7,12,1.3,16,2.4),['all',cls('river','canal'),surfaceWater],8);
 line('tk-streams','waterway',c.waterLine,widths(10,.65,12,.85,16,1.4),['all',['!',cls('river','canal')],surfaceWater],10);
 line('tk-water-intermittent','waterway',c.waterLine,widths(10,.65,12,.85,16,1.4),['all',['==',['get','intermittent'],1],['!=',['get','brunnel'],'tunnel']],10,{'line-dasharray':[3,2]});
 line('tk-water-tunnels','waterway',c.waterLine,widths(10,.55,14,.85,17,1.2),['==',['get','brunnel'],'tunnel'],12,{'line-dasharray':[1,2]});
 fill('tk-runway','aeroway','#d6d3ca',null,10);
 layers.push({id:'tk-cemetery-fill',type:'fill',source:'named-farms',filter:['==',['get','class'],'cemetery'],layout:{visibility:enabled.cemeteries?'visible':'none'},paint:{'fill-color':'#d6dfcd','fill-opacity':.65,'fill-outline-color':'#59624d'}});
 layers.push({id:'tk-military-fill',type:'fill',source:'named-farms',filter:['==',['get','class'],'military'],layout:{visibility:enabled.militaryAreas?'visible':'none'},paint:{'fill-pattern':'pq5-military-hatch'}});
 layers.push({id:'tk-military-edge',type:'line',source:'named-farms',filter:['==',['get','class'],'military'],layout:{visibility:enabled.militaryAreas?'visible':'none'},paint:{'line-color':'#c42a3c','line-width':1,'line-dasharray':[5,2]}});
 line('tk-admin','boundary',c.boundary,widths(5,.6,12,1.3,16,2),['<=',['get','admin_level'],6],4,{'line-dasharray':[5,2,1,2],'line-opacity':.8});
 fill('tk-buildings','building',c.building,null,12);
 line('tk-building-edges','building',c.ink,.25,null,13);
 line('tk-tracks','transportation','#776f5a',widths(11,.65,15,1.4,18,2.5),cls('track'),11,{'line-dasharray':[5,2]});
 line('tk-paths','transportation','#645d4c',widths(12,.6,16,1.15,19,2),cls('path'),12,{'line-dasharray':[2,2]});
 const roads=[['local',['minor','service'],c.paper,[11,.7,14,2.1,18,7],11],['tertiary',['tertiary'],c.secondary,[9,.7,13,2.2,18,8],9],['secondary',['secondary'],c.secondary,[8,.8,13,3,18,10],8],['primary',['primary','trunk'],c.major,[6,.8,13,3.6,18,12],6],['motorway',['motorway'],c.motorway,[5,1,13,4.2,18,15],5]];
 for(const [id,classes,color,stops,min]of roads){
 const filter=['all',cls(...classes),['!=',['get','brunnel'],'tunnel']];
 const roadWidth=stops.map((value,index)=>index%2?value*1.4:value);
 line(`tk-road-${id}-edge`,'transportation',c.ink,widths(...roadWidth.map((value,index)=>index%2?value+1.4:value)),filter,min);
 line(`tk-road-${id}`,'transportation',color,widths(...roadWidth),filter,min);
 }
 line('tk-tunnels','transportation','#8c8579',widths(10,1,16,3.5),['all',cls('minor','service','tertiary','secondary','primary','trunk','motorway'),['==',['get','brunnel'],'tunnel']],10,{'line-dasharray':[3,2]});
 const rails=cls('rail','transit');
 line('tk-rail-bed','transportation',c.paper,widths(9,1.8,15,3.5,18,5),rails,9);
 line('tk-rail','transportation',c.ink,widths(9,.7,15,1.3,18,2),rails,9);
 line('tk-rail-sleepers','transportation',c.ink,widths(9,1.8,15,3.5,18,5),rails,10,{'line-dasharray':[.35,4]});
 for(const [kind,minzoom,width]of [['powerLine',8,.9],['minorPowerLine',11,.65]])layers.push({id:`tk-${kind}`,type:'line',source:'named-farms',minzoom,filter:['==',['get','class'],kind],layout:{visibility:enabled.powerLines?'visible':'none'},paint:{'line-color':TK_POWER_COLOR,'line-width':width}});
 label('tk-water-names','water_name',null,8,widths(8,11,14,14),c.waterLine,{'text-font':['Noto Sans Italic']});
 label('tk-river-names','waterway',['any',['has','name'],['has','name:latin']],11,12.5,c.waterLine,{'text-field':['coalesce',['get','name'],['get','name:latin'],['get','name:nonlatin'],''],'symbol-placement':'line','text-font':['Noto Sans Italic'],'symbol-spacing':220,'text-padding':1,'text-max-angle':60,'text-letter-spacing':.03,'text-offset':[0,.7]});
 // Route references at every scale; optional street names only at 1:5,000.
 label('tk-road-refs','transportation_name',['all',cls('motorway','trunk','primary','secondary','tertiary'),['has','ref']],10,11.5,c.ink,{'text-field':['get','ref'],'symbol-placement':'line','symbol-spacing':220,'text-font':['Noto Sans Bold'],'text-max-width':6});
 if(Number(options.scale)===5000&&options.streetNames!==false)label('tk-street-names','transportation_name',['all',cls('motorway','trunk','primary','secondary','tertiary','minor','service','residential','unclassified','track','path'),['any',['has','name'],['has','name:latin']]],12,11,c.ink,{'symbol-placement':'line','symbol-spacing':220,'text-max-angle':45});

 label('tk-small-settlements','place',cls('hamlet','isolated_dwelling',...(enabled.farms?['farm']:[]),'neighbourhood'),11,widths(11,12,15,14.5),c.ink,{'text-font':['Noto Sans Italic'],'text-padding':1,'text-max-width':12,'text-variable-anchor':['center','top','bottom','left','right'],'text-radial-offset':.35});
 label('tk-villages','place',cls('village','suburb'),9,widths(9,13,15,17),c.ink,{'text-padding':1.5,'text-variable-anchor':['center','top','bottom','left','right'],'text-radial-offset':.4});
 label('tk-towns','place',cls('town'),7,widths(7,15.5,13,21),c.ink,{'text-font':['Noto Sans Bold']});
 label('tk-cities','place',cls('city'),4,widths(4,17,10,23.5),c.ink,{'text-font':['Noto Sans Bold']});
 label('tk-countries','place',cls('country','state'),2,widths(2,15.5,6,22),c.ink,{'text-transform':'uppercase','text-letter-spacing':.12});
 const farms=structuredClone(layers.find(l=>l.id==='tk-small-settlements'));
 farms.layout['text-allow-overlap']=true;
 farms.layout.visibility=enabled.farms?'visible':'none';farms.filter=['==',['get','class'],'farm'];
 farms.id='tk-named-farms';farms.source='named-farms';delete farms['source-layer'];
 layers.splice(layers.findIndex(l=>l.id==='tk-small-settlements'),0,farms);
 layers.push({id:'tk-mountain-peaks',type:'symbol',source:'named-farms',minzoom:9,filter:['==',['get','class'],'peak'],layout:{visibility:enabled.peaks?'visible':'none','icon-image':'pq5-peak','icon-size':.75,'icon-allow-overlap':true,'text-field':['concat',['coalesce',['get','name'],''],['case',['all',['!=',['get','name'],''],['!=',['get','elevation'],'']],'\n',''],['coalesce',['get','elevation'],'']],'text-font':['Noto Sans Regular'],'text-size':11,'text-anchor':'top','text-offset':[0,.65],'text-padding':2,'text-optional':true},paint:{'text-color':'#000000','text-halo-color':c.paper,'text-halo-width':1}});
 const kinds=TK_SYMBOL_CLASSES.filter(kind=>kind!=='peak'&&enabled[TK_CLASS_OPTIONS[kind]]);
 layers.push({id:'tk-landmarks',type:'symbol',source:'named-farms',minzoom:9,filter:kinds.length?['in',['get','class'],['literal',kinds]]:['==',1,0],layout:{'icon-image':['concat','pq5-',['get','class']],'icon-size':['match',['get','class'],'pylon',.7,1],'icon-allow-overlap':true,'icon-padding':2}});
 layers.find(l=>l.id==='tk-countries').maxzoom=9;
 return addStreetNameFallback({version:8,name:'PQ5-TK',metadata:{'pq5:description':'OSM topographic cartography inspired by German TK maps; not an official LGLN map'},glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{'named-farms':{type:'geojson',data:{type:'FeatureCollection',features:[]}},osm:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'© OpenStreetMap contributors · OpenMapTiles · OpenFreeMap'}},layers:prioritizeSettlementLabels(layers)});
}

// Load finer vector tiles for print without making type and strokes physically smaller.
// MapLibre's zoom expressions must remain top-level interpolate/step expressions.
export const PQ5_PRINT_DETAIL_OFFSET=2;
export function pq5PrintPixelRatio(dpi){return dpi/150/2**PQ5_PRINT_DETAIL_OFFSET;}
function pq5ScaleCamera(value,factor,offset){
 if(typeof value==='number')return value*factor;
 if(!Array.isArray(value))return value;
 const result=structuredClone(value);
 if(result[0]==='interpolate'&&result[2]?.[0]==='zoom'){
 for(let i=3;i<result.length;i+=2){result[i]+=offset;result[i+1]=pq5ScaleCamera(result[i+1],factor,0);}return result;
 }
 if(result[0]==='step'&&result[1]?.[0]==='zoom'){
 result[2]=pq5ScaleCamera(result[2],factor,0);for(let i=3;i<result.length;i+=2){result[i]+=offset;result[i+1]=pq5ScaleCamera(result[i+1],factor,0);}return result;
 }
 return ['*',result,factor];
}
export function createPQ5TKPrintStyle(options={},baseStyle){
 const style=baseStyle||createPQ5TKStyle(options),offset=PQ5_PRINT_DETAIL_OFFSET,factor=2**offset;
 style.name='PQ5-TK · Print';style.metadata['pq5:printScale']=factor;
 for(const layer of style.layers){
 // Preserve visibility thresholds: the higher camera zoom reveals fine features.
 // Shift only maximum zooms so overview labels still disappear at the same scale.
 if(layer.maxzoom!==undefined)layer.maxzoom+=offset;
 for(const key of ['line-width','line-gap-width','line-offset','text-halo-width','text-halo-blur'])if(layer.paint?.[key]!==undefined)layer.paint[key]=pq5ScaleCamera(layer.paint[key],factor,offset);
 if(layer.layout?.['text-size']!==undefined)layer.layout['text-size']=pq5ScaleCamera(layer.layout['text-size'],factor,offset);
 for(const key of ['text-padding','symbol-spacing','icon-size','icon-padding'])if(layer.layout?.[key]!==undefined)layer.layout[key]=pq5ScaleCamera(layer.layout[key],factor,offset);
 }
 return style;
}

export function createPQ5TKOverviewStyle(baseStyle){
 const off=Object.fromEntries(Object.keys(normalizeTKOptions()).map(key=>[key,false]));
 const style=baseStyle||createPQ5TKStyle(off);style.name='PQ5-TK · Overview';style.metadata['pq5:overview']=true;
 const remove=new Set(['tk-street-names','tk-street-name-fallback','tk-small-settlements','tk-named-farms','tk-landmarks','tk-road-refs','tk-mountain-peaks','tk-river-names','tk-buildings','tk-building-edges','tk-tracks','tk-paths','tk-cemetery-fill','tk-military-fill','tk-military-edge','tk-powerLine','tk-minorPowerLine']);
 style.layers=style.layers.filter(layer=>!remove.has(layer.id));delete style.sources['named-farms'];delete style.sources['street-label-points'];
 if(!style.metadata['pq5:basemap']){
 const places=structuredClone(style.layers.find(l=>l.id==='tk-villages'));places.id='tk-overview-places';places.minzoom=8;places.filter=['in',['get','class'],['literal',['hamlet','quarter','neighbourhood']]];places.layout['text-size']=10;places.layout['text-padding']=5;places.layout['text-allow-overlap']=false;style.layers.push(places);
 }
 style.layers=prioritizeSettlementLabels(style.layers);
 const villages=style.layers.find(layer=>layer.id==='tk-villages');villages.layout['text-size']=10;villages.layout['text-padding']=5;
 return style;
}
