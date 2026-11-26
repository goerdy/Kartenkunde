// Coordinate tool browser regression test. Requires npm run build and a local server.
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=process.cwd(),exerciseTestBase=new URL(process.env.KARTENKUNDE_URL||'http://127.0.0.1:8081/'),exerciseTestDist=process.env.KARTENKUNDE_URL?'':'dist/';
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.png':'image/png'};
const server={address:()=>({port:Number(process.env.PORT)||8081}),close:fn=>fn()};
const profile=await mkdtemp(join(tmpdir(),'utmref-screenshot-'));
let browser,buffer='',nextId=1,diagnostics='';const waiting=new Map();
function failAll(error){for(const pending of waiting.values()){clearTimeout(pending.timer);pending.reject(error);}waiting.clear();}
function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const id=nextId++,timer=setTimeout(()=>{waiting.delete(id);reject(Error(`Browser-Zeitüberschreitung: ${method}`));},180000);waiting.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});}
try{
 browser=spawn(process.env.CHROMIUM_BIN||'chromium',['--headless','--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--hide-scrollbars','--remote-debugging-pipe',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
 browser.stderr.on('data',chunk=>{diagnostics=(diagnostics+chunk).slice(-4000);});browser.on('error',error=>failAll(error));browser.on('exit',code=>failAll(Error(`Browser beendet (${code}). ${diagnostics}`)));
 browser.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let end;while((end=buffer.indexOf('\0'))>=0){const raw=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!raw)continue;const response=JSON.parse(raw),pending=waiting.get(response.id);if(!pending)continue;waiting.delete(response.id);clearTimeout(pending.timer);response.error?pending.reject(Error(response.error.message)):pending.resolve(response.result);}});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 await send('Page.enable',{},sessionId);if(process.env.KARTENKUNDE_FORCE_CDN){await send('Network.enable',{},sessionId);await send('Network.setBlockedURLs',{urls:['*/vendor/leaflet.js*']},sessionId);}await send('Runtime.enable',{},sessionId);await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);


 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const navigate=async file=>{await send('Page.navigate',{url:new URL(exerciseTestDist+file,exerciseTestBase).href},sessionId);};

 await navigate('koordinaten.html');
 for(let i=0;i<100;i++){if(await evaluate(`!!document.getElementById('ctForm')?.onsubmit`))break;await new Promise(r=>setTimeout(r,100));}
 const check=async(expression,message)=>{if(!await evaluate(expression))throw Error(message+' '+JSON.stringify(await evaluate(`({status:document.getElementById('ctStatus')?.textContent,styles:document.getElementById('ctStyle')?.innerHTML})`)));};
 await check(`document.getElementById('ctStyle').value==='pq5basemap'&&document.getElementById('ctStyle').options.length===10`,'Default style');
 await evaluate(`(async()=>{window.ct=await import('./src/coordinate-tools.js'+(document.documentElement.dataset.build?'?v='+document.documentElement.dataset.build:''));ct.map.fire('click',{lngLat:{lng:7.92,lat:53.67}})})()`);
 await check(`document.querySelectorAll('#ctPoints li').length===1&&document.getElementById('ctReadout').textContent.includes('32U ME')`,'Map click point');
 await evaluate(`document.getElementById('ctCode').value='32U ME 123 456';document.getElementById('ctForm').requestSubmit()`);
 await check(`document.querySelectorAll('#ctPoints li').length===2&&document.querySelectorAll('#ctPoints .coordinate-utmref')[1].textContent==='32U ME 123 456'&&document.querySelector('#ctReadout .coordinate-utmref').textContent==='32U ME 123 456'`,'MGRS submission preserves entered precision');
 await evaluate(`document.getElementById('ctCode').value='<script>';document.getElementById('ctForm').requestSubmit()`);
 await check(`document.querySelectorAll('#ctPoints li').length===2&&document.getElementById('ctStatus').classList.contains('error')`,'Invalid input');
 await evaluate(`document.getElementById('ctFormat').value='decimal';document.getElementById('ctFormat').dispatchEvent(new Event('change'));document.getElementById('ctLat').value='53,67';document.getElementById('ctLon').value='7,92';document.getElementById('ctForm').requestSubmit();document.getElementById('ctAdd').click()`);
 await check(`document.querySelectorAll('#ctPoints li').length===4`,'Decimal and crosshair');
 await evaluate(`(()=>{const input=document.getElementById('ctLon'),data=new DataTransfer();data.setData('text','52.44627777770788, 9.144475507734173');input.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));})()`);
 await check(`document.getElementById('ctLat').value==='52.44627777770788'&&document.getElementById('ctLon').value==='9.144475507734173'`,'Google Maps pair paste');
 await evaluate(`document.querySelector('.coordinate-delete').click();document.querySelector('.coordinate-point-select').click()`);
 await check(`document.querySelectorAll('#ctPoints li').length===3&&document.querySelectorAll('.coordinate-marker.selected').length===1`,'Delete and select');
 await send('Browser.grantPermissions',{origin:exerciseTestBase.origin,permissions:['geolocation']});
 await send('Emulation.setGeolocationOverride',{latitude:53.6,longitude:7.9,accuracy:12},sessionId);
 await evaluate(`document.getElementById('ctLocation').click()`);
 for(let i=0;i<50;i++){if(await evaluate(`document.querySelectorAll('#ctPoints li').length===4`))break;await new Promise(r=>setTimeout(r,100));}
 await check(`document.querySelectorAll('#ctPoints li').length===4&&document.getElementById('ctStatus').textContent.includes('12')`,'Device location');
 for(const width of [1440,1101,800,390,320]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<800},sessionId);await new Promise(r=>setTimeout(r,150));
 const dimensions=await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,map:document.getElementById('ctMap').getBoundingClientRect().width})`);if(dimensions.scroll>dimensions.width||dimensions.map<200)throw Error('Responsive layout '+JSON.stringify(dimensions));
 }
 const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);await writeFile('/tmp/kartenkunde-coordinates-mobile.png',Buffer.from(shot.data,'base64'));
 await evaluate(`document.getElementById('language').value='en';document.getElementById('language').dispatchEvent(new Event('change'))`);
 await check(`document.querySelector('h1').textContent==='Coordinate tools'&&document.getElementById('ctLocation').textContent==='My location'`,'Translation');
 await navigate('koordinaten.html');for(let i=0;i<100;i++){if(await evaluate(`!!document.getElementById('ctForm')?.onsubmit`))break;await new Promise(r=>setTimeout(r,100));}
 await check(`document.querySelectorAll('#ctPoints li').length===4&&document.querySelectorAll('.coordinate-grid-line').length>0&&document.querySelector('#ctPoints .coordinate-utmref').textContent==='32U ME 123 456'&&Number(getComputedStyle(document.querySelector('#ctReadout .coordinate-utmref')).fontWeight)>=700`,'Restored points, grid and four-digit bold UTMREF');
 await evaluate(`document.getElementById('ctClear').click()`);await check(`document.querySelectorAll('.coordinate-marker').length===0&&document.getElementById('ctEmpty').hidden===false`,'Clear list');
 await navigate('index.html');for(let i=0;i<80;i++){if(await evaluate(`!!document.querySelector('img[src*="koordinaten-tools.png"]')`))break;await new Promise(r=>setTimeout(r,100));}
 await evaluate(`document.querySelector('img[src*="koordinaten-tools.png"]').scrollIntoView()`);
 for(let i=0;i<80;i++){if(await evaluate(`document.querySelector('img[src*="koordinaten-tools.png"]')?.naturalWidth>0`))break;await new Promise(r=>setTimeout(r,100));}
 await check(`document.querySelector('img[src*="koordinaten-tools.png"]').naturalWidth>0&&!!document.querySelector('.home-feature a[href="./koordinaten.html"]')&&document.documentElement.scrollWidth<=innerWidth`,'Homepage feature and illustration');
 await check(`(()=>{const links=[...document.querySelectorAll('#site-navigation a')];return links[1].getAttribute('href')==='./karten.html'&&links[2].getAttribute('href')==='./koordinaten.html'&&links.every(a=>a.querySelectorAll('.nav-purpose-icons img').length===(['./karten.html','./koordinaten.html'].includes(a.getAttribute('href'))?2:['./index.html','./hilfe.html','./impressum.html','./technik.html'].includes(a.getAttribute('href'))?0:1))&&[...document.querySelectorAll('.nav-purpose-icons img')].every(img=>img.complete&&img.naturalWidth>0);})()`,'Menu order and purpose icons');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);await new Promise(r=>setTimeout(r,150));
 await evaluate(`window.scrollTo(0,0)`);await new Promise(r=>setTimeout(r,100));
 const menuShot=await send('Page.captureScreenshot',{format:'png'},sessionId);await writeFile('/tmp/kartenkunde-menu-icons.png',Buffer.from(menuShot.data,'base64'));
 await check(`document.documentElement.scrollWidth<=innerWidth`,'Desktop menu overflow');
 console.log('Coordinate browser checks passed: map, inputs, invalid values, list, location, languages, desktop and mobile.');
}catch(error){console.error(diagnostics);throw error;}finally{browser?.kill('SIGTERM');failAll(Error('Browser test finished'));await rm(profile,{force:true,recursive:true,maxRetries:5,retryDelay:200}).catch(()=>{});}
