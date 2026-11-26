import {trainerMessages} from './trainer-messages.js';
// The training radio is German. Do not mix browser/Node UI languages into its fixed dialogue.
export const SUPPORT_FAILURE_KEYS=Object.freeze({vehicle:['fpVehicleRequestInside','fpVehicleNoSpace'],helicopter:['fpHeliLandFirst','fpHeliNoSpace']});
export function supportRequest(action){return action==='vehicle'?'Benötige ein Fahrzeug an meinem Standort.':'Benötige einen Rettungshubschrauber an meinem Standort.';}
export function supportReply(action,result){
 const vehicle=action==='vehicle';
 if(result.ok)return vehicle?'Verstanden. Wir schicken Ihnen ein Fahrzeug an Ihren Standort.':'Verstanden. Wir entsenden einen Rettungshubschrauber an einen geeigneten Landeplatz in Ihrer Nähe.';
 return 'Verstanden. An Ihren Standort können wir derzeit kein '+(vehicle?'Fahrzeug':'Luftfahrzeug')+' senden. '+trainerMessages.de[result.key];
}
