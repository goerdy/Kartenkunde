import {setLanguage} from '../src/i18n.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {administrativeLevels,levelName,requiresPageConfirmation,BoundaryClient,countryName,initAdministrativeSelection,boundaryMediaURL,countryOptions,automaticAreaTitle} from '../src/admin.js';
import {inFeature,interiorPoint,isChildFeature,clipRingToBox,featureBounds,polygonIntersectsBox,normalizeAdministrativeFeature} from '../src/area-geometry.js';
setLanguage('de');
const rect=(name,w,s,e,n)=>({type:'Feature',properties:{shapeName:name},geometry:{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}});
const metadata=[{boundaryISO:'DEU',boundaryType:'ADM0',boundaryName:'Germany'},{boundaryType:'ADM1',boundaryCanonical:'Länder'},{boundaryType:'ADM2',boundaryCanonical:'Government District'},{boundaryType:'ADM3',boundaryCanonical:'Independent City or District'}];
test('German hierarchy is Bundesland then Landkreis; other countries retain their available levels',()=>{assert.deepEqual(administrativeLevels(metadata,'DEU').map(m=>m.boundaryType),['ADM1','ADM3']);assert.equal(levelName(metadata[1],'DEU'),'Bundesland');assert.equal(levelName(metadata[3],'DEU'),'Landkreis / kreisfreie Stadt');assert.deepEqual(administrativeLevels(metadata,'FRA').map(m=>m.boundaryType),['ADM1','ADM2','ADM3']);assert.equal(levelName({boundaryType:'ADM1',boundaryCanonical:'States'},'USA'),'Bundesstaat');assert.equal(countryName(metadata[0]),'Deutschland');});
test('More than 20 PDF pages require confirmation, including the cover',()=>{assert.equal(requiresPageConfirmation(18),false);assert.equal(requiresPageConfirmation(19),false);assert.equal(requiresPageConfirmation(20),true);assert.equal(requiresPageConfirmation(24),true);assert.equal(requiresPageConfirmation(3000),true);});
test('Child filtering handles concave boundaries and holes',()=>{const parent=rect('Parent',0,0,10,10);parent.geometry.coordinates.push([[4,4],[6,4],[6,6],[4,6],[4,4]]);assert.ok(isChildFeature(rect('Inside',1,1,2,2),parent));assert.equal(isChildFeature(rect('Hole',4.5,4.5,5.5,5.5),parent),false);assert.equal(isChildFeature(rect('Outside',11,1,12,2),parent),false);const concave={type:'Polygon',coordinates:[[[0,0],[6,0],[6,1],[1,1],[1,6],[0,6],[0,0]]]};assert.ok(inFeature(interiorPoint(concave.coordinates),concave));assert.deepEqual(featureBounds(parent),{w:0,e:10,s:0,n:10});});
test('Polygon clipping and sheet intersection preserve small islands and reject holes',()=>{const ring=rect('',0,0,10,10).geometry.coordinates[0];assert.ok(clipRingToBox(ring,{w:2,e:4,s:2,n:4}).length>=4);assert.equal(clipRingToBox(ring,{w:11,e:12,s:2,n:3}).length,0);const poly=[ring,rect('',3,3,7,7).geometry.coordinates[0]];assert.equal(polygonIntersectsBox(poly,{w:4,e:6,s:4,n:6}),false);assert.equal(polygonIntersectsBox(poly,{w:1,e:2,s:1,n:2}),true);assert.equal(polygonIntersectsBox(poly,{w:-5,e:15,s:-5,n:15}),true);});
test('Boundary client caches requests, uses browser-readable raw geometry and reports HTTP errors',async()=>{const requests=[];const client=new BoundaryClient(async url=>{requests.push(url);return {ok:true,json:async()=>url.includes('/ALL/ADM0/')?[metadata[0]]:{type:'FeatureCollection',features:[rect('A',0,0,1,1)]}};});assert.equal((await client.countries())[0].boundaryISO,'DEU');await client.countries();assert.equal(requests.length,1);const features=await client.features({gjDownloadURL:'https://github.com/wmgeolab/geoBoundaries/raw/abc/area.geojson'});assert.equal(features.length,1);assert.equal(requests[1],'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/abc/area.geojson');const bad=new BoundaryClient(async()=>({ok:false,status:503}));await assert.rejects(()=>bad.countries(),/503/);});
// Small DOM fixture for the cascading selector's actual async event handlers.
class Node{constructor(){this.children=[];this.dataset={};this.options=[];this.value='';this.disabled=false;this.textContent='';}append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}add(option){this.options.push(option);}replaceChildren(...nodes){this.children=[];this.options=[];for(const n of nodes){if(n.option)this.add(n);else this.append(n);}}remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}get selectedOptions(){return this.options.filter(o=>o.value===this.value);}}
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
test('Selecting only a country applies the whole country; refining filters descendants and clearing restores the parent',async()=>{
 const previousDocument=globalThis.document,previousOption=globalThis.Option;
 globalThis.document={createElement:()=>new Node()};globalThis.Option=class{constructor(text,value){this.textContent=text;this.value=value;this.option=true;}};
 try{
 const country=new Node(),host=new Node(),status=new Node(),applied=[];
 const full=rect('Country',0,0,10,10),west=rect('West',0,0,5,10),east=rect('East',5,0,10,10),westCounty=rect('West County',1,1,2,2),eastCounty=rect('East County',6,1,7,2);
 const client={countries:async()=>[metadata[0]],metadata:async()=>metadata,features:async m=>m.boundaryType==='ADM0'?[full]:m.boundaryType==='ADM1'?[west,east]:[westCounty,eastCounty]};
 initAdministrativeSelection({countrySelect:country,levelsHost:host,status,client,clear:()=>{},apply:(bounds,area)=>applied.push({bounds,area})});await flush();country.value='DEU';await country.onchange();assert.equal(applied.at(-1).area.name,'Deutschland');assert.deepEqual(applied.at(-1).bounds,{w:0,e:10,s:0,n:10});
 const state=host.children[0].children[1];state.value=String(state.options.findIndex(o=>o.textContent==='West')-1);await state.onchange();assert.equal(applied.at(-1).area.name,'West');const county=host.children[1].children[1];assert.deepEqual(county.options.map(o=>o.textContent),['Gesamtes übergeordnetes Gebiet','West County']);county.value='0';await county.onchange();assert.equal(applied.at(-1).area.name,'West County');county.value='';await county.onchange();assert.equal(applied.at(-1).area.name,'West');state.value='';await state.onchange();assert.equal(applied.at(-1).area.name,'Deutschland');assert.equal(host.children.length,1);
 }finally{globalThis.document=previousDocument;globalThis.Option=previousOption;}
});

test('Administrative boundaries across the dateline split into narrow polygons, not a world-spanning region',()=>{
 const f={type:'Feature',properties:{shapeName:'Dateline'},geometry:{type:'Polygon',coordinates:[[[179,10],[-179,10],[-179,11],[179,11],[179,10]]]}};
 const normalized=normalizeAdministrativeFeature(f);assert.equal(normalized.geometry.type,'MultiPolygon');assert.equal(normalized.geometry.coordinates.length,2);assert.ok(inFeature([179.5,10.5],normalized));assert.ok(inFeature([-179.5,10.5],normalized));assert.equal(inFeature([0,10.5],normalized),false);
});

test('Git LFS pointers are resolved to the actual media JSON instead of being parsed as JSON',async()=>{
 const raw='https://raw.githubusercontent.com/wmgeolab/geoBoundaries/abc/area.geojson',media=boundaryMediaURL(raw),requests=[];
 const client=new BoundaryClient(async url=>{requests.push(url);return {ok:true,text:async()=>url===raw?'version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 123':'\uFEFF'+JSON.stringify({type:'FeatureCollection',features:[rect('Actual country',0,0,1,1)]})};});
 const result=await client.json(raw);assert.equal(result.type,'FeatureCollection');assert.deepEqual(requests,[raw,media]);await client.json(raw);assert.equal(requests.length,2);
});
test('A non-LFS geometry can fall back from media to raw; HTML errors never surface as JSON.parse exceptions',async()=>{
 const requested=[];const client=new BoundaryClient(async url=>{requested.push(url);return url.includes('media.githubusercontent')?{ok:false,status:404}:{ok:true,text:async()=>JSON.stringify({type:'FeatureCollection',features:[rect('A',0,0,1,1)]})};});
 const result=await client.features({gjDownloadURL:'https://github.com/org/repo/raw/main/file.geojson'});assert.equal(result.length,1);assert.equal(requested.length,2);assert.ok(requested[1].startsWith('https://raw.githubusercontent.com/'));
 const html=new BoundaryClient(async()=>({ok:true,text:async()=>'<!DOCTYPE html><html>Service error</html>'}));await assert.rejects(()=>html.countries(),/keine gültigen JSON-Daten/);
});
test('Germany is pinned above the alphabetic list and also remains in its normal position',()=>{const list=countryOptions([{boundaryISO:'AUT',boundaryName:'Austria'},{boundaryISO:'DEU',boundaryName:'Germany'},{boundaryISO:'BEL',boundaryName:'Belgium'}]);assert.equal(list[0].boundaryISO,'DEU');assert.equal(list.filter(m=>m.boundaryISO==='DEU').length,2);assert.deepEqual(list.slice(1).map(m=>m.boundaryISO),['BEL','DEU','AUT']);});

test('Administrative selection fills the title while preserving manual edits on a language-only update',()=>{
 const state={feature:{},name:'Niedersachsen'},county={feature:{},name:'Landkreis Friesland'};
 assert.equal(automaticAreaTitle('UTMREF-MAP',null,state),'Niedersachsen');assert.equal(automaticAreaTitle('Eigener Titel',state,county),'Landkreis Friesland');assert.equal(automaticAreaTitle('Eigener Titel',county,{...county,name:'Friesland District'}),'Eigener Titel');assert.equal(automaticAreaTitle('Landkreis Friesland',county,{...county,name:'Friesland District'}),'Friesland District');
});

test('BKG German hierarchy reaches municipalities and groups split areas by AGS instead of geometry guesses',async()=>{
 const {bkgBoundaryMetadata,normalizeBKGBoundaries,isAdministrativeChild}=await import('../src/admin.js');
 const meta=bkgBoundaryMetadata();assert.deepEqual(administrativeLevels(meta,'DEU').map(m=>m.boundaryType),['ADM1','ADM3','ADM4']);assert.equal(levelName(meta.at(-1),'DEU'),'Gemeinde');
 const raw=(ags,gen,w)=>({...rect(gen,w,0,w+1,1),properties:{ags,gen}});
 const features=normalizeBKGBoundaries([raw('07332029','Kindenheim',0),raw('07332029','Kindenheim',10),raw('07332006','Bockenheim',20)],meta.at(-1));
 assert.equal(features.length,2);assert.equal(features[0].geometry.coordinates.length,2);assert.equal(features[0].properties._boundaryAttribution.name,'BKG VG250');
 assert.ok(isAdministrativeChild(features[0],{properties:{bkgAGS:'07332'}}));assert.ok(!isAdministrativeChild(features[0],{properties:{bkgAGS:'07331'}}));
});
test('BKG fetches only the selected parent and follows pagination with lon/lat GeoJSON',async()=>{
 const requests=[],feature=i=>({...rect('Gemeinde '+i,7,49,8,50),properties:{ags:String(7332000+i).padStart(8,'0'),gen:'Gemeinde '+i}});
 const client=new BoundaryClient(async url=>{requests.push(new URL(url));const start=Number(new URL(url).searchParams.get('startIndex'));return {ok:true,json:async()=>({type:'FeatureCollection',numberMatched:501,features:start?[feature(501)]:Array.from({length:500},(_,i)=>feature(i))})};});
 const meta=(await client.metadata('DEU')).find(m=>m.boundaryType==='ADM4');const features=await client.features(meta,undefined,{properties:{bkgAGS:'07332'}});
 assert.equal(features.length,501);assert.equal(requests.length,2);assert.equal(requests[0].searchParams.get('CQL_FILTER'),"ags LIKE '07332%'");assert.equal(requests[1].searchParams.get('startIndex'),'500');assert.equal(requests[0].searchParams.get('srsName'),'EPSG:4326');
});
test('German BKG failure falls back to geoBoundaries with accurate attribution; other countries remain unchanged',async()=>{
 const requests=[];const client=new BoundaryClient(async url=>{requests.push(url);if(url.includes('wfs_vg250'))return {ok:false,status:503};return {ok:true,json:async()=>url.endsWith('/DEU/ALL/')?metadata.map(m=>({...m,gjDownloadURL:'https://raw.githubusercontent.com/test/data/main/'+m.boundaryType+'.json'})):{type:'FeatureCollection',features:[rect('Fallback',0,0,1,1)]}};});
 const bkg=await client.metadata('DEU');const features=await client.features(bkg[0]);assert.ok(client.usingGeoGermany);assert.equal(features[0].properties._boundaryAttribution.name,'geoBoundaries');assert.deepEqual(await client.features(bkg.at(-1)),[]);
 assert.deepEqual((await client.metadata('DEU')).map(m=>m.boundaryType),metadata.map(m=>m.boundaryType));await client.metadata('FRA');assert.ok(requests.at(-1).endsWith('/FRA/ALL/'));assert.equal(requests.filter(u=>u.includes('wfs_vg250')).length,1);
});
test('Cancelled BKG requests do not activate fallback',async()=>{
 const client=new BoundaryClient(async()=>{throw new DOMException('Aborted','AbortError');}),controller=new AbortController();controller.abort();
 const meta=(await client.metadata('DEU'))[0];await assert.rejects(()=>client.features(meta,controller.signal),{name:'AbortError'});assert.equal(client.usingGeoGermany,false);
});

test('German UI continues from a county to municipalities, passes the parent and applies the municipal title and source',async()=>{
 const previousDocument=globalThis.document,previousOption=globalThis.Option;
 globalThis.document={createElement:()=>new Node()};globalThis.Option=class{constructor(text,value){this.textContent=text;this.value=value;this.option=true;}};
 try{
 const {bkgBoundaryMetadata}=await import('../src/admin.js'),meta=bkgBoundaryMetadata(),country=new Node(),host=new Node(),status=new Node(),applied=[];
 const root=rect('Deutschland',0,0,10,10),state=rect('Rheinland-Pfalz',0,0,5,5),county=rect('Bad Dürkheim',1,1,4,4),municipality=rect('Kindenheim',2,2,3,3);state.properties.bkgAGS='07';county.properties.bkgAGS='07332';municipality.properties.bkgAGS='07332029';municipality.properties._boundaryAttribution={name:'BKG VG250',license:'dl-de/by-2-0'};
 const client={countries:async()=>[meta[0]],metadata:async()=>meta,features:async(m,signal,parent)=>{if(m.boundaryType==='ADM0')return[root];if(m.boundaryType==='ADM1')return[state];if(m.boundaryType==='ADM3'){assert.equal(parent,state);return[county];}assert.equal(parent,county);return[municipality];}};
 initAdministrativeSelection({countrySelect:country,levelsHost:host,status,client,clear(){},apply:(bounds,area)=>applied.push(area)});await flush();country.value='DEU';await country.onchange();
 for(let depth=0;depth<3;depth++){const select=host.children[depth].children[1];select.value='0';await select.onchange();}
 assert.equal(applied.at(-1).name,'Kindenheim');assert.equal(applied.at(-1).attribution.name,'BKG VG250');assert.equal(host.children[2].children[0].textContent,'Gemeinde');
 const select=host.children[2].children[1];select.value='';await select.onchange();assert.equal(applied.at(-1).name,'Bad Dürkheim');
 }finally{globalThis.document=previousDocument;globalThis.Option=previousOption;}
});

test('Germany remains selectable through BKG when the global geoBoundaries country list is unavailable',async()=>{
 const previousDocument=globalThis.document,previousOption=globalThis.Option;
 globalThis.document={createElement:()=>new Node()};globalThis.Option=class{constructor(text,value){this.textContent=text;this.value=value;this.option=true;}};
 try{const country=new Node(),host=new Node(),status=new Node();initAdministrativeSelection({countrySelect:country,levelsHost:host,status,clear(){},apply(){},client:{countries:async()=>{throw Error('Offline');}}});await flush();assert.equal(country.disabled,false);assert.ok(country.options.some(o=>o.value==='DEU'));assert.ok(status.textContent.includes('BKG'));assert.ok(host.children.some(n=>n.dataset.i18n==='retryCountries'));}finally{globalThis.document=previousDocument;globalThis.Option=previousOption;}
});
