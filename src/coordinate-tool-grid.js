import {gridGeometry} from './simulator-geometry.js';
import {clipLine,gridEdgeLabel} from './geo.js';
const ns='http://www.w3.org/2000/svg';
export function installCoordinateGrid(map,stage){
 const svg=document.createElementNS(ns,'svg');svg.classList.add('coordinate-grid');svg.setAttribute('aria-hidden','true');stage.insertBefore(svg,stage.querySelector('.coordinate-crosshair'));let frame;
 const node=(name,attributes)=>{const element=document.createElementNS(ns,name);for(const [key,value]of Object.entries(attributes))element.setAttribute(key,value);return element;};
 function draw(){frame=null;const width=stage.clientWidth,height=stage.clientHeight;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren();if(map.getZoom()<6||!width||!height)return;
 const bounds=map.getBounds(),box={w:Math.max(-180,bounds.getWest()),e:Math.min(180,bounds.getEast()),s:Math.max(-80,bounds.getSouth()),n:Math.min(83.999999,bounds.getNorth())};if(box.n<=box.s||box.e<=box.w)return;
 const metres=(box.e-box.w)*111320*Math.cos((box.n+box.s)*Math.PI/360),spacing=1000*10**Math.max(0,Math.ceil(Math.log10(metres/18000))),placed=[];
 for(const grid of gridGeometry(box,spacing)){const points=grid.points.map(ll=>{const p=map.project(ll);return [p.x,p.y];});svg.append(node('polyline',{points:points.map(p=>p.join(',')).join(' '),class:'coordinate-grid-line'}));
 for(let i=1;i<points.length;i++){const segment=clipLine(points[i-1],points[i],width,height);if(!segment)continue;for(const [x,y]of segment){const edge=Math.abs(y)<.01?'top':Math.abs(x)<.01?'left':null;if(!edge||edge==='top'&&(x<45||x>width-55)||edge==='left'&&(y<35||y>height-70))continue;const along=edge==='top'?x:y;if(placed.some(p=>p.edge===edge&&Math.abs(p.along-along)<45))continue;placed.push({edge,along});const text=node('text',{x:edge==='top'?x:5,y:edge==='top'?16:y-4,'text-anchor':edge==='top'?'middle':'start'});text.textContent=gridEdgeLabel(grid.value,spacing);svg.append(text);}}
 }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(draw);}map.on('move',schedule);map.on('resize',schedule);schedule();return svg;
}
