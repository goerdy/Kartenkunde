import {exerciseSnapshot,createExerciseShare,readExerciseShare} from './exercise-share.js';
import {exportFileNames} from './export-names.js';
import {createPDFArchive} from './zip.js';
import {initExerciseUI} from './exercise-ui.js';
import {exerciseBounds,outsideExercisePoints} from './exercise.js';
import {exerciseTaskPageCount,createExerciseSolutionPDF,createExerciseLinkPDF} from './exercise-pdf.js';
import {contourInterval} from './contours.js';
import {gridSpacing} from './geo.js';
import {formatFarmError} from './farm-labels.js';
import {normalizeTKOptions} from './tk-features.js';
import {installWorldOverview,selectionRectangle} from './world-overview.js';
import {t,getLanguage,setLanguage} from './i18n.js';
import {L,maplibregl} from './vendor.js';
import {makePlan,sheetPolygon,sheetPlan,pdfPageNumber,zoneBoundarySegments} from './geo.js';
import {styleURL,applyMapStyle,setPreviewStyle,MAP_STYLES,isPQ5,isBasemap,isLGLN,lglnCredit,lglnIntersects} from './render.js';
import {createPDF} from './pdf.js';
import {boundaryAttributionHTML,initAdministrativeSelection,requiresPageConfirmation,automaticAreaTitle,resolveAdministrativeReference} from './admin.js';
const $=id=>document.getElementById(id);
let incomingExercise=null,incomingExerciseError;try{incomingExercise=await readExerciseShare(window.location.href);if(incomingExercise&&!Object.hasOwn(MAP_STYLES,incomingExercise.settings.style))throw Error(t('exerciseLinkInvalid'));if(incomingExercise?.language)setLanguage(incomingExercise.language);if(incomingExercise?.administrative){const resolved=await resolveAdministrativeReference(incomingExercise.administrative);incomingExercise.selection=resolved.bounds;incomingExercise.settings={...incomingExercise.settings,feature:resolved.area.feature,areaName:resolved.area.name,boundaryAttribution:resolved.area.attribution,boundarySelection:resolved.area.reference};}}catch(error){incomingExercise=null;incomingExerciseError=error.message;}
window.addEventListener('hashchange',()=>{if(/^#uebung=/.test(window.location.hash))window.location.reload();});
let selection=null,plan=null,orientation=false,drawing=false,firstCorner=null,rectangle=null,controller=null;
const pages=L.layerGroup(),handles=L.layerGroup(),boundaryLayer=L.layerGroup(),zoneLayer=L.layerGroup();
let exerciseUI=null;
let selectedArea=null,layoutCache=null,adminUI=null,worldOverview=null,lastFarmState=null;
const map=L.map('map',{worldCopyJump:false,maxBounds:[[-85,-180],[85,180]],minZoom:2,zoomControl:false}).setView([51.2,10.4],6);
// Leaflet owns all interaction, overlays and selection. MapLibre renders the OSM vector base.
const VectorLayer=L.Layer.extend({
 onAdd(leaflet){const pane=leaflet.getPane('tilePane');this.host=L.DomUtil.create('div','',pane);this.host.style.position='absolute';this.host.style.pointerEvents='none';this.host.style.width=`${leaflet.getSize().x}px`;this.host.style.height=`${leaflet.getSize().y}px`;this.gl=new maplibregl.Map({container:this.host,style:styleURL($('style').value,readTKOptions()),center:[leaflet.getCenter().lng,leaflet.getCenter().lat],zoom:leaflet.getZoom()-1,interactive:false,attributionControl:false,fadeDuration:0});this.gl.on('farmdata',event=>{lastFarmState={data:event};renderFarmStatus();});this.gl.on('farmwarning',event=>{lastFarmState={error:event.error};renderFarmStatus();if(!controller&&isPQ5($('style').value))setStatus(t('farmUnavailable'),true);});this.gl.on('idle',()=>{this.host.dataset.mapReady='true';});this.gl.on('dataloading',()=>{delete this.host.dataset.mapReady;});this.gl.on('error',()=>{if(!controller&&!worldOverview?.active)setStatus(t('mapUnavailable'),true);});this.gl.on('style.load',()=>this.relief());this.sync=()=>{this.host.style.display=worldOverview?.active?'none':'';if(worldOverview?.active)return;const size=leaflet.getSize();const pos=leaflet.containerPointToLayerPoint([0,0]);L.DomUtil.setPosition(this.host,pos);this.host.style.width=`${size.x}px`;this.host.style.height=`${size.y}px`;this.gl.resize();const c=leaflet.getCenter();this.gl.jumpTo({center:[c.lng,c.lat],zoom:leaflet.getZoom()-1});};leaflet.on('move zoom resize',this.sync);this.sync();},
 onRemove(leaflet){leaflet.off('move zoom resize',this.sync);this.gl.remove();this.host.remove();},
 relief(){Promise.resolve(applyMapStyle(this.gl,$('style').value,readTKOptions())).catch(error=>setStatus(error.message,true));this.host.style.filter=MAP_STYLES[$('style').value]?.monochrome?'grayscale(1)':'';}
});
const base=new VectorLayer().addTo(map);pages.addTo(map);handles.addTo(map);boundaryLayer.addTo(map);zoneLayer.addTo(map);
const osmAttribution=()=>`<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright">${t('osmAttribution')}</a>`;
function renderFarmStatus(){
 if(!isPQ5($('style').value)||!lastFarmState){$('farmStatus').hidden=true;return;}
 $('farmStatus').hidden=false;const {data,error}=lastFarmState;
 $('farmStatus').textContent=data?t('featuresLoaded',{count:data.count,symbols:data.symbols||0}):`${t('farmUnavailable')} ${formatFarmError(error)}`;
 $('farmStatus').title=data?data.names.join(' · '):'';
}

let currentMapAttribution='';
function updateMapCredit(){document.querySelector('[data-tk-option="farms"]')?.closest('label')?.toggleAttribute('hidden',isBasemap($('style').value));$('contoursControl').hidden=!isBasemap($('style').value);$('contourIntervalHint').textContent=t('contourIntervalHint',{interval:contourInterval(+$('scale').value).toLocaleString(getLanguage())});$('streetNamesControl').hidden=$('scale').value!=='5000'||!isPQ5($('style').value);$('tkOptions').hidden=!isPQ5($('style').value);if(!isPQ5($('style').value))$('farmStatus').hidden=true;if(currentMapAttribution)map.attributionControl.removeAttribution(currentMapAttribution);currentMapAttribution=isBasemap($('style').value)?`© GeoBasis-DE / <a href="https://www.bkg.bund.de/">BKG</a> (${new Date().getFullYear()}) · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · ${t('basemapChanges')} · ${osmAttribution()}`:isLGLN($('style').value)?`<a href="https://www.lgln.niedersachsen.de/">${lglnCredit()}</a> · <a href="https://creativecommons.org/licenses/by/4.0/">${t('licenseLabel')}</a>`:osmAttribution();map.attributionControl.addAttribution(currentMapAttribution);$('styleHint').textContent=t(isBasemap($('style').value)?'basemapHint':isPQ5($('style').value)?'pq5Hint':isLGLN($('style').value)?'lglnHint':$('style').value==='bright'?'reliefHint':'sourceHint');}
updateMapCredit();
const zoomControl=L.control.zoom({zoomInTitle:t('zoomIn'),zoomOutTitle:t('zoomOut')}).addTo(map);
for(const [selector,key]of [['.leaflet-control-zoom-in','zoomIn'],['.leaflet-control-zoom-out','zoomOut']]){const button=zoomControl.getContainer().querySelector(selector);button.dataset.i18nTitle=key;button.dataset.i18nLabel=key;button.setAttribute('aria-label',t(key));}
L.control.scale({imperial:false}).addTo(map);
worldOverview=installWorldOverview(L,map,{onChange:projection=>{
 base.host.style.display=projection==='equalEarth'?'none':'';if(projection==='mercator')base.sync();
 $('projectionBadge').textContent=t(projection==='equalEarth'?'projectionEqualEarth':'projectionMercator');$('projectionBadge').dataset.projection=projection;
 },onError:()=>setStatus(t('overviewUnavailable'),true)});

function setStatus(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function readTKOptions(){return {...normalizeTKOptions(Object.fromEntries([...document.querySelectorAll('[data-tk-option]')].map(input=>[input.dataset.tkOption,input.checked]))),scale:+$('scale').value,streetNames:$('streetNames').checked,contours:$('contours').checked};}
function options(){return {exercise:exerciseUI?.options,utmLabels:$('utmLabels').checked,dmsLabels:$('dmsLabels').checked,tkOptions:readTKOptions(),streetNames:$('streetNames').checked,contours:$('contours').checked,scale:+$('scale').value,paper:$('paper').value,landscape:orientation,style:$('style').value,overlap:+$('overlap').value,dpi:+$('dpi').value,title:$('title').value,notes:$('notes').value,feature:selectedArea?.feature,boundaryAttribution:selectedArea?.attribution,areaName:selectedArea?.name,boundarySelection:selectedArea?.reference};}
function store(){try{localStorage.setItem('utmref-settings-v1',JSON.stringify({selection,...options()}));}catch{/* Private mode and storage limits must not prevent export. */}}
function update(){
 exerciseUI?.invalidate();
 pages.clearLayers();zoneLayer.clearLayers();plan=null;$('export').disabled=true;$('pageCount').textContent='—';$('gridSize').textContent=gridSpacing(Number($('scale').value))>=1000?`${gridSpacing(Number($('scale').value))/1000} km`:`${gridSpacing(Number($('scale').value))} m`;
 const exercise=exerciseUI?.options,automatic=!!exercise?.fit;let effectiveSelection;try{effectiveSelection=automatic?exerciseBounds(exercise.points,Number($('scale').value)):selection;}catch(error){setStatus(error.message,true);store();return;}
 if(exerciseUI)exerciseUI.render(null);
 if(rectangle)rectangle.setStyle({opacity:automatic||selectedArea?0:1,fillOpacity:automatic||selectedArea?0:.04});
 if(automatic){handles.remove();boundaryLayer.remove();}else{if(!controller)handles.addTo(map);boundaryLayer.addTo(map);}
 if(!effectiveSelection){$('bounds').textContent=t('noArea');$('planInfo').textContent=t('chooseArea');return;}
 $('bounds').textContent=automatic?t('exerciseFit'):selectedArea?.name||t('rectangle');$('bounds').title=selectedArea?.attribution?`${selectedArea.attribution.source} · ${t('asOf')} ${selectedArea.attribution.year} · ${selectedArea.attribution.license}`:'';
 try{if(isLGLN($('style').value)&&!lglnIntersects(effectiveSelection))throw Error(t('lglnOutside'));const opts={...options(),...(automatic?{feature:undefined,boundaryAttribution:undefined,areaName:undefined}:{})},key=JSON.stringify([opts.scale,opts.paper,opts.landscape,opts.overlap]);if(!layoutCache||layoutCache.selection!==effectiveSelection||layoutCache.feature!==opts.feature||layoutCache.key!==key)layoutCache={selection:effectiveSelection,feature:opts.feature,key,plan:makePlan(effectiveSelection,opts)};plan={...layoutCache.plan,...opts,paper:layoutCache.plan.paper};
 for(const [a,b]of zoneBoundarySegments(effectiveSelection))L.polyline([[a[1],a[0]],[b[1],b[0]]],{color:'#2a4f6a',weight:1.5,dashArray:'7 4',interactive:false}).addTo(zoneLayer);
 const preview=plan.sheets.length<=300?plan.sheets:plan.sheets.filter((_,i)=>i%Math.ceil(plan.sheets.length/300)===0);
 for(const sheet of preview){const polygon=sheetPolygon(sheetPlan(plan,sheet),sheet).map(ll=>[ll[1],ll[0]]);const layer=L.polygon(polygon,{color:'#536b83',weight:1,dashArray:'5 4',fillOpacity:.015,interactive:false}).addTo(pages);if(plan.sheets.length<=300)layer.bindTooltip(String(pdfPageNumber(sheet)),{permanent:true,direction:'center',className:'page-label'});}
 $('pageCount').textContent=plan.sheets.length;$('planInfo').textContent=[plan.regional?t('blockCount',{count:plan.blocks.length}):t('layout',{cols:plan.cols,rows:plan.rows}),t('perSheet',{width:(plan.wm/1000).toLocaleString(getLanguage(),{minimumFractionDigits:2,maximumFractionDigits:2}),height:(plan.hm/1000).toLocaleString(getLanguage(),{minimumFractionDigits:2,maximumFractionDigits:2})}),...(exercise?[t('exerciseWorksheetCount',{count:exerciseTaskPageCount(plan)})]:[]),...(plan.zones.length>1?[t('multipleZones')]:[]),...(plan.sheets.length>300?[t('reducedPreview')]:[])].join(' · ');$('mapCaption').textContent=t('mapCaption',{count:plan.sheets.length,scale:plan.scale.toLocaleString(getLanguage())});const keyNote=document.querySelector('.key-note');if(keyNote)keyNote.textContent=t(plan.regional?'regionalNumbering':'numbering');const missing=exercise?outsideExercisePoints(plan,exercise.points):[];exerciseUI?.render(plan);$('export').disabled=!!controller||!!exercise&&(!exercise.points.length||missing.length>0);setStatus(exercise&&!exercise.points.length?t('exerciseNeedPoints'):missing.length?t('exerciseOutsideSummary',{points:missing.map(p=>p.name).join(', ')}):t('print100'),missing.length>0);
 }catch(e){$('planInfo').textContent=e.message;setStatus(e.message,true);$('mapCaption').textContent=t('adjustArea');}store();
}
let boundaryAttribution='';
function setSelection(b,area=null){map.attributionControl.removeAttribution(boundaryAttribution);boundaryAttribution=area?boundaryAttributionHTML(area.attribution):'';if(area)map.attributionControl.addAttribution(boundaryAttribution);selectedArea=area;boundaryLayer.clearLayers();if(area?.feature)L.geoJSON(area.feature,{style:{color:'#f2a66f',weight:2,fillOpacity:.06},interactive:false}).addTo(boundaryLayer);selection=b;if(rectangle)rectangle.setBounds([[b.s,b.w],[b.n,b.e]]);else rectangle=selectionRectangle(L,[[b.s,b.w],[b.n,b.e]],{color:'#f2a66f',weight:2,fillOpacity:.04,interactive:false}).addTo(map);if(area){handles.clearLayers();rectangle.setStyle({opacity:0,fillOpacity:0});}else{rectangle.setStyle({opacity:1,fillOpacity:.04});makeHandles();}update();}
function makeHandles(){handles.clearLayers();if(!selection)return;for(const [latKey,lonKey]of [['n','w'],['n','e'],['s','w'],['s','e']]){const marker=L.marker([selection[latKey],selection[lonKey]],{draggable:true,icon:L.divIcon({className:'corner',iconSize:[12,12],iconAnchor:[6,6]}),keyboard:true,title:t('moveCorner')}).addTo(handles);marker.on('drag',()=>{const ll=marker.getLatLng();const oppositeLat=latKey==='n'?selection.s:selection.n,oppositeLon=lonKey==='w'?selection.e:selection.w;rectangle.setBounds([[Math.min(ll.lat,oppositeLat),Math.min(ll.lng,oppositeLon)],[Math.max(ll.lat,oppositeLat),Math.max(ll.lng,oppositeLon)]]);});marker.on('dragend',()=>{const b=rectangle.getBounds();setSelection({s:b.getSouth(),n:b.getNorth(),w:b.getWest(),e:b.getEast()});});}}
function stopDraw(){drawing=false;firstCorner=null;$('draw').classList.remove('active');$('draw').textContent=t('draw');$('drawHint').textContent=t('drawHint');map.getContainer().classList.remove('drawing');if(selection){rectangle?.setBounds([[selection.s,selection.w],[selection.n,selection.e]]);if(selectedArea)rectangle?.setStyle({opacity:0,fillOpacity:0});}else if(rectangle){rectangle.remove();rectangle=null;}handles.addTo(map);}
$('draw').onclick=()=>{exerciseUI?.stopPick();if(exerciseUI?.state.fit){$('exerciseAreaMode').value='manual';$('exerciseAreaMode').dispatchEvent(new Event('change'));}if(drawing){stopDraw();return;}adminUI?.reset();drawing=true;firstCorner=null;handles.remove();if(rectangle)rectangle.setStyle({opacity:1,fillOpacity:.04});$('draw').classList.add('active');$('draw').textContent=t('cancelDraw');$('drawHint').textContent=t('firstCorner');map.getContainer().classList.add('drawing');};
map.on('click',e=>{if(exerciseUI?.handleMapClick(e))return;if(!drawing||!worldOverview.allows(e.latlng,e.containerPoint))return;if(!firstCorner){firstCorner=e.latlng;$('drawHint').textContent=t('secondCorner');return;}const b=L.latLngBounds(firstCorner,e.latlng);stopDraw();setSelection({s:b.getSouth(),n:b.getNorth(),w:b.getWest(),e:b.getEast()});});
map.on('mousemove',e=>{if(!drawing||!firstCorner||!worldOverview.allows(e.latlng,e.containerPoint))return;const b=L.latLngBounds(firstCorner,e.latlng);if(rectangle)rectangle.setBounds(b);else rectangle=selectionRectangle(L,b,{color:'#f2a66f',weight:2,fillOpacity:.04,interactive:false}).addTo(map);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(drawing)stopDraw();exerciseUI?.stopPick();}});
for(const id of ['paper','overlap','dpi','title','notes'])$(id).addEventListener('change',update);
$('scale').addEventListener('change',()=>{exerciseUI?.syncScale();updateMapCredit();setPreviewStyle(base.gl,base.host,$('style').value,readTKOptions());update();});
for(const id of ['utmLabels','dmsLabels'])$(id).addEventListener('change',update);
$('contours').addEventListener('change',()=>{setPreviewStyle(base.gl,base.host,$('style').value,readTKOptions());update();});
$('streetNames').addEventListener('change',()=>{setPreviewStyle(base.gl,base.host,$('style').value,readTKOptions());update();});
for(const input of document.querySelectorAll('[data-tk-option]'))input.addEventListener('change',()=>{setPreviewStyle(base.gl,base.host,$('style').value,readTKOptions());update();});
let reliefAttribution='';
function updateReliefCredit(){if(reliefAttribution)map.attributionControl.removeAttribution(reliefAttribution);reliefAttribution=`${t('reliefLabel')}: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen / AWS Terrain Tiles</a>`;if($('style').value==='bright')map.attributionControl.addAttribution(reliefAttribution);}
$('style').onchange=()=>{updateReliefCredit();setPreviewStyle(base.gl,base.host,$('style').value,readTKOptions());updateMapCredit();update();};
function orient(landscape){orientation=landscape;$('portrait').setAttribute('aria-pressed',String(!landscape));$('landscape').setAttribute('aria-pressed',String(landscape));update();}
$('portrait').onclick=()=>orient(false);$('landscape').onclick=()=>orient(true);
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=$('understood').onclick=()=>$('helpDialog').close();
$('cancel').onclick=()=>controller?.abort();
$('export').onclick=async()=>{
 if(!plan||controller)return;stopDraw();exerciseUI?.stopPick();let exportPlan;try{exportPlan={...plan,...options(),paper:plan.paper,...(exerciseUI?.options?.fit?{feature:undefined,boundaryAttribution:undefined}:{})};if(exportPlan.exercise){if(!exportPlan.exercise.points.length)throw Error(t('exerciseNeedPoints'));const missing=outsideExercisePoints(exportPlan,exportPlan.exercise.points);if(missing.length)throw Error(t('exerciseOutsideSummary',{points:missing.map(p=>p.name).join(', ')}));}}catch(e){setStatus(e.message,true);return;}
 const totalPages=exportPlan.sheets.length+1+exerciseTaskPageCount(exportPlan);
 if(totalPages>20&&!window.confirm(t(exportPlan.exercise?'confirmExercisePages':'confirmPages',{total:totalPages,maps:exportPlan.sheets.length,tasks:exerciseTaskPageCount(exportPlan)})))return;
 controller=new AbortController();$('language').disabled=true;$('export').disabled=true;$('cancel').hidden=false;$('progress').hidden=false;
 const controls=[...document.querySelectorAll('aside input,aside select,aside textarea,aside button')].filter(el=>el.id!=='cancel');controls.forEach(el=>el.disabled=true);map.dragging.disable();handles.remove();
 try{const shared=exportPlan.exercise?await createExerciseShare(exerciseSnapshot(options(),selection,getLanguage(),{center:[map.getCenter().lat,map.getCenter().lng],zoom:map.getZoom()}),{signal:controller.signal}):null;const pdf=await createPDF(exportPlan,{signal:controller.signal,onProgress:(done,total,message)=>{$('progress').max=total;$('progress').value=done;setStatus(message);}});if(controller.signal.aborted)return;const names=exportFileNames(exportPlan);let solution;if(exportPlan.exercise){setStatus(t('exerciseSolutionLoading'));solution=await createExerciseSolutionPDF(exportPlan,{signal:controller.signal});if(controller.signal.aborted)return;}if(solution){const linkPDF=createExerciseLinkPDF(exportPlan,shared.url),archive=createPDFArchive([{name:names.link,data:linkPDF.output('arraybuffer')},{name:names.exercise,data:pdf.output('arraybuffer')},{name:names.solution,data:solution.output('arraybuffer')}]);exerciseUI.downloadArchive(archive,names.zip);}else pdf.save(names.atlas);setStatus(pdf.exportWarnings?.length?`${t('created')} ${pdf.exportWarnings.join(' ')}`:t('created'));}
 catch(e){setStatus(e.name==='AbortError'?t('cancelled'):e.message,e.name!=='AbortError');}
 finally{controller=null;$('language').disabled=false;controls.forEach(el=>el.disabled=false);document.querySelectorAll('#adminLevels select').forEach(el=>el.disabled=false);$('cancel').hidden=true;$('progress').hidden=true;map.dragging.enable();handles.addTo(map);exerciseUI?.render(plan);$('export').disabled=!plan||!!plan.exercise&&(!plan.exercise.points.length||outsideExercisePoints(plan,plan.exercise.points).length>0);}
};
try{const saved=incomingExercise?{...incomingExercise.settings,selection:incomingExercise.selection}:JSON.parse(localStorage.getItem('utmref-settings-v1')||'null');if(saved){$('utmLabels').checked=saved.utmLabels!==false;$('dmsLabels').checked=saved.dmsLabels!==false;if(saved.paper==='A5')saved.paper='A4';$('contours').checked=saved.contours!==false;$('streetNames').checked=saved.streetNames!==false;const tkSaved=normalizeTKOptions(saved.tkOptions);for(const input of document.querySelectorAll('[data-tk-option]'))input.checked=tkSaved[input.dataset.tkOption];for(const id of ['scale','paper','style','overlap','dpi','title','notes'])if(saved[id]!==undefined)$(id).value=id==='style'&&saved[id]==='pq4tk'?'pq5tk':id==='title'&&['Mein Kartenatlas','UTMREF-MAP','UMTFREF-MAP','PQ5-UTMREF-MAP'].includes(saved[id])?'KARTENKUNDE.app':saved[id];orientation=!!saved.landscape;$('portrait').setAttribute('aria-pressed',String(!orientation));$('landscape').setAttribute('aria-pressed',String(orientation));if(saved.selection){setSelection(saved.selection,saved.feature?{feature:saved.feature,name:saved.areaName,attribution:saved.boundaryAttribution,reference:saved.boundarySelection}:null);map.fitBounds([[selection.s,selection.w],[selection.n,selection.e]],{padding:[50,50]});}updateReliefCredit();setPreviewStyle(base.gl,base.host,$('style').value,readTKOptions());}}catch{/* Ignore old or invalid stored settings. */}
exerciseUI=initExerciseUI({map,L,initial:incomingExercise?.exercise,onChange:update,onModeChange:()=>{stopDraw();updateMapCredit();setPreviewStyle(base.gl,base.host,$('style').value,readTKOptions());},onStartPick:stopDraw,allows:e=>worldOverview.allows(e.latlng,e.containerPoint)});
update();updateMapCredit();
const sharedView=incomingExercise?.view;if(sharedView&&Array.isArray(sharedView.center)&&sharedView.center.length===2&&sharedView.center.every(Number.isFinite)&&Math.abs(sharedView.center[0])<85&&Math.abs(sharedView.center[1])<=180&&Number.isFinite(sharedView.zoom))map.setView(sharedView.center,Math.max(2,Math.min(18,sharedView.zoom)));
if(incomingExerciseError)setStatus(incomingExerciseError,true);else if(incomingExercise)setStatus(t('exerciseLinkLoaded'));
// Named exports keep the real PDF path testable with synthetic map pixels, without network requests.
export {map,setSelection,options,exerciseUI};

adminUI=initAdministrativeSelection({countrySelect:$('country'),levelsHost:$('adminLevels'),status:$('adminStatus'),isExporting:()=>!!controller,
 apply:(bounds,area)=>{if(exerciseUI?.state.fit){$('exerciseAreaMode').value='manual';$('exerciseAreaMode').dispatchEvent(new Event('change'));}stopDraw();$('title').value=automaticAreaTitle($('title').value,selectedArea,area);setSelection(bounds,area);map.fitBounds([[bounds.s,bounds.w],[bounds.n,bounds.e]],{padding:[40,40]});},
 clear:()=>{map.attributionControl.removeAttribution(boundaryAttribution);selectedArea=null;selection=null;layoutCache=null;pages.clearLayers();handles.clearLayers();boundaryLayer.clearLayers();if(rectangle){rectangle.remove();rectangle=null;}update();store();}
});

document.addEventListener('languagechange',()=>{
 update();exerciseUI?.render(plan);updateMapCredit();updateReliefCredit();renderFarmStatus();$('projectionBadge').textContent=t(worldOverview.active?'projectionEqualEarth':'projectionMercator');
 if(drawing){$('draw').textContent=t('cancelDraw');$('drawHint').textContent=t(firstCorner?'secondCorner':'firstCorner');}
});
