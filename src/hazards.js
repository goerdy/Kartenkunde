import {t} from './i18n.js';
import {project,unproject,extent,sheetGeo} from './geo.js';
const NDS='https://www.umweltkarten-niedersachsen.de/arcgis/services/HWSchutz_wms/MapServer/WMSServer',BKG='https://sgx.geodatenzentrum.de/wms_starkregen';
const depths=['0–0,5 m','> 0,5–1 m','> 1–2 m','> 2–4 m','> 4 m'];
const coastColors=['#dbf2ff','#b7dbff','#94b7ff','#7794ff','#4c70db'],protectedColors=['#f7feb6','#f2ff52','#f2d760','#f2bc60','#db7c4c'];
export const HAZARD_LAYERS={
 coastExtreme:{key:'hazardCoast',url:NDS,layer:'Wassertiefen_Küste_HWextrem61160',region:'nds',kind:'flood'},
 riverFrequent:{key:'hazardRiverFrequent',url:NDS,layer:'Wassertiefen_Binnenland_HQhäufig26814',region:'nds',kind:'flood'},
 river100:{key:'hazardRiver100',url:NDS,layer:'Wassertiefen_Binnenland_HQ10035990',region:'nds',kind:'flood'},
 riverExtreme:{key:'hazardRiverExtreme',url:NDS,layer:'Wassertiefen_Binnenland_HQextrem23372',region:'nds',kind:'flood'},
 rain100:{key:'hazardRain100',url:BKG,layer:'tiefe_agw',region:'de',kind:'rain'},
 rainExtreme:{key:'hazardRainExtreme',url:BKG,layer:'tiefe_extrem',region:'de',kind:'rain'}
};
export function normalizeHazard(value){return {id:value&&Object.hasOwn(HAZARD_LAYERS,value.id)?value.id:'none',opacity:Number.isFinite(value?.opacity)?Math.max(.1,Math.min(1,value.opacity)):.55};}
export function hazardConfig(value){return HAZARD_LAYERS[normalizeHazard(value).id]||null;}
export function hazardName(value){const c=hazardConfig(value);return c?t(c.key):t('hazardNone');}
export function hazardCredit(value){const c=hazardConfig(value);return !c?'':c.kind==='rain'?`© BKG ${new Date().getFullYear()} · dl-de/by-2-0`:t('hazardNdsCredit')+' · dl-de/by-2-0';}
export function hazardSourceURL(value){return hazardConfig(value)?.kind==='rain'?'https://gdz.bkg.bund.de/index.php/default/wms-hinweiskarte-starkregengefahren-wms-starkregen.html':'https://www.nlwkn.niedersachsen.de/wasserwirtschaft/eghochwasserrisikomanagementrichtlinie/gefahren_und_risikokarten/gefahren--und-risikokarten-116763.html';}
export function hazardAttribution(value){const c=hazardConfig(value);return !c?'':`<a href="${hazardSourceURL(value)}">${c.kind==='rain'?'© BKG': '© MU / NLWKN'}</a> · <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>`;}
export function hazardLegend(value){const c=hazardConfig(value);if(!c)return [];
 if(c.kind==='rain')return ['10–<30 cm','30–<50 cm','50–<100 cm','100–<200 cm','200–<400 cm','≥ 400 cm'].map((label,i)=>({label,color:['#ccecff','#99ccff','#6e99ff','#3d66ff','#0033cc','#08306b'][i]}));
 return [...depths.map((label,i)=>({label,color:coastColors[i]})),...depths.map((label,i)=>({label:label+' · '+t('hazardProtected'),color:protectedColors[i]}))];
}
export function hazardMapURL(value,crs,box,width,height){const c=hazardConfig(value);if(!c)return null;
 return c.url+'?'+new URLSearchParams({SERVICE:'WMS',VERSION:'1.3.0',REQUEST:'GetMap',LAYERS:c.layer,STYLES:'',CRS:crs,BBOX:[box.x0,box.y0,box.x1,box.y1].join(','),WIDTH:String(width),HEIGHT:String(height),FORMAT:'image/png',TRANSPARENT:'TRUE'});
}
function abort(signal){if(signal?.aborted)throw new DOMException('Aborted','AbortError');}
async function raster(url,signal){abort(signal);const controller=new AbortController(),onAbort=()=>controller.abort();signal?.addEventListener('abort',onAbort,{once:true});const timer=setTimeout(()=>controller.abort(),60000);
 try{const r=await fetch(url,{signal:controller.signal});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error(t('hazardLoadError'));const image=await createImageBitmap(await r.blob());abort(signal);return image;}catch(e){abort(signal);throw Error(t('hazardLoadError'));}finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
}
function triangle(ctx,img,s,d){const [a,b,c]=s,[p,q,r]=d,dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1],det=dx*ey-ex*dy;if(Math.abs(det)<1e-12)return;
 const m=((q[0]-p[0])*ey-(r[0]-p[0])*dy)/det,n=((q[1]-p[1])*ey-(r[1]-p[1])*dy)/det,o=((r[0]-p[0])*dx-(q[0]-p[0])*ex)/det,v=((r[1]-p[1])*dx-(q[1]-p[1])*ex)/det;
 ctx.save();ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.lineTo(...r);ctx.closePath();ctx.clip();ctx.transform(m,n,o,v,p[0]-m*a[0]-o*a[1],p[1]-n*a[0]-v*a[1]);ctx.drawImage(img,0,0);ctx.restore();
}
// Request bounded WMS tiles and reproject them onto the same sheet coordinates
// as the base map. Never change the sheet extent or print scale for an overlay.
export async function composeHazard(canvas,plan,sheet,signal){const h=normalizeHazard(plan.hazard),c=hazardConfig(h);if(!c)return canvas;
 const bounds=extent(sheetGeo(plan,sheet,8)),region=c.region==='nds'?[6.5,51.1,11.8,54.3]:[5,47,16,56];
 if(bounds.x1<region[0]||bounds.x0>region[2]||bounds.y1<region[1]||bounds.y0>region[3]){plan.warnings?.add(t('hazardOutside'));return canvas;}
 const {width,height}=canvas,ctx=canvas.getContext('2d'),tileSize=1400;
 for(let y=0;y<height;y+=tileSize)for(let x=0;x<width;x+=tileSize){abort(signal);const w=Math.min(tileSize,width-x),hpx=Math.min(tileSize,height-y),local={x0:sheet.x0+x/width*(sheet.x1-sheet.x0),x1:sheet.x0+(x+w)/width*(sheet.x1-sheet.x0),y1:sheet.y1-y/height*(sheet.y1-sheet.y0),y0:sheet.y1-(y+hpx)/height*(sheet.y1-sheet.y0)};
 const direct=plan.crs==='EPSG:3857'||/\+zone=32(?:\s|$)/.test(plan.crs)&&!plan.south,crs=plan.crs==='EPSG:3857'?'EPSG:3857':direct?'EPSG:25832':'EPSG:3857';
 const box=direct?local:extent(sheetGeo(plan,local,8).map(ll=>project('EPSG:3857',ll))),rw=w,rh=hpx,img=await raster(hazardMapURL(h,crs,box,rw,rh),signal);
 // Warp without opacity first, so triangle edges cannot receive the layer twice.
 const tile=document.createElement('canvas');tile.width=w;tile.height=hpx;const tc=tile.getContext('2d');
 try{if(direct)tc.drawImage(img,0,0,w,hpx);else{const source=(a,b)=>{const ll=unproject(plan.crs,[local.x0+a/w*(local.x1-local.x0),local.y1-b/hpx*(local.y1-local.y0)]),v=project('EPSG:3857',ll);return [(v[0]-box.x0)/(box.x1-box.x0)*rw,(box.y1-v[1])/(box.y1-box.y0)*rh];};for(let b=0;b<hpx;b+=32)for(let a=0;a<w;a+=32){const aa=Math.min(w,a+32),bb=Math.min(hpx,b+32),p=[a,b],q=[aa,b],r=[aa,bb],s=[a,bb];triangle(tc,img,[source(...p),source(...q),source(...r)],[p,q,r]);triangle(tc,img,[source(...p),source(...r),source(...s)],[p,r,s]);}}
 ctx.save();ctx.globalAlpha=h.opacity;if(['pq5gray','mono','lgln50gray'].includes(plan.style))ctx.filter='grayscale(1)';ctx.drawImage(tile,x,y);ctx.restore();}finally{img.close();tile.width=tile.height=1;}
 }
 return canvas;
}
