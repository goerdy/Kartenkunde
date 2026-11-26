import {installCoordinateGrid} from './coordinate-tool-grid.js';
import './coordinate-tool-messages.js';
import {t,translatePage} from './i18n.js';
import {maplibregl} from './vendor.js';
import {MAP_STYLES,styleURL,setPreviewStyle,applyMapStyle,styleCredit} from './render.js';
import {installCoverageNotice} from './coverage.js';
import {coordinateFormats,parseCoordinate,parseDecimalPair,readStoredPoints,storePoints} from './coordinate-tool-model.js';
const $=id=>document.getElementById(id),form=$('ctForm'),styleSelect=$('ctStyle'),format=$('ctFormat'),points=[];
let style='pq5basemap',nextId=1,selected=null,attribution,locating=false;
const options={scale:25000,contours:true,streetNames:true};
export const map=new maplibregl.Map({container:'ctMap',style:styleURL(style,options),center:[7.92,53.67],zoom:13,minZoom:1,maxZoom:19,renderWorldCopies:false,dragRotate:false,pitchWithRotate:false,touchPitch:false,attributionControl:false});
map.touchZoomRotate.disableRotation();
map.addControl(new maplibregl.NavigationControl({showCompass:false}));map.addControl(new maplibregl.ScaleControl({unit:'metric'}));
installCoverageNotice({container:$('ctStage'),map,getStyle:()=>style,onSwitch:id=>{styleSelect.value=id;styleSelect.dispatchEvent(new Event('change'));}});
function status(key,values={},error=false){$('ctStatus').textContent=t(key,values);$('ctStatus').classList.toggle('error',error);}
function credit(){if(attribution)map.removeControl(attribution);attribution=new maplibregl.AttributionControl({customAttribution:styleCredit(style),compact:true});map.addControl(attribution);}
function readout(){const {lng,lat}=map.getCenter(),values=coordinateFormats(Math.max(-180,Math.min(180,lng)),lat),dl=$('ctReadout');dl.replaceChildren();for(const [key,label] of [['mgrs','UTMREF / MGRS'],['utm','UTM'],['dms',t('ctDMS')],['decimal',t('ctDecimal')]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;const current=points.find(p=>p.id===selected&&Math.abs(p.position[0]-lng)<1e-8&&Math.abs(p.position[1]-lat)<1e-8);dd.textContent=(key==='mgrs'?current?.reference:null)??values[key]??t('ctPolar');dd.classList.toggle('coordinate-utmref',key==='mgrs');dl.append(dt,dd);}}
function renderPoints(){const list=$('ctPoints');list.replaceChildren();$('ctCount').textContent=points.length;$('ctEmpty').hidden=!!points.length;$('ctClear').disabled=!points.length;for(const point of points){const row=document.createElement('li'),button=document.createElement('button'),remove=document.createElement('button'),title=document.createElement('strong'),coordinate=document.createElement('span');button.type=remove.type='button';button.className='coordinate-point-select';button.setAttribute('aria-pressed',String(point.id===selected));title.textContent=t('ctPoint',{number:point.id});const values=coordinateFormats(...point.position);coordinate.textContent=point.reference??values.mgrs??values.decimal;coordinate.classList.toggle('coordinate-utmref',!!values.mgrs);button.append(title,coordinate);button.onclick=()=>selectPoint(point);remove.textContent='×';remove.className='coordinate-delete';remove.setAttribute('aria-label',t('ctDelete',{number:point.id}));remove.onclick=()=>{point.marker.remove();points.splice(points.indexOf(point),1);if(selected===point.id)selected=null;savePoints();renderPoints();};point.element.setAttribute('aria-label',title.textContent);point.element.classList.toggle('selected',point.id===selected);row.append(button,remove);list.append(row);}}
function selectPoint(point){selected=point.id;map.jumpTo({center:point.position});renderPoints();readout();}
function createPoint(position,id,reference){const element=document.createElement('button');nextId=Math.max(nextId,id+1);element.type='button';element.className='coordinate-marker';element.textContent=id;const point={id,...(reference?{reference}:{}),position:[((position[0]+180)%360+360)%360-180,position[1]],element,marker:new maplibregl.Marker({element}).setLngLat(position).addTo(map)};element.onclick=e=>{e.stopPropagation();selectPoint(point);};points.push(point);return point;}
function savePoints(){try{if(!storePoints(localStorage,points))status('ctStorageError',{},true);}catch{status('ctStorageError',{},true);}}
export function addPoint(position,reference){const point=createPoint(position,nextId,reference);selectPoint(point);savePoints();return point;}
map.on('click',event=>{if(event.originalEvent?.target.closest('.coordinate-marker'))return;addPoint([event.lngLat.lng,event.lngLat.lat]);status('ctReady');});
map.on('move',readout);
map.on('style.load',()=>{Promise.resolve(applyMapStyle(map,style,options)).catch(()=>status('ctMapError',{},true));});
map.on('error',()=>status('ctMapError',{},true));
styleSelect.onchange=()=>{style=styleSelect.value;setPreviewStyle(map,map.getCanvas(),style,options);credit();};
function inputFormat(){const value=format.value;for(const group of document.querySelectorAll('[data-format]')){group.hidden=group.dataset.format!==(value==='decimal'||value==='dms'?'geographic':value);for(const input of group.querySelectorAll('input,select'))input.disabled=group.hidden;}
 const dms=value==='dms';$('ctLat').placeholder=dms?'53° 40′ 12″ N':'53.670000';$('ctLon').placeholder=dms?'7° 55′ 12″ E':'7.920000';$('ctLat').inputMode=$('ctLon').inputMode=dms?'text':'decimal';$('ctExample').textContent=dms?'53° 40′ 12″ N · 7° 55′ 12″ E':t('ctPasteHint');}
format.onchange=inputFormat;
for(const id of ['ctLat','ctLon'])$(id).addEventListener('paste',event=>{
 if(format.value!=='decimal')return;
 try{const pair=parseDecimalPair(event.clipboardData.getData('text'));event.preventDefault();$('ctLat').value=pair.lat;$('ctLon').value=pair.lon;status('ctReady');}catch{/* A single value keeps normal paste behaviour. */}
});
form.onsubmit=event=>{event.preventDefault();try{const values=Object.fromEntries(new FormData(form));const position=parseCoordinate(format.value,values);const code=format.value==='mgrs'?values.code.toUpperCase().replace(/\s/g,''):null;const reference=code?code.replace(/^(\d{1,2}[A-Z])([A-Z]{2})(\d+)$/,(_,zone,square,digits)=>`${zone} ${square} ${digits.slice(0,digits.length/2)} ${digits.slice(digits.length/2)}`):undefined;addPoint(position,reference);if(map.getZoom()<13)map.setZoom(13);status('ctReady');}catch{status('ctInvalid',{},true);}};
$('ctAdd').onclick=()=>{const c=map.getCenter();addPoint([c.lng,c.lat]);status('ctReady');};
$('ctClear').onclick=()=>{for(const point of points)point.marker.remove();points.length=0;selected=null;savePoints();renderPoints();};
$('ctLocation').onclick=()=>{if(locating)return;if(!navigator.geolocation||!window.isSecureContext){status('ctLocationError',{},true);return;}locating=true;$('ctLocation').disabled=true;status('ctLocating');navigator.geolocation.getCurrentPosition(result=>{locating=false;$('ctLocation').disabled=false;addPoint([result.coords.longitude,result.coords.latitude]);map.setZoom(Math.max(map.getZoom(),15));status('ctLocated',{accuracy:Math.round(result.coords.accuracy)});},()=>{locating=false;$('ctLocation').disabled=false;status('ctLocationError',{},true);},{enableHighAccuracy:true,timeout:15000,maximumAge:60000});};
function language(){const previous=styleSelect.value;styleSelect.replaceChildren(...Object.entries(MAP_STYLES).map(([id,entry])=>{const option=document.createElement('option');option.value=id;option.textContent=t(entry.label);return option;}));styleSelect.value=previous||style;translatePage();inputFormat();readout();renderPoints();credit();}
installCoordinateGrid(map,$('ctStage'));
try{for(const point of readStoredPoints(localStorage))createPoint(point.position,point.id,point.reference);}catch{}
if(points.length)selectPoint(points.at(-1));
document.addEventListener('languagechange',language);language();status('ctReady');
for(const id of ['ctAdd','ctSubmit','ctLocation'])$(id).disabled=false;
new ResizeObserver(()=>map.resize()).observe($('ctStage'));
