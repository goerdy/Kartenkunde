import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tkFeatureClass,tkPostpassSQL,TK_FEATURE_KEYS,TK_TAG_FILTERS,normalizeTKOptions} from '../src/tk-features.js';
import {farmFeatures,installFarmLabels,loadFarmFeatures} from '../src/farm-labels.js';
import {createPQ5TKStyle,createPQ5TKPrintStyle} from '../src/pq5-tk.js';
test('Postpass response with real farm tag structure preserves Pulvermacherei, coordinates and stable identity',()=>{
 const result=farmFeatures({type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[7.8826294,53.6725554]},properties:{osm_type:'N',osm_id:2971306472,tags:{name:'Pulvermacherei',place:'farm'}}}]});
 assert.equal(result.features[0].properties.name,'Pulvermacherei');assert.equal(result.features[0].properties.class,'farm');assert.equal(result.features[0].id,'N/2971306472');
});
test('Landmarks are classified from OSM tags; ruins override intact castles/churches',()=>{
 for(const [tags,kind]of [[{building:'church'},'church'],[{'tower:type':'bell_tower'},'church'],[{power:'generator','generator:source':'wind'},'wind'],[{man_made:'communications_tower'},'transmitter'],[{historic:'castle'},'castle'],[{historic:'fort'},'castle'],[{historic:'castle',ruins:'yes'},'ruin'],[{man_made:'water_tower'},'waterTower'],[{man_made:'chimney'},'chimney']])assert.equal(tkFeatureClass(tags),kind);
 assert.equal(tkFeatureClass({amenity:'place_of_worship',religion:'muslim'}),null);assert.equal(tkFeatureClass({place:'isolated_dwelling',name:'Existing label'}),null);
});
test('All options default on, and disabling categories applies to both screen and print styles',()=>{
 assert.ok(Object.values(normalizeTKOptions()).every(Boolean));
 const off=Object.fromEntries(TK_FEATURE_KEYS.map(key=>[key,false]));
 for(const create of [createPQ5TKStyle,createPQ5TKPrintStyle]){
 const style=create(off);assert.equal(style.layers.find(l=>l.id==='tk-named-farms').layout.visibility,'none');assert.deepEqual(style.layers.find(l=>l.id==='tk-landmarks').filter,['==',1,0]);
 assert.ok(!JSON.stringify(style.layers.find(l=>l.id==='tk-small-settlements').filter).includes('"farm"'));
 const selected=create({churches:false,wind:false});const filter=JSON.stringify(selected.layers.find(l=>l.id==='tk-landmarks').filter);assert.ok(!filter.includes('church'));assert.ok(!filter.includes('wind'));assert.ok(filter.includes('castle'));
 }
 assert.deepEqual(createPQ5TKPrintStyle().layers.find(l=>l.id==='tk-landmarks').layout['icon-size'],['*',['match',['get','class'],'pylon',.7,1],4]);
});
test('No supplemental requests are made when all options are disabled',async()=>{
 const oldFetch=globalThis.fetch;globalThis.fetch=()=>assert.fail('Disabled features must not fetch');
 try{await installFarmLabels({},Object.fromEntries(TK_FEATURE_KEYS.map(key=>[key,false])));}finally{globalThis.fetch=oldFetch;}
});
test('Only bounded numeric queries are accepted; PHP and Node use the same fixed tag categories',()=>{
 for(const box of [[-90,-180,90,180],[NaN,1,2,3],[53,'7 OR true',54,8],[54,7,53,8]])assert.throws(()=>tkPostpassSQL(box));
 const query=tkPostpassSQL([53.6,7.8,53.7,7.9]);assert.ok(query.includes('geom && ST_MakeEnvelope(7.8,53.6,7.9,53.7,4326)'));assert.ok(!query.includes('isolated_dwelling'));
 assert.deepEqual(JSON.parse(readFileSync(new URL('../api/tk-filters.json',import.meta.url))),TK_TAG_FILTERS);
});
test('Postpass requests are serialized and duplicate calls share their result',async()=>{
 let active=0,maxActive=0,calls=0;
 const fetcher=async()=>{calls++;active++;maxActive=Math.max(maxActive,active);return {ok:true,json:async()=>{await new Promise(resolve=>setTimeout(resolve,5));active--;return {type:'FeatureCollection',features:[]};}};};
 await Promise.all([loadFarmFeatures([40,10,40.1,10.1],undefined,fetcher),loadFarmFeatures([40,10,40.1,10.1],undefined,fetcher),loadFarmFeatures([40.1,10,40.2,10.1],undefined,fetcher)]);
 assert.equal(calls,2);assert.equal(maxActive,1);
});

test('Power lines remain lines and military areas retain polygon boundaries and holes',()=>{
 const line={type:'LineString',coordinates:[[8,53],[8.1,53.1],[8.2,53]]};
 const area={type:'Polygon',coordinates:[[[8,53],[8.2,53],[8.2,53.2],[8,53.2],[8,53]],[[8.05,53.05],[8.1,53.05],[8.1,53.1],[8.05,53.05]]]};
 const data=farmFeatures({type:'FeatureCollection',features:[{geometry:line,properties:{osm_type:'W',osm_id:1,tags:{power:'line'}}},{geometry:area,properties:{osm_type:'W',osm_id:2,tags:{landuse:'military'}}},{geometry:{type:'Point',coordinates:[8,53]},properties:{osm_type:'N',osm_id:3,tags:{landuse:'military'}}}]});
 assert.equal(data.features.length,2);assert.deepEqual(data.features[0].geometry,line);assert.deepEqual(data.features[1].geometry,area);
 const query=tkPostpassSQL([53,8,53.2,8.2]);assert.ok(query.includes('postpass_pointlinepolygon'));assert.ok(query.includes('THEN geom ELSE ST_PointOnSurface(geom)'));
});
test('Lighthouses and locks have distinct classes; electricity and military visibility follow their options',()=>{
 assert.equal(tkFeatureClass({man_made:'lighthouse'}),'lighthouse');assert.equal(tkFeatureClass({waterway:'lock_gate'}),'lock');assert.equal(tkFeatureClass({power:'substation'}),'substation');assert.equal(tkFeatureClass({power:'tower'}),'pylon');
 for(const create of [createPQ5TKStyle,createPQ5TKPrintStyle]){const style=create({militaryAreas:false,powerLines:false});for(const id of ['tk-military-fill','tk-military-edge','tk-powerLine','tk-minorPowerLine'])assert.equal(style.layers.find(l=>l.id===id).layout.visibility,'none');}
});

test('Public service POIs and observation towers classify independently; cemetery polygons retain holes',()=>{
 const cases=[[{amenity:'hospital'},'hospital'],[{healthcare:'hospital'},'hospital'],[{amenity:'fire_station'},'fireStation'],[{amenity:'police'},'police'],[{man_made:'tower','tower:type':'observation'},'viewTower'],[{man_made:'mast','tower:type':'observation'},'viewTower'],[{landuse:'cemetery'},'cemetery'],[{amenity:'grave_yard'},'cemetery']];
 for(const [tags,kind]of cases)assert.equal(tkFeatureClass(tags),kind);
 assert.equal(tkFeatureClass({amenity:'doctors'}),null);
 const geometry={type:'Polygon',coordinates:[[[8,53],[8.2,53],[8.2,53.2],[8,53]],[[8.05,53.05],[8.1,53.05],[8.1,53.1],[8.05,53.05]]]};
 const data=farmFeatures({type:'FeatureCollection',features:[{geometry,properties:{osm_id:1,osm_type:'W',tags:{landuse:'cemetery'}}}]});assert.deepEqual(data.features[0].geometry,geometry);
 for(const create of [createPQ5TKStyle,createPQ5TKPrintStyle]){
 const style=create({hospitals:false,fireStations:false,police:false,viewTowers:false,cemeteries:false});const filter=JSON.stringify(style.layers.find(l=>l.id==='tk-landmarks').filter);
 for(const kind of ['hospital','fireStation','police','viewTower','cemetery'])assert.ok(!filter.includes(kind));assert.equal(style.layers.find(l=>l.id==='tk-cemetery-fill').layout.visibility,'none');
 }
 const sql=tkPostpassSQL([53,8,53.2,8.2]);assert.ok(sql.includes("tags->>'landuse'='cemetery'"));assert.ok(sql.includes("tags->>'amenity'='grave_yard'"));
});
