import {addStreetNameFallback} from './street-labels.js';
import {CONTOUR_TILEJSON,createContourLayers} from './contours.js';
import {prioritizeSettlementLabels,PQ5_TK_COLORS,createPQ5TKStyle,createPQ5TKPrintStyle,createPQ5TKOverviewStyle} from './pq5-tk.js';
export const BASEMAP_TILEJSON='https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_de_3857/bm_web_de_3857.json';
export function basemapCredit(year=new Date().getFullYear()){return `© GeoBasis-DE / BKG (${year}) CC BY 4.0`;}
// Own PQ5 cartography for the published basemap.de V2 schema; no copied provider style.
export function createPQ5BasemapStyle(options={},mode='screen'){
 const withContours=mode!=='overview'&&options.contours!==false,contourLayers=withContours?createContourLayers(options.scale):[];
 const c=PQ5_TK_COLORS,base=createPQ5TKStyle(options),layers=[],supplement=base.layers.filter(l=>l.source==='named-farms');
 const cls=(...values)=>['in',['get','klasse'],['literal',values]],zoom=(...stops)=>['interpolate',['exponential',1.5],['zoom'],...stops];
 const fill=(id,sl,color,filter,minzoom=0)=>layers.push({id,type:'fill',source:'basemap','source-layer':sl,minzoom,...(filter?{filter}:{}),paint:{'fill-color':color}});
 const line=(id,sl,color,width,filter,minzoom=0,paint={})=>layers.push({id,type:'line',source:'basemap','source-layer':sl,minzoom,...(filter?{filter}:{}),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':color,'line-width':width,...paint}});
 const label=(id,sl,filter,minzoom,size,color=c.ink,layout={})=>layers.push({id,type:'symbol',source:'basemap','source-layer':sl,minzoom,...(filter?{filter}:{}),layout:{'text-field':['coalesce',['get','name'],''],'text-font':['Noto Sans Regular'],'text-size':size,'text-max-width':9,'text-padding':2,...layout},paint:{'text-color':color,'text-halo-color':c.paper,'text-halo-width':1}});
 layers.push({id:'tk-paper',type:'background',paint:{'background-color':c.paper}});
 fill('bm-fields','Vegetationsflaeche',c.field,cls('Ackerland','Streuobstacker','Gartenbauland'),6);
 fill('bm-meadows','Vegetationsflaeche',c.meadow,cls('Grünland','Streuobstwiese','Streuobst','Gras','Heide','Moor','Sumpf'),6);
 fill('bm-forest','Vegetationsflaeche',c.forest,cls('Wald','Laubholz','Nadelholz','Laub- und Nadelholz','Gehölz','Gebüsch','Bewuchs, Gehölz'),5);
 fill('bm-settlement','Siedlungsflaeche',c.built,['!',cls('Friedhof','Parkfriedhof','Sportanlage','Erholungsfläche','Garten','Park')],7);
 fill('bm-park','Siedlungsflaeche',c.meadow,cls('Park','Garten','Erholungsfläche','Sportanlage'),8);
 layers.push(...contourLayers.filter(l=>l.type==='line'));
 fill('bm-water','Gewaesserflaeche',c.water);line('bm-shore','Gewaesserflaeche',c.waterLine,.65,null,9);
 const hidden=['any',['==',['get','bauwerk'],'Durchlass'],['==',['get','bauwerk'],'Rohrdurchlass'],['==',['get','bauwerk'],'Düker'],['==',['get','merkmal'],'Nicht ständig Wasser führend']];
 line('bm-waterways','Gewaesserlinie',c.waterLine,zoom(8,.65,12,1,16,1.8),['!',hidden],7);
 line('bm-waterways-covered','Gewaesserlinie',c.waterLine,zoom(8,.65,12,1,16,1.8),hidden,9,{'line-dasharray':[3,2]});
 layers.push(...supplement.filter(l=>['fill','line'].includes(l.type)&&!l.id.includes('powerLine')&&!l.id.includes('minorPowerLine')));
 fill('tk-buildings','Gebaeudeflaeche',c.building,null,11);
 // Service roads from OSM supplement small driveways and industrial access routes.
 // Do not filter access=private: accessibility and physical presence are different.
 const serviceFilter=['==',['get','class'],'service'];
 for(const [id,color,width]of [['casing',c.ink,zoom(12,.9,16,2.5,18,3.8)],['fill',c.paper,zoom(12,.35,16,1.5,18,2.7)]])layers.push({id:`bm-osm-service-${id}`,type:'line',source:'osm-detail','source-layer':'transportation',minzoom:12,filter:serviceFilter,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':color,'line-width':width}});
 const roads=[['minor',['Gemeindestraße','Nicht öffentliche Straße','Sonstige öffentliche Straße'],c.paper,[9,.8,12,2,16,5]],['county',['Kreisstraße'],c.secondary,[8,1.1,12,2.6,16,7]],['state',['Landesstraße, Staatsstraße'],c.secondary,[7,1.3,12,3,16,8]],['primary',['Bundesstraße'],c.major,[6,1.7,12,3.8,16,9]],['motorway',['Bundesautobahn'],c.motorway,[5,2,12,4.3,16,11]]];
 for(const [id,classes,color,stops]of roads){line(`bm-${id}-casing`,'Verkehrslinie',c.ink,zoom(...stops.map((v,i)=>i%2?v*1.4+1:v)),cls(...classes),5);line(`bm-${id}`,'Verkehrslinie',color,zoom(...stops.map((v,i)=>i%2?v*1.4:v)),cls(...classes),5);}
 line('tk-tracks','Verkehrslinie','#716b52',zoom(10,.7,14,1.3),cls('Wirtschaftsweg','Hauptwirtschaftsweg'),10,{'line-dasharray':[5,2]});
 line('tk-paths','Verkehrslinie','#726d58',zoom(11,.6,15,1),cls('Weg, Pfad, Steig','Fußweg','Rad- und Fußweg','Radweg','Reitweg'),11,{'line-dasharray':[2,2]});
 const rail=cls('Eisenbahn','Gleis','Güterverkehr','Personenverkehr','Museumsbahn','S-Bahn','Stadtbahn','Straßenbahn','U-Bahn','Zahnradbahn','Standseilbahn','Magnetschwebebahn','Bahn im Freizeitpark');line('bm-rail','Verkehrslinie',c.ink,1.1,rail,8);line('bm-rail-sleepers','Verkehrslinie',c.ink,3,rail,10,{'line-dasharray':[.3,3]});
 layers.push(...supplement.filter(l=>l.id.includes('powerLine')||l.id.includes('minorPowerLine')));
 layers.push(...contourLayers.filter(l=>l.type==='symbol'));
 label('tk-road-refs','Verkehrslinie',['all',cls('Bundesautobahn','Bundesstraße','Landesstraße, Staatsstraße','Kreisstraße'),['has','nummer']],10,11,c.ink,{'symbol-placement':'line','symbol-spacing':260,'text-field':['get','nummer'],'text-font':['Noto Sans Bold']});
 if(Number(options.scale)===5000&&options.streetNames!==false)label('tk-street-names','Verkehrslinie',['all',cls('Bundesautobahn','Bundesstraße','Landesstraße, Staatsstraße','Kreisstraße','Gemeindestraße','Nicht öffentliche Straße','Sonstige öffentliche Straße','Wirtschaftsweg','Hauptwirtschaftsweg','Weg, Pfad, Steig','Fußweg','Rad- und Fußweg','Radweg','Reitweg'),['has','name']],12,11,c.ink,{'symbol-placement':'line','symbol-spacing':220,'text-max-angle':45});
 label('tk-river-names','Gewaesserlinie',['has','name'],11,13,c.waterLine,{'symbol-placement':'line','text-font':['Noto Sans Italic'],'symbol-spacing':300});
 label('bm-water-names','Gewaesserflaeche',['has','name'],10,13,c.waterLine,{'text-font':['Noto Sans Italic']});
 label('tk-small-settlements','Name_Punkt',['all',cls('Ort'),['in',['get','art'],['literal',['Wohnplatz','Gemeindeteil','Stadtteil']]]],11,13,c.ink,{'text-font':['Noto Sans Italic'],'text-padding':1});
 label('tk-villages','Name_Punkt',['all',cls('Ort'),['in',['get','art'],['literal',['Gemeinde','Gemeindefreies Gebiet']]]],8,15);
 label('bm-cities','Name_Punkt',['all',cls('Ort'),['in',['get','art'],['literal',['Stadt','Hauptstadt','Landeshauptstadt']]]],5,zoom(5,13,10,20,14,24),c.ink,{'text-font':['Noto Sans Bold']});
 layers.push(...supplement.filter(l=>l.type==='symbol'));
 const style={version:8,name:'PQ5-Default-GER',metadata:{'pq5:basemap':true},glyphs:base.glyphs,sources:{basemap:{type:'vector',url:BASEMAP_TILEJSON,attribution:basemapCredit()},'osm-detail':{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'© OpenStreetMap contributors · OpenMapTiles · OpenFreeMap'},'named-farms':base.sources['named-farms']},layers:prioritizeSettlementLabels(layers)};
 if(withContours){style.metadata['pq5:contourScale']=Number(options.scale)||50000;style.sources['height-contours']={type:'vector',url:CONTOUR_TILEJSON,attribution:basemapCredit()};style.sources['height-label-points']={type:'geojson',data:{type:'FeatureCollection',features:[]}};}
 addStreetNameFallback(style);
 if(mode==='print')return createPQ5TKPrintStyle(options,style);
 if(mode==='overview'){
 const overview=createPQ5TKOverviewStyle(style);overview.layers=overview.layers.filter(l=>l.source!=='osm-detail'&&!['bm-water-names','bm-rail-sleepers'].includes(l.id));delete overview.sources['osm-detail'];
 const places=structuredClone(layers.find(l=>l.id==='tk-small-settlements'));places.id='tk-overview-places';places.minzoom=8;places.filter=['all',cls('Ort'),['in',['get','art'],['literal',['Gemeindeteil','Stadtteil']]]];places.layout['text-size']=10;places.layout['text-padding']=5;places.layout['text-allow-overlap']=false;overview.layers.push(places);overview.layers=prioritizeSettlementLabels(overview.layers);return overview;
 }
 return style;
}
