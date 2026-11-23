const slides=[...document.querySelectorAll('section')];let n=0;function forward(){const next=slides[n].querySelector('.funk-reveal:not(.is-revealed)');if(next){next.classList.add('is-revealed');return}show(n+1)}function backward(){const shown=[...slides[n].querySelectorAll('.funk-reveal.is-revealed')];if(shown.length){shown[shown.length-1].classList.remove('is-revealed');return}show(n-1)}function show(i){document.querySelectorAll('.funk-reveal').forEach(e=>e.classList.remove('is-revealed'));n=Math.max(0,Math.min(slides.length-1,i));slides.forEach((s,j)=>s.classList.toggle('active',n===j));document.querySelector('output').textContent=`${n+1} / ${slides.length}`;history.replaceState(null,'','#'+(n+1))}function resize(){const s=document.querySelector('#stage'),scale=Math.min(innerWidth/1100,(innerHeight-44)/618.75);s.style.transform=`scale(${scale})`;s.style.left=`${(innerWidth-1100*scale)/2}px`}addEventListener('resize',resize);addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();forward()}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();backward()};if(e.key==='Home')show(0);if(e.key==='End')show(slides.length-1);if(e.key==='f')document.documentElement.requestFullscreen?.()});show(Number(location.hash.slice(1)||1)-1);resize();
/** Shared by the Vue theme and static preview. Wait for fonts and images first. */
async function fitContent(element) {
  if (!element || !element.getClientRects().length) return
  await document.fonts?.ready
  await Promise.all([...element.querySelectorAll('img')].map(img => img.decode?.().catch(() => {})))
  if (!element.getClientRects().length) return
  element.style.setProperty('--funk-fit', '1')
  let factor = 1
  const overflows = () => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1
  while (overflows() && factor > 0.76) {
    factor = Math.max(0.76, Math.round((factor - 0.02) * 100) / 100)
    element.style.setProperty('--funk-fit', String(factor))
  }
  element.dataset.fit = String(factor)
  element.dataset.overflow = String(overflows())
  if (overflows()) console.warn('Folie benötigt Layoutprüfung:', element.querySelector('h1')?.textContent)
}

const fit = () => fitContent(document.querySelector("section.active .funk-content")); new MutationObserver(fit).observe(document.querySelector("#stage"), { attributes:true, subtree:true, attributeFilter:["class"] }); fit();
document.getElementById("previousSlide").addEventListener("click",backward);
document.getElementById("nextSlide").addEventListener("click",forward);
