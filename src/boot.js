import {t,setLanguage,getLanguage,translatePage} from './i18n.js';
import {libraries} from './libraries.js';
translatePage();
const languageSelect=document.getElementById('language');languageSelect.value=getLanguage();languageSelect.onchange=()=>setLanguage(languageSelect.value);
function load(url,css,integrity){return new Promise((resolve,reject)=>{const node=document.createElement(css?'link':'script');if(css){node.rel='stylesheet';node.href=url;}else node.src=url;if(integrity&&new URL(url,document.baseURI).protocol!=='file:'){node.integrity=integrity;node.crossOrigin='anonymous';}node.onload=resolve;node.onerror=()=>{node.remove();reject(Error(t('libraryError',{url})));};document.head.append(node);});}
try{
 await Promise.all(libraries.map(async lib=>{try{const local=new URL(`../vendor/${lib.file}`,import.meta.url);const version=document.documentElement.dataset.build;if(version)local.searchParams.set('v',version);await load(local.href,lib.css,lib.integrity);}catch{await load(lib.url,lib.css,lib.integrity);}}));
 if(!globalThis.L||!globalThis.maplibregl||!globalThis.proj4||!globalThis.mgrs||!globalThis.jspdf||!globalThis.qrcode)throw Error(t('libraryInit'));
 await import('./main.js');
}catch(e){const s=document.getElementById('status');s.textContent=t('bootError',{detail:e.message});s.classList.add('error');document.getElementById('mapCaption').textContent=t('bootCaption');console.error(e);}
