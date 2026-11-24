import {COVERAGE_BOUNDARIES} from './coverage-boundaries.js';
import {areaPolygons,clipRingToBox,ringArea} from './area-geometry.js';
import {t} from './i18n.js';
export function coverageRegion(style){return style==='pq5basemap'?'germany':['lgln50','lgln50gray'].includes(style)?'lowerSaxony':null;}
const mercatorY=latitude=>Math.log(Math.tan(Math.PI/4+Math.max(-85.05112878,Math.min(85.05112878,latitude))*Math.PI/360))*180/Math.PI;
const projectedBoundaries=new Map();
// Measure the intersection in projected map space, rather than treating a
// single foreign corner (or the sea beyond a coastline) as missing coverage.
export function mapCoverageFraction(style,bounds){
 const region=coverageRegion(style);if(!region||!bounds)return null;
 let {w,e,s,n}=bounds;if(![w,e,s,n].every(Number.isFinite)||n<=s)return null;
 if(e<w)e+=360;if(e<=w)return null;
 e=Math.min(e,w+360);const width=e-w;
 w=((w+180)%360+360)%360-180;e=w+width;
 const box={w,e,s:mercatorY(s),n:mercatorY(n)},total=(e-w)*(box.n-box.s);if(total<=0)return null;
 if(!projectedBoundaries.has(region))projectedBoundaries.set(region,areaPolygons(COVERAGE_BOUNDARIES[region]).map(poly=>poly.map(ring=>ring.map(([x,y])=>[x,mercatorY(y)]))));
 let covered=0;
 for(const polygon of projectedBoundaries.get(region))for(const offset of [-360,0,360]){
  const clipped=polygon.map(ring=>clipRingToBox(ring.map(([x,y])=>[x+offset-w,y-box.s]),{w:0,e:width,s:0,n:box.n-box.s}));
  covered+=Math.max(0,ringArea(clipped[0])-clipped.slice(1).reduce((sum,ring)=>sum+ringArea(ring),0));
 }
 return Math.max(0,Math.min(1,covered/total));
}
export function outsideMapCoverage(style,bounds){
 const fraction=mapCoverageFraction(style,bounds);return fraction!==null&&fraction<.5-1e-9;
}
export function installCoverageNotice({container,map,getStyle,onSwitch}){
 const notice=document.createElement('div');notice.className='coverage-notice';notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 const text=document.createElement('p'),button=document.createElement('button');button.type='button';button.onclick=event=>{event.stopPropagation();onSwitch('pq5tk');};notice.append(text,button);container.append(notice);
 // Do not let clicks/touch on the notice start a rectangle or drag the map.
 for(const name of ['pointerdown','mousedown','touchstart','dblclick','click','wheel'])notice.addEventListener(name,event=>event.stopPropagation());
 function update(){
 const style=getStyle(),region=coverageRegion(style),b=map.getBounds(),bounds={w:b.getWest(),e:b.getEast(),s:b.getSouth(),n:b.getNorth()};
 const outside=region&&outsideMapCoverage(style,bounds);notice.hidden=!outside;
 if(outside){text.textContent=t('coverageOutside',{region:t(region==='germany'?'coverageGermany':'coverageLowerSaxony')});button.textContent=t('coverageSwitch');}
 }
 for(const event of ['moveend','zoomend','resize'])map.on(event,update);document.addEventListener('languagechange',update);update();return {update,element:notice};
}
