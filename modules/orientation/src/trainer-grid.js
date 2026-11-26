// The invented training sheet uses a fixed UTMREF zone/square, not a real deployment location.
export const GRID_PREFIX='32U KA';
export const GRID_COMPACT='32UKA';
const DIGITS=['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun'];
export const gridDigits=(metres,precision=3)=>String(Math.floor(metres/10**(5-precision))).padStart(precision,'0');
export const coordinateText=(point,precision=3)=>`${GRID_PREFIX} ${gridDigits(point.e,precision)} ${gridDigits(point.n,precision)}`;
export function coordinateCell(raw){const text=String(raw??'').trim();if(!/^\d{3,4}$/.test(text))return null;const size=10**(5-text.length);return {lower:Number(text)*size,size,precision:text.length};}
export function spokenCoordinates(text){return text.replace(/\b32\s*U\s*K\s*A\s+(\d{3,4})\s+(\d{3,4})\b/gi,(_,e,n)=>'zweiunddreißig Ulrich Kaufmann Anton '+[...e,...n].map(d=>DIGITS[Number(d)]).join(' ')).replace(/\b32\s*U\s*K\s*A\b/gi,'zweiunddreißig Ulrich Kaufmann Anton');}
