import {GRID_PREFIX} from './trainer-grid.js';
import {PQ5_TK_COLORS as C,frameGraduations} from '../host.js';
import {TRAINING_POINTS,TOWN_PARK,CAMPUS,INDUSTRY,INDUSTRIAL_FENCES,WORLD_SIZE,MAP_SCALE,FIELDS,QUARRY,SERVICE_SITES,LANDMARKS,STATIONS,FORESTS,LAKE,MARSH,WATERCOURSES,BRIDGES,SETTLEMENTS,ROAD_FEATURES,BUILDINGS,PLACE_LABELS,heightAt,pointAlong,effectiveDeclination,toUnit,mod} from './trainer-world.js';
import {t,getLanguage} from '../host.js';
export const SIZE=2048,PAD=210,INNER=SIZE-PAD*2,MAP_SIDE=WORLD_SIZE/MAP_SCALE,SHEET_SIDE=MAP_SIDE*SIZE/INNER;
export const canvasPoint=p=>[PAD+p.e/WORLD_SIZE*INNER,SIZE-PAD-p.n/WORLD_SIZE*INNER];
export function createCanvas(w=SIZE,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function path(ctx,points,close=false){ctx.beginPath();points.forEach((p,i)=>{const [x,y]=canvasPoint({e:p[0],n:p[1]});if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});if(close)ctx.closePath();}
export function contours() {
  const result=[],step=50,count=WORLD_SIZE/step+1,grid=new Float32Array(count*count);
  for(let x=0;x<count;x++)for(let z=0;z<count;z++)grid[x*count+z]=heightAt(x*step,z*step);
  for(let x=0;x<count-1;x++)for(let z=0;z<count-1;z++){
    const e=x*step,n=z*step,p=[[e,n],[e+step,n],[e+step,n+step],[e,n+step]],h=[grid[x*count+z],grid[(x+1)*count+z],grid[(x+1)*count+z+1],grid[x*count+z+1]],min=Math.min(...h),max=Math.max(...h);
    for(let level=Math.ceil(min/10)*10;level<=max;level+=10){const cross=[];
      for(let i=0;i<4;i++){const j=(i+1)%4;if((h[i]>=level)===(h[j]>=level))continue;const f=(level-h[i])/(h[j]-h[i]);cross.push([p[i][0]+f*(p[j][0]-p[i][0]),p[i][1]+f*(p[j][1]-p[i][1])]);}
      if(cross.length===2)result.push({level,points:cross});else if(cross.length===4)result.push({level,points:cross.slice(0,2)},{level,points:cross.slice(2)});
    }
  }
  return result;
}
const CONTOURS=contours();
function text(ctx,value,x,y,size=24,color=C.ink){ctx.font=`${size}px sans-serif`;ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle=C.paper;ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);}
export function drawMap(canvas,s,solution=false) {
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,SIZE,SIZE);ctx.fillStyle=C.paper;ctx.fillRect(0,0,SIZE,SIZE);
  ctx.fillStyle=C.field;ctx.fillRect(PAD,PAD,INNER,INNER);
  for(const field of FIELDS){path(ctx,field.polygon,true);ctx.fillStyle=field.crop==='wheat'?'#e7e2b8':field.crop==='ploughed'?'#dfd0b5':'#d8e2bc';ctx.fill();ctx.strokeStyle='#96a17a';ctx.lineWidth=1;ctx.stroke();}
  for(const forest of FORESTS){path(ctx,forest,true);ctx.fillStyle=C.forest;ctx.fill();ctx.strokeStyle='#76a25f';ctx.lineWidth=2;ctx.stroke();}
  // The summit is above the same tree line used by the 3D forest.
  ctx.fillStyle='#e3dfce';for(let e=5200;e<7900;e+=40)for(let n=4200;n<7900;n+=40)if(heightAt(e+20,n+20)>415){const [x,y]=canvasPoint({e,n:n+40});ctx.fillRect(x,y,40/WORLD_SIZE*INNER+.4,40/WORLD_SIZE*INNER+.4);}
  path(ctx,LAKE,true);ctx.fillStyle=C.water;ctx.fill();ctx.strokeStyle=C.waterLine;ctx.lineWidth=3;ctx.stroke();
  path(ctx,QUARRY.polygon,true);ctx.fillStyle='#c3beb0';ctx.fill();ctx.strokeStyle=C.terrain;ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle=C.terrain;for(const c of CONTOURS){path(ctx,c.points);ctx.lineWidth=c.level%50===0?2:1;ctx.stroke();}
  for(const town of SETTLEMENTS){path(ctx,town.polygon,true);ctx.fillStyle=C.built;ctx.fill();}
  {for(const site of [CAMPUS,INDUSTRY]){const [x,y]=canvasPoint(site),w=site.w/WORLD_SIZE*INNER,d=site.d/WORLD_SIZE*INNER;ctx.fillStyle=C.built;ctx.fillRect(x-w/2,y-d/2,w,d);}}
  for(const fence of INDUSTRIAL_FENCES){const [x,y]=canvasPoint(fence);ctx.strokeStyle=C.ink;ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(x-fence.w/2/WORLD_SIZE*INNER,y-fence.d/2/WORLD_SIZE*INNER);ctx.lineTo(x+fence.w/2/WORLD_SIZE*INNER,y+fence.d/2/WORLD_SIZE*INNER);ctx.stroke();}
  path(ctx,MARSH,true);ctx.fillStyle='#d1ddbc';ctx.fill();ctx.save();ctx.clip();ctx.strokeStyle='#689dac';ctx.lineWidth=2;for(let y=450;y<1500;y+=18)for(let x=900;x<1600;x+=26){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+11,y);ctx.moveTo(x+5,y);ctx.lineTo(x+3,y-6);ctx.stroke();}ctx.restore();
  for(const water of WATERCOURSES){path(ctx,water.points);ctx.strokeStyle=C.waterLine;ctx.lineWidth=Math.max(3,water.width/WORLD_SIZE*INNER+2);ctx.lineJoin='round';ctx.stroke();if(water.id==='river'){ctx.strokeStyle=C.water;ctx.lineWidth=water.width/WORLD_SIZE*INNER;ctx.stroke();}}
  for(const road of [...ROAD_FEATURES].sort((a,b)=>(a.kind==='highway')-(b.kind==='highway'))){path(ctx,road.points);ctx.lineJoin='round';ctx.strokeStyle=C.ink;ctx.lineWidth=road.kind==='highway'?8:road.kind==='street'?4:3;ctx.stroke();ctx.strokeStyle=road.kind==='track'?C.paper:C.secondary;ctx.lineWidth=road.kind==='highway'?5:road.kind==='street'?2:1.5;ctx.stroke();}
  for(const bridge of BRIDGES){const [x,y]=canvasPoint(bridge),half=bridge.length/WORLD_SIZE*INNER/2;ctx.strokeStyle=C.ink;ctx.lineWidth=2.5;for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(x-half,y+sign*6);ctx.lineTo(x+half,y+sign*6);ctx.stroke();}}
  for(const b of BUILDINGS){const [x,y]=canvasPoint(b);ctx.fillStyle=C.building;const w=Math.max(3,b.w/WORLD_SIZE*INNER),d=Math.max(3,b.d/WORLD_SIZE*INNER);ctx.save();ctx.translate(x,y);ctx.rotate(-(b.angle||0)*Math.PI/180);ctx.fillRect(-w/2,-d/2,w,d);ctx.restore();}
  {const [x,y]=canvasPoint(CAMPUS.helipad);ctx.strokeStyle=C.ink;ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.stroke();ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle=C.ink;ctx.fillText('H',x,y+4);}
  for(const p of SERVICE_SITES){const [x,y]=canvasPoint(p);ctx.fillStyle=C.paper;ctx.fillRect(x-15,y-14,30,28);ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.strokeRect(x-15,y-14,30,28);ctx.fillStyle=p.color;ctx.font=`bold ${p.id==='thw'?12:22}px sans-serif`;ctx.textAlign='center';ctx.fillText(p.symbol,x,y+7);}
  ctx.strokeStyle='#55788d';ctx.lineWidth=1.8;ctx.fillStyle='#315267';ctx.font='24px monospace';ctx.textAlign='center';
  for(let i=0;i<=WORLD_SIZE/1000;i++){
    const a=PAD+i*1000/WORLD_SIZE*INNER;ctx.beginPath();ctx.moveTo(a,PAD);ctx.lineTo(a,SIZE-PAD);ctx.moveTo(PAD,a);ctx.lineTo(SIZE-PAD,a);ctx.stroke();
    ctx.fillText(String(i).padStart(2,'0'),a,PAD-18);ctx.fillText(String(i).padStart(2,'0'),a,SIZE-PAD+38);
    ctx.fillText(String(WORLD_SIZE/1000-i).padStart(2,'0'),PAD-36,a+8);ctx.fillText(String(WORLD_SIZE/1000-i).padStart(2,'0'),SIZE-PAD+38,a+8);
  }
  ctx.save();ctx.fillStyle='#315267';ctx.textAlign='left';ctx.font='bold 30px sans-serif';ctx.fillText(GRID_PREFIX,PAD,SIZE-28);ctx.restore();
  ctx.strokeStyle=C.ink;ctx.lineWidth=3;ctx.strokeRect(PAD,PAD,INNER,INNER);
  for(const p of LANDMARKS){const [x,y]=canvasPoint(p);ctx.strokeStyle=C.ink;ctx.fillStyle=C.ink;ctx.lineWidth=3;
    if(p.kind==='church'){ctx.strokeRect(x-7,y-6,14,12);ctx.beginPath();ctx.moveTo(x,y-23);ctx.lineTo(x,y-5);ctx.moveTo(x-8,y-17);ctx.lineTo(x+8,y-17);ctx.stroke();}
    else if(p.kind==='turbine'){ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(a)*15,y+Math.cos(a)*15);}ctx.stroke();}
    else if(p.kind==='summit'){ctx.beginPath();ctx.moveTo(x-10,y+8);ctx.lineTo(x,y-12);ctx.lineTo(x+10,y+8);ctx.closePath();ctx.stroke();text(ctx,String(Math.round(heightAt(p.e,p.n)))+' m',x+35,y-15,19);}
    else if(['castle','ruin'].includes(p.kind)){ctx.strokeRect(x-13,y-10,26,20);for(const dx of [-13,13])for(const dy of [-10,10])ctx.strokeRect(x+dx-3,y+dy-3,6,6);}
    else{ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x-10,y+8);ctx.lineTo(x+10,y+8);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
    if(p.kind!=='turbine')text(ctx,p.kind==='summit'?'Gipfelkreuz':p.name,x+(p.kind==='silo'?-25:0),y+(p.kind==='silo'?60:35),22);else text(ctx,p.name.split(' · ')[1],x,y+26,16);
  }
  for(const p of TRAINING_POINTS){const [x,y]=canvasPoint(p);ctx.strokeStyle=C.ink;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();text(ctx,p.name,x+60,y-8,16);}
  for(const p of PLACE_LABELS){const [x,y]=canvasPoint(p);text(ctx,p.name,x,y,p.size,p.water?C.waterLine:C.ink);}
  text(ctx,'SANKT FLORIAN · RÜSTHOLZ',SIZE/2,90,43);text(ctx,t('trMapScale'),SIZE/2,140,25);
  text(ctx,t('trMapLegend'),SIZE/2,1900,24);text(ctx,t('trMapOffset',{value:effectiveDeclination(s)}),SIZE/2,1940,24);
  text(ctx,t('trMapFiction'),SIZE/2,1990,21,'#a44131');
  text(ctx,'N',SIZE-95,180,34);ctx.strokeStyle=C.ink;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(SIZE-95,250);ctx.lineTo(SIZE-95,200);ctx.lineTo(SIZE-105,220);ctx.moveTo(SIZE-95,200);ctx.lineTo(SIZE-85,220);ctx.stroke();
  // A physical 1 km control bar, matching the sheet and instrument scale.
  const bx=PAD,by=1855,bw=INNER*1000/WORLD_SIZE;ctx.fillStyle=C.ink;ctx.fillRect(bx,by,bw,7);text(ctx,'0',bx,by+32,20);text(ctx,'1 km',bx+bw,by+32,20);
  ctx.save();ctx.beginPath();ctx.rect(PAD,PAD,INNER,INNER);ctx.clip();
  for(const line of s.lines){let a,b;if(line.kind==='connect'){a=s.points.find(p=>p.id===line.a);b=s.points.find(p=>p.id===line.b);}else{a=line.origin;b=pointAlong(a,line.angle,line.length);}
    if(!a||!b)continue;path(ctx,[[a.e,a.n],[b.e,b.n]]);ctx.strokeStyle=s.selected===line.id?'#ed8300':'#b02731';ctx.lineWidth=s.selected===line.id?6:4;ctx.stroke();
  }
  for(const p of s.points){const [x,y]=canvasPoint(p);ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fillStyle=s.selected===p.id?'#ed8300':'#b02731';ctx.fill();text(ctx,p.name,x+18,y-14,27,'#a12530');}
  const marker=(p,color,label)=>{const[x,y]=canvasPoint(p);ctx.strokeStyle=color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.moveTo(x-25,y);ctx.lineTo(x+25,y);ctx.moveTo(x,y-25);ctx.lineTo(x,y+25);ctx.stroke();if(label)text(ctx,label,x,y-32,24,color);};
  if(s.resultPoint)marker(s.resultPoint,'#c55113','?');
  if(s.helpers||solution)marker(s.player||STATIONS[s.station],'#127d4b','●');
  ctx.restore();
}
// Texture layers share the same footprint; the needle is painted in world north,
// never derived from the bezel value. This is also visible in the live mirror.
export function drawCompass(canvas,s,worldHeading,{held=false}={}) {
  const ctx=canvas.getContext('2d'),w=768,h=1280,cx=384,cy=490,r=282;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='rgba(243,250,227,.30)';ctx.strokeStyle='#233b3c';ctx.lineWidth=6;
  ctx.beginPath();ctx.roundRect(20,20,w-40,h-40,35);ctx.fill();ctx.stroke();
  // Distance ticks share the map's physical metre scale.
  const metresPerPx=(.087619047619/h)/MAP_SIDE*WORLD_SIZE;
  for(let metres=0;metres<4000;metres+=100){const y=1220-metres/metresPerPx,big=metres%500===0;ctx.beginPath();ctx.moveTo(25,y);ctx.lineTo(big?76:53,y);ctx.strokeStyle='#1f3436';ctx.lineWidth=3;ctx.stroke();}
  ctx.font='25px sans-serif';ctx.fillStyle='#1d3435';ctx.textAlign='center';
  ctx.save();ctx.translate(112,1000);ctx.rotate(-Math.PI/2);ctx.fillText('1 : 50 000 · 100 m',0,0);ctx.restore();
  // Compact 500 m planzeiger with 100 m ticks, calibrated to the same map.
  const km=500/metresPerPx;const x0=220,y0=1180;ctx.strokeStyle='#9b392f';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x0,y0-km);ctx.lineTo(x0,y0);ctx.lineTo(x0+km,y0);ctx.stroke();
  for(let i=0;i<=5;i++){ctx.beginPath();ctx.moveTo(x0+i*km/5,y0);ctx.lineTo(x0+i*km/5,y0-12);ctx.moveTo(x0,y0-i*km/5);ctx.lineTo(x0+12,y0-i*km/5);ctx.stroke();}
  ctx.fillStyle='#8a392e';ctx.fillText('500 m',x0+km/2,y0+35);
  // Right edge: a centimetre ruler, calibrated in real world metres.
  const pixelsPerCm=.01*(MAP_SIDE/(WORLD_SIZE/MAP_SCALE))/(.087619047619/h);
  for(let mm=0;mm<=80;mm++){const y=1220-mm/10*pixelsPerCm;if(y<50)break;ctx.strokeStyle='#253b3c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w-25,y);ctx.lineTo(w-(mm%10===0?75:45),y);ctx.stroke();if(mm%10===0){ctx.fillStyle='#253b3c';ctx.font='22px sans-serif';ctx.fillText(String(mm/10),w-95,y+7);}}
  // Fixed direction-of-travel arrow and index.
  ctx.strokeStyle='#a43c28';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(cx,175);ctx.lineTo(cx,55);ctx.moveTo(cx-23,85);ctx.lineTo(cx,55);ctx.lineTo(cx+23,85);ctx.stroke();
  ctx.fillStyle='#253b3c';ctx.beginPath();ctx.arc(cx,cy,r+8,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(252,255,233,.86)';ctx.beginPath();ctx.arc(cx,cy,r-34,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-s.compass.ring*Math.PI/180);
  ctx.strokeStyle='#547b5e';ctx.lineWidth=3;
  for(let x=-150;x<=150;x+=50){ctx.beginPath();ctx.moveTo(x,-170);ctx.lineTo(x,170);ctx.stroke();}
  ctx.strokeStyle='#3f8359';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-24,-38);ctx.lineTo(-24,-170);ctx.lineTo(0,-207);ctx.lineTo(24,-170);ctx.lineTo(24,-38);ctx.stroke();
  // Ring markings rotate independently of the red needle.
  const divisions=s.unit==='mil'?128:180;
  for(let i=0;i<divisions;i++){const d=i*360/divisions,a=d*Math.PI/180,big=i%(s.unit==='mil'?2:5)===0;ctx.strokeStyle='#fff7da';ctx.lineWidth=big?3:2;ctx.beginPath();ctx.moveTo(Math.sin(a)*(r-3),-Math.cos(a)*(r-3));ctx.lineTo(Math.sin(a)*(r-(big?24:13)),-Math.cos(a)*(r-(big?24:13)));ctx.stroke();
    if(i%(s.unit==='mil'?8:15)===0){ctx.save();ctx.translate(Math.sin(a)*(r-50),-Math.cos(a)*(r-50));ctx.rotate(a);ctx.font=s.unit==='mil'?'bold 27px sans-serif':'bold 32px sans-serif';ctx.fillStyle=d===0?'#b82d2b':'#233b3c';ctx.fillText(d===0?'N':d===90?'E':d===180?'S':d===270?'W':String(Math.round(toUnit(d,s.unit))),0,8);ctx.restore();}
  }
  ctx.restore();
  const needle=mod(s.north+effectiveDeclination(s)-worldHeading)*Math.PI/180;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(needle);ctx.fillStyle='#d23d32';ctx.beginPath();ctx.moveTo(0,-(r-29));ctx.lineTo(-19,0);ctx.lineTo(19,0);ctx.closePath();ctx.fill();ctx.fillStyle='#f4f0d4';ctx.beginPath();ctx.moveTo(0,r-29);ctx.lineTo(-19,0);ctx.lineTo(19,0);ctx.closePath();ctx.fill();ctx.strokeStyle='#293e40';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  ctx.fillStyle='#d5b06f';ctx.beginPath();ctx.arc(cx,cy,14,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#b82d2b';ctx.beginPath();ctx.moveTo(cx,cy-r-12);ctx.lineTo(cx-12,cy-r-40);ctx.lineTo(cx+12,cy-r-40);ctx.closePath();ctx.fill();
  ctx.fillStyle='#283e3f';ctx.font='bold 26px sans-serif';ctx.fillText(s.unit==='mil'?'6400':'360°',cx,875);
  if(held){ctx.font='20px sans-serif';ctx.fillText('ST. FLORIAN · FIELD',cx,1232);}
}

export const COMPASS_WIDTH=.052571428571,COMPASS_LENGTH=.087619047619,ROMER_SIDE=.078;
export function drawRomer(canvas){
  const c=canvas.getContext('2d'),size=canvas.width,edge=size*.014/.078,span=size*.05/.078,right=size-edge,bottom=size-edge;
  c.clearRect(0,0,size,size);c.fillStyle='rgba(255,250,177,.68)';c.strokeStyle='#284847';c.lineWidth=3;c.beginPath();c.roundRect(4,4,size-8,size-8,22);c.fill();c.stroke();c.clearRect(edge,edge,span,span);c.strokeRect(edge,edge,span,span);
  c.font='bold 20px sans-serif';c.textAlign='center';c.fillStyle='#24413e';
  const scales=[25000,50000,100000,200000];
  for(const side of ['bottom','right','top','left'])for(let row=0;row<2;row++){
    const scale=scales[(side==='top'||side==='left'?2:0)+row],offset=row*edge*.47;
    const at=(d,o)=>side==='bottom'?[right-d/(MAP_SCALE*.05)*span,bottom+o]:side==='right'?[right+o,bottom-d/(MAP_SCALE*.05)*span]:side==='top'?[edge+d/(MAP_SCALE*.05)*span,edge-o]:[edge-o,edge+d/(MAP_SCALE*.05)*span];
    c.strokeStyle=scale===MAP_SCALE?'#aa3f30':'#294c45';c.lineWidth=scale===MAP_SCALE?3:2;
    for(const tick of frameGraduations(scale,MAP_SCALE)){
      if(!tick.major)continue;const p=at(tick.distance,offset),q=at(tick.distance,offset+edge*.15);c.beginPath();c.moveTo(...p);c.lineTo(...q);c.stroke();const v=at(tick.distance,offset+edge*.34);c.save();c.translate(...v);if(side==='left'||side==='right')c.rotate(-Math.PI/2);c.fillText(tick.metres%1000===0?String(tick.metres/1000)+'k':String(tick.metres/100),0,6);c.restore();
    }
    const p=at(MAP_SCALE*.025,offset+edge*.42);c.save();c.translate(...p);if(side==='left'||side==='right')c.rotate(-Math.PI/2);c.font='bold 16px sans-serif';c.fillText('1:'+scale.toLocaleString('de'),0,0);c.restore();
  }
  c.strokeStyle='#b5382b';c.lineWidth=4;c.beginPath();c.moveTo(edge,bottom);c.lineTo(right,bottom);c.lineTo(right,edge);c.stroke();
}

export function drawVehicleInstruments(canvas,s,attitude){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  c.fillStyle='#202a29';c.fillRect(0,0,w,h);
  const centers=[w*.125,w*.375,w*.625,w*.875],cy=h*.48,r=h*.36;
  const label=(value,x,y,size=30)=>{c.fillStyle='#ece9cb';c.font=`${size}px sans-serif`;c.textAlign='center';c.fillText(value,x,y);};
  const dial=(x,title)=>{c.fillStyle='#5b6862';c.beginPath();c.arc(x,cy,r+9,0,Math.PI*2);c.fill();c.fillStyle='#101b1c';c.beginPath();c.arc(x,cy,r,0,Math.PI*2);c.fill();label(title,x,h-18,24);};
  const tick=(x,angle,major)=>{const a=angle*Math.PI/180;c.strokeStyle='#d9dec6';c.lineWidth=major?3:1.5;c.beginPath();c.moveTo(x+Math.sin(a)*(r-8),cy-Math.cos(a)*(r-8));c.lineTo(x+Math.sin(a)*(r-(major?25:15)),cy-Math.cos(a)*(r-(major?25:15)));c.stroke();};
  const needle=(x,angle)=>{c.save();c.translate(x,cy);c.rotate(angle*Math.PI/180);c.fillStyle='#ed7958';c.beginPath();c.moveTo(0,-r+30);c.lineTo(-5,15);c.lineTo(5,15);c.closePath();c.fill();c.fillStyle='#a8b6a2';c.beginPath();c.arc(0,0,8,0,Math.PI*2);c.fill();c.restore();};
  dial(centers[0],'km/h');
  for(let speed=0;speed<=160;speed+=10){const angle=-125+speed/160*250;tick(centers[0],angle,speed%20===0);if(speed%40===0){const a=angle*Math.PI/180;label(String(speed),centers[0]+Math.sin(a)*(r-49),cy-Math.cos(a)*(r-49)+8,25);}}
  needle(centers[0],-125+Math.min(160,Math.abs(s.vehicle.speed)*3.6)/160*250);
  const trip=(Math.floor((s.vehicle.tripMeters||0)/100)/10).toLocaleString(getLanguage(),{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false});
  c.fillStyle='#080f12';c.fillRect(centers[0]-85,cy+48,170,43);label(trip+' km',centers[0],cy+79,29);label('TRIP',centers[0],cy+119,22);
  const heading=mod(s.vehicle.heading-effectiveDeclination(s));dial(centers[1],t('fpDashboardCompass'));
  for(let d=0;d<360;d+=5){tick(centers[1],d-heading,d%30===0);if(d%30===0){const a=(d-heading)*Math.PI/180;label(d===0?'N':d===90?'E':d===180?'S':d===270?'W':String(d),centers[1]+Math.sin(a)*(r-47),cy-Math.cos(a)*(r-47)+8,26);}}
  c.fillStyle='#ed7958';c.beginPath();c.moveTo(centers[1],cy-r+7);c.lineTo(centers[1]-9,cy-r-13);c.lineTo(centers[1]+9,cy-r-13);c.closePath();c.fill();
  for(const [x,title,value]of [[centers[2],t('fpPitch'),attitude.pitch],[centers[3],t('fpRoll'),attitude.roll]]){
    dial(x,title);c.save();c.beginPath();c.arc(x,cy,r-4,0,Math.PI*2);c.clip();c.translate(x,cy);c.rotate(-value*Math.PI/180);c.fillStyle='#547c89';c.fillRect(-r,-r,r*2,r);c.fillStyle='#71694d';c.fillRect(-r,0,r*2,r);c.strokeStyle='#e8e4c5';c.lineWidth=3;c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.stroke();c.restore();
    for(let a=-30;a<=30;a+=5){tick(x,a*2,a%10===0);if(a%15===0){const rad=a*2*Math.PI/180;label(`${a}°`,x+Math.sin(rad)*(r-47),cy-Math.cos(rad)*(r-47)+7,21);}}
    needle(x,value*2);c.strokeStyle='#f2d388';c.lineWidth=5;c.beginPath();c.moveTo(x-35,cy);c.lineTo(x-10,cy);c.lineTo(x,cy+8);c.lineTo(x+10,cy);c.lineTo(x+35,cy);c.stroke();
  }
}

// In-game detail plan: same geography and footprints as the physical topo sheet.
export function drawTownPlan(canvas){
 const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
 const project=(e,n)=>[(e-280)/2500*W,70+(3560-n)/900*(H-150)];
 c.fillStyle=C.paper;c.fillRect(0,0,W,H);c.fillStyle=C.ink;c.textAlign='center';c.font='bold 28px sans-serif';c.fillText('Sankt Florian · Stadtplan',W/2,38);
 c.save();c.beginPath();c.rect(15,60,W-30,H-140);c.clip();
 for(const r of ROAD_FEATURES){if(!r.points.some(([e,n])=>e>=300&&e<=2780&&n>2650&&n<3600))continue;
  c.beginPath();r.points.forEach(([e,n],i)=>{const [x,y]=project(e,n);i?c.lineTo(x,y):c.moveTo(x,y);});c.strokeStyle=C.ink;c.lineWidth=r.width/2500*W+2;c.stroke();c.strokeStyle=r.kind==='highway'?'#e4bc75':'#fffdf3';c.lineWidth=r.width/2500*W;c.stroke();
  const [e1,n1]=r.points[0],[e2,n2]=r.points.at(-1);if(r.kind==='street'){const [x,y]=project((e1+e2)/2,(n1+n2)/2);c.save();c.translate(x,y-8);c.rotate(-Math.atan2(n2-n1,e2-e1));c.font='13px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle=C.paper;c.strokeText(r.name,0,0);c.fillStyle=C.ink;c.fillText(r.name,0,0);c.restore();}
 }
 {const p=INDUSTRY,[x,y]=project(p.e,p.n);c.fillStyle='#d4d4c7';c.fillRect(x-p.w/5000*W,y-p.d/1800*(H-150),p.w/2500*W,p.d/900*(H-150));c.strokeStyle=C.ink;c.lineWidth=1;c.setLineDash([3,3]);c.strokeRect(x-p.w/5000*W,y-p.d/1800*(H-150),p.w/2500*W,p.d/900*(H-150));c.setLineDash([]);c.fillStyle=C.ink;c.font='12px sans-serif';c.textAlign='center';c.fillText('Gewerbepark',x,y);}
 {const p=TOWN_PARK,[x,y]=project(p.e,p.n);c.fillStyle=C.forest;c.fillRect(x-p.w/5000*W,y-p.d/1800*(H-150),p.w/2500*W,p.d/900*(H-150));c.fillStyle=C.ink;c.textAlign='center';c.font='11px sans-serif';c.fillText('Lagebesprechung',x,y);}
 for(const b of BUILDINGS){if(b.e<300||b.e>2780||b.n<2700||b.n>3550)continue;const [x,y]=project(b.e,b.n);c.save();c.translate(x,y);c.rotate(-(b.angle||0)*Math.PI/180);c.fillStyle=b.service?'#8c9395':C.building;c.fillRect(-b.w/5000*W,-b.d/1800*(H-150),b.w/2500*W,b.d/900*(H-150));c.restore();}
 {const [x,y]=project(CAMPUS.helipad.e,CAMPUS.helipad.n);c.strokeStyle=C.ink;c.lineWidth=2;c.beginPath();c.arc(x,y,12,0,Math.PI*2);c.stroke();c.fillStyle=C.ink;c.textAlign='center';c.font='bold 18px sans-serif';c.fillText('H',x,y+6);c.font='12px sans-serif';c.fillText('Luftrettung',x,y+29);}
 const [cx,cy]=project(680,3150);c.fillStyle=C.ink;c.fillRect(cx-10,cy-18,20,36);c.font='16px sans-serif';c.fillText('St. Florian',cx,cy+38);
 for(const p of SERVICE_SITES){const [x,y]=project(p.e,p.n);c.fillStyle=C.paper;c.fillRect(x-19,y-17,38,34);c.strokeStyle=p.color;c.lineWidth=2;c.strokeRect(x-19,y-17,38,34);c.fillStyle=p.color;c.textAlign='center';c.font=`bold ${p.id==='thw'?15:25}px sans-serif`;c.fillText(p.symbol,x,y+9);c.font='13px sans-serif';c.fillText(p.name,x,y+34);}
 c.restore();c.fillStyle=C.ink;c.textAlign='left';c.font='15px sans-serif';c.fillText('F Feuerwehr   P Polizei   H Krankenhaus   R Rettungsdienst   THW Ortsverband   A Ausbildung',24,H-42);c.fillText('N ↑     Fiktives Gelände · Straßen und Gebäude entsprechen der 3D-Welt',24,H-17);
}
