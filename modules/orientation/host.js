// The only runtime boundary to the main website. Do not duplicate these definitions.
import {registerMessages} from '../../src/i18n.js';
import {trainerMessages} from './src/trainer-messages.js';
registerMessages(trainerMessages);
export {t,getLanguage,setLanguage,translatePage} from '../../src/i18n.js';
export {PQ5_TK_COLORS} from '../../src/map-palette.js';
export {frameGraduations} from '../../src/planzeiger-scale.js';
