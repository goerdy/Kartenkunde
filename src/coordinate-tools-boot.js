import {libraries} from './libraries.js';
import './coordinate-tool-messages.js';
import {t,translatePage} from './i18n.js';
translatePage();
try{
 await Promise.all(libraries.filter(lib=>['maplibre-gl.js','maplibre-gl.css','proj4.js','mgrs.js'].includes(lib.file)).map(async lib=>{
  const load=url=>new Promise((resolve,reject)=>{const node=document.createElement(lib.css?'link':'script');if(lib.css){node.rel='stylesheet';node.href=url;}else node.src=url;node.integrity=lib.integrity;node.crossOrigin='anonymous';node.onload=resolve;node.onerror=()=>{node.remove();reject(Error(t('libraryError',{url})));};document.head.append(node);});
  try{const local=new URL('../vendor/'+lib.file,import.meta.url);if(document.documentElement.dataset.build)local.searchParams.set('v',document.documentElement.dataset.build);await load(local.href);}catch{await load(lib.url);}
 }));
 await import('./coordinate-tools.js');
}catch(error){document.getElementById('ctStatus').textContent=t('bootError',{detail:error.message});document.getElementById('ctStatus').classList.add('error');console.error(error);}
