// Fixed, language-neutral teaching artwork, rebuilt only when editing this file.
import {mkdir,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),art={};
for(const scale of [25000,50000]){
 const g=1e6/scale,panelWidth=2*g+12,height=g+24,shapes=[];let panel=0;
 const push=shape=>shapes.push({...shape,step:panel});
 const line=(x1,y1,x2,y2,color='#293b44',width=.2)=>push({type:'line',x1,y1,x2,y2,color,width});
 const rect=(x,y,w,h,fill,color=fill,width=.15)=>push({type:'rect',x,y,w,h,fill,color,width});
 const text=(value,x,y,size=6,color='#293b44')=>push({type:'text',value,x,y,size,color});
 for(let step=0;step<4;step++){
 panel=step;const start=step*panelWidth,x=start+g+5,y=8,bottom=y+g,px=x+.1*g,py=bottom-.5*g;
 text(String(step+1),start+2,4,9);
 // A quiet fictional map: fields, woodland, roads, stream and buildings.
 rect(x,y,g,g,'#fafafa');rect(x+.57*g,y+.03*g,.4*g,.27*g,'#eeeeee');rect(x+.04*g,y+.69*g,.29*g,.27*g,'#f1f1f1');
 for(let i=0;i<6;i++){const xx=x+(.61+i*.055)*g,yy=y+(.08+(i%2)*.08)*g;push({type:'circle',x:xx,y:yy,r:g*.017,fill:'#e0e0e0',color:'#e0e0e0'});}
 for(const route of [[[0,.83],[.28,.72],[.47,.52],[.69,.43],[1,.39]],[[.47,.52],[.39,.27],[.5,0]]])for(const [color,width]of [['#d0d0d0',g*.035],['#f9f9f9',g*.019]])for(let i=1;i<route.length;i++)line(x+route[i-1][0]*g,y+route[i-1][1]*g,x+route[i][0]*g,y+route[i][1]*g,color,width);
 const stream=[[.78,0],[.72,.2],[.82,.39],[.73,.57],[.77,.77],[.68,1]];for(let i=1;i<stream.length;i++)line(x+stream[i-1][0]*g,y+stream[i-1][1]*g,x+stream[i][0]*g,y+stream[i][1]*g,'#d4d4d4',.35);
 for(const [bx,by,bw,bh]of [[.2,.63,.06,.035],[.31,.58,.04,.07],[.48,.38,.06,.04],[.54,.47,.07,.035],[.14,.79,.05,.04]])rect(x+bx*g,y+by*g,bw*g,bh*g,'#c9c9c9');
 for(let i=1;i<4;i++){line(x+i*g/4,y,x+i*g/4,y+.3*g,'#e7e7e7',.12);line(x,y+i*g/4,x+.3*g,y+i*g/4,'#e7e7e7',.12);}
 push({type:'rect',x,y,w:g,h:g,color:'#46565c',width:.25});line(x,y,x,bottom,'#006fba',.4);line(x,bottom,x+g,bottom,'#006fba',.4);
 text('39',x-1,y-2,7,'#006fba');text('40',x+g-2,y-2,7,'#006fba');text('36',x-4,bottom-1,6,'#006fba');text('37',x-4,y+2,6,'#006fba');
 const ruler=(rx,ghost=false)=>{const fill=ghost?'#faf7e9':'#fff1bb',ink=ghost?'#d8d3c2':'#675e43',number=ghost?'#d3d0c4':'#293b44',arm=g*.14;
 rect(rx-g,bottom,g+arm,arm,fill,ink);rect(rx,y,arm,g,fill,ink);line(rx,bottom,rx+arm,bottom+arm,ghost?'#ded8c5':'#ad9d6e',.15);
 const subdivisions=scale===25000?100:50;
 for(let i=1;i<=subdivisions;i++){const d=i/subdivisions*g,major=i%(subdivisions/10)===0,length=major?arm*.4:arm*.2;line(rx-d,bottom,rx-d,bottom+length,ink,.1);line(rx,bottom-d,rx+length,bottom-d,ink,.1);if(major){text(String(Math.round(i/subdivisions*10)),rx-d-.5,bottom+arm*.88,5,number);text(String(Math.round(i/subdivisions*10)),rx+arm*.65,bottom-d+.5,5,number);}}
 text('0',rx+arm*.35,bottom+arm*.7,6,ghost?'#cedde4':'#006fba');
 };
 if(step===1)ruler(x+g);
 if(step===2){ruler(x+g,true);ruler(px);const ay=y+.73*g,from=x+.85*g,to=px+g*.18;line(from,ay,to,ay,'#b52635',.6);line(to,ay,to+g*.09,ay-g*.055,'#b52635',.6);line(to,ay,to+g*.09,ay+g*.055,'#b52635',.6);}
 if(step===3){ruler(px);line(px-1,py,px+g*.14,py,'#16803a',.5);push({type:'circle',x,y:bottom+g*.085,r:g*.055,color:'#16803a',width:.35});text('100 m',start+2,y+g*.35,7,'#16803a');text('500 m',start+2,y+g*.65,7,'#16803a');}
 push({type:'circle',x:px,y:py,r:.75,fill:'#b52635',color:'#ffffff',width:.2});
 text(step===3?(scale===25000?'32U ME 3910 3650':'32U ME 391 365'):'32U ME 39 36',start+3,height-3,6);
 }
 art[scale]={width:panelWidth*4,height,panelWidth,shapes};
 const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;');
 const svg=shapes.map(s=>{const paint=`stroke="${s.color}" stroke-width="${s.width||.2}" fill="${s.fill||'none'}"`;if(s.type==='line')return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" ${paint}/>`;if(s.type==='rect')return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" ${paint}/>`;if(s.type==='circle')return `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" ${paint}/>`;return `<text x="${s.x}" y="${s.y}" font-family="Arial,sans-serif" font-size="${s.size*.352778}" fill="${s.color}">${escape(s.value)}</text>`;}).join('\n');
 await mkdir(new URL('assets/planzeiger/',root),{recursive:true});await writeFile(new URL(`assets/planzeiger/planzeiger-${scale}.svg`,root),`<svg xmlns="http://www.w3.org/2000/svg" width="${panelWidth*4}mm" height="${height}mm" viewBox="0 0 ${panelWidth*4} ${height}"><title>UTMREF / MGRS 1:${scale}</title>\n${svg}\n</svg>\n`);
}
await writeFile(new URL('src/planzeiger-art.js',root),'// Fixed vector artwork; source: tools/generate-planzeiger.mjs\nexport const PLANZEIGER_ART='+JSON.stringify(art)+';\n');
console.log('Fixed planzeiger artwork generated.');
