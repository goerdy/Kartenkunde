export function grayscaleColorArguments(args){
 let rgb=args;
 if(args.length===1&&typeof args[0]==='string'&&/^#[0-9a-f]{6}$/i.test(args[0]))rgb=[1,3,5].map(start=>parseInt(args[0].slice(start,start+2),16));
 if(rgb.length===3&&rgb.every(value=>Number.isFinite(Number(value)))){const grey=Math.round(.2126*Number(rgb[0])+.7152*Number(rgb[1])+.0722*Number(rgb[2]));return [grey,grey,grey];}
 return args;
}
// Raster pixels are converted during capture; this covers PDF vectors and legend swatches.
export function applyPDFMonochrome(pdf){
 for(const name of ['setDrawColor','setFillColor','setTextColor']){
 const original=pdf[name];pdf[name]=function(...args){return original.apply(this,grayscaleColorArguments(args));};
 }
 return pdf;
}
