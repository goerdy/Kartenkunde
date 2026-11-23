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

let testExportController;
const testExportButton=document.getElementById('testExport'),testExportCancel=document.getElementById('testExportCancel'),testExportStatus=document.getElementById('testExportStatus'),testExportProgress=document.getElementById('testExportProgress');
testExportCancel.onclick=()=>testExportController?.abort();
testExportButton.onclick=async()=>{
 if(testExportController)return;testExportController=new AbortController();const signal=testExportController.signal;
 testExportButton.disabled=true;testExportCancel.hidden=false;testExportProgress.hidden=false;testExportProgress.value=0;document.getElementById('language').disabled=true;testExportStatus.textContent=t('techTestLoading');
 try{
 const {loadTestExport}=await import('./test-export-loader.js'),{createMapTestPDF}=await loadTestExport();
 const pdf=await createMapTestPDF({signal,...document.documentElement.dataset,onProgress:(done,total,label)=>{testExportProgress.max=total;testExportProgress.value=done;testExportStatus.textContent=`${done}/${total} · ${label}`;}});
 pdf.save(`Kartenkunde-Testexport-1-50k-${new Date().toISOString().slice(0,10)}.pdf`);
 testExportStatus.textContent=pdf.exportWarnings.length?t('techTestWarnings',{count:pdf.exportWarnings.length}):t('created');
 }catch(error){testExportStatus.textContent=signal.aborted?t('cancelled'):error.message;}
 finally{testExportController=null;testExportButton.disabled=false;testExportCancel.hidden=true;testExportProgress.hidden=true;document.getElementById('language').disabled=false;}
};
