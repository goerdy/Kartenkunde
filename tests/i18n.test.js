import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {messages,languages,t,setLanguage,getLanguage} from '../src/i18n.js';
import {countryName,countryOptions,levelName} from '../src/admin.js';
import {formatFarmError} from '../src/farm-labels.js';
import {styleCredit,rasterRegions,MAP_STYLES,styleURL,applyMapStyle} from '../src/render.js';
test('Every supported language covers every UI, error, and PDF message',()=>{const keys=Object.keys(messages.de).sort();for(const lang of Object.keys(languages)){assert.deepEqual(Object.keys(messages[lang]).sort(),keys);for(const key of keys)assert.ok(messages[lang][key].length>0);}});
test('HTML translation attributes resolve in every language',()=>{const html=readFileSync(new URL('../karten.html',import.meta.url),'utf8');const keys=[...html.matchAll(/data-i18n(?:-html|-placeholder|-label|-title)?="([^"]+)"/g)].map(m=>m[1]);assert.ok(keys.length>35);for(const lang of Object.keys(languages))for(const key of keys)assert.ok(Object.hasOwn(messages[lang],key),`${lang}: ${key}`);assert.ok(html.includes('<option value="300">300 dpi</option>'));assert.ok(html.includes('Druckbare UTMREF-Karten'));});
test('Language changes localise country names, administrative labels, errors and confirmation placeholders',()=>{try{for(const [lang,name,state]of [['de','Deutschland','Bundesland'],['en','Germany','Federal state'],['fr','Allemagne','État fédéré']]){setLanguage(lang);assert.equal(getLanguage(),lang);assert.equal(countryName({boundaryISO:'DEU',boundaryName:'Germany'}),name);assert.equal(countryOptions([{boundaryISO:'DEU'},{boundaryISO:'FRA'}])[0].boundaryISO,'DEU');assert.equal(levelName({boundaryType:'ADM1'},'DEU'),state);const warning=t('confirmPages',{total:31,maps:30});assert.ok(warning.includes('31')&&warning.includes('30'));assert.ok(!warning.includes('{'));assert.ok(!t('invalidJSON').includes('JSON.parse'));}setLanguage('invalid');assert.equal(getLanguage(),'fr');}finally{setLanguage('de');}});
test('A1 at 300 dpi is split into bounded sections with exact coverage and geographic registration',()=>{
 const width=Math.round(574*300/25.4),height=Math.round(821*300/25.4),sheet={x0:400000,x1:428700,y0:5500000,y1:5541050};assert.ok(height>7800);
 const regions=rasterRegions(sheet,width,height);assert.ok(regions.length>1);assert.equal(regions.reduce((n,r)=>n+r.drawWidth*r.drawHeight,0),width*height);
 for(const r of regions){assert.ok(r.width<=2176&&r.height<=2176);assert.ok(r.x+r.drawWidth<=width&&r.y+r.drawHeight<=height);const sx=(r.sheet.x1-r.sheet.x0)/r.width,sy=(r.sheet.y1-r.sheet.y0)/r.height;assert.ok(Math.abs(sx-(sheet.x1-sheet.x0)/width)<1e-9);assert.ok(Math.abs(sy-(sheet.y1-sheet.y0)/height)<1e-9);assert.ok(Math.abs(r.sheet.x0+r.cropX*sx-(sheet.x0+r.x*(sheet.x1-sheet.x0)/width))<1e-7);assert.ok(Math.abs(r.sheet.y1-r.cropY*sy-(sheet.y1-r.y*(sheet.y1-sheet.y0)/height))<1e-7);}
 const last=regions.at(-1);assert.equal(last.x+last.drawWidth,width);assert.equal(last.y+last.drawHeight,height);assert.equal(last.sheet.x1,sheet.x1);assert.equal(last.sheet.y0,sheet.y0);
});

test('All ten map styles have translated labels and public key-free sources; no-labels changes only symbols',()=>{
 assert.equal(Object.keys(MAP_STYLES).length,10);for(const config of Object.values(MAP_STYLES))for(const lang of Object.keys(languages))assert.ok(messages[lang][config.label]);
 assert.equal(styleURL('mono'),'https://tiles.openfreemap.org/styles/positron');assert.ok(!Object.hasOwn(MAP_STYLES,'dark'));assert.ok(!Object.hasOwn(MAP_STYLES,'fiord'));
 const changed=[];applyMapStyle({getStyle:()=>({layers:[{id:'roads',type:'line'},{id:'labels',type:'symbol'}]}),setLayoutProperty:(...args)=>changed.push(args)},'plain');assert.deepEqual(changed,[['labels','visibility','none']]);
});

test('All literal translation calls resolve and placeholders agree across languages',()=>{
 for(const file of ['main','admin','pdf','render','farm-labels','tk-features','world-overview','boot','tk-legend','exercise','exercise-ui','exercise-pdf','simulator','simulator-boot','diagnostics','technology','test-export','test-export-loader','coverage']){
 const source=readFileSync(new URL(`../src/${file}.js`,import.meta.url),'utf8');
 for(const match of source.matchAll(/\bt\(['"]([^'"]+)['"]/g))for(const lang of Object.keys(languages))assert.ok(Object.hasOwn(messages[lang],match[1]),`${file}: ${lang}.${match[1]}`);
 }
 for(const key of Object.keys(messages.de)){const expected=[...messages.de[key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();for(const lang of Object.keys(languages))assert.deepEqual([...messages[lang][key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),expected,`${lang}.${key}`);}
});
test('Credits, diagnostic summaries and cover numbering follow the current language',()=>{
 try{for(const [lang,credit]of [['de','Mitwirkende'],['en','contributors'],['fr','contributeurs']]){setLanguage(lang);assert.ok(styleCredit('liberty').includes(credit));assert.ok(formatFarmError({detailKey:'mapTimeout'}).includes(t('mapTimeout')));assert.equal(t('helpProjection').includes(lang==='de'?'Titelseite ist Seite 0':lang==='en'?'cover is page 0':'couverture est la page 0'),true);}}finally{setLanguage('de');}
});
test('Language switches refresh dynamic titles, accessibility labels and input placeholders',()=>{
 const previous=globalThis.document,title={dataset:{i18nTitle:'zoomIn'}},label={dataset:{i18nLabel:'zoomOut'},setAttribute(name,value){this[name]=value;}},placeholder={dataset:{i18nPlaceholder:'notesPlaceholder'}},selector={value:'de'};
 globalThis.document={documentElement:{},getElementById:id=>id==='language'?selector:null,querySelectorAll:selector=>selector==='[data-i18n-title]'?[title]:selector==='[data-i18n-label]'?[label]:selector==='[data-i18n-placeholder]'?[placeholder]:[],dispatchEvent(){}};
 try{for(const lang of ['en','fr','de']){setLanguage(lang);assert.equal(title.title,t('zoomIn'));assert.equal(label['aria-label'],t('zoomOut'));assert.equal(placeholder.placeholder,t('notesPlaceholder'));assert.equal(selector.value,lang);}}finally{globalThis.document=previous;setLanguage('de');}
});
