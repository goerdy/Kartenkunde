import {coordinateText,coordinateCell,gridDigits} from './trainer-grid.js';
export {coordinateText} from './trainer-grid.js';
// Campaign rules are independent of Babylon, speech and UI. All coordinates use
// the fictitious UTMREF training sheet 32U KA (00–08 km).
import {PLAYER_START,TRAINING_CENTER,STATIONS,LANDMARKS,magneticBearing,angleDifference,effectiveDeclination,bearing} from './trainer-world.js';
const point=(id,e,n,label,kind='sign',extra={})=>({id,e,n,label,kind,...extra});
const coord=(site)=>[{id:site+'-e',label:'Ostwert '+site,type:'coordinate'},{id:site+'-n',label:'Nordwert '+site,type:'coordinate'}];
const number=(id,label,expected,tolerance=0)=>({id,label,type:'number',expected,tolerance});
const classroom={e:PLAYER_START.e,n:PLAYER_START.n};
export const TRAINING=[
 {id:'t1',title:'Einführung im Lehrsaal',start:classroom,brief:'Sprechen Sie mit der Ausbilderin im Lehrsaal. Lassen Sie sich Steuerung und Ausrüstung erklären. Bestätigen Sie die Einführung anschließend über Funk.',fields:[],lesson:0,hints:['Die Ausbilderin steht vorne im Mittelgang. Mit E sprechen Sie sie an.','Inventar: Karte 1, Kompass 2, Planzeiger 3, Bleistift 4, Notizblock 5, Fernglas 6, Funkgerät 9.']},
 {id:'t2',title:'Aufbau einer Karte',start:{e:1453,n:2951},brief:'Gehen Sie mit der Ausbilderin zur großen Wandkarte. Tragen Sie Maßstabsnenner, Gitterabstand und Äquidistanz im Notizblock ein.',fields:[number('scale','Maßstabsnenner',50000),number('grid','Gitterabstand in Metern',1000),number('contour','Äquidistanz in Metern',10)],lesson:1,hints:['Kartenrand, Legende und Höhenlinien liefern die gesuchten Angaben.','Der Nenner gehört hinter die 1 im Maßstab; Gitterlinien liegen einen Kilometer auseinander.']},
 {id:'t3',title:'Karte einnorden · Punkt 1',start:{e:1950,n:1650},brief:'Norden Sie die Karte erst mit dem Kompass ein. Richten Sie sie anschließend anhand des Kirchturms Sankt Florian aus. Beide Verfahren werden am Instrument geprüft. Melden Sie den Abschluss über Funk.',fields:[],sites:[point('P1',1950,1650,'Übungspunkt 1')],hints:['Mit 1 die Karte halten und mit 2 den Kompass nehmen. F öffnet die Kartenarbeit; Karte am Drehgriff ausrichten.','Die rote Nadel zeigt zum eingestellten magnetischen Norden. Beim Landmarkenverfahren muss die Kartenrichtung zum Kirchturm mit dem Gelände übereinstimmen.']},
 {id:'t4',title:'Position mit Planzeiger · Punkt 2',start:{e:1450,n:2300},brief:'Bestimmen Sie am Schild Übungspunkt 2 Ihre Position aus der Topokarte mit dem Rahmenplanzeiger. Notieren Sie die vollständige UTMREF-Koordinate mit drei Ziffern je Wert, zuerst Ostwert, dann Nordwert.',fields:coord('P2'),sites:[point('P2',1450,2300,'Übungspunkt 2')],hints:['Übungspunkt 2 ist auf der Topokarte markiert. Mit 3 den Planzeiger nehmen, mit 5 die Werte notieren.','Zuerst Ostwert, dann Nordwert: Kilometerquadrat lesen und die restlichen Meter mit dem Planzeiger bestimmen.']},
 {id:'t5',title:'Eine Koordinate aufsuchen',start:{e:1450,n:2300},brief:'Suchen Sie den Kontrollpunkt bei UTMREF 32U KA 016 024 auf. Lesen Sie die Kontrollzahl auf dem Schild am Ziel ab, notieren Sie sie und melden Sie die Zahl über Funk.',fields:[number('checkpoint','Kontrollzahl am Schild',17)],sites:[point('Ziel',1650,2400,'Kontrollpunkt','sign',{reading:'KONTROLLZAHL 17',dialog:'Am Kontrollpunkt steht die Kennzahl siebzehn.'})],hints:['Das Ziel liegt nordöstlich von Übungspunkt 2. Die Ausbilderin begleitet Sie.','Übertragen Sie 32U KA 016 024 auf die Karte, bestimmen Sie die Richtung und gehen Sie etwa 224 Meter.']},
 {id:'t6',title:'Kreuzpeilung · Punkt 3',start:{e:2450,n:1150},brief:'Bestimmen Sie Ihren Standort durch Peilung zum Kirchturm Sankt Florian und zur Melderwarte. Notieren Sie beide magnetischen Peilungen in Grad und den ermittelten Standort.',fields:[...coord('Standort'),{id:'church-bearing',label:'Peilung Kirchturm in Grad',type:'bearing'},{id:'tower-bearing',label:'Peilung Melderwarte in Grad',type:'bearing'}],sites:[point('Standort',2450,1150,'Übungspunkt 3')],hints:['Peilen Sie beide eindeutig erkannten Landmarken mit Kartenkompass, Spiegel-Peilkompass oder der Kompassskala des Fernglases. Notieren Sie die Peilungen im Notizblock.','Die Rückpeilungen sind jeweils um 180 Grad versetzt. Zwei von den bekannten Landmarken ausgehende Linien schneiden sich am gesuchten Standort.']}
];
const practice=(id,title,brief,sites,fields=[],hints=[])=>({id,title,brief,sites,fields:[...sites.flatMap(s=>coord(s.id)),...fields],hints});
export const PRACTICE=[
 practice('p1','Straßenschäden an der L 112','Erkunden Sie die L 112 zwischen Sankt Florian und dem Abzweig Am Eigenschutz. Melden Sie die Koordinaten aller drei gekennzeichneten Straßenschäden.',[point('Schaden1',1510,3067,'Schadstelle 1','damage'),point('Schaden2',1810,3124,'Schadstelle 2','damage'),point('Schaden3',2210,3200,'Schadstelle 3','damage')],[],['Beginnen Sie am östlichen Ortsausgang von Sankt Florian und folgen Sie der L 112 nach Osten.','Die Schäden sind durch orange Warnkegel gekennzeichnet. Für jeden Schaden ist ein eigenes Koordinatenpaar erforderlich.']),
 practice('p2','Gemeldeter Rauch im Rüstholz','Suchen Sie die gemeldete Rauchentwicklung am südlichen Rand des Rüstholzes. Erkunden Sie den sichtbaren Übungsrauch und melden Sie den Standort.',[point('Rauch',2850,3920,'Rauchentwicklung','smoke')],[],['Vom Wasserturm aus liegt die Rauchentwicklung im nordöstlichen Waldsaum.','Mit dem Fernglas können Sie die Rauchfahne erkennen. Nähern Sie sich anschließend zur genauen Verortung.']),
 practice('p3','Verkehrsunfall in Kupplingen','Fahren Sie zur gemeldeten Unfallstelle 32U KA 056 023 in Kupplingen. Sprechen Sie vor Ort mit der betroffenen Person und melden Sie Standort und Anzahl der Verletzten.',[point('Unfall',5650,2395,'Unfallstelle','person',{person:'Betroffene Person',dialog:'Der Unfall ist hier passiert. Zwei Personen sind leicht verletzt. Bitte melden Sie der Leitstelle zwei Verletzte.',answer:2})],[number('injured','Anzahl Verletzte',2)],['Die Unfallstelle liegt an der Langen Leitung im Ortskern von Kupplingen.','Steigen Sie aus und sprechen Sie die Person mit E an. Ihre Aussage gehört in den Notizblock.']),
 practice('p4','Kupplungsbrücke erkunden','Erkunden Sie die Kupplungsbrücke. Lesen Sie die verbliebene Durchfahrtsbreite am Kontrollschild ab und melden Sie Standort und Breite.',[point('Bruecke',4270,3402,'Brückenkontrolle','gauge',{dialog:'Die passierbare Breite beträgt vier Meter. Der markierte Bereich bleibt frei.',reading:'FREIE BREITE 4,0 m'})],[number('width','Passierbare Breite in Metern',4,.1)],['Die Brücke liegt an der L 112 über die Blaulach.','Am westlichen Brückenkopf steht das Kontrollschild; mit E können Sie die Beschriftung lesen.']),
 practice('p5','Beschädigter Funkmast','Erkunden Sie den Bereich Unter den Funkmasten. Melden Sie den Standort der markierten Beschädigung und wie viele Masten betroffen sind.',[point('Mast',720,720,'Mastschaden','mast',{dialog:'Ein Mast ist beschädigt. Der Bereich ist für diese Übung gekennzeichnet.',reading:'1 MAST BESCHÄDIGT'})],[number('poles','Betroffene Masten',1)],['Suchen Sie im südwestlichen Kartenteil beim hohen Funkmast.','Die orange Markierung steht neben dem beschädigten Übungsmast.']),
 practice('p6','Pegel an der Blaulach','Erkunden Sie den Pegel am östlichen Zugang zur Kupplungsbrücke. Melden Sie die Koordinate und den abgelesenen Wasserstand.',[point('Pegel',4380,3400,'Pegel Blaulach','gauge',{dialog:'Der Übungspegel zeigt einen Wasserstand von eins Komma acht Metern.',reading:'PEGEL 1,80 m'})],[number('level','Wasserstand in Metern',1.8,.05)],['Folgen Sie der L 112 über die Brücke nach Osten.','Die Pegeltafel steht am östlichen Ufer auf sicherem Boden.']),
 practice('p7','Vermisste Person im Rüstholz','Suchen Sie eine vermisste Person im südlichen Rüstholz. Befragen Sie die Person und melden Sie ihren Standort sowie die Anzahl der Personen, die noch vermisst werden.',[point('Person',2990,3820,'Vermisste Person','person',{person:'Wanderin',dialog:'Danke, dass Sie mich gefunden haben. Ich war allein unterwegs. Es wird keine weitere Person vermisst.',answer:0})],[number('missing','Weitere vermisste Personen',0)],['Das Suchgebiet liegt am südlichen Waldsaum östlich des Wasserturms.','Nutzen Sie Karte und Fernglas; die Person trägt eine orange Jacke.']),
 practice('p8','Zuwegung im Windpark','Erkunden Sie die Zuwegung zu den westlichen beiden Anlagen des Windparks Lange Leitung. Melden Sie die beiden beschädigten Wegmarkierungen.',[point('West',1450,4380,'Wegschaden West','damage'),point('Mitte',1850,4620,'Wegschaden Mitte','damage')],[],['Der Weg Unter den Flügeln führt vom Ort in den Windpark.','Die Schäden liegen jeweils an der Zufahrt zur westlichen und zur mittleren Anlage.']),
 practice('p9','Umleitung vorbereiten','Erkunden Sie die markierten Umleitungspunkte an der L 112. Melden Sie beide Koordinaten und die magnetische Richtung vom westlichen zum östlichen Punkt.',[point('Anfang',1050,2980,'Umleitung Anfang','sign'),point('Ende',1950,3150,'Umleitung Ende','sign')],[{id:'course',label:'Magnetische Richtung Anfang → Ende in Grad',type:'bearing'}],['Die beiden Kontrollschilder stehen am östlichen Rand von Sankt Florian und beim Abzweig Am Eigenschutz.','Verbinden Sie die Punkte auf der Karte und bestimmen Sie die Richtung mit dem Kartenkompass.']),
 practice('p10','Abschließende Lageerkundung','Erkunden Sie den Bevölkerungsschutz-Stützpunkt. Melden Sie Bereitstellungsraum, Helipad und Ansprechpartner. Erfragen Sie, wie viele Fahrzeuge im Bereitstellungsraum Platz haben.',[point('Bereitstellung',1510,2780,'Bereitstellungsraum','sign',{reading:'BEREITSTELLUNGSRAUM · 6 FAHRZEUGE'}),point('Helipad',1740,2840,'Luftrettung','sign'),point('Kontakt',1545,2800,'Ansprechpartner Klinik','person',{person:'Klinikmitarbeiter',dialog:'Im markierten Bereitstellungsraum können sechs Fahrzeuge aufgestellt werden. Der Helipad liegt östlich von hier.',answer:6})],[number('capacity','Fahrzeuge im Bereitstellungsraum',6)],['Die Leitstelle erwartet drei Standorte und die Kapazität des Bereitstellungsraums.','Befragen Sie den Ansprechpartner auf dem Hof nördlich der Klinik mit E.'])
];
export const MISSIONS=[...TRAINING,...PRACTICE];
export const COORDINATE_HELP='UTMREF der fiktiven Übungskarte: 32U KA. Erst Ostwert, dann Nordwert; jeweils 3 Ziffern (100 Meter), optional 4 Ziffern (10 Meter). Beispiel: 32U KA 019 016. Beide Werte müssen gleich viele Stellen haben.';
export const INTRO='Willkommen im Ausbildungszentrum für Bevölkerungsschutz von Kartenkunde.app! Ich bin Ihre Ausbilderin. Mit W A S D bewegen Sie sich, mit der Maus schauen Sie sich um. Umschalt beschleunigt, die Leertaste lässt Sie springen. Mit E sprechen Sie Personen an, lesen Kontrollschilder oder steigen in Fahrzeuge. Die festen Inventarplätze sind: eins Karte, zwei Kompass, drei Rahmenplanzeiger, vier Bleistift, fünf Notizblock, sechs Fernglas und neun Funkgerät. Mit der rechten Maustaste betrachten Sie die Karte oder peilen mit dem Kompass. F öffnet die Kartenarbeit, C wechselt den Kompasstyp. Mit V schalten Sie das Vollbild ein. Escape schließt Ansichten oder gibt die Maus frei. Neue Aufträge, Hinweise, Fahrzeuge und Ergebnismeldungen laufen über das Funkgerät auf Taste neun. Im Notizblock finden Sie die Lückentexte zum aktuellen Auftrag. Links sehen Sie Ihren Fortschritt. '+COORDINATE_HELP+' Sprechen Sie mich während der Ausbildung jederzeit mit E an. Fordern Sie nach der Einführung über Funk die Prüfung an.';
export const LESSONS=[INTRO,
 'An der großen Wandkarte erkennen Sie Kartenrand, Kilometergitter, Legende, Straßen, Gewässer, Siedlungen und Höhenlinien. Der Maßstab ist eins zu fünfzigtausend. Ein Zentimeter auf der maßstäblichen Handkarte entspricht fünfhundert Metern im Gelände. Das Gitter hat einen Abstand von eintausend Metern. Zwischen zwei benachbarten Höhenlinien liegen zehn Höhenmeter. Notieren Sie die drei gesuchten Werte mit Taste fünf und melden Sie die Ergebnisse über Funk.',
 'Wir sind am Übungspunkt eins. Legen Sie mit eins und zwei Karte und Kompass an. Öffnen Sie mit F die Kartenarbeit. Bringen Sie die Karten-Nordrichtung und die Kompass-Nordrichtung zur Deckung. Anschließend orientieren Sie die Karte ohne Hilfe der Nadel anhand des Kirchturms Sankt Florian. Vergleichen Sie die Richtung vom eigenen Punkt zum Kirchturm auf der Karte mit der tatsächlichen Blickrichtung zum Kirchturm. Beide Verfahren werden erkannt; den Abschluss melden Sie über Funk.',
 'Das Schild benennt Übungspunkt zwei. Finden Sie diesen Punkt auf der Topokarte. Lesen Sie erst den Ostwert, dann den Nordwert des Kilometerquadrats. Mit dem Rahmenplanzeiger auf Platz drei bestimmen Sie die restlichen Meter. Tragen Sie beide Werte selbst im Notizblock ein. Der Funkruf Ergebnisse melden lässt die Leitstelle Ihre Messung prüfen.',
 'Übertragen Sie die Koordinate 32U KA 016 024 auf die Karte. Bestimmen Sie die Marschrichtung mit dem Kompass und gehen Sie zum Kontrollpunkt. Ich begleite Sie. Wenn Sie dort sind, lesen Sie die Kontrollzahl auf dem Schild. Tragen Sie diese Zahl im Notizblock ein und melden Sie sie über Funk.',
 'Ihr Standort ist nun absichtlich nur als Übungspunkt drei bezeichnet. Peilen Sie den Kirchturm Sankt Florian und die Melderwarte an. Sie können den Kartenkompass, den Spiegel-Peilkompass oder die Kompassskala des Fernglases verwenden. Notieren Sie die magnetischen Peilungen in Grad mit drei Ziffern, zum Beispiel null vier fünf. Übertragen Sie die Rückrichtungen auf die Karte. Der Schnittpunkt liefert Ihren Standort. Tragen Sie auch dessen Ost- und Nordwert in den Notizblock ein. Danach melden Sie alle Ergebnisse über Funk.'
];
export function defaultCampaign(){return {version:1,coordinateFormat:2,trainingDone:0,practiceDone:0,active:null,entries:{},seen:[],talked:[],evidence:[],hints:{},log:[],lastFeedback:''};}
export function restoreCampaign(raw){
 const c=defaultCampaign();if(raw?.version!==1)return c;
 const integer=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max?n:0;c.trainingDone=integer(raw.trainingDone,6);c.practiceDone=c.trainingDone===6?integer(raw.practiceDone,10):0;
 const expected=typeof raw.active==='string'&&raw.active.startsWith('t')?TRAINING[c.trainingDone]:c.trainingDone===6?PRACTICE[c.practiceDone]:null;c.active=expected?.id===raw.active?raw.active:null;
 for(const m of MISSIONS){if(raw.entries?.[m.id]&&typeof raw.entries[m.id]==='object'){c.entries[m.id]={};for(const f of m.fields)if(typeof raw.entries[m.id][f.id]==='string')c.entries[m.id][f.id]=f.type==='coordinate'&&raw.coordinateFormat!==2&&/^\d{5}$/.test(raw.entries[m.id][f.id])?gridDigits(Number(raw.entries[m.id][f.id])):raw.entries[m.id][f.id].slice(0,80);}c.hints[m.id]=integer(raw.hints?.[m.id],99);}
 for(const key of ['seen','talked','evidence'])c[key]=Array.isArray(raw[key])?[...new Set(raw[key].filter(v=>typeof v==='string'&&v.length<60))].slice(0,30):[];
 c.log=Array.isArray(raw.log)?raw.log.filter(v=>v&&['self','dispatch','instructor','person'].includes(v.role)&&typeof v.text==='string').slice(-80).map(v=>({role:v.role,text:v.text.slice(0,4000)})):[];
 c.lastFeedback=typeof raw.lastFeedback==='string'?raw.lastFeedback.slice(0,1000):'';return c;
}
export const currentMission=s=>MISSIONS.find(m=>m.id===s.campaign.active)||null;
export const spokenDigits=v=>String(v).replace(/[,.]/g,' Komma ').replace(/\d/g,d=>d+' ');
export function missionNpc(s){const m=currentMission(s);if(m?.id.startsWith('t'))return {id:'instructor',name:'Ausbilderin',role:'instructor',dialog:LESSONS[Number(m.id.slice(1))-1]};return null;}
export function advanceCampaign(s,track='auto'){
 const c=s.campaign;if(c.active)return {ok:false,message:'Der aktuelle Auftrag ist noch nicht abgeschlossen. Melden Sie zuerst Ihre Ergebnisse.'};
 if(track==='practice'&&c.trainingDone<6)return {ok:false,message:'Beenden Sie zuerst die sechs Ausbildungsstationen.'};
 const m=track==='training'||track==='auto'&&c.trainingDone<6?TRAINING[c.trainingDone]:PRACTICE[c.practiceDone];
 if(!m)return {ok:false,message:'Alle Aufträge dieser Kampagne sind abgeschlossen.'};
 if(m.start&&(s.helicopter.occupied||s.vehicle.occupied))return {ok:false,message:'Steigen Sie vor dem Wechsel der Ausbildungsstation sicher aus dem Fahrzeug aus.'};
 s.helpers=false;c.active=m.id;c.seen=[];c.talked=[];c.evidence=[];c.lastFeedback='';c.entries[m.id]??={};
 if(m.start){s.player={...m.start};s.yaw=s.north;s.pitch=0;s.mode='explore';Object.assign(s.jump,{offset:0,velocity:0,grounded:true,wasPressed:false});}
 return {ok:true,message:m.brief,mission:m};
}
const add=(list,id)=>{if(!list.includes(id))list.push(id);};
export function observeCampaign(s){
 const m=currentMission(s);if(!m||!s.started||s.paused||s.vehicle.occupied||s.helicopter.occupied)return false;const c=s.campaign,before=JSON.stringify([c.seen,c.evidence]);
 for(const p of m.sites||[])if(Math.hypot(p.e-s.player.e,p.n-s.player.n)<18)add(c.seen,p.id);
 if(s.items.romer!=='stowed')add(c.evidence,'romer');if(s.items.compass!=='stowed')add(c.evidence,'compass');
 if(m.id==='t3'&&Math.hypot(s.player.e-m.start.e,s.player.n-m.start.n)<45&&s.mapLocation!=='stowed'&&Math.abs(angleDifference(s.paperAngle,s.north))<=5){
  if(s.items.compass!=='stowed')add(c.evidence,'north-compass');
  const target=bearing(s.player,LANDMARKS[0])+s.north;if(Math.abs(angleDifference(s.yaw,target))<=25)add(c.evidence,'north-landmark');
 }
 if(m.id==='t6'&&(s.mode==='binoculars'||s.mode==='sight'&&s.items.compass!=='stowed'))for(const [index,key]of [[0,'sight-church'],[1,'sight-tower']]){
  if(Math.abs(angleDifference(s.yaw+(s.mode==='sight'?s.handAngle:0)-s.north,bearing(s.player,LANDMARKS[index])))<5)add(c.evidence,key);
 }
 return before!==JSON.stringify([c.seen,c.evidence]);
}
function value(raw){if(typeof raw!=='string'||!raw.trim())return NaN;const text=raw.trim().replace(',','.');return /^\d+(\.\d+)?$/.test(text)?Number(text):NaN;}
export const DEGREE_FORMAT_HINT='Bitte geben Sie Gradangaben immer dreistellig durch, zum Beispiel 045.';
// Assign whole coordinate pairs one-to-one, so duplicates cannot stand in for missing sites.
export function assessCoordinatePairs(m,entries){
 const sites=(m.sites||[]).filter(p=>m.fields.some(f=>f.id===p.id+'-e'));
 const rows=sites.map(p=>({e:coordinateCell(entries[p.id+'-e']),n:coordinateCell(entries[p.id+'-n'])}));
 const distance=(row,p)=>!row.e||!row.n||row.e.precision!==row.n.precision?Infinity:Math.hypot(...['e','n'].map(axis=>Math.max(row[axis].lower-p[axis],p[axis]-(row[axis].lower+row[axis].size-1),0)));
 const costs=rows.map(row=>sites.map(p=>distance(row,p)));
 let best=null;
 function assign(order,remaining){
  if(!remaining.length){
   const errors=order.map((site,i)=>costs[i][site]);
   const correct=errors.filter(d=>d<=50).length,total=errors.reduce((sum,d)=>sum+Math.min(d,1e6),0);
   if(!best||correct>best.correct||correct===best.correct&&total<best.total)best={order,correct,total};
   return;
  }
  for(const site of remaining)assign([...order,site],remaining.filter(i=>i!==site));
 }
 assign([],sites.map((_,i)=>i));
 const results=rows.map((row,i)=>{
  const d=costs[i][best.order[i]];
  const status=!row.e||!row.n||row.e.precision!==row.n.precision?'fehlt oder hat ein ungültiges Format':d<=50?'ist korrekt':d<=300?'ist zu ungenau':'liegt komplett daneben';
  return {ok:d<=50,status};
 });
 return {ok:results.every(r=>r.ok),message:results.map((r,i)=>`Koordinate ${i+1} ${r.status}.`).join(' ')};
}
export function assessCampaign(s){
 const m=currentMission(s),c=s.campaign;if(!m)return {ok:false,message:'Es liegt kein aktiver Auftrag vor.'};const fail=message=>({ok:false,message});
 if(m.id==='t3'&&!['north-compass','north-landmark'].every(k=>c.evidence.includes(k)))return fail('Das Einnorden muss sowohl mit Kompass als auch anhand des Kirchturms gezeigt werden.');
 if(m.id==='t4'&&!c.evidence.includes('romer'))return fail('Benutzen Sie den Rahmenplanzeiger zur Positionsbestimmung.');
 for(const p of m.sites||[]){if(!c.seen.includes(p.id))return fail(`Erkunden Sie ${p.label} vor Ort.`);if(['person','gauge','mast'].includes(p.kind)&&!c.talked.includes(p.id))return fail(`Sprechen oder lesen Sie bei ${p.label} mit E.`);}
 const entries=c.entries[m.id]||{};
 const unordered=m.fields.filter(f=>f.type==='coordinate').length>2;
 if(unordered){const result=assessCoordinatePairs(m,entries);if(!result.ok)return fail(result.message);}
 for(const f of m.fields){if(unordered&&f.type==='coordinate')continue;const n=value(entries[f.id]);if(!Number.isFinite(n))return fail(`Die Angabe „${f.label}“ fehlt oder ist keine gültige Zahl.`);
  if(f.type==='coordinate'){
   const cell=coordinateCell(entries[f.id]),other=coordinateCell(entries[f.id.slice(0,-1)+(f.id.endsWith('e')?'n':'e')]);
   if(!cell||!other||cell.precision!==other.precision)return fail('UTMREF: Tragen Sie nach 32U KA zwei gleich lange Zahlengruppen mit jeweils drei oder vier Ziffern ein.');
   if(cell.lower>8000)return fail('Die Koordinate liegt außerhalb des Kartenblatts. Prüfen Sie die Kilometerziffern am Kartenrand.');
   const id=f.id.slice(0,-2),axis=f.id.slice(-1),p=(m.sites||[]).find(p=>p.id===id),tolerance=m.id==='t4'?25:50;
   if(!p||p[axis]<cell.lower-tolerance||p[axis]>=cell.lower+cell.size+tolerance){
    const direction=axis==='e'?(cell.lower>p?.e?'östlich':'westlich'):(cell.lower>p?.n?'nördlich':'südlich');
    return fail(`Der ${axis==='e'?'Ostwert':'Nordwert'} für ${p?.label||id} liegt zu weit ${direction}. Prüfen Sie die linke beziehungsweise untere Kilometerlinie und die Reststrecke mit dem Planzeiger.`);
   }
  }
  else if(f.type==='number'&&Math.abs(n-f.expected)>(f.tolerance||0))return fail(`Die Angabe „${f.label}“ ist ${n<f.expected?'zu niedrig':'zu hoch'}. Prüfen Sie die Einheit und lesen Sie die Beobachtung oder die Lehrtafel erneut.`);
  else if(f.type==='bearing'){
   let expected;if(m.id==='t6')expected=magneticBearing(m.start,LANDMARKS[f.id.startsWith('church')?0:1],effectiveDeclination(s));else expected=magneticBearing(m.sites[0],m.sites[1],effectiveDeclination(s));
   if(n>=360||Math.abs(angleDifference(n,expected))>5)return fail(`Die Peilung „${f.label}“ passt noch nicht. Prüfen Sie Ziel, Nordrichtung und die Gradskala.`);
  }
 }
 const formatHint=m.fields.some(f=>f.type==='bearing'&&!/^\d{3}(?:[.,]\d+)?$/.test(entries[f.id]?.trim()||''))?DEGREE_FORMAT_HINT:'';
 const message=m.id==='t6'?'Ausbildung erfolgreich abgeschlossen. Sie können jetzt den ersten selbstständigen Einsatz anfordern.':m.id==='p10'?'Lagemeldung korrekt. Alle zehn Einsatzübungen sind erfolgreich abgeschlossen.':'Verstanden. Ihre Ergebnisse sind korrekt. Auftrag abgeschlossen. Fordern Sie den nächsten Auftrag an.';
 return {ok:true,message:message+(formatHint?' '+formatHint:''),formatHint};
}
export function completeCampaign(s){const result=assessCampaign(s);s.campaign.lastFeedback=result.message;if(result.ok){if(s.campaign.active.startsWith('t'))s.campaign.trainingDone++;else s.campaign.practiceDone++;s.campaign.active=null;}return result;}
export function campaignHint(s){const m=currentMission(s);if(!m)return 'Fordern Sie zunächst einen Ausbildungs- oder Einsatzauftrag an.';const n=s.campaign.hints[m.id]||0;s.campaign.hints[m.id]=Math.min(99,n+1);return m.hints[Math.min(n,m.hints.length-1)]||m.brief;}
export function reportText(s){
 const m=currentMission(s);if(!m)return 'Ich möchte Ergebnisse melden, habe aber keinen aktiven Auftrag.';
 const entries=s.campaign.entries[m.id]||{},fields=[];const unordered=m.fields.filter(f=>f.type==='coordinate').length>2;let coordinateIndex=0;
 for(const f of m.fields){if(f.type==='coordinate'){
  if(f.id.endsWith('-n'))continue;const site=f.id.slice(0,-2);fields.push(`${unordered?'Koordinate '+(++coordinateIndex):site}: 32U KA ${coordinateCell(entries[f.id])?entries[f.id]:'nicht ausgefüllt'} ${coordinateCell(entries[site+'-n'])?entries[site+'-n']:'nicht ausgefüllt'}`);
 }else fields.push(`${f.label}: ${spokenDigits(entries[f.id]||'nicht ausgefüllt')}`);}
 return `Melde Ergebnisse zu ${m.title}. ${fields.join('. ')||'Die Ausbildungsstation wurde durchgeführt.'}`;
}
