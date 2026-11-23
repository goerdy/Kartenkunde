import {installStreetNameLabels} from './street-labels.js';
import {installPrintTileLoader,printTileRequest,waitForPrintableMap} from './map-loading.js';
import {installShortContourLabels} from './contours.js';
import {createPQ5BasemapStyle,basemapCredit} from './pq5-basemap.js';
import {prepareTKSymbols} from './tk-symbols.js';
import {installFarmLabels} from './farm-labels.js';
import {createPQ5TKStyle,createPQ5TKPrintStyle,createPQ5TKOverviewStyle,pq5PrintPixelRatio} from './pq5-tk.js';
import {t} from './i18n.js';
import {maplibregl} from './vendor.js';
import {extent,sheetGeo,unproject,project} from './geo.js';
export const sourceCredit=()=>`${t('osmAttribution')} (ODbL) · OpenMapTiles · OpenFreeMap`;
export function reliefCredit(){return t('pdfRelief');}
export const MAP_STYLES={pq5basemap:{label:'stylePQ5Basemap',tk:true,basemap:true},pq5tk:{label:'stylePQ5TK',source:'pq5tk',tk:true},pq5gray:{label:'stylePQ5Gray',source:'pq5tk',tk:true,monochrome:true},liberty:{source:'liberty',label:'liberty'},bright:{source:'bright',label:'bright',relief:true},positron:{source:'positron',label:'positron'},fiord:{source:'fiord',label:'styleFiord'},dark:{source:'dark',label:'styleDark'},mono:{source:'positron',label:'styleMono',monochrome:true},plain:{source:'liberty',label:'stylePlain',labels:false},lgln50:{wmsLayer:'ni_dtk50_farbe',label:'styleLGLN50'},lgln50gray:{wmsLayer:'ni_dtk50_grau',label:'styleLGLN50Gray',monochrome:true}};
export const STYLES=Object.fromEntries(Object.keys(MAP_STYLES).map(id=>[id,()=>t(MAP_STYLES[id].label)]));
export function styleName(id){return STYLES[id]?.()||id;}
export const LGLN_WMS='https://opendata.lgln.niedersachsen.de/doorman/noauth/dtk50_wms';
export const isPQ5=id=>!!MAP_STYLES[id]?.tk;
export const isBasemap=id=>!!MAP_STYLES[id]?.basemap;
export const isLGLN=id=>!!MAP_STYLES[id]?.wmsLayer;
export function lglnCredit(year=new Date().getFullYear()){return `© GeoBasis-DE/LGLN ${year} · CC BY 4.0 · ${t('lglnChanges')}`;}
export function styleCredit(id){return isBasemap(id)?`${basemapCredit()} · ${t('basemapChanges')} · ${t('osmAttribution')} (ODbL) · OpenFreeMap`:isLGLN(id)?lglnCredit():sourceCredit();}
export function lglnIntersects(bounds){return bounds.e>6.50&&bounds.w<11.76&&bounds.n>51.15&&bounds.s<54.15;}
export function lglnMapURL(id,crs,box,width,height){
 const params=new URLSearchParams({SERVICE:'WMS',VERSION:'1.3.0',REQUEST:'GetMap',LAYERS:MAP_STYLES[id].wmsLayer,STYLES:'',CRS:crs,BBOX:typeof box==='string'?box:[box.x0,box.y0,box.x1,box.y1].join(','),WIDTH:String(width),HEIGHT:String(height),FORMAT:'image/png',TRANSPARENT:'FALSE',BGCOLOR:'0xFFFFFF',EXCEPTIONS:'XML'});
 return `${LGLN_WMS}?${params}`;
}
export function styleURL(id,options){
 if(isPQ5(id)){const style=isBasemap(id)?createPQ5BasemapStyle(options):createPQ5TKStyle(options);style.name=styleName(id);return style;}
 if(isLGLN(id)){
 const tile=lglnMapURL(id,'EPSG:3857','{bbox-epsg-3857}',256,256).replace(/BBOX=[^&]*/, 'BBOX={bbox-epsg-3857}');
 const sourceId=`lgln-${id}`;
 return {version:8,sources:{[sourceId]:{type:'raster',tiles:[tile],tileSize:256,bounds:[6.50,51.15,11.76,54.15],maxzoom:19,attribution:lglnCredit()}},layers:[{id:'paper',type:'background',paint:{'background-color':'#ffffff'}},{id:`${sourceId}-raster`,type:'raster',source:sourceId,paint:{'raster-fade-duration':0}}]};
 }
 return `https://tiles.openfreemap.org/styles/${(MAP_STYLES[id]||MAP_STYLES.liberty).source}`;}
export function setPreviewStyle(map,host,id,options){
 // Reset the CSS filter immediately, even while the next style is loading.
 host.style.filter=MAP_STYLES[id]?.monochrome?'grayscale(1)':'';
 // Colour and grey WMS tiles must never reuse the previous raster source/cache.
 map.setStyle(styleURL(id,options),{diff:false});
}
export function applyMapStyle(map,id,options,streetClip){const config=MAP_STYLES[id]||MAP_STYLES.liberty;
 if(config.labels===false)for(const layer of map.getStyle().layers)if(layer.type==='symbol')map.setLayoutProperty(layer.id,'visibility','none');
 if(isPQ5(id)&&map.getStyle().metadata?.['pq5:overview'])return;
 if(isPQ5(id)){installStreetNameLabels(map,streetClip);if(isBasemap(id))installShortContourLabels(map);prepareTKSymbols(map);return installFarmLabels(map,options);}
 if(config.relief){map.addSource('terrain-dem',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium'});const before=map.getStyle().layers.find(l=>l.type==='line'||l.type==='symbol')?.id;map.addLayer({id:'terrain-shade',type:'hillshade',source:'terrain-dem',paint:{'hillshade-exaggeration':.38,'hillshade-shadow-color':'#5b6549','hillshade-highlight-color':'#fffced','hillshade-accent-color':'#7b805d'}},before);}
}

export function aborted(signal){if(signal?.aborted)throw new DOMException(t('cancelled'),'AbortError');}
export const breathe=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function renderMap(plan,sheet,width,height,signal){
 aborted(signal);
 if(width<=3800&&height<=3800&&width*height<=16000000)return renderSingleMap(plan,sheet,width,height,signal);
 if(width>32760||height>32760||width*height>120000000)throw Error(t('imageLimit'));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw Error(t('canvasMemory'));
 try{for(const region of rasterRegions(sheet,width,height,2048,Math.ceil(64*(plan.dpi||150)/150))){
 aborted(signal);const tile=await renderSingleMap(plan,region.sheet,region.width,region.height,signal);
 ctx.drawImage(tile,region.cropX,region.cropY,region.drawWidth,region.drawHeight,region.x,region.y,region.drawWidth,region.drawHeight);tile.width=1;tile.height=1;await breathe();
 }return canvas;}catch(e){canvas.width=1;canvas.height=1;throw e;}
}
// Render overscanned sections at the exact output pixel density, then crop the overlap.
export function rasterRegions(sheet,width,height,tileSize=2048,padding=64){
 const regions=[];for(let y=0;y<height;y+=tileSize)for(let x=0;x<width;x+=tileSize){const dw=Math.min(tileSize,width-x),dh=Math.min(tileSize,height-y),left=Math.max(0,x-padding),top=Math.max(0,y-padding),right=Math.min(width,x+dw+padding),bottom=Math.min(height,y+dh+padding);
 regions.push({x,y,drawWidth:dw,drawHeight:dh,cropX:x-left,cropY:y-top,width:right-left,height:bottom-top,sheet:{...sheet,x0:sheet.x0+(sheet.x1-sheet.x0)*left/width,x1:sheet.x0+(sheet.x1-sheet.x0)*right/width,y1:sheet.y1-(sheet.y1-sheet.y0)*top/height,y0:sheet.y1-(sheet.y1-sheet.y0)*bottom/height}});
 }return regions;
}
async function renderSingleMap(plan,sheet,width,height,signal){
 aborted(signal);
 if(isLGLN(plan.style))return renderLGLN(plan,sheet,width,height,signal);
 maplibregl.setMaxParallelImageRequests(4);
 if(isPQ5(plan.style))installPrintTileLoader(maplibregl);
 const pts=sheetGeo(plan,sheet,32),merc=extent(pts.map(p=>project('EPSG:3857',p)));
 const mw=merc.x1-merc.x0,mh=merc.y1-merc.y0;
 const resolution=Math.min(mw/width,mh/height)/1.025;
 const sw=Math.ceil(mw/resolution)+4,sh=Math.ceil(mh/resolution)+4;
 if(sw>7800||sh>7800||sw*sh>36000000)throw Error(t('imageLimit'));
 const pixelRatio=isPQ5(plan.style)&&!plan.overview?pq5PrintPixelRatio(plan.dpi||150):(plan.dpi||150)/150;
 const host=document.createElement('div');host.className='render-host';host.style.width=`${Math.ceil(sw/pixelRatio)}px`;host.style.height=`${Math.ceil(sh/pixelRatio)}px`;document.body.append(host);
 let map;
 try{
 const vectorOptions={...plan.tkOptions,scale:plan.scale,streetNames:plan.streetNames!==false,contours:plan.contours!==false};
 const center=unproject('EPSG:3857',[(merc.x0+merc.x1)/2,(merc.y0+merc.y1)/2]);
 map=new maplibregl.Map({container:host,style:isBasemap(plan.style)?createPQ5BasemapStyle(vectorOptions,plan.overview?'overview':'print'):isPQ5(plan.style)?(plan.overview?createPQ5TKOverviewStyle():createPQ5TKPrintStyle(vectorOptions)):styleURL(plan.style),center,zoom:Math.log2(40075016.68557849/(512*resolution*pixelRatio)),bearing:0,pitch:0,interactive:false,attributionControl:false,...(isPQ5(plan.style)?{transformRequest:printTileRequest}:{}),preserveDrawingBuffer:true,canvasContextAttributes:{preserveDrawingBuffer:true},pixelRatio,fadeDuration:0,renderWorldCopies:false});
 map.on('farmwarning',()=>plan.warnings?.add(t('farmUnavailable')));
 await waitForPrintableMap(map,()=>applyMapStyle(map,plan.style,plan.tkOptions,{crs:plan.crs,sheet}),signal);
 aborted(signal);
 // Copy pixels before freeing the WebGL context.
 const src=captureMapPixels(map.getCanvas(),sw,sh,!!MAP_STYLES[plan.style]?.monochrome);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle=MAP_STYLES[plan.style]?.monochrome?'#f4f4f4':'#f5f4ed';ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const toSource=(x,y)=>{const ll=unproject(plan.crs,[sheet.x0+x/width*(sheet.x1-sheet.x0),sheet.y1-y/height*(sheet.y1-sheet.y0)]);const p=map.project(ll);return [p.x*sw/map.getContainer().clientWidth,p.y*sh/map.getContainer().clientHeight];};
 // A dense triangular mesh reprojects the map pixels from Web Mercator to UTM.
 const step=48;
 for(let y=0;y<height;y+=step){for(let x=0;x<width;x+=step){const xx=Math.min(width,x+step),yy=Math.min(height,y+step);const a=[x,y],b=[xx,y],c=[xx,yy],d=[x,yy];const sa=toSource(...a),sb=toSource(...b),sc=toSource(...c),sd=toSource(...d);triangle(ctx,src,[sa,sb,sc],[a,b,c]);triangle(ctx,src,[sa,sc,sd],[a,c,d]);}if(y%480===0){aborted(signal);await breathe();}}
 src.width=1;src.height=1;return canvas;
 }finally{map?.remove();host.remove();}
}
function triangle(ctx,img,s,d){
 const [s0,s1,s2]=s,[d0,d1,d2]=d;const sx1=s1[0]-s0[0],sy1=s1[1]-s0[1],sx2=s2[0]-s0[0],sy2=s2[1]-s0[1],det=sx1*sy2-sx2*sy1;if(Math.abs(det)<1e-12)return;
 const dx1=d1[0]-d0[0],dy1=d1[1]-d0[1],dx2=d2[0]-d0[0],dy2=d2[1]-d0[1];
 const a=(dx1*sy2-dx2*sy1)/det,b=(dy1*sy2-dy2*sy1)/det,c=(dx2*sx1-dx1*sx2)/det,e=(dy2*sx1-dy1*sx2)/det;
 ctx.save();ctx.beginPath();ctx.moveTo(...d0);ctx.lineTo(...d1);ctx.lineTo(...d2);ctx.closePath();ctx.clip();ctx.transform(a,b,c,e,d0[0]-a*s0[0]-c*s0[1],d0[1]-b*s0[0]-e*s0[1]);ctx.drawImage(img,0,0);ctx.restore();
}

// Request the exact metric print extent directly; no intermediate Mercator resampling.
export async function renderLGLN(plan,sheet,width,height,signal){
 const zone=/\+zone=(32|33)(?:\s|$)/.exec(plan.crs);
 const crs=plan.crs==='EPSG:3857'?'EPSG:3857':zone&&!plan.crs.includes('+south')?`EPSG:326${zone[1]}`:null;
 if(!crs)throw Error(t('lglnOutside'));
 const requestController=new AbortController(),onAbort=()=>requestController.abort();
 signal?.addEventListener('abort',onAbort,{once:true});
 const timer=setTimeout(()=>requestController.abort(),60000);
 let bitmap;
 try{
 aborted(signal);
 const response=await fetch(lglnMapURL(plan.style,crs,sheet,width,height),{signal:requestController.signal});
 if(!response.ok)throw Error(`LGLN: HTTP ${response.status}`);
 if(!response.headers.get('content-type')?.toLowerCase().startsWith('image/'))throw Error(t('lglnResponse'));
 const blob=await response.blob();aborted(signal);bitmap=await createImageBitmap(blob);aborted(signal);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error(t('canvasMemory'));
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.drawImage(bitmap,0,0,width,height);return canvas;
 }catch(e){aborted(signal);if(e.name==='AbortError')throw Error(t('mapTimeout'));throw e;}
 finally{bitmap?.close();clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
}

// Avoid the WebGL -> drawImage GPU readback path, which can swap R/B on some drivers.
// WebGL readPixels explicitly returns RGBA, with rows ordered bottom to top.
export function captureMapPixels(source,width,height,monochrome=false){
 const gl=source.getContext('webgl2')||source.getContext('webgl')||source.getContext('experimental-webgl');
 if(!gl)throw Error(t('mapPixelReadError'));
 const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,pixels=new Uint8Array(w*h*4);
 const target=gl.READ_FRAMEBUFFER??gl.FRAMEBUFFER,binding=gl.READ_FRAMEBUFFER_BINDING??gl.FRAMEBUFFER_BINDING,previous=gl.getParameter(binding);
 try{gl.bindFramebuffer(target,null);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);}finally{gl.bindFramebuffer(target,previous);}
 const copy=document.createElement('canvas');copy.width=w;copy.height=h;
 const ctx=copy.getContext('2d',{colorSpace:'srgb'});if(!ctx)throw Error(t('canvasMemory'));
 const frame=ctx.createImageData(w,h);
 for(let y=0;y<h;y++)frame.data.set(pixels.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);
 if(monochrome)for(let i=0;i<frame.data.length;i+=4){const grey=Math.round(.2126*frame.data[i]+.7152*frame.data[i+1]+.0722*frame.data[i+2]);frame.data[i]=frame.data[i+1]=frame.data[i+2]=grey;}
 ctx.putImageData(frame,0,0);
 if(w===width&&h===height)return copy;
 const result=document.createElement('canvas');result.width=width;result.height=height;const out=result.getContext('2d',{colorSpace:'srgb'});if(!out)throw Error(t('canvasMemory'));out.drawImage(copy,0,0,width,height);copy.width=copy.height=1;return result;
}
