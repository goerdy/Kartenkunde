// Official basemap.de height contours; independent from the base-map vector archive.
export const CONTOUR_TILEJSON='https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_hl_de_3857/bm_web_hl_de_3857.json';
export const CONTOUR_COLOR='#986b43';
export function contourInterval(scale=50000){return scale<=5000?2.5:scale<=10000?5:scale<=25000?10:scale<=50000?20:scale<=100000?50:100;}
export function createContourLayers(scale){
 const interval=contourInterval(scale),height=['to-number',['get','hoehe'],-999999];
 // The source partitions contours into classes (2,5er, 5er, 10er ...). Filter by
 // numeric height so all retained lines follow one consistent interval.
 const modulo=n=>['<',['abs',['%',height,n]],.001];
 const valid=['all',['has','hoehe'],['!=',height,-999999],modulo(interval)],index=modulo(interval*5);
 const base={source:'height-contours','source-layer':'Hoehenlinie',minzoom:8};
 const line=(id,filter,width)=>({...base,id,type:'line',filter,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':CONTOUR_COLOR,'line-width':width,'line-opacity':.9}});
 return [line('bm-contours-minor',['all',valid,['!',index]],.6),line('bm-contours-major',['all',valid,index],1.1),{...base,id:'bm-contour-labels',type:'symbol',filter:['all',valid,index],layout:{'symbol-placement':'line','symbol-spacing':180,'text-field':['concat',['to-string',height],' m'],'text-font':['Noto Sans Regular'],'text-size':10,'text-padding':2,'text-max-angle':65,'text-keep-upright':false,'text-allow-overlap':false},paint:{'text-color':CONTOUR_COLOR,'text-halo-color':'#fffff2','text-halo-width':1.1}}, {id:'bm-contour-short-labels',type:'symbol',source:'height-label-points',minzoom:8,layout:{'symbol-placement':'point','text-field':['concat',['to-string',['get','hoehe']],' m'],'text-font':['Noto Sans Regular'],'text-size':9.5,'text-padding':1,'text-allow-overlap':false,'text-anchor':'center','text-rotation-alignment':'map','text-rotate':['get','rotation']},paint:{'text-color':CONTOUR_COLOR,'text-halo-color':'#fffff2','text-halo-width':1.1}}];
}

// Preserve source direction, as in the official relief style (text-keep-upright:false).
// In north-up screen coordinates the left/uphill side is above the forward tangent.
// Point anchors avoid the text-length and curvature constraints of line labels.
export function shortContourLabelFeatures(features,{scale=50000,project,unproject,printScale=1,width=Infinity,height=Infinity}){
 const result=[],seen=new Set(),major=contourInterval(scale)*5;
 for(const feature of features){const elevation=Number(feature.properties?.hoehe);if(feature.properties?.hoehe==null||!Number.isFinite(elevation)||Math.abs(elevation%major)>.001)continue;
 const lines=feature.geometry?.type==='LineString'?[feature.geometry.coordinates]:feature.geometry?.type==='MultiLineString'?feature.geometry.coordinates:[];
 for(const line of lines){if(line.length<2)continue;const points=[project(line[0])],lengths=[];let length=0;
 // Long contours already use line labels: stop projecting once they exceed
 // the short-label threshold, instead of projecting every buffered vertex.
 for(let i=1;i<line.length&&length<=180*printScale;i++){const point=project(line[i]),previous=points.at(-1),segment=Math.hypot(point.x-previous.x,point.y-previous.y);points.push(point);lengths.push(segment);length+=segment;}
 if(length<=0||length/printScale>180)continue;let distance=length/2,midpoint,rotation;
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]&&lengths[i]>0){const t=distance/lengths[i];rotation=Math.atan2(points[i+1].y-points[i].y,points[i+1].x-points[i].x)*180/Math.PI;midpoint={x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};break;}distance-=lengths[i];}
 if(!midpoint||midpoint.x<0||midpoint.y<0||midpoint.x>width||midpoint.y>height)continue;
 const ll=unproject(midpoint),coordinates=Array.isArray(ll)?ll:[ll.lng,ll.lat],key=`${elevation}:${coordinates.map(n=>n.toFixed(5)).join(',')}`;if(seen.has(key))continue;seen.add(key);
 result.push({type:'Feature',id:key,geometry:{type:'Point',coordinates},properties:{hoehe:elevation,rotation}});
 }
 }
 return {type:'FeatureCollection',features:result};
}
const contourLabelLoaders=new WeakMap();
export function installShortContourLabels(map){
 contourLabelLoaders.get(map)?.();const source=map.getSource('height-label-points');if(!source||!map.getSource('height-contours'))return;
 let disposed=false,last='',dirty=true,scheduled;
 const schedule=()=>{dirty=true;if(scheduled===undefined)scheduled=setTimeout(()=>{scheduled=undefined;refresh();},0);};
 const refresh=()=>{if(!dirty||disposed||map.getSource('height-label-points')!==source)return;dirty=false;const metadata=map.getStyle().metadata||{},container=map.getContainer();
 // Filter inside the vector-tile query, before MapLibre expands every contour
 // geometry into GeoJSON. Fine 2.5 m lines are not needed for major labels.
 const filter=map.getFilter('bm-contour-labels');
 const data=shortContourLabelFeatures(map.querySourceFeatures('height-contours',{sourceLayer:'Hoehenlinie',filter}),{scale:metadata['pq5:contourScale'],printScale:metadata['pq5:printScale']||1,project:ll=>map.project(ll),unproject:point=>map.unproject(point),width:container.clientWidth,height:container.clientHeight});
 const signature=JSON.stringify(data);if(signature===last)return;last=signature;source.setData(data);
 };
 const loaded=event=>{if(event.sourceId==='height-contours'&&event.isSourceLoaded)schedule();};
 const dispose=()=>{if(disposed)return;disposed=true;clearTimeout(scheduled);map.off('sourcedata',loaded);map.off('moveend',schedule);map.off('idle',refresh);map.off('style.load',dispose);map.off('remove',dispose);contourLabelLoaders.delete(map);};
 contourLabelLoaders.set(map,dispose);map.on('sourcedata',loaded);map.on('moveend',schedule);map.on('idle',refresh);map.once('style.load',dispose);map.once('remove',dispose);refresh();
}
