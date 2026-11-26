import {speechChunks} from './trainer-speech-chunks.js';
const words=['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun'];
// Split fixed wording from variable numeric groups. Coordinate groups are spoken digit by digit.
export function speechPlan(text){
 const source=text.replace(/\b32\s*U\s*K\s*A\b/gi,'zweiunddreißig Ulrich\uE000Kaufmann Anton'),out=[];let end=0;
 const fixed=part=>{for(const [index,section] of part.split('\uE000').entries()){if(index)out.push({pause:250});for(const chunk of speechChunks(section))if(/[\p{L}\d]/u.test(chunk))out.push({text:chunk,number:false});}};
 for(const match of source.matchAll(/\b\d+(?:[.,]\d+)?(?:[ \t]+\d+(?:[.,]\d+)?)*\b/g)){
  fixed(source.slice(end,match.index));const raw=match[0];const spoken=/^0|\s/.test(raw)?raw.replace(/\d/g,d=>words[Number(d)]+' ').trim().replace(/\s+/g,' '):raw;out.push({text:spoken,number:true});end=match.index+raw.length;
 }
 fixed(source.slice(end));return out;
}
