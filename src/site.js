import {getLanguage,setLanguage,translatePage,t} from './i18n.js';
translatePage();
const siteLanguage=document.getElementById('language');siteLanguage.value=getLanguage();siteLanguage.onchange=()=>setLanguage(siteLanguage.value);
const siteToggle=document.querySelector('.nav-toggle'),siteNav=document.getElementById('site-navigation'),siteMobile=matchMedia('(max-width: 1100px)');
function closeSiteNavigation(returnFocus=false){siteToggle.setAttribute('aria-expanded','false');siteNav.hidden=siteMobile.matches;if(returnFocus)siteToggle.focus();}
siteToggle.onclick=()=>{const expanded=siteToggle.getAttribute('aria-expanded')!=='true';siteToggle.setAttribute('aria-expanded',String(expanded));siteNav.hidden=!expanded;};
siteMobile.addEventListener('change',()=>closeSiteNavigation());closeSiteNavigation();
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&siteMobile.matches&&siteToggle.getAttribute('aria-expanded')==='true'){closeSiteNavigation(true);}});
document.addEventListener('click',event=>{if(siteMobile.matches&&!event.target.closest('.site-header'))closeSiteNavigation();});
if(document.body.dataset.page==='home'&&location.hash.startsWith('#uebung='))location.replace(new URL('./uebungen.html'+location.search+location.hash,location.href));

function updateSiteTitle(){if(document.body.dataset.page==='home'){document.title=t('site_homeTitle')+' · KARTENKUNDE.app';document.querySelector('meta[name="description"]')?.setAttribute('content',t('site_homeSEO'));return;}const current=document.querySelector('nav a[aria-current]');const heading=current||document.querySelector('h1');if(heading)document.title=heading.textContent+' · KARTENKUNDE.app';}
document.addEventListener('languagechange',updateSiteTitle);updateSiteTitle();
