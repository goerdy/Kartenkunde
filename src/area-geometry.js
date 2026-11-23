import {t} from './i18n.js';
export function areaPolygons(feature){const g=feature?.type==='Feature'?feature.geometry:feature;if(g?.type==='Polygon')return [g.coordinates];if(g?.type==='MultiPolygon')return g.coordinates;throw Error(t('noGeometry'));}
export function coordinatesBounds(points){let w=Infinity,e=-Infinity,s=Infinity,n=-Infinity;for(const [x,y]of points){w=Math.min(w,x);e=Math.max(e,x);s=Math.min(s,y);n=Math.max(n,y);}return {w,e,s,n};}
export function featureBounds(feature){let b={w:Infinity,e:-Infinity,s:Infinity,n:-Infinity};for(const poly of areaPolygons(feature)){const p=coordinatesBounds(poly[0]);b={w:Math.min(b.w,p.w),e:Math.max(b.e,p.e),s:Math.min(b.s,p.s),n:Math.max(b.n,p.n)};}return b;}
export function inRing(point,ring){let inside=false;const [x,y]=point;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function inPolygon(point,polygon){return inRing(point,polygon[0])&&!polygon.slice(1).some(r=>inRing(point,r));}
export function inFeature(point,feature){return areaPolygons(feature).some(poly=>inPolygon(point,poly));}
export function ringArea(ring){let area=0;for(let i=1;i<ring.length;i++)area+=ring[i-1][0]*ring[i][1]-ring[i][0]*ring[i-1][1];return Math.abs(area/2);}
// An interior scanline point avoids assigning concave districts by an exterior centroid.
export function interiorPoint(polygon){const b=coordinatesBounds(polygon[0]);let best=null,span=0;for(const f of [.5,.25,.75,.125,.875]){const y=b.s+(b.n-b.s)*f,xs=[];for(const ring of polygon)for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],c=ring[j];if((a[1]>y)!==(c[1]>y))xs.push(a[0]+(y-a[1])*(c[0]-a[0])/(c[1]-a[1]));}xs.sort((a,c)=>a-c);for(let i=1;i<xs.length;i++){const x=(xs[i-1]+xs[i])/2,w=xs[i]-xs[i-1];if(w>span&&inPolygon([x,y],polygon)){best=[x,y];span=w;}}}return best||polygon[0][0];}
export function isChildFeature(child,parent){const polys=areaPolygons(child);const largest=polys.reduce((a,b)=>ringArea(a[0])>ringArea(b[0])?a:b);return inFeature(interiorPoint(largest),parent);}
export function clipRingToBox(ring,b){let result=ring.slice();for(const [axis,value,greater]of [[0,b.w,true],[0,b.e,false],[1,b.s,true],[1,b.n,false]]){const input=result;result=[];if(!input.length)break;let a=input.at(-1),aIn=greater?a[axis]>=value:a[axis]<=value;for(const c of input){const cIn=greater?c[axis]>=value:c[axis]<=value;if(aIn!==cIn){const t=(value-a[axis])/(c[axis]-a[axis]);result.push([a[0]+(c[0]-a[0])*t,a[1]+(c[1]-a[1])*t]);}if(cIn)result.push(c);a=c;aIn=cIn;}}if(result.length)result.push(result[0]);return result;}
export function polygonIntersectsBox(polygon,b){if([[b.w,b.s],[b.w,b.n],[b.e,b.s],[b.e,b.n]].some(p=>inPolygon(p,polygon)))return true;const inside=([x,y])=>x>=b.w&&x<=b.e&&y>=b.s&&y<=b.n;for(const ring of polygon){if(ring.some(inside))return true;for(let i=1;i<ring.length;i++)if(segmentHitsBox(ring[i-1],ring[i],b))return true;}return false;}
function segmentHitsBox(a,c,b){let lo=0,hi=1;for(let axis=0;axis<2;axis++){const d=c[axis]-a[axis],min=axis===0?b.w:b.s,max=axis===0?b.e:b.n;if(Math.abs(d)<1e-14){if(a[axis]<min||a[axis]>max)return false;}else{const t1=(min-a[axis])/d,t2=(max-a[axis])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;}}return true;}
// Split rings that cross ±180° instead of treating their short seam as a world-spanning edge.
export function normalizeAdministrativeFeature(feature){
 const original=areaPolygons(feature);
 if(!original.some(poly=>poly.some(r=>r.some((p,i)=>i&&Math.abs(p[0]-r[i-1][0])>180))))return feature;
 const polygons=[];
 for(const polygon of original){const rings=polygon.map((ring,index)=>{const unwrapped=[];for(const point of ring){let x=point[0];const previous=unwrapped.at(-1)?.[0];if(previous!==undefined){while(x-previous>180)x-=360;while(x-previous< -180)x+=360;}unwrapped.push([x,point[1]]);}return unwrapped;});
 const outer=coordinatesBounds(rings[0]),center=(outer.w+outer.e)/2;
 for(let i=1;i<rings.length;i++){const b=coordinatesBounds(rings[i]),offset=Math.round((center-(b.w+b.e)/2)/360)*360;rings[i]=rings[i].map(([x,y])=>[x+offset,y]);}
 const first=Math.ceil((-180-outer.e)/360),last=Math.floor((180-outer.w)/360);
 for(let shift=first;shift<=last;shift++){const clipped=rings.map(r=>clipRingToBox(r.map(([x,y])=>[x+shift*360,y]),{w:-180,e:180,s:-90,n:90}));if(clipped[0].length>=4&&ringArea(clipped[0])>1e-12)polygons.push(clipped.filter(r=>r.length>=4));}
 }
 return {...feature,geometry:{type:'MultiPolygon',coordinates:polygons}};
}
