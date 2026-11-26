import {PiperSpeech,PIPER_VOICES} from './trainer-piper.js';
// One speech queue for both sides of a radio exchange and local conversations.
// The visible transcript is authoritative when the browser has no usable voice.
export class TrainingSpeech{
 constructor({environment=globalThis,onLine=()=>{},onBusy=()=>{},onVoices=()=>{},onStatus=()=>{},preferences=()=>({}),enabled=()=>true,duck=()=>{},delay=(ms)=>new Promise(r=>setTimeout(r,ms))}={}){
  Object.assign(this,{environment,onLine,onBusy,onVoices,onStatus,preferences,enabled,duck,delay});this.serial=0;this.busy=false;
  this.piper=environment.kartenkundePiper||new PiperSpeech({environment,onStatus});
 }
 async preload(progress=()=>{}){if(this.piper.preload)await this.piper.preload(progress);else progress(1);}
 warmModels(){this.piper.warmModels?.();}
 voices(){return Object.values(PIPER_VOICES);}
 chooseVoice(role){return PIPER_VOICES[role]||PIPER_VOICES.self;}
 cancel(){this.serial++;this.finish?.();this.finish=null;this.piper.cancel();this.busy=false;this.duck(false);this.onBusy(false);}
 next(){this.piper.cancel();this.finish?.();}
 async line(item,token){
  if(token!==this.serial)return;this.onLine(item);
  if(this.enabled()&&this.preferences().enabled!==false){
   try{this.piper.reset?.();await this.piper.speak(item.text,item.role);return;}
   catch(error){this.onStatus(`Sprachausgabe nicht verfügbar: ${error.message} Der Text bleibt lesbar.`);}
  }
  if(token!==this.serial)return;
  let done;const skip=new Promise(resolve=>{done=resolve;});this.finish=done;await Promise.race([this.delay(Math.min(8000,Math.max(700,item.text.length*26))),skip]);if(this.finish===done)this.finish=null;
 }
 async play(lines,complete=()=>{}){
  if(this.busy)return false;const token=++this.serial;this.busy=true;this.onBusy(true);this.duck(true);this.piper.unlock?.()?.catch?.(()=>{});this.piper.prepare?.(lines)?.catch?.(()=>{});
  try{for(const line of lines){if(token!==this.serial)return false;await this.line(line,token);if(token!==this.serial)return false;await this.delay(180);}if(token!==this.serial)return false;complete();return true;}
  finally{if(token===this.serial){this.finish=null;this.busy=false;this.duck(false);this.onBusy(false);}}
 }
 dispose(){this.cancel();this.piper.dispose?.();}
}
export const RADIO_NAMES={self:'Einsatzleiter Sankt Florian',dispatch:'Leitstelle Sankt Florian'};
export function radioExchange(request,response){return [
 {role:'self',text:`${RADIO_NAMES.dispatch} von ${RADIO_NAMES.self} – kommen.`},
 {role:'dispatch',text:`Hier ${RADIO_NAMES.dispatch} – kommen.`},
 {role:'self',text:`${request.replace(/[.!\s]+$/,'')} – kommen.`},
 {role:'dispatch',text:`${response.replace(/[.!\s]+$/,'')} – kommen.`},
 {role:'self',text:'Verstanden – Ende.'}
];}
