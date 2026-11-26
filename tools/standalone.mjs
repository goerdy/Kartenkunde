import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
let html=(await readFile(new URL('karten.html',root),'utf8')).replace('data-page="maps"','data-page="standalone"');
const css=await readFile(new URL('src/style.css',root),'utf8');
const libraries=(await readFile(new URL('src/libraries.js',root),'utf8')).replace('export const','const');
const translations=(await readFile(new URL('src/i18n.js',root),'utf8')).replace(/\bexport (async function|function|const|class|let) /g,'$1 ');
let combined='';
for(const file of ['vendor','countries','area-geometry','coverage-boundaries','coverage','admin','geo','exercise','exercise-share','exercise-ui','navigation','world-overview','tk-features','street-labels','map-palette','pq5-tk','contours','pq5-basemap','tk-symbols','farm-labels','map-loading','render','tk-legend','monochrome','geomagnetism','north','coordinates','planzeiger-art','cover','exercise-pdf','pdf','zip','export-names','main']){
 let s=await readFile(new URL(`src/${file}.js`,root),'utf8');
 s=s.replace(/^import .*;\n/gm,'').replace(/^export \{.*\};?\n?/gm,'').replace(/\bexport (async function|function|const|class|let) /g,'$1 ');
 combined+=s+'\n';
}
let boot=await readFile(new URL('src/boot.js',root),'utf8');boot=boot.replace(/^import .*;\n/gm,'').replace('new URL(`../vendor/${lib.file}`,import.meta.url)','new URL(`./vendor/${lib.file}`,document.baseURI)').replace("await import('./main.js');",combined);
const site=(await readFile(new URL('src/site.js',root),'utf8')).replace(/^import .*;\n/gm,'');
html=html.replace('<script type="module" src="./src/site.js"></script>','');
html=html.replace('<link rel="stylesheet" href="./src/style.css">',`<style>${css}</style>`).replace('<script type="module" src="./src/boot.js"></script>',`<script type="module">\n${libraries}\n${translations}\n${site}\n${boot.replace(/<\/script/gi,'<\\/script')}\n</script>`);
await writeFile(new URL('Start.html',root),html);console.log('Start.html: zusätzlich direkt aus Firefox öffnbare Ausgabe (Onlinequellen erforderlich).');
