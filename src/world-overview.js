import {t} from './i18n.js';
// Equal Earth on WGS84's authalic sphere (EPSG:8857), used only by the UI.
// Snyder's authalic latitude conversion keeps the ellipsoid's area ratios.
const EE_A1=1.340264,EE_A2=-.081106,EE_A3=.000893,EE_A4=.003796;
const EE_E2=.0066943799901413165,EE_E=Math.sqrt(EE_E2),EE_RAD=Math.PI/180;
function authalicQ(phi){const s=Math.sin(phi);return (1-EE_E2)*(s/(1-EE_E2*s*s)-Math.log((1-EE_E*s)/(1+EE_E*s))/(2*EE_E));}
const EE_QP=authalicQ(Math.PI/2),EE_RADIUS=6378137*Math.sqrt(EE_QP/2);
const eeClamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function equalEarthForward(lon,lat){
 const beta=Math.asin(eeClamp(authalicQ(eeClamp(lat,-90,90)*EE_RAD)/EE_QP,-1,1));
 const theta=Math.asin(Math.sqrt(3)/2*Math.sin(beta)),p=theta*theta,p3=p*p*p;
 const denominator=EE_A1+3*EE_A2*p+p3*(7*EE_A3+9*EE_A4*p);
 return [EE_RADIUS*2*Math.sqrt(3)*lon*EE_RAD*Math.cos(theta)/(3*denominator),EE_RADIUS*theta*(EE_A1+EE_A2*p+p3*(EE_A3+EE_A4*p))];
}
export function equalEarthInverse(x,y){
 let theta=eeClamp(y/(EE_RADIUS*EE_A1),-Math.PI/3,Math.PI/3);
 for(let i=0;i<15;i++){const p=theta*theta,p3=p*p*p,f=theta*(EE_A1+EE_A2*p+p3*(EE_A3+EE_A4*p))-y/EE_RADIUS,derivative=EE_A1+3*EE_A2*p+p3*(7*EE_A3+9*EE_A4*p);const next=eeClamp(theta-f/derivative,-Math.PI/3,Math.PI/3);if(Math.abs(theta-next)<1e-13){theta=next;break;}theta=next;}
 const p=theta*theta,p3=p*p*p,beta=Math.asin(eeClamp(2*Math.sin(theta)/Math.sqrt(3),-1,1));
 let phi=beta;if(Math.abs(Math.abs(beta)-Math.PI/2)<1e-10)phi=Math.sign(beta)*Math.PI/2;
 else for(let i=0;i<15;i++){const s=Math.sin(phi),derivative=2*(1-EE_E2)*Math.cos(phi)/(1-EE_E2*s*s)**2,delta=(authalicQ(phi)-EE_QP*Math.sin(beta))/derivative;phi=eeClamp(phi-delta,-Math.PI/2,Math.PI/2);if(Math.abs(delta)<1e-13)break;}
 const lon=x*3*(EE_A1+3*EE_A2*p+p3*(7*EE_A3+9*EE_A4*p))/(EE_RADIUS*2*Math.sqrt(3)*Math.cos(theta));
 return [lon/EE_RAD,phi/EE_RAD];
}
export const WORLD_DATA_URL='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
export const EQUAL_EARTH_MAX_ZOOM=4;
export function overviewProjection(zoom){return zoom<=EQUAL_EARTH_MAX_ZOOM?'equalEarth':'mercator';}
export function createEqualEarthCRS(L){
 const maxX=equalEarthForward(180,0)[0],maxY=equalEarthForward(0,90)[1];
 return L.extend({},L.CRS.Earth,{code:'EPSG:8857',infinite:false,wrapLng:undefined,wrapLat:undefined,
 projection:{bounds:L.bounds([-maxX,-maxY],[maxX,maxY]),project:ll=>{const xy=equalEarthForward(ll.lng,ll.lat);return L.point(xy[0],xy[1]);},unproject:point=>{const ll=equalEarthInverse(point.x,point.y);return L.latLng(ll[1],ll[0]);}},
 transformation:new L.Transformation(1/(2*maxX),.5,-1/(2*maxX),.5)
 });
}
export function rectangleOutline(bounds,step=2){
 const points=[];for(const [a,b]of [[[bounds.s,bounds.w],[bounds.s,bounds.e]],[[bounds.s,bounds.e],[bounds.n,bounds.e]],[[bounds.n,bounds.e],[bounds.n,bounds.w]],[[bounds.n,bounds.w],[bounds.s,bounds.w]]]){
 const count=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/step));for(let i=0;i<count;i++)points.push([a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count]);
 }return points;
}
let geographicRectangleType;
export function selectionRectangle(L,bounds,options){
 geographicRectangleType??=L.Rectangle.extend({_boundsToLatLngs(bounds){const b=L.latLngBounds(bounds);return rectangleOutline({s:b.getSouth(),n:b.getNorth(),w:b.getWest(),e:b.getEast()}).map(ll=>L.latLng(ll[0],ll[1]));}});
 return new geographicRectangleType(bounds,options);
}
export async function fetchWorldCountries(fetcher=globalThis.fetch.bind(globalThis),base=globalThis.document?.baseURI){
 const candidates=base?[new URL('./assets/world-countries.geojson',base).href,WORLD_DATA_URL]:[WORLD_DATA_URL];let failure;
 for(const url of candidates)try{const response=await fetcher(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`HTTP ${response.status}`);const data=await response.json();if(data.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length)throw Error(t('invalidWorldGeometry'));return data;}catch(e){failure=e;}
 throw failure||Error(t('overviewUnavailable'));
}
export function installWorldOverview(L,map,{onChange=()=>{},onError=()=>{}}={}){
 const mercator=L.CRS.EPSG3857,equalEarth=createEqualEarthCRS(L),detailedBounds=map.options.maxBounds;
 let active=false,switching=false,dataPromise=null,loaded=false;
 const pane=map.createPane('equalEarthOverview');pane.style.zIndex='190';pane.style.pointerEvents='none';
 const water=L.polygon(rectangleOutline({w:-180,e:180,s:-90,n:90},1),{pane:'equalEarthOverview',color:'#536b83',weight:1,fillColor:'#1c3042',fillOpacity:1,interactive:false,smoothFactor:0});
 const land=L.geoJSON(null,{pane:'equalEarthOverview',style:{color:'#8d9b9d',weight:.6,fillColor:'#b3b9a6',fillOpacity:1},interactive:false,smoothFactor:0});
 const graticule=L.layerGroup();for(let lat=-60;lat<=60;lat+=30)graticule.addLayer(L.polyline(Array.from({length:181},(_,i)=>[lat,-180+i*2]),{pane:'equalEarthOverview',color:'#576d7e',weight:.5,opacity:.6,interactive:false}));
 for(let lon=-150;lon<=150;lon+=30)graticule.addLayer(L.polyline(Array.from({length:91},(_,i)=>[-90+i*2,lon]),{pane:'equalEarthOverview',color:'#576d7e',weight:.5,opacity:.6,interactive:false}));
 const credit='<a href="https://www.naturalearthdata.com/">Natural Earth</a> · Equal Earth';
 async function loadLand(){if(loaded)return;if(!dataPromise)dataPromise=fetchWorldCountries();try{const data=await dataPromise;if(!loaded){land.addData(data);loaded=true;}if(active){if(!map.hasLayer(land))land.addTo(map);map.fire('overviewready');}}catch(e){dataPromise=null;if(active)onError(e);}}
 function switchProjection(){if(switching)return;const should=overviewProjection(map.getZoom())==='equalEarth';if(should===active)return;
 switching=true;active=should;const center=map.getCenter(),zoom=map.getZoom();
 if(active){map.setMaxBounds(null);map.options.crs=equalEarth;water.addTo(map);graticule.addTo(map);land.addTo(map);map.attributionControl.addAttribution(credit);}
 else{map.removeLayer(water);map.removeLayer(graticule);map.removeLayer(land);map.attributionControl.removeAttribution(credit);map.options.crs=mercator;}
 const lon=((center.lng+180)%360+360)%360-180,lat=eeClamp(center.lat,active?-90:-85,active?90:85);
 // Public setView reset forces all Leaflet paths and markers to use the new CRS.
 map.setView([lat,lon],zoom,{reset:true,animate:false});if(!active&&detailedBounds)map.setMaxBounds(detailedBounds);
 switching=false;onChange(active?'equalEarth':'mercator');if(active)loadLand();
 }
 map.on('zoomend',switchProjection);switchProjection();
 return {get active(){return active;},allows(ll,containerPoint){if(!active)return true;if(!Number.isFinite(ll.lng)||Math.abs(ll.lng)>180||Math.abs(ll.lat)>90)return false;if(containerPoint){const roundtrip=map.latLngToContainerPoint(ll);if(Math.hypot(roundtrip.x-containerPoint.x,roundtrip.y-containerPoint.y)>2)return false;}return true;},remove(){map.off('zoomend',switchProjection);map.removeLayer(water);map.removeLayer(land);map.removeLayer(graticule);}};
}
