// Explicit diagnostic allowlist: never send notebook contents, saved games or radio logs.
export function feedbackContext(state,build=''){
 const number=value=>Number.isFinite(value)?Math.round(value*100)/100:0;
 const position=value=>({e:number(value?.e),n:number(value?.n)});
 return {build:String(build||'unknown').slice(0,64),mode:state.mode,slot:state.activeSlot,
  position:position(state.helicopter?.occupied?state.helicopter:state.vehicle?.occupied?state.vehicle:state.player),
  yaw:number(state.yaw),pitch:number(state.pitch),map:state.mapLocation,hand:state.handTool||'none',
  items:{...Object.fromEntries(['compass','romer','pencil','binoculars','radio'].map(key=>[key,state.items?.[key]||'stowed'])),notepad:state.notepadLocation||'stowed'},
  instrument:state.instrument,mission:state.campaign?.active||'none',quality:state.quality,
  vehicle:{occupied:!!state.vehicle?.occupied,speed:number(state.vehicle?.speed)},
  helicopter:{occupied:!!state.helicopter?.occupied,speed:number(state.helicopter?.speed),altitude:number(state.helicopter?.altitude)}};
}
export class TrainerFeedback{
 constructor(state){
  this.state=state;this.snapshot=null;this.busy=false;
  this.form=document.getElementById('fpReportForm');this.status=document.getElementById('fpReportStatus');
  document.getElementById('fpReportOpen').onclick=()=>{this.form.hidden=!this.form.hidden;if(!this.form.hidden)document.getElementById('fpReportText').focus();};
  this.form.onsubmit=event=>{event.preventDefault();this.send();};
 }
 capture(){if(!this.busy)this.snapshot=feedbackContext(this.state,document.documentElement.dataset.build||'');}
 async send(){
  if(this.busy||!this.form.reportValidity())return;
  this.busy=true;const button=document.getElementById('fpReportSend');button.disabled=true;this.status.textContent='Meldung wird gespeichert …';
  try{
   const response=await fetch(new URL('../../../api/feedback.php',import.meta.url),{method:'POST',headers:{'Content-Type':'application/json','X-Kartenkunde-Feedback':'1'},credentials:'omit',signal:AbortSignal.timeout(20000),body:JSON.stringify({text:document.getElementById('fpReportText').value,consent:true,context:this.snapshot||feedbackContext(this.state)})});
   const result=await response.json();if(!response.ok)throw Error(response.status===429?'Bitte warte einige Minuten vor der nächsten Meldung.':result.error||'Speichern fehlgeschlagen.');
   this.status.textContent=`Danke! Deine Meldung wurde gespeichert (${result.id}).`;document.getElementById('fpReportText').value='';document.getElementById('fpReportConsent').checked=false;
  }catch(error){this.status.textContent=error.name==='TimeoutError'?'Zeitüberschreitung: Der Versandstatus ist unklar. Bitte nicht sofort erneut senden.':error.message==='Failed to fetch'?'Keine Verbindung zum Server. Dein Text bleibt erhalten.':error.message;}
  finally{this.busy=false;button.disabled=false;}
 }
}
