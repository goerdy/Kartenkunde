import {loadFarmFeatures} from '../src/farm-labels.js';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=process.cwd(),port=Number(process.env.PORT)||8081;
const types={'.json':'application/json; charset=utf-8','.woff2':'font/woff2','.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/plain; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'};
createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname.endsWith('/api/farms.php')){
 const parts=(u.searchParams.get('bbox')||'').split(','),box=parts.map(Number);
 if(parts.length!==4||parts.some(p=>!p.trim())||box.some(v=>!Number.isFinite(v))||box[0]<-90||box[2]>90||box[1]<-180||box[3]>180||box[2]<=box[0]||box[3]<=box[1]||box[2]-box[0]>2||box[3]-box[1]>4){res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Invalid detail bounding box'}));return;}
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 const request=new AbortController();res.on('close',()=>request.abort());
 try{res.end(JSON.stringify(await loadFarmFeatures(box,request.signal)));}catch(error){if(!res.destroyed)res.writeHead(502).end(JSON.stringify({error:error.message}));}return;
 }
 let path=resolve(root,'.'+decodeURIComponent(u.pathname));if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}if((await stat(path)).isDirectory())path=resolve(path,'index.html');const policy=await readFile(resolve(root,'dist/.htaccess'),'utf8').catch(()=> '');for(const [,name,value]of policy.matchAll(/Header always set ([\w-]+) "([^"]+)"/g))res.setHeader(name,value);res.setHeader('Cache-Control','no-cache, must-revalidate');res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end('Nicht gefunden');}}).on('error',error=>{console.error(`Serverstart fehlgeschlagen: ${error.message}. Bitte in einem lokalen Terminal außerhalb der Sandbox starten.`);process.exitCode=1;}).listen(port,'127.0.0.1',()=>console.log(`KARTENKUNDE.app: http://127.0.0.1:${port}`));
