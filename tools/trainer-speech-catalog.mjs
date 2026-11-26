import {SUPPORT_FAILURE_KEYS,supportRequest,supportReply} from '../modules/orientation/src/trainer-radio-text.js';
import {LESSONS,MISSIONS,COORDINATE_HELP,DEGREE_FORMAT_HINT,assessCampaign,reportText,defaultCampaign} from '../modules/orientation/src/trainer-campaign.js';
import {defaultGameState} from '../modules/orientation/src/trainer-game-state.js';
import {gridDigits,spokenCoordinates} from '../modules/orientation/src/trainer-grid.js';
import {radioExchange} from '../modules/orientation/src/trainer-speech.js';
import {speechPlan} from '../modules/orientation/src/trainer-speech-plan.js';
import {magneticBearing,effectiveDeclination,LANDMARKS} from '../modules/orientation/src/trainer-world.js';
export function speechCatalog(){
 const lines=[],add=(role,text)=>lines.push({role,text});
 for(const text of LESSONS)add('instructor',text);
 const exchange=(request,response)=>lines.push(...radioExchange(request,response));
 const requests=['Benötige ein Fahrzeug an meinem Standort.','Benötige einen Rettungshubschrauber an meinem Standort.','Benötige mein Navigationsmaterial wieder am Mann.','Erbitte den nächsten Ausbildungsauftrag.','Erbitte einen neuen Einsatzauftrag.','Erbitte einen Hinweis zum aktuellen Auftrag.','Erbitte erneutes Aufsuchen der aktuellen Ausbildungsstation.'];
 for(const request of requests)exchange(request,'Verstanden.');
 for(const response of ['Verstanden. Wir schicken Ihnen ein Fahrzeug an Ihren Standort.','Verstanden. Wir entsenden einen Rettungshubschrauber an einen geeigneten Landeplatz in Ihrer Nähe.','Verstanden. Ihr Navigationsmaterial wird an Sie zurückgegeben.','Verstanden. Sie werden mit Ihrer Ausbilderin zum Ausbildungsort versetzt.','Der aktuelle Auftrag ist noch nicht abgeschlossen. Melden Sie zuerst Ihre Ergebnisse.','Alle Aufträge dieser Kampagne sind abgeschlossen.'])add('dispatch',response.replace(/[.!\s]+$/,'')+' – kommen.');
 for(const m of MISSIONS){
  add('instructor',m.brief);add('instructor',[m.brief,...m.hints].join(' '));
  exchange(m.id.startsWith('t')?'Erbitte den nächsten Ausbildungsauftrag.':'Erbitte einen neuen Einsatzauftrag.','Verstanden. Ihr Auftrag lautet: '+m.brief);
  for(const hint of m.hints)exchange(requests[5],'Verstanden. '+hint);
  for(const site of m.sites||[])if(site.dialog||site.reading)add('person',site.dialog||site.reading);
  const s=defaultGameState();s.campaign={...defaultCampaign(),active:m.id};s.campaign.entries[m.id]={};s.campaign.seen=(m.sites||[]).map(p=>p.id);s.campaign.talked=(m.sites||[]).map(p=>p.id);s.campaign.evidence=['romer','north-compass','north-landmark','sight-church','sight-tower'];
  for(const f of m.fields){let v=f.expected;if(f.type==='coordinate')v=gridDigits(m.sites.find(p=>p.id===f.id.slice(0,-2))[f.id.slice(-1)]);if(f.type==='bearing')v=String(m.id==='t6'?magneticBearing(m.start,LANDMARKS[f.id.startsWith('church')?0:1],effectiveDeclination(s)):magneticBearing(m.sites[0],m.sites[1],effectiveDeclination(s)));s.campaign.entries[m.id][f.id]=f.type==='bearing'?Number(v).toFixed(0).padStart(3,'0'):String(v);}
  exchange(reportText(s),assessCampaign(s).message);
  const feedback=state=>{const message=assessCampaign(state).message;add('instructor',message);add('dispatch',message.replace(/[.!\s]+$/,'')+' – kommen.');};
  for(const field of ['seen','talked','evidence']){const variant=structuredClone(s);variant.campaign[field]=[];feedback(variant);}
  for(const f of m.fields)for(const wrong of ['', 'abc','000','080','999999']){const variant=structuredClone(s);variant.campaign.entries[m.id][f.id]=wrong;feedback(variant);if(!wrong)exchange(reportText(variant),assessCampaign(variant).message);}
  for(const f of m.fields){const saved=s.campaign.entries[m.id][f.id];s.campaign.entries[m.id][f.id]='';const text=assessCampaign(s).message;add('instructor',text);add('dispatch',text.replace(/[.!\s]+$/,'')+' – kommen.');s.campaign.entries[m.id][f.id]=saved;}
 }
 for(const [action,keys] of Object.entries(SUPPORT_FAILURE_KEYS))for(const key of keys)exchange(supportRequest(action),supportReply(action,{ok:false,key}));
 add('dispatch','Ein Wechsel ist derzeit nicht möglich. Steigen Sie zuerst sicher aus dem Fahrzeug aus – kommen.');
 exchange('Ich möchte Ergebnisse melden, habe aber keinen aktiven Auftrag.','Es liegt kein aktiver Auftrag vor.');
 add('instructor','Fordern Sie über das Funkgerät den nächsten Auftrag an.');
 add('instructor','Willkommen im Ausbildungszentrum für Bevölkerungsschutz von Kartenkunde.app. Aufträge und Hinweise erhalten Sie über das Funkgerät auf Platz neun. Ihren aktuellen Auftrag sehen Sie links. Mit fünf öffnen Sie Ihren Notizblock.');
 for(const role of ['instructor','dispatch'])add(role,DEGREE_FORMAT_HINT+(role==='dispatch'?' – kommen.':''));
 add('instructor','Ihre Ergebnisse sind richtig. Sie können sie jetzt über das Funkgerät an die Leitstelle melden.');
 // Pre-render all fixed feedback fragments, including transitions between coordinate verdicts.
 for(const status of ['ist korrekt','ist zu ungenau','liegt komplett daneben','fehlt oder hat ein ungültiges Format'])for(const role of ['instructor','dispatch']){
  add(role,`Koordinate 1 ${status}. Koordinate 2 ${status}. Koordinate 3 ${status}.`+(role==='dispatch'?' – kommen.':''));
 }
 const unique=new Map();for(const line of lines)for(const {text} of speechPlan(line.text)){if(!text)continue;const role=line.role==='person'?'self':line.role;unique.set(role+'\n'+text,{role,text});}
 return [...unique.values()];
}
if(process.argv[1]?.endsWith('trainer-speech-catalog.mjs'))console.log(JSON.stringify(speechCatalog()));
