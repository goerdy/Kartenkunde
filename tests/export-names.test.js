import test from 'node:test';
import assert from 'node:assert/strict';
import {exportFileNames} from '../src/export-names.js';
test('Export names use exercise-title-date and atlas-title-short scale',()=>{
 const names=exportFileNames({title:'Bad Dürkheim',scale:50000},new Date(2026,10,22));
 assert.equal(names.zip,'Übung-Bad-Dürkheim-2026-11-22.zip');assert.equal(names.exercise,'Übung-Bad-Dürkheim-2026-11-22.pdf');assert.equal(names.solution,'Übung-Bad-Dürkheim-2026-11-22-Lösungen.pdf');assert.equal(names.atlas,'Atlas-Bad-Dürkheim-1:50k.pdf');
 for(const scale of [5000,10000,25000,50000,100000,200000])assert.ok(exportFileNames({title:'Test',scale}).atlas.endsWith(`1:${scale/1000}k.pdf`));
});
