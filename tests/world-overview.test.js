import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {equalEarthForward,equalEarthInverse,overviewProjection,rectangleOutline,createEqualEarthCRS,fetchWorldCountries,installWorldOverview,selectionRectangle,WORLD_DATA_URL} from '../src/world-overview.js';
import {readFileSync} from 'node:fs';
test('Equal Earth matches independent PROJ WGS84 control points to a millimetre',()=>{
 // proj +proj=eqearth +ellps=WGS84 -f %.8f
 const points=[[[0,0],[0,0]],[[180,0],[17243959.06221694,0]],[[0,90],[0,8392927.59846645]],[[9,50],[711935.43574581,5985837.89911016]],[[-77,39],[-6583375.36044508,4808986.50855486]],[[122,47],[9879845.83359043,5677922.92040756]]];
 for(const [ll,expected]of points){const xy=equalEarthForward(...ll);assert.ok(Math.hypot(xy[0]-expected[0],xy[1]-expected[1])<.001);const back=equalEarthInverse(...xy);assert.ok(Math.abs(back[0]-ll[0])<1e-8&&Math.abs(back[1]-ll[1])<1e-8);}
});
test('Equal Earth inverse preserves selection coordinates across continents, poles and the dateline',()=>{for(const lon of [-180,-170,-90,0,9,90,170,180])for(const lat of [-90,-85,-60,-10,0,40,80,85,90]){const back=equalEarthInverse(...equalEarthForward(lon,lat));assert.ok(Math.abs(back[0]-lon)<1e-7);assert.ok(Math.abs(back[1]-lat)<1e-7);}});
test('Zoom levels two through four use Equal Earth; Mercator starts at five',()=>{for(const z of [2,3,4])assert.equal(overviewProjection(z),'equalEarth');for(const z of [5,6,12,18])assert.equal(overviewProjection(z),'mercator');});
test('Densified rectangles retain all four geographic corners and geographic bounds',()=>{const b={w:-30,e:60,s:-20,n:70},points=rectangleOutline(b);assert.ok(points.length>100);for(const corner of [[b.s,b.w],[b.s,b.e],[b.n,b.e],[b.n,b.w]])assert.ok(points.some(p=>p[0]===corner[0]&&p[1]===corner[1]));assert.ok(points.every(p=>p[0]>=b.s&&p[0]<=b.n&&p[1]>=b.w&&p[1]<=b.e));});
test('World data uses /UTMREF-MAP/assets directly, with a remote fallback for missing local data',async()=>{const urls=[],data={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[]}}]};const result=await fetchWorldCountries(async url=>{urls.push(url);return url===WORLD_DATA_URL?{ok:true,json:async()=>data}:{ok:false,status:404};},'https://pq5.de/pq5/UTMREF-MAP/index.html');assert.equal(result,data);assert.deepEqual(urls,['https://pq5.de/pq5/UTMREF-MAP/assets/world-countries.geojson',WORLD_DATA_URL]);});
function leafletFixture(){
 const layer=()=>({addTo(map){map.layers.add(this);return this;},addData(){this.loaded=true;}});
 const L={CRS:{Earth:{},EPSG3857:{code:'EPSG:3857'}},extend:Object.assign,point:(x,y)=>({x,y}),latLng:(lat,lng)=>({lat,lng}),bounds:(a,b)=>({min:{x:a[0],y:a[1]},max:{x:b[0],y:b[1]}}),Transformation:class{constructor(...values){this.values=values;}},polygon:layer,geoJSON:layer,polyline:layer,layerGroup:()=>({...layer(),addLayer(){}})};
 return L;
}
test('Leaflet switches CRS and restores Mercator without changing the geographic centre',async()=>{
 const L=leafletFixture(),events={},changes=[],credits=new Set();let zoom=6,center={lat:51.2,lng:10.4};
 const map={options:{maxBounds:'detailed bounds',crs:L.CRS.EPSG3857},layers:new Set(),attributionControl:{addAttribution:c=>credits.add(c),removeAttribution:c=>credits.delete(c)},createPane:()=>({style:{}}),getZoom:()=>zoom,getCenter:()=>center,on:(name,fn)=>events[name]=fn,off:name=>delete events[name],setMaxBounds(b){this.options.maxBounds=b;},setView(ll,z,options){center={lat:ll[0],lng:ll[1]};zoom=z;assert.equal(options.reset,true);},hasLayer(layer){return this.layers.has(layer);},removeLayer(layer){this.layers.delete(layer);},fire(){},latLngToContainerPoint:()=>({x:100,y:100})};
 const oldFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({type:'FeatureCollection',features:[{}]})});
 try{const overview=installWorldOverview(L,map,{onChange:mode=>changes.push(mode)});assert.equal(overview.active,false);zoom=4;events.zoomend();assert.equal(overview.active,true);assert.equal(map.options.crs.code,'EPSG:8857');assert.equal(map.options.maxBounds,null);assert.ok(Math.abs(center.lat-51.2)<1e-9&&Math.abs(center.lng-10.4)<1e-9);assert.equal(overview.allows({lat:0,lng:200}),false);assert.equal(overview.allows({lat:0,lng:0},{x:100,y:200}),false);assert.equal(overview.allows({lat:0,lng:0},{x:100,y:100}),true);zoom=5;events.zoomend();assert.equal(overview.active,false);assert.equal(map.options.crs,L.CRS.EPSG3857);assert.equal(map.options.maxBounds,'detailed bounds');assert.deepEqual(changes,['equalEarth','mercator']);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(credits.size,0);}finally{globalThis.fetch=oldFetch;}
});
test('PDF rendering remains independent from the UI overview projection',()=>{const render=readFileSync(new URL('../src/render.js',import.meta.url),'utf8'),pdf=readFileSync(new URL('../src/pdf.js',import.meta.url),'utf8');assert.ok(!render.includes('world-overview'));assert.ok(!pdf.includes('world-overview'));assert.ok(render.includes("project('EPSG:3857'"));assert.ok(pdf.includes('sheetPlan(plan,s)'));});

test('Selection rectangles accept coordinate arrays and Leaflet bounds on construction and update',()=>{
 const context={window:{screen:{deviceXDPI:96,logicalXDPI:96},devicePixelRatio:1},document:{documentElement:{style:{}},createElement:()=>({getContext:()=>({}),style:{}})},navigator:{userAgent:'node',platform:'Linux'},setTimeout,clearTimeout};
 context.window.document=context.document;vm.createContext(context);
 vm.runInContext(readFileSync(new URL('../vendor/leaflet.js',import.meta.url),'utf8'),context);
 const L=context.window.L;
 const assertBounds=(rectangle,s,w,n,e)=>{const b=rectangle.getBounds();assert.equal(b.getSouth(),s);assert.equal(b.getWest(),w);assert.equal(b.getNorth(),n);assert.equal(b.getEast(),e);};
 const rectangle=selectionRectangle(L,[[47,5],[55,15]],{});
 assertBounds(rectangle,47,5,55,15);
 rectangle.setBounds([[48,6],[54,14]]);assertBounds(rectangle,48,6,54,14);
 rectangle.setBounds(L.latLngBounds([[-20,-30],[70,60]]));assertBounds(rectangle,-20,-30,70,60);
 const drawn=selectionRectangle(L,L.latLngBounds([[50,7],[52,9]]),{});assertBounds(drawn,50,7,52,9);
});
