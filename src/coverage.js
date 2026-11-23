import {COVERAGE_BOUNDARIES} from './coverage-boundaries.js';
import {inFeature} from './area-geometry.js';
import {t} from './i18n.js';
export function coverageRegion(style){return style==='pq5basemap'?'germany':['lgln50','lgln50gray'].includes(style)?'lowerSaxony':null;}
export function outsideMapCoverage(style,bounds){
 const region=coverageRegion(style);if(!region||!bounds)return false;
 const {w,e,s,n}=bounds;if(![w,e,s,n].every(Number.isFinite))return false;
 // Sample the centre and all edges as well as corners: a viewport can contain
 // foreign land even when its centre lies within the provider's home territory.
 for(const x of [w,(w+e)/2,e])for(const y of [s,(s+n)/2,n])if(!inFeature([x,y],COVERAGE_BOUNDARIES[region]))return true;
 return false;
}
export function installCoverageNotice({container,map,getStyle,getSelection=()=>null,onSwitch}){
 const notice=document.createElement('div');notice.className='coverage-notice';notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 const text=document.createElement('p'),button=document.createElement('button');button.type='button';button.onclick=event=>{event.stopPropagation();onSwitch('pq5tk');};notice.append(text,button);container.append(notice);
 // Do not let clicks/touch on the notice start a rectangle or drag the map.
 for(const name of ['pointerdown','mousedown','touchstart','dblclick','click','wheel'])notice.addEventListener(name,event=>event.stopPropagation());
 function update(){
 const style=getStyle(),region=coverageRegion(style),b=map.getBounds(),bounds={w:b.getWest(),e:b.getEast(),s:b.getSouth(),n:b.getNorth()};
 const outside=region&&(outsideMapCoverage(style,bounds)||outsideMapCoverage(style,getSelection()));notice.hidden=!outside;
 if(outside){text.textContent=t('coverageOutside',{region:t(region==='germany'?'coverageGermany':'coverageLowerSaxony')});button.textContent=t('coverageSwitch');}
 }
 for(const event of ['moveend','zoomend','resize'])map.on(event,update);document.addEventListener('languagechange',update);update();return {update,element:notice};
}
