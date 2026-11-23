import {t,getLanguage} from './i18n.js';
import {countryCodes} from './countries.js';
import {featureBounds,isChildFeature,normalizeAdministrativeFeature} from './area-geometry.js';
const API='https://www.geoboundaries.org/api/current/gbOpen';
export function countryName(meta){const code=countryCodes[meta.boundaryISO];return code?new Intl.DisplayNames([getLanguage()],{type:'region'}).of(code):meta.boundaryName;}
export function administrativeLevels(records,iso){return records.filter(r=>/^ADM[1-5]$/.test(r.boundaryType)&&!(iso==='DEU'&&r.boundaryType==='ADM2')).sort((a,b)=>a.boundaryType.localeCompare(b.boundaryType));}
export function levelName(meta,iso){const de={ADM1:'state',ADM3:'county',ADM4:'municipality',ADM5:'district'};if(iso==='DEU'&&de[meta.boundaryType])return t(de[meta.boundaryType]);const label=meta.boundaryCanonical;const units={state:'unitStates',states:'unitStates',province:'unitProvinces',provinces:'unitProvinces',county:'unitCounties',counties:'unitCounties',district:'unitDistricts',districts:'unitDistricts',region:'unitRegions',regions:'unitRegions',department:'unitDepartments',departments:'unitDepartments','départements':'unitDepartments',municipalities:'unitMunicipalities',municipality:'unitMunicipalities',communes:'unitMunicipalities',prefectures:'unitPrefectures'};if(label&&units[label.toLowerCase()])return t(units[label.toLowerCase()]);return label&&label!=='Unknown'&&label!=='nan'?label:t('adminLevel',{level:meta.boundaryType.slice(3)});}
export function areaName(feature){return feature.properties?.shapeName||feature.properties?.name||feature.properties?.shapeID||t('genericArea');}
export function boundaryRawURL(url){return url.replace(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/(?:refs\/heads\/)?/,'https://raw.githubusercontent.com/$1/$2/').replace(/^https:\/\/media\.githubusercontent\.com\/media\//,'https://raw.githubusercontent.com/');}
export function boundaryMediaURL(url){return boundaryRawURL(url).replace(/^https:\/\/raw\.githubusercontent\.com\//,'https://media.githubusercontent.com/media/');}
export function countryOptions(countries){const sorted=[...countries].sort((a,b)=>countryName(a).localeCompare(countryName(b),getLanguage()));const germany=sorted.find(m=>m.boundaryISO==='DEU');return germany?[germany,...sorted]:sorted;}
export const BKG_BOUNDARY_API='https://sgx.geodatenzentrum.de/wfs_vg250';
const BKG_LEVELS={ADM0:'sta',ADM1:'lan',ADM3:'krs',ADM4:'gem'};
export function bkgBoundaryMetadata(){return Object.keys(BKG_LEVELS).map(boundaryType=>({boundaryISO:'DEU',boundaryName:'Germany',boundaryType,provider:'bkg',boundarySource:`© BKG (${new Date().getFullYear()}) · VG250`,boundaryLicense:'dl-de/by-2-0',boundaryYearRepresented:t('boundaryUnknownDate')}));}
export function boundarySourceAttribution(meta){return {name:meta.provider==='bkg'?'BKG VG250':'geoBoundaries',source:meta.boundarySource,license:meta.boundaryLicense,year:meta.boundaryYearRepresented,url:meta.provider==='bkg'?'https://www.bkg.bund.de':'https://www.geoboundaries.org/',...(meta.provider==='bkg'?{licenseURL:'https://www.govdata.de/dl-de/by-2-0',sourcesURL:'https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf'}:{})};}
export function boundaryAttributionHTML(attribution){return attribution?.name==='BKG VG250'?`© <a href="https://www.bkg.bund.de">BKG</a> (${new Date().getFullYear()}) · <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a> · <a href="https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf">VG250</a>`:'<a href="https://www.geoboundaries.org/">geoBoundaries</a>';}
export function isAdministrativeChild(feature,parent){
 const prefix=parent?.properties?.bkgAGS,code=feature.properties?.bkgAGS;
 return prefix&&code?code.startsWith(prefix):isChildFeature(feature,parent);
}
// Merge land/water parts by official administrative code, retaining islands and holes.
export function normalizeBKGBoundaries(features,meta){
 const groups=new Map();
 for(const feature of features){const p=feature.properties||{},raw=String(p.ags??''),length={ADM0:0,ADM1:2,ADM3:5,ADM4:8}[meta.boundaryType];
 if(!/^\d{2,8}$/.test(raw)||!p.gen||!['Polygon','MultiPolygon'].includes(feature.geometry?.type))continue;
 const code=raw.slice(0,length),key=code||'DEU',polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 if(!groups.has(key))groups.set(key,{type:'Feature',id:key,properties:{shapeID:key,shapeName:p.gen,bkgAGS:code,_boundaryAttribution:boundarySourceAttribution(meta)},geometry:{type:'MultiPolygon',coordinates:[]}});
 groups.get(key).geometry.coordinates.push(...polygons);
 }
 return [...groups.values()].map(normalizeAdministrativeFeature);
}
async function boundedBoundaryText(response){
 const limit=32*1024*1024;if(Number(response.headers?.get?.('content-length'))>limit)throw Error(t('boundaryUnavailable'));
 if(!response.body?.getReader){const text=await response.text();if(new TextEncoder().encode(text).length>limit)throw Error(t('boundaryUnavailable'));return text;}
 const reader=response.body.getReader(),decoder=new TextDecoder(),parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error(t('boundaryUnavailable'));parts.push(decoder.decode(value,{stream:true}));}parts.push(decoder.decode());return parts.join('');}finally{await reader.cancel().catch(()=>{});}
}
export class BoundaryClient{
 constructor(fetcher=globalThis.fetch?.bind(globalThis)){this.fetcher=fetcher;this.cache=new Map();this.usingGeoGermany=false;}
 async json(url,signal,visited=new Set()){
 if(this.cache.has(url))return this.cache.get(url);if(visited.has(url))throw Error(t('lfsPointer'));visited.add(url);
 const timeout=AbortSignal.timeout(45000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
 let response;try{response=await this.fetcher(url,{signal:combined,headers:{Accept:'application/geo+json,application/json,text/plain;q=0.9'}});}catch(e){if(signal?.aborted||e.name==='AbortError')throw e;throw Error(t('boundaryUnavailable'));}
 if(!response.ok)throw Error(t('httpBoundary',{status:response.status}));
 let result;
 if(response.text){const body=(await boundedBoundaryText(response)).replace(/^\uFEFF/,'').trim();if(body.startsWith('version https://git-lfs.github.com/spec/')){const media=boundaryMediaURL(url);if(media===url)throw Error(t('lfsPointer'));result=await this.json(media,signal,visited);}else{try{result=JSON.parse(body);}catch{throw Error(t('invalidJSON'));}}}
 else{try{result=await response.json();}catch{throw Error(t('invalidJSON'));}}
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');if(this.cache.size>=32)this.cache.delete(this.cache.keys().next().value);this.cache.set(url,result);return result;
 }

 async countries(signal){const all=await this.json(`${API}/ALL/ADM0/`,signal);if(!Array.isArray(all))throw Error(t('invalidCountries'));return all.filter(m=>m.boundaryISO).sort((a,b)=>countryName(a).localeCompare(countryName(b),getLanguage()));}
 async metadata(iso,signal){if(iso==='DEU'&&!this.usingGeoGermany)return bkgBoundaryMetadata();return this.geoMetadata(iso,signal);}
 async geoMetadata(iso,signal){const data=await this.json(`${API}/${encodeURIComponent(iso)}/ALL/`,signal);return Array.isArray(data)?data:[data];}
 async bkgFeatures(meta,signal,parent){
 const type=BKG_LEVELS[meta.boundaryType];if(!type)throw Error(t('noBoundaryLink'));
 const prefix=parent?.properties?.bkgAGS||'';if(!/^\d{0,8}$/.test(prefix))throw Error(t('invalidJSON'));
 const features=[];let matched=Infinity;
 for(let start=0;start<matched;start+=500){
 const params=new URLSearchParams({service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:`vg250:vg250_${type}`,outputFormat:'application/json',srsName:'EPSG:4326',count:'500',startIndex:String(start)});
 if(prefix)params.set('CQL_FILTER',`ags LIKE '${prefix}%'`);
 const data=await this.json(`${BKG_BOUNDARY_API}?${params}`,signal);
 if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error(t('invalidJSON'));
 features.push(...data.features);matched=Number(data.numberMatched??data.totalFeatures);
 if(!Number.isFinite(matched)||matched>50000||(!data.features.length&&features.length<matched))throw Error(t('invalidJSON'));
 if(data.features.length<500&&features.length<matched)throw Error(t('invalidJSON'));
 }
 const normalized=normalizeBKGBoundaries(features,meta);if(!normalized.length)throw Error(t('emptyCountry'));return normalized;
 }
 async features(meta,signal,parent){
 if(meta.provider!=='bkg')return this.geoFeatures(meta,signal);
 if(!this.usingGeoGermany){try{return await this.bkgFeatures(meta,signal,parent);}catch(error){if(signal?.aborted||error.name==='AbortError')throw error;this.usingGeoGermany=true;}}
 const fallback=(await this.geoMetadata('DEU',signal)).find(m=>m.boundaryType===meta.boundaryType);
 return fallback?(await this.geoFeatures(fallback,signal)).map(f=>({...f,properties:{...f.properties,_boundaryAttribution:boundarySourceAttribution(fallback)}})):[];
 }
 async geoFeatures(meta,signal){
 const links=[meta.simplifiedGeometryGeoJSON,meta.gjDownloadURL].filter(Boolean);if(!links.length)throw Error(t('noBoundaryLink'));
 let lastError;
 const candidates=[...new Set(links.flatMap(url=>[boundaryMediaURL(url),boundaryRawURL(url),url]))];
 for(const url of candidates){try{const data=await this.json(url,signal);const features=data.type==='FeatureCollection'?data.features:data.type==='Feature'?[data]:null;if(!Array.isArray(features))throw Error(t('invalidJSON'));const polygons=features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)).map(normalizeAdministrativeFeature);if(!polygons.length)throw Error(t('emptyCountry'));return polygons;}catch(e){if(signal?.aborted||e.name==='AbortError')throw e;lastError=e;}}
 throw lastError||Error(t('boundaryUnavailable'));
 }

}
export function initAdministrativeSelection({countrySelect,levelsHost,status,apply,clear,isExporting=()=>false,client=new BoundaryClient()}){
 let epoch=0,request=null,countryMeta=[],currentISO='',selections=[],countryList=[];
 const begin=()=>{request?.abort();request=new AbortController();return {id:++epoch,signal:request.signal};};
 const current=id=>id===epoch;
 const clearLevels=depth=>{for(const node of [...levelsHost.children])if(+node.dataset.depth>=depth)node.remove();selections=selections.slice(0,depth);};
 const showError=(e,id)=>{if(current(id)&&e.name!=='AbortError')status.textContent=`${e.message} ${t('rectangleAvailable')}`;};
 const attribution=(feature,meta)=>feature.properties?._boundaryAttribution||boundarySourceAttribution(meta);
 const fallbackNotice=()=>currentISO==='DEU'&&client.usingGeoGermany?` ${t('germanyBoundaryFallback')}`:'';
 const applyFeature=(feature,meta,label)=>{const index=selections.findIndex(s=>s.feature===feature),path=selections.slice(0,index+1).map(s=>({level:s.meta.boundaryType,id:String(s.feature.properties?.bkgAGS||s.feature.properties?.shapeID||s.feature.id||''),name:s.name}));apply(featureBounds(feature),{feature,name:label,attribution:attribution(feature,meta),reference:{iso:currentISO,path}});};
 async function nextLevel(depth,parent,signal,id){
 const levels=administrativeLevels(countryMeta,currentISO);if(depth>=levels.length){if(current(id))status.textContent=t('noLevels')+fallbackNotice();return;}
 const meta=levels[depth];status.textContent=t('levelLoading',{level:levelName(meta,currentISO)});
 const all=await client.features(meta,signal,parent);if(!current(id))return;
 const children=all.filter(f=>isAdministrativeChild(f,parent)).sort((a,b)=>areaName(a).localeCompare(areaName(b),getLanguage()));
 if(!children.length){status.textContent=(currentISO==='DEU'&&client.usingGeoGermany&&meta.boundaryType==='ADM4'?t('germanyMunicipalitiesUnavailable'):t('noChildren'))+fallbackNotice();return;}
 const field=document.createElement('div');field.dataset.depth=depth;const label=document.createElement('label');const select=document.createElement('select');select.id=`admin-level-${depth}`;label.htmlFor=select.id;label.textContent=levelName(meta,currentISO);select.add(new Option(t('wholeParent'),''));children.forEach((f,i)=>select.add(new Option(areaName(f),String(i))));select.disabled=isExporting();field.append(label,select);levelsHost.append(field);status.textContent=t('wholeSelected')+fallbackNotice();
 select.onchange=async()=>{if(isExporting())return;const task=begin();clearLevels(depth+1);if(select.value===''){const previous=depth===0?selections[0]:selections[depth];if(previous)applyFeature(previous.feature,previous.meta,previous.name);status.textContent=t('wholeSelected')+fallbackNotice();return;}
 const feature=children[+select.value],name=areaName(feature);selections[depth+1]={feature,meta,name};applyFeature(feature,meta,name);try{await nextLevel(depth+1,feature,task.signal,task.id);}catch(e){showError(e,task.id);}};
 }
 countrySelect.onchange=async()=>{if(isExporting())return;const task=begin();clearLevels(0);countryMeta=[];currentISO=countrySelect.value;clear();if(!currentISO){status.textContent=t('countryOrDraw');return;}countrySelect.disabled=true;status.textContent=t('countryLoading');try{
 countryMeta=await client.metadata(currentISO,task.signal);const meta=countryMeta.find(m=>m.boundaryType==='ADM0');if(!meta)throw Error(t('noCountryBoundary'));const features=await client.features(meta,task.signal);if(!features.length)throw Error(t('emptyCountry'));if(!current(task.id))return;
 const feature={type:'Feature',properties:{...features[0].properties,shapeName:countrySelect.selectedOptions[0].textContent},geometry:{type:'MultiPolygon',coordinates:features.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates)}};const name=countrySelect.selectedOptions[0].textContent;selections[0]={feature,meta,name};applyFeature(feature,meta,name);await nextLevel(0,feature,task.signal,task.id);
 }catch(e){showError(e,task.id);}finally{if(current(task.id))countrySelect.disabled=false;}};
 async function loadCountries(){const task=begin();countrySelect.disabled=true;status.textContent=t('countriesLoading');try{const countries=await client.countries(task.signal);if(!current(task.id))return;countrySelect.replaceChildren(new Option(t('chooseCountry'),''));countryList=countries;for(const meta of countryOptions(countries))countrySelect.add(new Option(countryName(meta),meta.boundaryISO));countrySelect.disabled=false;status.textContent=t('countryOrDraw');}catch(e){showError(e,task.id);if(current(task.id)){countryList=[{boundaryISO:'DEU',boundaryName:'Germany'}];countrySelect.replaceChildren(new Option(t('chooseCountry'),''),new Option(countryName(countryList[0]),'DEU'));countrySelect.disabled=false;status.textContent=`${e.message} ${t('germanyStillAvailable')}`;const retry=document.createElement('button');retry.type='button';retry.className='quiet';retry.dataset.i18n='retryCountries';retry.textContent=t('retryCountries');retry.onclick=()=>{retry.remove();loadCountries();};levelsHost.append(retry);}}}
 if(globalThis.document?.addEventListener)document.addEventListener('languagechange',()=>{
 const iso=countrySelect.value;if(countryList.length){countrySelect.replaceChildren(new Option(t('chooseCountry'),''));for(const meta of countryOptions(countryList))countrySelect.add(new Option(countryName(meta),meta.boundaryISO));countrySelect.value=iso;}
 for(const node of levelsHost.children){if(node.dataset.depth===undefined)continue;const meta=administrativeLevels(countryMeta,currentISO)[+node.dataset.depth];if(meta){node.querySelector('label').textContent=levelName(meta,currentISO);node.querySelector('select').options[0].textContent=t('wholeParent');}}
 if(selections[0]&&iso){selections[0].name=countryName({boundaryISO:iso,boundaryName:selections[0].name});const deepest=selections.at(-1);if(deepest)applyFeature(deepest.feature,deepest.meta,deepest.name);}
 status.textContent=t('countryOrDraw');
 });
 loadCountries();
 return {reset(){if(countrySelect.options.length<=1)return;begin();countrySelect.value='';countrySelect.disabled=false;clearLevels(0);status.textContent=t('countryOrDraw');}};
}
export function requiresPageConfirmation(mapPages){return mapPages+1>20;}

export function automaticAreaTitle(currentTitle,previousArea,nextArea){return !previousArea||previousArea.feature!==nextArea.feature||currentTitle===previousArea.name?nextArea.name:currentTitle;}

// Compact identity for previously saved areas; geometry never goes into shared links.
export function administrativeReference(feature){
 const p=feature?.properties||{},code=p.bkgAGS;
 if(typeof code==='string'){const level={0:'ADM0',2:'ADM1',5:'ADM3',8:'ADM4'}[code.length];if(level)return {iso:'DEU',path:[{level,id:code||'DEU',name:areaName(feature)}]};}
 if(/^[A-Z]{3}$/.test(p.shapeGroup||'')&&/^ADM[0-5]$/.test(p.shapeType||''))return {iso:p.shapeGroup,path:[{level:p.shapeType,id:String(p.shapeID||feature.id||''),name:areaName(feature)}]};
 return null;
}
export async function resolveAdministrativeReference(reference,{client=new BoundaryClient(),signal}={}){
 const metadata=await client.metadata(reference.iso,signal);let parent=null,lastMeta;
 for(const item of reference.path){
 const meta=metadata.find(m=>m.boundaryType===item.level);if(!meta)throw Error(t('exerciseAreaUnavailable'));
 const all=await client.features(meta,signal,parent);if(item.level==='ADM0'){
 if(!all.length)throw Error(t('exerciseAreaUnavailable'));parent={type:'Feature',properties:{...all[0].properties,shapeName:item.name},geometry:{type:'MultiPolygon',coordinates:all.flatMap(f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates)}};
 }else{const eligible=parent?all.filter(f=>isAdministrativeChild(f,parent)):all;const exact=eligible.filter(f=>String(f.properties?.bkgAGS||f.properties?.shapeID||f.id||'')===item.id),matches=exact.length?exact:eligible.filter(f=>areaName(f)===item.name);if(matches.length!==1)throw Error(t('exerciseAreaUnavailable'));parent=matches[0];}
 lastMeta=meta;
 }
 if(!parent)throw Error(t('exerciseAreaUnavailable'));return {bounds:featureBounds(parent),area:{feature:parent,name:reference.path.at(-1).name,attribution:parent.properties?._boundaryAttribution||boundarySourceAttribution(lastMeta),reference}};
}
