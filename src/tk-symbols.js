import {TK_SYMBOL_CLASSES,TK_POWER_COLOR} from './tk-features.js';
// Original vector paths shared by map icons and the PDF legend (coordinates 0..16).
export function tkSymbolGeometry(kind){
 const shapes=[],path=(points,closed=false,fill=false)=>shapes.push({points,closed,fill});
 const arc=(x,y,r,a,b)=>path(Array.from({length:25},(_,i)=>[x+r*Math.cos(a+(b-a)*i/24),y+r*Math.sin(a+(b-a)*i/24)]));
 const circle=(x,y,r)=>{arc(x,y,r,0,Math.PI*2);shapes.at(-1).closed=true;shapes.at(-1).fill=true;};
 if(kind==='peak')path([[8,2],[14,13],[2,13]],true,true);
 if(kind==='hospital'){path([[2,2],[14,2],[14,14],[2,14]],true,true);path([[5,4],[5,12]]);path([[11,4],[11,12]]);path([[5,8],[11,8]]);}
 if(kind==='fireStation'){path([[2,14],[2,6],[8,2],[14,6],[14,14]],true,true);path([[5,14],[5,8],[11,8],[11,14]]);path([[8,3],[8,6]]);}
 if(kind==='police'){path([[3,2],[13,2],[13,9],[11,12],[8,15],[5,12],[3,9]],true,true);path([[6,11],[6,5],[10,5],[10,8],[6,8]]);}
 if(kind==='viewTower'){path([[4,14],[6,6],[10,6],[12,14]]);path([[3,3],[13,3],[13,6],[3,6]],true,true);path([[3,1],[3,3]]);path([[13,1],[13,3]]);path([[5,10],[11,10]]);}
 if(kind==='cemetery'){path([[2,14],[2,2],[14,2],[14,14]],true,true);for(const x of [5,11]){path([[x,6],[x,12]]);path([[x-2,8],[x+2,8]]);}}
 if(kind==='church'){path([[4,14],[4,8],[8,4],[12,8],[12,14]],true,true);path([[8,1],[8,7]]);path([[6,3],[10,3]]);}
 if(kind==='wind'){path([[8,14],[8,7]]);circle(8,6,1);for(const a of [-Math.PI/2,Math.PI/6,5*Math.PI/6])path([[8,6],[8+5*Math.cos(a),6+5*Math.sin(a)]]);}
 if(kind==='transmitter'){path([[4,14],[8,3],[12,14]]);path([[5.5,10],[10.5,10]]);arc(8,4,5,-.65,.65);arc(8,4,5,Math.PI-.65,Math.PI+.65);}
 if(kind==='castle'){path([[2,14],[2,5],[4,5],[4,2],[6,2],[6,5],[10,5],[10,2],[12,2],[12,5],[14,5],[14,14]],true,true);path([[6,14],[6,10],[10,10],[10,14]]);}
 if(kind==='ruin'){path([[2,14],[2,7],[4,7],[4,3],[7,6],[9,4],[11,8],[14,6],[14,14]]);path([[2,14],[6,14]]);path([[10,14],[14,14]]);}
 if(kind==='waterTower'){path([[5,14],[6,7],[10,7],[11,14]]);path([[4,3],[8,1],[12,3],[12,7],[4,7]],true,true);}
 if(kind==='chimney'){path([[5,14],[6,3],[10,3],[11,14]],true,true);path([[6,1],[10,1]]);}
 if(kind==='substation'){path([[2,3],[14,3],[14,13],[2,13]],true,true);path([[9,4],[6,8],[10,8],[7,12]]);}
 if(kind==='pylon')path([[5.5,5.5],[10.5,5.5],[10.5,10.5],[5.5,10.5]],true,true);
 if(kind==='lighthouse'){path([[5,14],[6,6],[10,6],[11,14]],true,true);path([[5,6],[5,3],[8,1],[11,3],[11,6]],true,true);path([[1,4],[3,4]]);path([[13,4],[15,4]]);path([[6,10],[10,10]]);}
 if(kind==='lock'){path([[2,2],[2,14]]);path([[14,2],[14,14]]);path([[2,5],[8,8],[14,5]]);path([[2,10],[8,13],[14,10]]);}
 return shapes;
}
const tkPixelCache=new Map();
export function tkSymbolPixels(kind){
 const cached=tkPixelCache.get(kind);if(cached)return {width:64,height:64,data:new Uint8ClampedArray(cached)};
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 // Tiny icons are read immediately. A CPU canvas avoids waiting for the large
 // print map's GPU queue on getImageData, and pixels are shared across sheets.
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.scale(4,4);ctx.lineWidth=kind==='pylon'?.6:1;ctx.strokeStyle=kind==='pylon'?TK_POWER_COLOR:'#20221b';ctx.fillStyle=kind==='peak'?'#000000':'#fffff2';ctx.lineCap='round';ctx.lineJoin='round';
 for(const shape of tkSymbolGeometry(kind)){ctx.beginPath();shape.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(shape.closed)ctx.closePath();if(shape.fill)ctx.fill();ctx.stroke();}
 const pixels=ctx.getImageData(0,0,64,64).data;tkPixelCache.set(kind,pixels);
 return {width:64,height:64,data:new Uint8ClampedArray(pixels)};
}
export function militaryHatchPixels(){
 const data=new Uint8ClampedArray(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++)if((x+y)%32<3){const i=(y*64+x)*4;data[i]=196;data[i+1]=42;data[i+2]=60;data[i+3]=190;}
 return {width:64,height:64,data};
}
export function prepareTKSymbols(map){
 for(const kind of TK_SYMBOL_CLASSES){const id=`pq5-${kind}`;if(!map.hasImage(id))map.addImage(id,tkSymbolPixels(kind),{pixelRatio:4});}
 if(!map.hasImage('pq5-military-hatch'))map.addImage('pq5-military-hatch',militaryHatchPixels(),{pixelRatio:4/(map.getStyle().metadata?.['pq5:printScale']||1)});
}
