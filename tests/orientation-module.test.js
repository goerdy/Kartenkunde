import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {PQ5_TK_COLORS as websitePalette} from '../src/pq5-tk.js';
import {frameGraduations as websiteScale} from '../src/simulator-geometry.js';
import {PQ5_TK_COLORS as modulePalette,frameGraduations as moduleScale} from '../modules/orientation/host.js';
import {messages,registerMessages} from '../src/i18n.js';
const root=new URL('../',import.meta.url),moduleRoot=new URL('modules/orientation/',root);
const imports=text=>[...text.matchAll(/(?:from\s*|import\s*\()\s*['"](\.{1,2}\/[^'"]+\.js)['"]/g)].map(m=>m[1]);
test('3D module shares the exact canonical palette and scale implementation',()=>{
 assert.equal(modulePalette,websitePalette);assert.equal(moduleScale,websiteScale);
 for(const scale of [25000,50000])for(const row of [25000,50000,100000,200000])assert.deepEqual(moduleScale(row,scale),websiteScale(row,scale));
});
test('Every game import stays inside the module except its explicit host boundary',async()=>{
 for(const name of await readdir(new URL('src/',moduleRoot))){
  if(!name.endsWith('.js'))continue;
  const file=new URL('src/'+name,moduleRoot),text=await readFile(file,'utf8');
  for(const specifier of imports(text)){
   const resolved=new URL(specifier,file);await access(resolved);
   assert.ok(resolved.href.startsWith(moduleRoot.href),`${name} bypasses host boundary: ${specifier}`);
  }
 }
 const hostImports=imports(await readFile(new URL('host.js',moduleRoot),'utf8')).filter(s=>s.startsWith('../../src/'));
 assert.deepEqual([...new Set(hostImports)].sort(),['../../src/i18n.js','../../src/map-palette.js','../../src/planzeiger-scale.js']);
});
test('Main website does not import the game and standalone owns all required host resources',async()=>{
 for(const name of await readdir(new URL('src/',root))){
  if(!name.endsWith('.js'))continue;
  const text=await readFile(new URL('src/'+name,root),'utf8');
  assert.ok(!text.includes('trainer-messages.js')&&!text.includes('modules/orientation/'),`${name} imports the game`);
 }
 const contract=JSON.parse(await readFile(new URL('module.json',moduleRoot),'utf8'));
 for(const path of [...contract.sharedSources,...contract.sharedStyles,...contract.sharedAssets,...contract.resources])await access(new URL(path,root));
 assert.ok(!(await readFile(new URL('template.html',moduleRoot),'utf8')).includes('<script'), 'The host controls module startup');
 const generator=await readFile(new URL('tools/build-orientation.mjs',root),'utf8');
 assert.ok(generator.includes('verifyDist(root)'));assert.ok(generator.includes('...module.sharedAssets'));
});
test('Module translations cannot override authoritative main-site wording',()=>{
 const original=messages.de.simFullscreen;
 registerMessages({de:{simFullscreen:'wrong module override'},unknown:{simFullscreen:'unsupported'}});
 assert.equal(messages.de.simFullscreen,original);assert.equal(messages.unknown,undefined);
 assert.ok(messages.de.fpDevelopmentNotice.includes('Taste 9'));
});
