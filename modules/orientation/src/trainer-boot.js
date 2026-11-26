import {t} from '../host.js';
const loadButton=document.getElementById('fpLoadWorld'),root=document.getElementById('trainer');
let loadStarted=false;
loadButton.onclick=async()=>{
  if(loadStarted)return;
  loadStarted=true;root.dataset.loadState='loading';root.setAttribute('aria-busy','true');
  loadButton.disabled=true;loadButton.hidden=true;document.getElementById('fpLoadHint').hidden=true;
  document.getElementById('fpLoading').hidden=false;document.getElementById('fpStart').hidden=false;
  document.getElementById('fpLoadStatus').textContent=t('fpLoadEngine');
  try {
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=new URL('../../../vendor/babylon.js',import.meta.url).href;
      script.integrity='sha384-TjE2hnGRb5tyIsN5LcN7j4WjNY6VX8yCeKcLSs0nG5pjTArTrUN0B0mVAjng5Lpy';script.crossOrigin='anonymous';
      script.onload=resolve;script.onerror=()=>reject(Error('Babylon engine unavailable'));
      document.head.append(script);
    });
    document.getElementById('fpLoadProgress').value=8;document.getElementById('fpLoadPercent').textContent='8 %';document.getElementById('fpLoadStatus').textContent=t('fpLoadPrepare');
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
    await import('./trainer.js');
    root.dataset.loadState='ready';
  } catch(error) {
    root.dataset.loadState='error';root.setAttribute('aria-busy','false');
    const message=document.getElementById('fpError');
    message.hidden=false;message.textContent=t('fpLoadFailed');document.getElementById('fpStart').disabled=true;document.getElementById('fpContinue').disabled=true;document.getElementById('fpLoadStatus').textContent=t('fpLoadFailed');document.getElementById('fpLoading').dataset.error='true';
    loadButton.hidden=false;loadButton.disabled=false;loadButton.dataset.i18n='fpReloadPage';loadButton.textContent=t('fpReloadPage');loadButton.onclick=()=>location.reload();
    console.error('Orientation trainer:',error);
  }
};
