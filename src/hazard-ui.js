import {normalizeHazard,hazardConfig,hazardLegend,hazardAttribution} from './hazards.js';
import {t} from './i18n.js';
export function installHazardControls(L,map,onChange){
 const select=document.getElementById('hazard'),slider=document.getElementById('hazardOpacity'),controls=document.getElementById('hazardControls'),status=document.getElementById('hazardStatus'),legend=document.getElementById('hazardLegend'),output=document.getElementById('hazardOpacityValue');
 map.createPane('hazardPane');map.getPane('hazardPane').style.zIndex='350';map.getPane('hazardPane').style.pointerEvents='none';
 let layer=null,current='none',failed=false;
 const options=()=>normalizeHazard({id:select.value,opacity:Number(slider.value)/100});
 function sync(){const value=options(),config=hazardConfig(value);controls.hidden=!config;output.textContent=Math.round(value.opacity*100)+' %';
  if(current!==value.id){if(layer)map.removeLayer(layer);layer=null;failed=false;current=value.id;}
  const detail=map.getZoom()>=5;
  if(config&&detail&&!layer){const bounds=config.region==='nds'?[[51.1,6.5],[54.3,11.8]]:[[47,5],[56,16]];layer=L.tileLayer.wms(config.url,{layers:config.layer,version:'1.3.0',format:'image/png',transparent:true,opacity:value.opacity,pane:'hazardPane',tileSize:512,bounds,attribution:hazardAttribution(value),crossOrigin:true,maxZoom:20});layer.on('tileerror',()=>{failed=true;status.textContent=t('hazardLoadError');status.classList.add('error');});layer.addTo(map);}
  if(layer){if(!detail){map.removeLayer(layer);layer=null;}else{layer.setOpacity(value.opacity);const credit=hazardAttribution(value);if(layer.options.attribution!==credit){map.attributionControl.removeAttribution(layer.options.attribution);layer.options.attribution=credit;map.attributionControl.addAttribution(credit);}}}
  status.textContent=!config?'':failed?t('hazardLoadError'):!detail?t('hazardZoomHint'):t(config.kind==='rain'?'hazardRainHint':'hazardFloodHint');status.classList.toggle('error',failed);
  legend.replaceChildren();if(config)for(const item of hazardLegend(value)){const row=document.createElement('li'),swatch=document.createElement('span'),label=document.createElement('span');swatch.className='hazard-swatch';swatch.style.backgroundColor=item.color;label.textContent=item.label;row.append(swatch,label);legend.append(row);}
 }
 select.addEventListener('change',()=>{sync();onChange();});slider.addEventListener('input',()=>{sync();onChange();});map.on('zoomend',sync);document.addEventListener('languagechange',sync);
 sync();return {options,set(value){const h=normalizeHazard(value);select.value=h.id;slider.value=String(Math.round(h.opacity*100));sync();},sync};
}
