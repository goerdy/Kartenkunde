// Shared metre-based geography for the topo sheet, walking and Babylon scene.
export const WORLD_SIZE=8000,MAP_SCALE=50000;
export const VEHICLE_START=Object.freeze({e:1955,n:1648,heading:80});
export const LANDMARKS=[
  {id:'church',name:'Sankt Florian',e:680,n:3150,kind:'church',height:52},
  {id:'tower',name:'Melderwarte',e:3250,n:3250,kind:'tower',height:65},
  {id:'mill',name:'Pumpenmühle',e:3400,n:850,kind:'mill',height:40},
  {id:'mast',name:'Unter den Funkmasten',e:700,n:700,kind:'mast',height:85},
  {id:'water',name:'Wasserturm',e:2050,n:3500,kind:'water',height:60},
  {id:'chapel',name:'St.-Barbara-Kapelle',e:5800,n:2550,kind:'church',height:36},
  {id:'wind-west',name:'Windpark Lange Leitung · West',e:1450,n:4420,kind:'turbine',height:116},
  {id:'wind-mid',name:'Windpark Lange Leitung · Mitte',e:1850,n:4660,kind:'turbine',height:116},
  {id:'wind-east',name:'Windpark Lange Leitung · Ost',e:2250,n:4510,kind:'turbine',height:116},
  {id:'ruin',name:'Ruine Oberlage',e:1250,n:6500,kind:'ruin',height:28},
  {id:'summit',name:'Meldekopf · Gipfelkreuz',e:6750,n:6500,kind:'summit',height:12},
  {id:'castle',name:'Burg Rückhalt',e:5600,n:5910,kind:'castle',height:42},
  {id:'radar',name:'Radarstation Weitblick',e:7270,n:1430,kind:'radar',height:48},
  {id:'silos',name:'Silos Hof Wasserhalt',e:6140,n:6490,kind:'silo',height:32},
  {id:'chimney',name:'Altes Pumpwerk',e:3520,n:6900,kind:'chimney',height:56}

];
export const STATIONS=[
  {id:'meadow',name:'trStationMeadow',e:1950,n:1650},
  {id:'ridge',name:'trStationRidge',e:1450,n:2300},
  {id:'south',name:'trStationSouth',e:2450,n:1150}
];
export const FORESTS=[
  [[2008,1680],[2080,1685],[2080,1760],[2010,1760]],
  [[100,1900],[500,1700],[1000,1950],[1000,2600],[500,2800],[100,2500]],
  [[2600,3900],[3050,3650],[3970,4100],[4100,5100],[3800,6400],[3000,6750],[2500,5600]],
  [[1000,100],[1550,120],[1650,650],[1200,800],[900,600]],
  [[5600,4300],[6600,4100],[7600,4600],[7700,7000],[6600,7600],[5600,6900],[5300,5600]],
  [[150,4200],[750,3900],[1050,4600],[900,5700],[1600,6000],[1850,7300],[300,7600]],
  [[2100,6500],[2600,6800],[4000,6900],[4200,7800],[2000,7800]],
  [[150,120],[700,180],[600,1200],[200,1350]],
  [[3300,100],[4000,170],[4100,1100],[3550,1350],[3300,750]],
  [[6200,200],[7600,200],[7700,1000],[7300,1800],[6700,1500]],
  [[6600,2100],[7700,2200],[7700,2800],[6900,2900]],
  [[900,3600],[1550,3500],[1600,4000],[1200,4300]]
];
export const FIELDS=[
 {name:'Große Lage',crop:'wheat',polygon:[[850,180],[1700,180],[1850,780],[1750,1150],[1700,1320],[850,1250]]},
 {name:'Am festen Halt',crop:'ploughed',polygon:[[2200,200],[2600,200],[2650,850],[2450,1050],[2200,1100]]},
 {name:'Kräfteansatz',crop:'pasture',polygon:[[1000,1800],[1550,1700],[1700,2200],[1500,2550],[1100,2500]]},
 {name:'Stille Reserve',crop:'wheat',polygon:[[1200,4900],[2200,5100],[2250,5600],[1600,5750],[1150,5400]]},
 {name:'Unter den Flügeln',crop:'pasture',polygon:[[1100,4120],[2350,4120],[2400,4800],[1100,4800]]},
 {name:'Kupplinger Feld',crop:'wheat',polygon:[[5000,1100],[5500,1100],[5500,2000],[5100,2100]]},
 {name:'An der stillen Reserve',crop:'ploughed',polygon:[[5900,2800],[6500,2800],[6500,3500],[5900,3500]]},
 {name:'Am langen Atem',crop:'pasture',polygon:[[5100,6900],[5800,7000],[5900,7700],[5000,7700]]}
];
export const QUARRY={name:'Trümmerbruch',e:7080,n:3500,polygon:[[6850,3300],[7250,3250],[7410,3560],[7180,3780],[6880,3650]]};
export const VIEWPOINTS=[
 {name:'Feldherrenhügel',e:3180,n:3195},
 {name:'Meldekopf',e:6690,n:6420},
 {name:'Burg Rückhalt',e:5550,n:5830},
 {name:'Ruine Oberlage',e:1310,n:6420},
 {name:'Talblick',e:4930,n:3850}
];
export const LAKE=[[2700,650],[2820,500],[3100,510],[3200,730],[3050,940],[2800,900]];
export const MARSH=[[4800,4900],[5200,4800],[5500,5200],[5420,5700],[4950,5850],[4700,5400]];
export const WATERCOURSES=[
  {id:'river',name:'Blaulach',width:32,points:[[4300,0],[4300,1200],[4400,2400],[4300,3400],[4550,4400],[4450,5500],[4700,6600],[4600,8000]]},
  {id:'stream',name:'Strahlbach',width:3.5,points:[[2900,1250],[3200,1550],[3600,1850],[4000,2200],[4400,2400]],levels:[74,72,70,67,64.6]}
];
export const BRIDGES=[{name:'Kupplungsbrücke',e:4300,n:3400,length:100,width:10,height:69.1}];
export const SETTLEMENTS=[
  {name:'Sankt Florian',e:680,n:3100,polygon:[[350,2700],[1370,2700],[1370,3550],[350,3550]]},
  {name:'Kupplingen',e:5650,n:2400,polygon:[[5390,2140],[5910,2140],[5910,2680],[5390,2680]]}
];
export const ROAD_FEATURES=[
  {name:'Weg der Erkundung',kind:'track',width:4.4,points:[[0,1200],[700,1400],[1500,1500],[1950,1650],[2600,1700],[3400,2100],[3850,2900],[4250,3400]]},
  {name:'Zum gesicherten Rückweg',kind:'track',width:4.4,points:[[680,8000],[680,3430],[950,3400],[950,2980],[1000,2900],[1450,2300],[1950,1650],[2450,1150],[3400,850],[8000,850]]},
  {name:'Am Eigenschutz',kind:'track',width:4.4,points:[[1950,1650],[2100,2300],[2050,3500],[2200,4000],[2450,4300],[2600,4900],[2800,5500],[3200,6200],[3800,6600]]},
  {name:'L 112',kind:'highway',width:7.4,points:[[0,2980],[1050,2980],[1950,3150],[3250,3400],[4300,3400],[5200,3400],[6100,3000],[8000,3000]]},
  {name:'Lange Leitung',kind:'highway',width:6.4,points:[[5650,850],[5650,2400],[5650,3100]]},
  {name:'An der Rückfallebene',kind:'track',width:4.4,points:[[5200,3400],[5750,4100],[5700,5600],[6050,5950],[6200,6200],[6500,6850],[7000,7100]]},
  {name:'Unter den Flügeln',kind:'track',width:4,points:[[800,3400],[1100,4000],[1450,4380],[1850,4620],[2250,4470],[2450,4300]]},
  {name:'Am alten Meldeweg',kind:'track',width:3.5,points:[[1850,4620],[1950,5300],[1400,5900],[1250,6440],[1800,7000],[2600,7100]]},
  {name:'Zum Meldekopf',kind:'track',width:2.5,points:[[6200,6200],[6420,6070],[6750,6170],[7000,6410],[6950,6710],[6760,6780],[6600,6550],[6690,6420],[6750,6500]]},
  {name:'Zur Burg Rückhalt',kind:'track',width:3,points:[[5700,5600],[5480,5680],[5430,5830],[5500,5950],[5600,5910]]},
  {name:'Zur wilden Ablage',kind:'track',width:4.4,points:[[6500,3000],[6800,3100],[7000,3290],[7080,3500]]},
  {name:'Zum ruhenden Verkehr',kind:'track',width:4,points:[[7000,850],[7200,1050],[7270,1400]]},
  {name:'An der Meldekette',kind:'track',width:3.5,points:[[3800,6600],[3570,6760],[3520,6900],[3750,7300]]},
  ...[450,800,1000,1300].map((e,i)=>({name:['Am Lagezentrum','Am Sammelplatz','Am langen Hebel','An der Führungsstelle'][i],kind:'street',width:6,points:[[e,2770],[e,3480]]})),
  ...[2820,3280,3400].map((n,i)=>({name:['Am Eigenschutz','Am kurzen Dienstweg','Zum kalten Ende'][i],kind:'street',width:6,points:[[400,n],[1330,n]]})),
  {name:'Zur letzten Hoffnung',kind:'street',width:5,points:[[450,3150],[600,3150],[600,3220],[800,3220]]},
  {name:'Feuerwehrzufahrt',kind:'access',width:6,points:[[1130,2995],[1130,3038]]},
  {name:'THW-Zufahrt',kind:'access',width:6,points:[[1130,2820],[1130,2858]]},
  {name:'Klinikzufahrt',kind:'access',width:6,points:[[1130,3400],[1190,3400],[1190,3320],[1130,3320]]},
  {name:'Am langen Hebel',kind:'street',width:5,points:[[5400,2400],[5900,2400]]},
  {name:'Zur stillen Reserve',kind:'street',width:4,points:[[5450,2190],[5450,2630],[5850,2630],[5850,2190],[5450,2190]]}
];
// Compatibility: all paths, tree clearings and the map refer to the same routes.
export const ROADS=ROAD_FEATURES.map(r=>r.points);
// Shared footprints also provide movement collision and map locations.
export const SERVICE_SITES=[
 {id:'fire',name:'Feuerwehr Sankt Florian',symbol:'F',color:'#b72e28',e:1130,n:3070,w:76,d:32,h:8},
 {id:'police',name:'Polizeiwache',symbol:'P',color:'#255690',e:880,n:3340,w:42,d:27,h:9},
 {id:'hospital',name:'Krankenhaus Sankt Florian',symbol:'H',color:'#246b96',e:1130,n:3345,w:74,d:38,h:15},
 {id:'thw',name:'THW Sankt Florian',symbol:'THW',color:'#2356a0',e:1130,n:2890,w:84,d:32,h:7}
];
export const STREET_SIGNS=ROAD_FEATURES.filter(r=>r.kind==='street').flatMap(r=>r.points.filter((_,i)=>i===0||i===r.points.length-1).map(([e,n])=>({name:r.name,e:e+5,n:n+5})));
export const TOWN_SIGNS=[{name:'Sankt Florian',e:355,n:2986,angle:90},{name:'Sankt Florian',e:1380,n:3048,angle:-80},{name:'Kupplingen',e:5656,n:2160,angle:0},{name:'Kupplingen',e:5656,n:2680,angle:180}];
export const BUILDINGS=[
 ...[450,800].flatMap((e,i)=>[2860,2920,3040,3100,3350,3440].flatMap((n,j)=>[-1,1].filter(sign=>Math.hypot(e+sign*23-680,n-3150)>70).map(sign=>({e:e+sign*23,n,w:17,d:22,h:7+(i+j)%4,name:'Sankt Florian',angle:sign===1?90:-90})))),
 ...[520,580,860,930,1040,1220].flatMap((e,i)=>[2820,3400].flatMap(n=>[-1,1].filter(sign=>!SERVICE_SITES.some(p=>Math.abs(e-p.e)<p.w/2+20&&Math.abs(n+sign*24-p.n)<p.d/2+20)).map(sign=>({e,n:n+sign*24,w:20,d:17,h:7+i%4,name:'Sankt Florian',angle:sign===1?0:180})))),
 ...[520,580,640,710,860,930,1050,1220].flatMap((e,i)=>[2980,3280].filter(n=>n!==2980||e<1000).flatMap(n=>[-1,1].filter(sign=>Math.hypot(e-680,n+sign*24-3150)>72&&!SERVICE_SITES.some(p=>Math.abs(e-p.e)<p.w/2+20&&Math.abs(n+sign*24-p.n)<p.d/2+20)).map(sign=>({e,n:n+sign*24,w:22,d:17,h:7+i%4,name:'Sankt Florian',angle:sign===1?0:180})))),
 ...SERVICE_SITES.map(p=>({...p,service:true})),
 {e:1162,n:3098,w:9,d:9,h:24,name:'Schlauchturm',servicePart:true},
 {e:1063,n:2890,w:34,d:30,h:8,name:'THW Verwaltung',servicePart:true},
 ...[5470,5530,5590,5710,5770,5830].flatMap((e,i)=>[2373,2427].map((n,j)=>({e,n,w:19,d:16,h:6+(i+j)%3,name:'Kupplingen',angle:j?0:180}))),
 {e:2040,n:1780,w:14,d:20,h:7,name:'Gut Eigenschutz'},
 {e:2065,n:1785,w:10,d:13,h:5,name:'Gut Eigenschutz'},
 {e:6100,n:6500,w:28,d:18,h:8,name:'Hof Wasserhalt'}
];
export const PLACE_LABELS=[
  {name:'Sankt Florian',e:720,n:3530,size:29},
  {name:'Kupplingen',e:5670,n:2760,size:28},
  {name:'Rüstholz',e:3300,n:5300,size:33},
  {name:'Führungssumpf',e:5110,n:5480,size:27},
  {name:'Feldherrenhügel',e:3230,n:3540,size:26},
  {name:'Tal der Tränen',e:4740,n:3950,size:26},
  {name:'Funkloch',e:2000,n:5900,size:28},
  {name:'Löschteich',e:2930,n:1090,size:24},
  {name:'Blaulach',e:4680,n:6650,size:24,water:true},
  {name:'Strahlbach',e:3700,n:1710,size:22,water:true},
  {name:'Kupplungsbrücke',e:4350,n:3200,size:22},
  {name:'L 112',e:6200,n:3240,size:24},
  {name:'Lange Leitung',e:5950,n:1650,size:21},
  {name:'Am kurzen Dienstweg',e:1370,n:3240,size:19},
  {name:'An der Rückfallebene',e:6500,n:6100,size:22},
  {name:'Gut Eigenschutz',e:2150,n:1950,size:21},
  {name:'Bereitstellungswiese',e:1720,n:1450,size:22},
  {name:'Stille Reserve',e:1800,n:5500,size:22},
  {name:'Meldekopf',e:7000,n:6880,size:30},
  {name:'Trümmerbruch',e:7080,n:3900,size:24},
  {name:'Windpark Lange Leitung',e:1800,n:4050,size:25},
  {name:'Große Lage',e:1600,n:500,size:22},
  {name:'Tannenwehr',e:7200,n:4950,size:27},
  {name:'Am alten Meldeweg',e:1750,n:6200,size:18}
];
export function distanceToPath(e,n,points){
  let distance=Infinity,index=0,fraction=0;
  for(let i=1;i<points.length;i++){
    const [a,b]=points[i-1],[c,d]=points[i],dx=c-a,dz=d-b,t=Math.max(0,Math.min(1,((e-a)*dx+(n-b)*dz)/(dx*dx+dz*dz)));
    const current=Math.hypot(e-a-dx*t,n-b-dz*t);if(current<distance){distance=current;index=i-1;fraction=t;}
  }
  return {distance,index,fraction};
}
export function waterLevel(course,index,fraction){
  if(course.id==='river')return 61+(course.points[index][1]+(course.points[index+1][1]-course.points[index][1])*fraction)*.0015;
  return course.levels[index]+(course.levels[index+1]-course.levels[index])*fraction;
}
export function onBridge(e,n,margin=0){return BRIDGES.find(b=>Math.abs(e-b.e)<=b.length/2&&Math.abs(n-b.n)<=b.width/2-margin);}
export function deepWater(e,n){return !onBridge(e,n,.3)&&(inside({e,n},LAKE)||distanceToPath(e,n,WATERCOURSES[0].points).distance<WATERCOURSES[0].width/2+.3);}
export function heightAt(e,n){
  const hill=(x,z,sx,sz,amplitude)=>amplitude*Math.exp(-(((e-x)/sx)**2+((n-z)/sz)**2));
  // Authored landforms: open southern rolling country, northern ridges and a rocky summit.
  let h=65+hill(1250,3150,800,800,45)+hill(3250,3250,570,620,108)
    +hill(650,650,550,650,35)+hill(1600,4500,1000,650,105)
    +hill(1250,6500,650,780,145)+hill(3500,7100,650,500,78)
    +hill(5800,5800,800,1100,180)+hill(6750,6500,870,850,390)
    +hill(6750,6500,285,340,155)+hill(7350,5850,440,700,85)
    +hill(7200,1500,640,600,68)+hill(3200,650,720,450,25)
    -hill(2000,5900,440,650,30)-hill(5200,4450,450,850,18)
    +12*Math.sin(e/850)*Math.sin(n/950);
  const wild=Math.min(1,Math.max(0,(n-3600)/800));
  h+=wild*(7*Math.sin(e/140)*Math.cos(n/190)+3*Math.sin((e+n)/61));
  // Terraced quarry cut: a recognisable depression with exposed rock benches.
  const q=Math.max(Math.abs((e-QUARRY.e)/245),Math.abs((n-QUARRY.n)/250));
  if(q<1.2){const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};h-=12*smooth((1.2-q)/.2)+11*smooth((.86-q)/.14)+12*smooth((.56-q)/.12);}
  for(const course of WATERCOURSES){
    const hit=distanceToPath(e,n,course.points),bank=course.width/2+8,blend=Math.max(0,1-Math.max(0,hit.distance-bank)/140);
    if(blend){const level=waterLevel(course,hit.index,hit.fraction),bed=level+(hit.distance<course.width/2?-2:Math.min(3,(hit.distance-course.width/2)*.6));h=h*(1-blend)+bed*blend;}
  }
  // Continuous embankments meet the deck without an invisible height step.
  for(const bridge of BRIDGES){
    const dx=Math.abs(e-bridge.e),dz=Math.abs(n-bridge.n),smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
    if(dx>=24&&dx<100&&dz<65){const weight=(1-smooth((dx-55)/45))*(1-smooth((dz-25)/40));h=h*(1-weight)+bridge.height*weight;}
  }
  return h;
}
export function walkingHeightAt(e,n){return onBridge(e,n)?.height??heightAt(e,n);}
// Chunked deterministic woodland. Twelve metre spacing yields overlapping crowns;
// road corridors and picnic sites stay clear, and trunks can be tested on foot.
export const TREES=[];
const treeCells=new Map(),treeCell=(e,n)=>`${Math.floor(e/12)},${Math.floor(n/12)}`;
for(let x=0;x<WORLD_SIZE/12;x++)for(let y=0;y<WORLD_SIZE/12;y++){
  const seed=Math.sin(x*127.1+y*311.7)*43758.5453,f=seed-Math.floor(seed),g=Math.sin(x*269.5+y*183.3)*23781.31,k=g-Math.floor(g);
  const e=x*12+2+f*8,n=y*12+2+k*8;
  if(!FORESTS.some(p=>inside({e,n},p))||ROAD_FEATURES.some(r=>distanceToPath(e,n,r.points).distance<r.width/2+7)||STATIONS.some(p=>Math.hypot(e-p.e-9,n-p.n-8)<3)||deepWater(e,n)||heightAt(e,n)>415||VIEWPOINTS.some(p=>Math.hypot(e-p.e,n-p.n)<20)||inside({e,n},QUARRY.polygon)||BUILDINGS.some(b=>Math.abs(e-b.e)<b.w/2+6&&Math.abs(n-b.n)<b.d/2+6)||LANDMARKS.some(p=>Math.hypot(e-p.e,n-p.n)<(p.kind==='castle'?55:35)))continue;
  const tree={e,n,height:13+f*16,radius:.28+f*.15,species:k<.28?'broadleaf':'pine'};TREES.push(tree);const cell=treeCell(e,n);if(!treeCells.has(cell))treeCells.set(cell,[]);treeCells.get(cell).push(tree);
}
// Roadside oaks and field-edge trees connect settlements with the forest canopy.
for(const road of ROAD_FEATURES.filter(r=>r.kind==='highway'))for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dn=b[1]-a[1],length=Math.hypot(dx,dn);
  for(let d=35;d<length;d+=85)for(const sign of [-1,1]){
    const e=a[0]+dx*d/length-dn/length*sign*(road.width/2+10),n=a[1]+dn*d/length+dx/length*sign*(road.width/2+10);
    if(deepWater(e,n)||onBridge(e,n)||FORESTS.some(p=>inside({e,n},p))||BUILDINGS.some(p=>Math.abs(e-p.e)<p.w/2+8&&Math.abs(n-p.n)<p.d/2+8)||LANDMARKS.some(p=>Math.hypot(e-p.e,n-p.n)<45)||ROAD_FEATURES.some(r=>distanceToPath(e,n,r.points).distance<r.width/2+5))continue;
    const tree={e,n,height:12+(Math.floor(d)%8),radius:.34,species:'broadleaf',roadside:true};TREES.push(tree);const cell=treeCell(e,n);if(!treeCells.has(cell))treeCells.set(cell,[]);treeCells.get(cell).push(tree);
  }
}
export function treeBlocks(from,to){
  const x=Math.floor(to.e/12),y=Math.floor(to.n/12);
  for(let i=x-1;i<=x+1;i++)for(let j=y-1;j<=y+1;j++)for(const tree of treeCells.get(`${i},${j}`)||[]){
    const next=Math.hypot(to.e-tree.e,to.n-tree.n),before=Math.hypot(from.e-tree.e,from.n-tree.n);
    if(next<tree.radius+.31&&next<=before)return true;
  }
  return false;
}
export function inside(point,polygon) {
  let yes=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [x,y]=polygon[i],[a,b]=polygon[j];
    if((y>point.n)!==(b>point.n)&&point.e<(a-x)*(point.n-y)/(b-y)+x)yes=!yes;
  }
  return yes;
}
export const mod = a => ((a%360)+360)%360;
export const angleDifference = (a,b) => ((a-b+540)%360)-180;
export const bearing = (a,b) => mod(Math.atan2(b.e-a.e,b.n-a.n)*180/Math.PI);
export const toUnit = (degrees,unit) => mod(degrees)*(unit==='mil'?6400/360:1);
export const fromUnit = (value,unit) => mod(value*(unit==='mil'?360/6400:1));
export const magneticBearing = (a,b,declination=0) => mod(bearing(a,b)-declination);
export function pointAlong(p,angle,distance) {
  const a=angle*Math.PI/180;
  return {e:p.e+Math.sin(a)*distance,n:p.n+Math.cos(a)*distance};
}
export function intersectRays(a,alpha,b,beta) {
  const u=pointAlong({e:0,n:0},alpha,1),v=pointAlong({e:0,n:0},beta,1);
  const det=u.e*v.n-u.n*v.e;
  if(Math.abs(det)<1e-8)return null;
  const distance=((b.e-a.e)*v.n-(b.n-a.n)*v.e)/det;
  return pointAlong(a,alpha,distance);
}
export function visibleFrom(station,target) {
  const eye=heightAt(station.e,station.n)+1.7,top=heightAt(target.e,target.n)+target.height;
  for(let i=1;i<100;i++) {
    const f=i/100,e=station.e+(target.e-station.e)*f,n=station.n+(target.n-station.n)*f;
    if(heightAt(e,n)>eye+(top-eye)*f)return false;
  }
  return true;
}
export function defaultState() {
  return {version:1,station:0,task:'free',instrument:'base',unit:'deg',view:'table',tool:'compass',
    north:0,declination:0,advanced:false,paperAngle:24,paperX:0,paperY:0,zoom:1,
    compass:{x:0,y:0,angle:0,ring:0},yaw:0,pitch:0,helpers:false,points:[],lines:[],
    selected:null,resultPoint:null,observations:[],target:0,exerciseValue:60};
}
export function restoreState(raw) {
  const s=defaultState();
  if(!raw||raw.version!==1)return s;
  for(const [key,min,max] of [['station',0,2],['north',0,360],['declination',-30,30],['paperAngle',-36000,36000],['paperX',-.3,.3],['paperY',-.3,.3],['zoom',.7,2],['yaw',-36000,36000],['pitch',-65,65],['target',0,LANDMARKS.length-1],['exerciseValue',0,360]]) {
    if(Number.isFinite(raw[key])&&raw[key]>=min&&raw[key]<=max)s[key]=raw[key];
  }
  s.station=Math.round(s.station);s.target=Math.round(s.target);
  for(const [key,values] of Object.entries({task:['free','orient','course','set','sight','cross'],instrument:['base','mirror'],unit:['deg','mil'],view:['table','look','sight'],tool:['compass','point','connect','draw','result','paper']}))if(values.includes(raw[key]))s[key]=raw[key];
  for(const key of ['advanced','helpers'])s[key]=raw[key]===true;
  for(const key of ['x','y','angle','ring'])if(Number.isFinite(raw.compass?.[key]))s.compass[key]=key==='x'||key==='y'?Math.max(-.55,Math.min(.55,raw.compass[key])):mod(raw.compass[key]);
  const point=p=>p&&Number.isFinite(p.e)&&Number.isFinite(p.n)&&p.e>=0&&p.e<=WORLD_SIZE&&p.n>=0&&p.n<=WORLD_SIZE;
  if(Array.isArray(raw.points))s.points=raw.points.filter(point).slice(0,40).map((p,i)=>({id:String(p.id||i).slice(0,40),e:p.e,n:p.n,name:String(p.name||'').slice(0,24)}));
  if(Array.isArray(raw.lines))s.lines=raw.lines.filter(l=>l&&((l.kind==='connect'&&s.points.some(p=>p.id===l.a)&&s.points.some(p=>p.id===l.b))||(l.kind==='ray'&&point(l.origin)&&Number.isFinite(l.angle)))).slice(0,60).map(l=>l.kind==='connect'?{id:String(l.id),kind:'connect',a:String(l.a),b:String(l.b)}:{id:String(l.id),kind:'ray',origin:{e:l.origin.e,n:l.origin.n},angle:mod(l.angle),length:Math.max(500,Math.min(10000,Number(l.length)||5000))});
  if(point(raw.resultPoint))s.resultPoint={e:raw.resultPoint.e,n:raw.resultPoint.n};
  if(Array.isArray(raw.observations))s.observations=raw.observations.filter(o=>o&&Number.isFinite(o.angle)).slice(0,12).map(o=>({angle:mod(o.angle)}));
  return s;
}
export function effectiveDeclination(s){return s.advanced?s.declination:0;}
export function expectedCourse(s) {
  return magneticBearing(STATIONS[s.station],LANDMARKS[s.target],effectiveDeclination(s));
}
export function assess(s) {
  const station=STATIONS[s.station],decl=effectiveDeclination(s);
  if(s.task==='cross') {
    if(!s.resultPoint)return {kind:'missing',passed:false};
    const error=Math.hypot(s.resultPoint.e-station.e,s.resultPoint.n-station.n);
    return {kind:'distance',error,passed:error<=100};
  }
  if(s.task==='free')return {kind:'free',passed:false};
  const desired=s.task==='orient'?mod(s.north):s.task==='set'?s.exerciseValue:expectedCourse(s);
  const actual=s.task==='orient'?mod(s.paperAngle):s.task==='sight'?mod(s.yaw-s.north-decl):s.compass.ring;
  const error=s.task==='sight'?Math.max(Math.abs(angleDifference(actual,desired)),Math.abs(angleDifference(s.compass.ring,desired)),Math.abs(angleDifference(actual,s.compass.ring))):Math.abs(angleDifference(actual,desired));
  return {kind:'angle',error,passed:error<=3,desired};
}

export function nearbyTrees(e,n,radius=4){
  const trees=[];for(let x=Math.floor((e-radius)/12);x<=Math.floor((e+radius)/12);x++)for(let y=Math.floor((n-radius)/12);y<=Math.floor((n+radius)/12);y++)trees.push(...(treeCells.get(`${x},${y}`)||[]));return trees;
}
