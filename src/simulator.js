import {maplibregl,mgrs} from './vendor.js';
import {MAP_STYLES,styleURL,applyMapStyle,setPreviewStyle,styleCredit} from './render.js';
import {zoneBoundarySegments,project,unproject,gridEdgeLabel,clipLine} from './geo.js';
import {PLANZEIGER_TYPES,simulatorProjection,gridGeometry,rulerTicks,snapNorthing,rulerCoordinate,rulerSpan,frameGraduations} from './simulator-geometry.js';
import {t,getLanguage} from './i18n.js';
const simEl=id=>document.getElementById(id),stage=simEl('simStage'),root=simEl('content'),styleSelect=simEl('simStyle'),scaleSelect=simEl('simScale'),typeSelect=simEl('simType'),handle=simEl('simRuler');
let gridView='';
let settings={};try{settings=JSON.parse(localStorage.getItem('kartenkunde-simulator-v1')||'{}')||{};}catch{}
let scale=[25000,50000].includes(Number(settings.scale))?Number(settings.scale):50000,style=Object.hasOwn(MAP_STYLES,settings.style)?settings.style:'pq5basemap',anchor,drag=null,frame=0,lastError=0;
scaleSelect.value=String(scale);simEl('simSnap').checked=settings.snap!==false;
function translatedOptions(){for(const [select,items]of [[styleSelect,Object.entries(MAP_STYLES).map(([id,s])=>({id,key:s.label}))],[typeSelect,PLANZEIGER_TYPES]]){const value=select.value;select.replaceChildren(...items.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=t(item.key);return option;}));if([...select.options].some(o=>o.value===value))select.value=value;}}
translatedOptions();styleSelect.value=style;typeSelect.value=settings.instrumentVersion===2&&PLANZEIGER_TYPES.some(p=>p.id===settings.type)?settings.type:'frame';
const initialCenter=Array.isArray(settings.center)&&settings.center.length===2&&settings.center.every(Number.isFinite)&&Math.abs(settings.center[0])<=179&&settings.center[1]>=-79&&settings.center[1]<=83?settings.center:[7.92,53.67];
const tkOptions=()=>({scale,contours:true,streetNames:false});
const map=new maplibregl.Map({container:simEl('simMap'),style:styleURL(style,tkOptions()),center:initialCenter,zoom:Number.isFinite(settings.zoom)?Math.max(10,Math.min(18,settings.zoom)):13,minZoom:10,maxZoom:18,maxBounds:[[-179.9,-79.8],[179.9,83.8]],renderWorldCopies:false,pitch:0,bearing:0,dragRotate:false,touchZoomRotate:true,attributionControl:false,fadeDuration:0});
map.touchZoomRotate.disableRotation();map.keyboard.disableRotation();map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-left');map.addControl(new maplibregl.ScaleControl({unit:'metric'}),'bottom-left');
map.getCanvas().setAttribute('aria-label',t('simMap'));
function store(){try{localStorage.setItem('kartenkunde-simulator-v1',JSON.stringify({instrumentVersion:2,scale,style,type:typeSelect.value,snap:simEl('simSnap').checked,center:map.getCenter().toArray(),zoom:map.getZoom()}));}catch{}}
function status(key,error=false){const el=simEl('simStatus');el.hidden=key==='simReady';el.textContent=el.hidden?'':t(key);el.classList.toggle('error',error);}
let credits;
function credit(){if(credits)map.removeControl(credits);credits=new maplibregl.AttributionControl({customAttribution:styleCredit(style),compact:true});map.addControl(credits);map.getCanvas().style.filter=MAP_STYLES[style].monochrome?'grayscale(1)':'';}
// Replace automatic attribution with the same source credits used on print maps.
credit();
map.on('style.load',()=>{Promise.resolve(applyMapStyle(map,style,tkOptions())).catch(()=>status('farmUnavailable',true));});
map.on('error',()=>{lastError=Date.now();status('mapUnavailable',true);});
map.on('idle',()=>{if(Date.now()-lastError>1500)status('simReady');});
map.on('farmwarning',()=>status('farmUnavailable',true));
const NS='http://www.w3.org/2000/svg';
function svgNode(tag,attrs={},content){const node=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));if(content!==undefined)node.textContent=content;return node;}
function viewport(){const a=stage.getBoundingClientRect(),b=simEl('simMap').getBoundingClientRect();return {x:b.left-a.left,y:b.top-a.top,width:b.width,height:b.height};}
function screen(ll){const p=map.project(ll),v=viewport();return [p.x+v.x,p.y+v.y];}
function unprojectPointer(event){const rect=simEl('simMap').getBoundingClientRect();return map.unproject([event.clientX-rect.left,event.clientY-rect.top]);}
function segment(a,b,attrs={}){return svgNode('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],...attrs});}
function gridDraw(){
 const svg=simEl('simGrid'),width=stage.clientWidth,height=stage.clientHeight,v=viewport();svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
 const bounds=map.getBounds(),box={w:bounds.getWest(),e:bounds.getEast(),s:Math.max(-80,bounds.getSouth()),n:Math.min(84,bounds.getNorth())},fragment=document.createDocumentFragment(),defs=svgNode('defs'),clip=svgNode('clipPath',{id:'sim-grid-clip'}),lines=svgNode('g',{'clip-path':'url(#sim-grid-clip)'}),labels=svgNode('g',{class:'sim-border-labels'}),placed=[];
 clip.append(svgNode('rect',{x:v.x,y:v.y,width:v.width,height:v.height}));defs.append(clip);fragment.append(defs);
 for(const rect of [{x:0,y:0,width,height:v.y},{x:0,y:v.y+v.height,width,height:height-v.y-v.height},{x:0,y:v.y,width:v.x,height:v.height},{x:v.x+v.width,y:v.y,width:width-v.x-v.width,height:v.height}])fragment.append(svgNode('rect',{...rect,class:'sim-border-paper'}));
 function edgeLabel(edge,point,grid){const horizontal=edge==='top'||edge==='bottom',along=horizontal?point[0]:point[1];if(along<(horizontal?v.x:v.y)+16||along>(horizontal?v.x+v.width:v.y+v.height)-16)return;if(placed.some(p=>p.edge===edge&&Math.abs(p.along-along)<30))return;placed.push({edge,along});let x=point[0],y=point[1],tick=[...point];if(edge==='top'){y=v.y-12;tick[1]-=6;}if(edge==='bottom'){y=v.y+v.height+22;tick[1]+=6;}if(edge==='left'){x=v.x-16;y+=6;tick[0]-=6;}if(edge==='right'){x=v.x+v.width+16;y+=6;tick[0]+=6;}labels.append(segment(point,tick,{class:'sim-border-tick'}),svgNode('text',{x,y,class:'sim-grid-label','text-anchor':'middle','data-edge':edge},gridEdgeLabel(grid.value)));}
 for(const grid of gridGeometry(box)){
  const points=grid.points.map(screen);lines.append(svgNode('polyline',{points:points.map(p=>p.join(',')).join(' '),class:'sim-grid-line'}));
  for(let i=1;i<points.length;i++){const clipped=clipLine(points[i-1].map((n,k)=>n-(k?v.y:v.x)),points[i].map((n,k)=>n-(k?v.y:v.x)),v.width,v.height);if(!clipped)continue;for(const p of clipped){const actual=[p[0]+v.x,p[1]+v.y];if(Math.abs(p[1])<1e-5)edgeLabel('top',actual,grid);if(Math.abs(p[1]-v.height)<1e-5)edgeLabel('bottom',actual,grid);if(Math.abs(p[0])<1e-5)edgeLabel('left',actual,grid);if(Math.abs(p[0]-v.width)<1e-5)edgeLabel('right',actual,grid);}}
 }
 for(const edge of zoneBoundarySegments(box))lines.append(svgNode('polyline',{points:edge.map(screen).map(p=>p.join(',')).join(' '),class:'sim-zone-line'}));
 // Each run of a native MGRS 100 km square is identified at the frame, never
 // as a floating label over the map. Sampling also covers zone/band transitions.
 for(const edge of ['top','bottom','left','right']){const horizontal=edge==='top'||edge==='bottom',length=horizontal?v.width:v.height;let runs=[];for(let d=1;d<length;d+=6){const ll=map.unproject(horizontal?[d,edge==='top'?1:v.height-1]:[edge==='left'?1:v.width-1,d]);const match=mgrs.forward([ll.lng,ll.lat],1).match(/^(\d{1,2}[A-Z])([A-Z]{2})/);if(!match)continue;const code=match[1]+' '+match[2],last=runs.at(-1);if(last?.code===code)last.end=d;else runs.push({code,start:d,end:d});}for(const run of runs){if(run.end-run.start<70)continue;const mid=(run.start+run.end)/2;let x=horizontal?v.x+mid:edge==='left'?13:width-13,y=horizontal?edge==='top'?17:height-10:v.y+mid;labels.append(svgNode('text',{x,y,class:'sim-square-label','text-anchor':'middle',...(horizontal?{}:{transform:`rotate(${edge==='left'?-90:90} ${x} ${y})`})},run.code));}}
 fragment.append(lines,svgNode('rect',{x:v.x,y:v.y,width:v.width,height:v.height,class:'sim-border-outline'}),labels);svg.replaceChildren(fragment);
}
function centreAnchor(){const c=map.getCenter(),projection=simulatorProjection(c.lng,c.lat),p=project(projection.crs,[c.lng,c.lat]),half=rulerSpan(typeSelect.value,scale)/2;anchor={...projection,easting:p[0]+half,northing:Math.round((p[1]-half)/1000)*1000};schedule();}
function frameRuler(fragment,p,span){
 const rim=span*.28,round=span*.045;
 const pt=(e,n)=>p(e,n).join(' ');
 const outer=`M ${pt(-rim+round,-rim)} L ${pt(span+rim-round,-rim)} Q ${pt(span+rim,-rim)} ${pt(span+rim,-rim+round)} L ${pt(span+rim,span+rim-round)} Q ${pt(span+rim,span+rim)} ${pt(span+rim-round,span+rim)} L ${pt(-rim+round,span+rim)} Q ${pt(-rim,span+rim)} ${pt(-rim,span+rim-round)} L ${pt(-rim,-rim+round)} Q ${pt(-rim,-rim)} ${pt(-rim+round,-rim)} Z`;
 const inner=`M ${pt(0,0)} L ${pt(span,0)} L ${pt(span,span)} L ${pt(0,span)} Z`;
 fragment.append(svgNode('path',{d:outer+' '+inner,'fill-rule':'evenodd',class:'sim-frame-body'}));
 fragment.append(svgNode('polygon',{points:[[0,0],[span,0],[span,span],[0,span]].map(q=>p(...q).join(',')).join(' '),class:'sim-frame-window'}));
 for(const side of ['bottom','right','top','left'])for(let row=0;row<2;row++){
  const rowScale=(side==='bottom'||side==='right')?[25000,50000][row]:[100000,200000][row],active=rowScale===scale,base=row*rim*.47,labelOffset=base+rim*.32;
  const at=(distance,offset)=>side==='bottom'?p(distance,-offset):side==='right'?p(-offset,distance):side==='top'?p(span-distance,span+offset):p(span+offset,span-distance);
  const ticks=frameGraduations(rowScale,scale),start=at(0,base),end=at(span,base);
  fragment.append(segment(start,end,{class:'sim-frame-rule'+(active?' active':'')}));
  const screenSpan=Math.hypot(end[0]-start[0],end[1]-start[1]),labelEvery=screenSpan<240?2:1;
  for(const [i,tick]of ticks.entries()){
   if(!tick.major&&screenSpan/125<1.25)continue;
   fragment.append(segment(at(tick.distance,base),at(tick.distance,base+rim*(tick.major?.2:i%5===0?.12:.07)),{class:'sim-ruler-tick'+(active?' active':'')}));
   if(tick.major&&(i/10)%labelEvery===0){const q=at(tick.distance,labelOffset),text=rowScale<100000?(tick.metres>0&&tick.metres%1000===0?tick.metres/1000+' km':String(tick.metres/100)):String(tick.metres/1000).replace('.',getLanguage()==='en'?'.':',');fragment.append(svgNode('text',{x:q[0],y:q[1],class:'sim-frame-number'+(active?' active':''),'text-anchor':'middle','data-side':side,'data-scale':rowScale,'data-metres':tick.metres,...(rowScale>=100000?{transform:`rotate(180 ${q[0]} ${q[1]})`}:{})},text));}
  }
  const caption=at(span+rim*.5,labelOffset),endLabel=at(span,base+rim*.12),value=rowScale*.05/1000;
  if(side==='bottom'||side==='top')fragment.append(svgNode('text',{x:caption[0],y:caption[1],class:'sim-frame-scale'+(active?' active':''),'text-anchor':'middle',...(rowScale>=100000?{transform:`rotate(180 ${caption[0]} ${caption[1]})`}:{})},'1:'+rowScale.toLocaleString(getLanguage())));
  if(!ticks.at(-1).major)fragment.append(svgNode('text',{x:endLabel[0],y:endLabel[1],class:'sim-frame-end','text-anchor':'middle',...(rowScale>=100000?{transform:`rotate(180 ${endLabel[0]} ${endLabel[1]})`}:{})},value===1.25?'1¼':value===2.5?'2½':String(value)));
 }
 // Selected reading axes meet at the bottom-right corner of the aperture.
 fragment.append(segment(p(0,0),p(span,0),{class:'sim-ruler-axis'}),segment(p(0,0),p(0,span),{class:'sim-ruler-axis'}));

}

function rulerDraw(){if(!anchor)return;const svg=simEl('simRuler');svg.setAttribute('viewBox',`0 0 ${stage.clientWidth} ${stage.clientHeight}`);const p=(e,n)=>screen(rulerCoordinate(anchor,e,n)),distance=rulerSpan(typeSelect.value,scale),origin=p(0,0),east=p(distance,0),north=p(0,distance),span=Math.hypot(east[0]-origin[0],east[1]-origin[1]),unit=span/distance,fragment=document.createDocumentFragment();
 if(typeSelect.value==='frame'){frameRuler(fragment,p,distance);}else{
 const shape=(coords,attrs)=>svgNode('polygon',{points:coords.map(([e,n])=>p(e,n).join(',')).join(' '),...attrs});
 if(typeSelect.value==='square')fragment.append(shape([[0,0],[1000,0],[1000,1000],[0,1000]],{class:'sim-ruler-sheet'}));
 const rim=26/Math.max(unit,.01);fragment.append(shape([[-rim,-rim],[1000,-rim],[1000,0],[0,0],[0,1000],[-rim,1000]],{class:'sim-ruler-body'}));
 fragment.append(segment(origin,east,{class:'sim-ruler-axis'}),segment(origin,north,{class:'sim-ruler-axis'}));
 for(const tick of rulerTicks(scale)){if(!tick.major&&unit*(scale===25000?10:20)<2)continue;
  const offset=(tick.major?13:6)/Math.max(unit,.01),eastPoint=p(tick.metres,0),northPoint=p(0,tick.metres);
  fragment.append(segment(eastPoint,p(tick.metres,-offset),{class:'sim-ruler-tick'}),segment(northPoint,p(-offset,tick.metres),{class:'sim-ruler-tick'}));
  if(tick.major&&tick.metres>0&&(span>150||tick.metres%500===0)){const ep=p(tick.metres,-20/Math.max(unit,.01)),np=p(-20/Math.max(unit,.01),tick.metres);fragment.append(svgNode('text',{x:ep[0],y:ep[1],class:'sim-ruler-number','text-anchor':'middle'},String(tick.metres/100)),svgNode('text',{x:np[0],y:np[1],class:'sim-ruler-number','text-anchor':'middle'},String(tick.metres/100)));}
 }
 const zero=p(-35/Math.max(unit,.01),-35/Math.max(unit,.01));fragment.append(svgNode('text',{x:zero[0],y:zero[1],class:'sim-ruler-number','text-anchor':'middle'},'0'));
 const caption=p(500,-48/Math.max(unit,.01));fragment.append(svgNode('text',{x:caption[0],y:caption[1],class:'sim-ruler-caption','text-anchor':'middle'},`1 : ${scale.toLocaleString(getLanguage())} · 1 km`));
 }
 svg.replaceChildren(fragment);
 handle.classList.toggle('snapped',simEl('simSnap').checked&&Math.abs(anchor.northing%1000)<.001);
 simEl('simView').textContent=t('simView',{percent:Math.round(span/(distance/scale*1000/25.4*96)*100),zone:anchor.zone});
}
function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const key=map.getCenter().toArray().join(',')+':'+map.getZoom()+':'+stage.clientWidth+':'+stage.clientHeight;if(key!==gridView){gridView=key;gridDraw();}rulerDraw();});}
function moveAnchor(easting,northing,useSnap=true,inputCrs=anchor.crs){const ll=unproject(inputCrs,[easting,northing]);if(ll[0]<-179.9||ll[0]>179.9||ll[1]<-79.8||ll[1]>83.8)return;const projection=simulatorProjection(...ll),xy=project(projection.crs,ll);easting=xy[0];northing=xy[1];const a=screen(ll),b=screen(unproject(projection.crs,[easting,northing+100])),ratio=Math.hypot(a[0]-b[0],a[1]-b[1])/100,snapped=snapNorthing(northing,ratio,useSnap&&simEl('simSnap').checked);anchor={...projection,easting,northing:snapped.value};simEl('simSnapState').textContent=snapped.snapped?t('simSnapped'):'';schedule();}
function startDrag(event){if(event.button!==undefined&&event.button!==0)return;event.preventDefault();event.stopPropagation();handle.focus({preventScroll:true});const ll=unprojectPointer(event),xy=project(anchor.crs,[ll.lng,ll.lat]);drag={id:event.pointerId,crs:anchor.crs,dx:anchor.easting-xy[0],dy:anchor.northing-xy[1]};map.dragPan.disable();event.currentTarget.setPointerCapture(event.pointerId);}
function duringDrag(event){if(!drag||event.pointerId!==drag.id)return;event.preventDefault();const ll=unprojectPointer(event),xy=project(drag.crs,[ll.lng,ll.lat]);moveAnchor(xy[0]+drag.dx,xy[1]+drag.dy,true,drag.crs);}
function endDrag(event){if(!drag||event.pointerId!==drag.id)return;drag=null;map.dragPan.enable();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);store();}
for(const element of [handle]){element.addEventListener('pointerdown',startDrag);element.addEventListener('pointermove',duringDrag);element.addEventListener('pointerup',endDrag);element.addEventListener('pointercancel',endDrag);element.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId){drag=null;map.dragPan.enable();}});}
handle.addEventListener('keydown',event=>{const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[event.key];if(!direction)return;event.preventDefault();const step=(scale===25000?10:100)*(event.shiftKey?10:1);moveAnchor(anchor.easting+direction[0]*step,anchor.northing+direction[1]*step,direction[1]===0);store();});
simEl('simSnap').onchange=()=>{moveAnchor(anchor.easting,anchor.northing);store();};
styleSelect.onchange=()=>{style=styleSelect.value;setPreviewStyle(map,simEl('simMap'),style,tkOptions());simEl('simMap').style.filter='';credit();store();status('simLoading');};
scaleSelect.onchange=()=>{const previous=scale;scale=Number(scaleSelect.value);map.setZoom(map.getZoom()+Math.log2(previous/scale));setPreviewStyle(map,simEl('simMap'),style,tkOptions());simEl('simMap').style.filter='';credit();store();schedule();};
typeSelect.onchange=()=>{simEl('simReset').click();store();schedule();};
simEl('simReset').onclick=()=>{const c=map.getCenter(),v=viewport(),metresPerPixel=(typeSelect.value==='frame'?rulerSpan('frame',scale)*1.56:1000)/(Math.min(v.width,v.height)*(typeSelect.value==='frame'?.78:.48)),zoom=Math.log2(40075016.68557849*Math.cos(c.lat*Math.PI/180)/(512*metresPerPixel));map.jumpTo({zoom});centreAnchor();if(typeSelect.value==='frame'){const half=rulerSpan('frame',scale)/2;map.jumpTo({center:rulerCoordinate(anchor,half,half)});}schedule();};
simEl('simFullscreen').onclick=async()=>{try{if(document.fullscreenElement===root)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else{root.classList.toggle('sim-fullscreen-fallback');document.body.classList.toggle('sim-fallback-active',root.classList.contains('sim-fullscreen-fallback'));}}catch{root.classList.toggle('sim-fullscreen-fallback');document.body.classList.toggle('sim-fallback-active',root.classList.contains('sim-fullscreen-fallback'));}fullscreenLabel();};
function fullscreenLabel(){simEl('simFullscreen').textContent=t(document.fullscreenElement===root||root.classList.contains('sim-fullscreen-fallback')?'simExitFullscreen':'simFullscreen');map.resize();schedule();}
document.addEventListener('fullscreenchange',fullscreenLabel);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.classList.contains('sim-fullscreen-fallback')){root.classList.remove('sim-fullscreen-fallback');document.body.classList.remove('sim-fallback-active');fullscreenLabel();}});
document.addEventListener('languagechange',()=>{translatedOptions();fullscreenLabel();schedule();});
new ResizeObserver(()=>{map.resize();schedule();}).observe(stage);
map.on('move',schedule);map.on('moveend',()=>{store();if(anchor&&!drag){const p=screen(rulerCoordinate(anchor,0,0));if(p[0]<-50||p[0]>stage.clientWidth+50||p[1]<-50||p[1]>stage.clientHeight+50)centreAnchor();}schedule();});
centreAnchor();if(!Number.isFinite(settings.zoom)||settings.instrumentVersion!==2)simEl('simReset').click();schedule();
export {map,anchor,moveAnchor,centreAnchor};
