// Browser libraries are loaded by boot.js, with local files preferred over pinned CDN URLs.
export const L=globalThis.L;
export const maplibregl=globalThis.maplibregl;
export function proj4(...args){return globalThis.proj4(...args);}
export const mgrs={toPoint:(...args)=>globalThis.mgrs.toPoint(...args),forward:(...args)=>globalThis.mgrs.forward(...args)};
export function jsPDF(...args){return new globalThis.jspdf.jsPDF(...args);}
