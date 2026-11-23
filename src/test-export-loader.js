import {libraries} from './libraries.js';
import {t} from './i18n.js';
let testExportModule;
export function loadTestExport(){
 if(testExportModule)return testExportModule;
 testExportModule=(async()=>{
 const files=['maplibre-gl.js','maplibre-gl.css','proj4.js','mgrs.js','jspdf.js'];
 await Promise.all(libraries.filter(lib=>files.includes(lib.file)).map(async lib=>{
 const load=url=>new Promise((resolve,reject)=>{const node=document.createElement(lib.css?'link':'script');if(lib.css){node.rel='stylesheet';node.href=url;}else node.src=url;node.integrity=lib.integrity;node.crossOrigin='anonymous';node.onload=resolve;node.onerror=()=>{node.remove();reject(Error(t('libraryError',{url})));};document.head.append(node);});
 try{const local=new URL('../vendor/'+lib.file,import.meta.url);if(document.documentElement.dataset.build)local.searchParams.set('v',document.documentElement.dataset.build);await load(local.href);}catch{await load(lib.url);}
 }));
 return import('./test-export.js');
 })().catch(error=>{testExportModule=null;throw error;});return testExportModule;
}
