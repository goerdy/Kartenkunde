import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
let server;
// Keep the regular local server's PHP-backed patch wall identical to shared hosting.
async function start(root){
 const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
 const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const child=spawn('php',['-S',`127.0.0.1:${port}`,'-t',root],{stdio:'ignore'});let failed;
 child.on('error',error=>{failed=error;});process.once('exit',()=>child.kill());
 for(let i=0;i<100;i++){
  if(failed||child.exitCode!==null)throw failed||Error('Local PHP server stopped');
  try{await fetch(`http://127.0.0.1:${port}/__php_ready__`);return `http://127.0.0.1:${port}`;}catch{await new Promise(resolve=>setTimeout(resolve,25));}
 }
 child.kill();throw Error('Local PHP server unavailable');
}
export async function servePatches(req,res,url,root){
 const feedback=url.pathname.endsWith('/api/feedback.php');
 if(req.method!==(feedback?'POST':'GET')){res.writeHead(405,{'Allow':feedback?'POST':'GET'}).end();return;}
 if(feedback&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403,{'Content-Type':'application/json'}).end('{"error":"Fremde Herkunft"}');return;}
 let body;
 if(feedback){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16384){res.writeHead(413).end();return;}chunks.push(chunk);}body=Buffer.concat(chunks);}
 try{
  server??=start(root);const base=await server;
  const response=await fetch(base+url.pathname+url.search,{method:req.method,body,headers:feedback?{'Content-Type':req.headers['content-type']||'','X-Kartenkunde-Feedback':req.headers['x-kartenkunde-feedback']||'',...(req.headers.origin?{'Origin':req.headers.origin===`http://${req.headers.host}`?base:req.headers.origin}:{}),...(req.headers['sec-fetch-site']?{'Sec-Fetch-Site':req.headers['sec-fetch-site']}:{})}:{},signal:AbortSignal.timeout(30000)});
  res.writeHead(response.status,{'Content-Type':response.headers.get('Content-Type')||'application/json','Cache-Control':response.headers.get('Cache-Control')||'no-store','X-Content-Type-Options':'nosniff'});
  res.end(Buffer.from(await response.arrayBuffer()));
 }catch{server=null;res.writeHead(503,{'Content-Type':'application/json'}).end('{"error":"Local PHP unavailable"}');}
}
