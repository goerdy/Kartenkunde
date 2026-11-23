import {EXTERNAL_SERVICES,LOCAL_COMPONENTS,PROJECT_REPOSITORY} from './services.js';
import {t} from './i18n.js';
function renderTechnology(){const services=document.getElementById('serviceCatalogue'),components=document.getElementById('localCatalogue');services.replaceChildren();components.replaceChildren();function row(target,label,url,second,third){const tr=document.createElement('tr'),name=document.createElement('th'),link=document.createElement('a');name.scope='row';link.textContent=label;link.href=url;name.append(link);tr.append(name);for(const value of [second,third]){const td=document.createElement('td');td.textContent=value;tr.append(td);}target.append(tr);}for(const service of EXTERNAL_SERVICES)row(services,service.labelKey?t(service.labelKey):service.name,service.home,t(service.purpose),service.license+(service.licenseKey?' · '+t(service.licenseKey):''));for(const [name,version,license,home]of LOCAL_COMPONENTS)row(components,name,home,version,license);if(PROJECT_REPOSITORY){const link=document.createElement('a');link.href=PROJECT_REPOSITORY;link.textContent=PROJECT_REPOSITORY;document.getElementById('repositoryLink').replaceChildren(link);}}
renderTechnology();document.addEventListener('languagechange',renderTechnology);

function renderAppVersion(){
 const {commit,dirty,build}=document.documentElement.dataset,target=document.getElementById('appCommit');
 if(commit&&/^[a-f0-9]{40,64}$/.test(commit)){
  const link=document.createElement('a');link.textContent=commit.slice(0,12);link.title=commit;link.href=PROJECT_REPOSITORY+'/commit/'+commit;target.replaceChildren(link);
 }else target.textContent=t('techNoCommit');
 document.getElementById('appDirty').hidden=dirty!=='true';
 document.getElementById('techBuildId').textContent=build||t('techDevelopment');
}
renderAppVersion();document.addEventListener('languagechange',renderAppVersion);
