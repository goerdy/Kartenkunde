// Standalone host: no map atlas, PDF tools, navigation controller or site.js needed.
import {getLanguage,setLanguage,translatePage} from './host.js';
translatePage();
const language=document.getElementById('language');
language.value=getLanguage();language.addEventListener('change',()=>setLanguage(language.value));
await import('./src/trainer-boot.js');
