import {t} from '../host.js';
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
} catch(error) {
  const message=document.getElementById('fpError');
  message.hidden=false;message.textContent=t('fpLoadFailed');document.getElementById('fpStart').disabled=true;document.getElementById('fpLoadStatus').textContent=t('fpLoadFailed');document.getElementById('fpLoading').dataset.error='true';
  console.error('Orientation trainer:',error);
}
