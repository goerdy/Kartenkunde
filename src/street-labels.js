import {clipLine,project,unproject} from './geo.js';
// Keep normal curved line labels; point labels cover names that cannot fit a line.
export function addStreetNameFallback(style){
 const original=style.layers.find(l=>l.id==='tk-street-names');if(!original)return style;
 original.layout={...original.layout,'text-allow-overlap':true,'text-ignore-placement':true,'text-padding':0,'text-max-angle':80};
 const layer=structuredClone(original);layer.id='tk-street-name-fallback';layer.source='street-label-points';delete layer['source-layer'];delete layer.filter;
 layer.layout={...layer.layout,'text-field':['get','name'],'symbol-placement':'point','text-rotate':['get','rotation'],'text-rotation-alignment':'map','text-pitch-alignment':'map','text-max-width':0};
 delete layer.layout['symbol-spacing'];delete layer.layout['text-max-angle'];
 style.sources['street-label-points']={type:'geojson',data:{type:'FeatureCollection',features:[]}};
 style.layers.splice(style.layers.indexOf(original)+1,0,layer);return style;
}
export function streetNameFeatures(features,{project:toPixel,unproject:toGeo,width,height,shown=new Set(),clipSegment}){
 const candidates=new Map();
 for(const feature of features){const name=String(feature.properties?.name||feature.properties?.['name:latin']||'').trim();if(!name||shown.has(name))continue;
 const lines=feature.geometry?.type==='LineString'?[feature.geometry.coordinates]:feature.geometry?.type==='MultiLineString'?feature.geometry.coordinates:[];
 for(const line of lines){const segments=[];let length=0;
 for(let i=1;i<line.length;i++){const clipped=clipSegment?clipSegment(line[i-1],line[i]):[line[i-1],line[i]];if(!clipped)continue;const a=toPixel(clipped[0]),b=toPixel(clipped[1]),segment=clipLine([a.x,a.y],[b.x,b.y],width,height);if(!segment)continue;const distance=Math.hypot(segment[1][0]-segment[0][0],segment[1][1]-segment[0][1]);if(distance<.01)continue;segments.push({a:segment[0],b:segment[1],distance});length+=distance;}
 if(!length||length<=(candidates.get(name)?.length||0))continue;let distance=length/2;
 for(const segment of segments){if(distance<=segment.distance){const t=distance/segment.distance,point={x:segment.a[0]+(segment.b[0]-segment.a[0])*t,y:segment.a[1]+(segment.b[1]-segment.a[1])*t};let rotation=Math.atan2(segment.b[1]-segment.a[1],segment.b[0]-segment.a[0])*180/Math.PI;if(rotation>90)rotation-=180;if(rotation< -90)rotation+=180;const ll=toGeo(point);candidates.set(name,{length,feature:{type:'Feature',geometry:{type:'Point',coordinates:Array.isArray(ll)?ll:[ll.lng,ll.lat]},properties:{name,rotation}}});break;}distance-=segment.distance;}
 }
 }
 return {type:'FeatureCollection',features:[...candidates.values()].map(v=>v.feature)};
}
const streetNameLoaders=new WeakMap();
export function installStreetNameLabels(map,printClip){
 streetNameLoaders.get(map)?.();const layer=map.getStyle().layers.find(l=>l.id==='tk-street-names'),source=map.getSource?.('street-label-points');if(!layer||!source)return;
 let disposed=false,dirty=true,features=[],last='',scheduled;
 const clipSegment=printClip?((a,b)=>{const {crs,sheet:s}=printClip,aa=project(crs,a),bb=project(crs,b),segment=clipLine([aa[0]-s.x0,aa[1]-s.y0],[bb[0]-s.x0,bb[1]-s.y0],s.x1-s.x0,s.y1-s.y0);return segment?.map(p=>unproject(crs,[p[0]+s.x0,p[1]+s.y0]));}):undefined;
 const refresh=()=>{if(disposed||map.getSource('street-label-points')!==source)return;
 if(!features.length)dirty=true;
 if(dirty){features=map.querySourceFeatures(layer.source,{sourceLayer:layer['source-layer'],filter:layer.filter});dirty=false;}
 const canvas=map.getContainer(),query=printClip?(()=>{const {crs,sheet:s}=printClip,points=[[s.x0,s.y0],[s.x1,s.y0],[s.x1,s.y1],[s.x0,s.y1]].map(xy=>map.project(unproject(crs,xy)));return [[Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y))],[Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))]];})():undefined;
 const rendered=query?map.queryRenderedFeatures(query,{layers:[layer.id]}):map.queryRenderedFeatures({layers:[layer.id]});
 const shown=new Set(rendered.map(f=>String(f.properties?.name||f.properties?.['name:latin']||'').trim()));
 const data=streetNameFeatures(features,{project:ll=>map.project(ll),unproject:p=>map.unproject(p),width:canvas.clientWidth,height:canvas.clientHeight,shown,clipSegment});const signature=JSON.stringify(data);if(signature===last)return;last=signature;source.setData(data);
 };
 const schedule=()=>{dirty=true;if(scheduled===undefined)scheduled=setTimeout(()=>{scheduled=undefined;refresh();},0);};
 const loaded=e=>{if(e.sourceId===layer.source&&e.isSourceLoaded)schedule();};
 const dispose=()=>{if(disposed)return;disposed=true;clearTimeout(scheduled);map.off('sourcedata',loaded);map.off('moveend',schedule);map.off('idle',refresh);map.off('style.load',styleChanged);map.off('remove',dispose);streetNameLoaders.delete(map);};
 const styleChanged=()=>{if(map.getSource('street-label-points')!==source)dispose();};
 streetNameLoaders.set(map,dispose);map.on('sourcedata',loaded);map.on('moveend',schedule);map.on('idle',refresh);map.on('style.load',styleChanged);map.once('remove',dispose);refresh();
}
