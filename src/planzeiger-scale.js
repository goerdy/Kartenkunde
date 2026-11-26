// Canonical frame-romer graduations; independent of map engines and projections.
export function frameGraduations(rowScale,mapScale){
 const span=Number(mapScale)*.05,max=rowScale*.05,major=({25000:100,50000:200,100000:500,200000:1000})[rowScale],minor=major/10;
 return Array.from({length:Math.round(max/minor)+1},(_,i)=>({distance:i*minor*mapScale/rowScale,metres:i*minor,major:i%10===0}));
}
