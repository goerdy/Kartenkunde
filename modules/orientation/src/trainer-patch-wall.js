// Proportional packing: a small collection stays patch-sized; larger collections add rows.
export function patchLayout(images,width=2048,height=1024){
 const columns=Math.max(8,Math.ceil(Math.sqrt(images.length*2))),rows=Math.max(3,Math.ceil(images.length/columns));
 const cellWidth=(width-140)/columns,cellHeight=(height-100)/rows;
 return images.map((image,index)=>{
  const row=Math.floor(index/columns),count=Math.min(columns,images.length-row*columns);
  const scale=Math.min(cellWidth*.82/image.width,cellHeight*.82/image.height);
  const w=image.width*scale,h=image.height*scale;
  return {x:(width-count*cellWidth)/2+(index%columns+.5)*cellWidth-w/2,y:50+(row+.5)*cellHeight-h/2,width:w,height:h};
 });
}
export function drawPatchFabric(canvas){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.fillStyle='#101113';c.fillRect(0,0,w,h);
 // Short loops and crossed threads create a dark hook-and-loop fabric without external textures.
 let seed=8103;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 c.lineWidth=1;
 for(let i=0;i<65000;i++){
  const x=random()*w,y=random()*h;
  c.strokeStyle=random()>.5?'#1d1e20':'#08090a';c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+3,y-3,x+4,y+2);c.stroke();
 }
 c.strokeStyle='#303133';c.lineWidth=10;c.strokeRect(6,6,w-12,h-12);
}
export async function loadPatchWall(art){
 const endpoint=new URL('../../../api/patches.php',import.meta.url);
 const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Patch wall catalog unavailable');
 const catalog=await response.json();if(!Array.isArray(catalog.patches))throw Error('Invalid patch wall catalog');
 const results=await Promise.allSettled(catalog.patches.map(entry=>new Promise((resolve,reject)=>{
  if(!/^[a-f0-9]{64}$/.test(entry.id)||entry.src!=='?image='+entry.id){reject(Error('Invalid patch image'));return;}
  const image=new Image(),timer=setTimeout(()=>reject(Error('Patch image timed out')),20000);
  image.onload=()=>{clearTimeout(timer);resolve({image,width:image.naturalWidth,height:image.naturalHeight,label:entry.label});};
  image.onerror=()=>{clearTimeout(timer);reject(Error('Patch image unavailable'));};image.src=new URL(entry.src,endpoint).href;
 })));
 const images=results.filter(result=>result.status==='fulfilled').map(result=>result.value),c=art.canvas.getContext('2d');
 drawPatchFabric(art.canvas);
 patchLayout(images,art.canvas.width,art.canvas.height).forEach((box,index)=>{
  c.save();c.shadowColor='#000';c.shadowBlur=12;c.shadowOffsetY=4;c.drawImage(images[index].image,box.x,box.y,box.width,box.height);c.restore();
 });
 if(!images.length){c.fillStyle='#a7a8aa';c.textAlign='center';c.font='38px sans-serif';c.fillText('Hier ist Platz für euren Patch.',art.canvas.width/2,art.canvas.height/2);}
 art.texture.update();return {count:images.length,skipped:catalog.skipped+results.filter(r=>r.status==='rejected').length};
}
