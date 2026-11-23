import {CONTOUR_COLOR,contourInterval} from './contours.js';
import {t,getLanguage} from './i18n.js';
import {normalizeTKOptions,TK_SYMBOL_CLASSES,TK_CLASS_OPTIONS,TK_POWER_COLOR} from './tk-features.js';
import {tkSymbolGeometry} from './tk-symbols.js';
import {PQ5_TK_COLORS} from './pq5-tk.js';
export function tkLegendLayout(paper,width,options,styleId='pq5tk'){
 const enabled=normalizeTKOptions(options),compact=paper[1]<180;
 const entries=[{label:'legendForest',fill:PQ5_TK_COLORS.forest},{label:'legendMeadow',fill:PQ5_TK_COLORS.meadow},{label:'legendSettlement',fill:PQ5_TK_COLORS.built},{label:'legendBuilding',fill:PQ5_TK_COLORS.building},{label:'legendWater',fill:PQ5_TK_COLORS.water},{label:'legendRoad',road:true},{label:'legendPath',dash:true},{label:'legendRail',rail:true}];
 if(styleId==='pq5basemap'&&options?.contours!==false)entries.push({label:'legendContours',contours:true,interval:contourInterval(options?.scale)});
 if(enabled.farms)entries.push({label:'tk_farms',farm:true});
 for(const kind of TK_SYMBOL_CLASSES)if(enabled[TK_CLASS_OPTIONS[kind]])entries.push({label:`tk_${TK_CLASS_OPTIONS[kind]}`,symbol:kind});
 if(enabled.powerLines)entries.push({label:'tk_powerLines',powerLine:true});
 if(enabled.militaryAreas)entries.push({label:'tk_militaryAreas',military:true});
 const columns=compact?2:Math.max(2,Math.min(4,Math.floor(width/55))),rowHeight=compact?3:5,fontSize=compact?5.2:6.5,titleHeight=compact?4:5;
 return {name:styleId==='pq5basemap'?'PQ5-Default-GER':styleId==='pq5gray'?'PQ5-grau':'PQ5-Default',entries,width,columns,rowHeight,fontSize,titleHeight,height:titleHeight+Math.ceil(entries.length/columns)*rowHeight};
}
export function drawTKLegend(pdf,layout,x,y){
 pdf.setTextColor(37,65,57);pdf.setFont('helvetica','bold');pdf.setFontSize(layout.fontSize+1);pdf.text(t('legendTitle',{style:layout.name}),x,y+2);pdf.setFont('helvetica','normal');
 const cell=layout.width/layout.columns,sw=layout.rowHeight*.9,sh=layout.rowHeight*.7;
 for(let i=0;i<layout.entries.length;i++){
 const entry=layout.entries[i],xx=x+(i%layout.columns)*cell,yy=y+layout.titleHeight+Math.floor(i/layout.columns)*layout.rowHeight;
 pdf.setDrawColor(28,33,27);pdf.setLineWidth(.15);pdf.setLineDashPattern?.([],0);
 if(entry.symbol){
 if(entry.symbol==='peak'){pdf.setFillColor(0,0,0);pdf.triangle(xx+sw/2,yy,xx+sw,yy+sh,xx,yy+sh,'F');}
 const scale=entry.symbol==='pylon'?.7:1;if(entry.symbol==='pylon'){pdf.setLineWidth(.09);pdf.setDrawColor(TK_POWER_COLOR);}
 for(const shape of tkSymbolGeometry(entry.symbol)){const pts=shape.points.map(p=>[xx+sw*(1-scale)/2+p[0]/16*sw*scale,yy+sh*(1-scale)/2+p[1]/16*sh*scale]);for(let j=1;j<pts.length;j++)pdf.line(...pts[j-1],...pts[j]);if(shape.closed)pdf.line(...pts.at(-1),...pts[0]);}
 }else if(entry.fill){pdf.setFillColor(entry.fill);pdf.rect(xx,yy,sw,sh,'FD');}
 else if(entry.military){pdf.setDrawColor(196,42,60);pdf.rect(xx,yy,sw,sh);for(let d=0;d<=sw+sh;d+=.7){const a=Math.max(0,d-sh),b=Math.min(sw,d);pdf.line(xx+a,yy+d-a,xx+b,yy+d-b);}}
 else if(entry.road){pdf.setLineWidth(.7);pdf.line(xx,yy+sh/2,xx+sw,yy+sh/2);pdf.setDrawColor(PQ5_TK_COLORS.secondary);pdf.setLineWidth(.4);pdf.line(xx,yy+sh/2,xx+sw,yy+sh/2);}
 else if(entry.rail){pdf.line(xx,yy+sh/2,xx+sw,yy+sh/2);for(let d=.4;d<sw;d+=.9)pdf.line(xx+d,yy+.2,xx+d,yy+sh-.2);}
 else if(entry.contours){pdf.setDrawColor(CONTOUR_COLOR);pdf.setLineWidth(.15);pdf.line(xx,yy+sh*.25,xx+sw,yy+sh*.25);pdf.setLineWidth(.3);pdf.line(xx,yy+sh*.8,xx+sw,yy+sh*.8);}
 else if(entry.powerLine){pdf.setDrawColor(TK_POWER_COLOR);pdf.setLineWidth(.2);pdf.line(xx,yy+sh/2,xx+sw,yy+sh/2);}
 else if(entry.dash){pdf.setLineDashPattern?.([.7,.4],0);pdf.line(xx,yy+sh/2,xx+sw,yy+sh/2);pdf.setLineDashPattern?.([],0);}
 else if(entry.farm){pdf.setFont('helvetica','italic');pdf.setFontSize(layout.fontSize);pdf.text('Abc',xx,yy+sh);pdf.setFont('helvetica','normal');}
 pdf.setTextColor(37,65,57);pdf.setFontSize(layout.fontSize);pdf.text(t(entry.label,{interval:entry.interval?.toLocaleString(getLanguage())}),xx+sw+1.5,yy+sh*.9);
 }
 pdf.setLineDashPattern?.([],0);
 return y+layout.height;
}
