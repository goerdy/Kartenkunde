import test from 'node:test';
import assert from 'node:assert/strict';
import {PAPER,SCALES} from '../src/geo.js';
import {coverLayout,coverScale,ATLAS_URL,drawCoverQR} from '../src/cover.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('Cover boxes fit A4 to A1 in both orientations and leave space between legend and sheet scale',()=>{
 for(const dim of Object.values(PAPER))for(const landscape of [true,false])for(const style of ['pq5tk','pq5gray','lgln50','liberty']){
 const paper=landscape?[...dim].reverse():dim,l=coverLayout({paper,style});
 for(const box of [l.map,l.legendBox,l.north,l.print,l.sources].filter(Boolean)){assert.ok(box.h>10);assert.ok(box.x>=7&&box.y>=7);assert.ok(box.x+box.w<=paper[0]-7);assert.ok(box.y+box.h<=paper[1]-7);}
 assert.ok(l.print.y+l.print.h<l.sources.y);assert.ok(l.map.y+l.map.h<l.print.y);
 if(l.legend){const top=l.compact?2:4;assert.ok(top+l.legend.height<=l.legendBox.h-9+.001);}
 }
});
test('Kilometre bars reproduce physical map sheet scale for all six scales',()=>{
 for(const scale of SCALES)for(const width of [45,60,75]){const bar=coverScale({scale},width);assert.ok(bar.width<=width);assert.ok(bar.width>0);assert.equal(bar.width*scale,bar.km*1e6);}
});
test('QR renders a local vector matrix with quiet zone and a clickable exact destination',()=>{
 vm.runInThisContext(readFileSync(new URL('../vendor/qrcode.js',import.meta.url),'utf8'));
 const rects=[],links=[];drawCoverQR({setFillColor(){},rect(...args){rects.push(args);},link(...args){links.push(args);}},10,20,25);
 assert.ok(rects.length>200);for(const [x,y,w,h]of rects.slice(1)){assert.ok(x>10&&y>20&&x+w<35&&y+h<45);}
 assert.equal(links[0][4].url,ATLAS_URL);assert.equal(ATLAS_URL,'https://kartenkunde.app');
});

test('Cover notes have a dedicated box outside the map and legend on every page format',()=>{
 for(const dimensions of Object.values(PAPER))for(const landscape of [true,false]){
 const p={paper:landscape?[...dimensions].reverse():dimensions,style:'pq5basemap',notes:'Notiz '.repeat(100)},l=coverLayout(p);
 assert.ok(l.map.h>10);assert.ok(l.notes.w>50);
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 assert.ok(!overlaps(l.north,l.map));assert.ok(!overlaps(l.north,l.legendBox));assert.ok(!overlaps(l.north,l.notes));assert.ok(!overlaps(l.notes,l.map));assert.ok(!overlaps(l.notes,l.legendBox));assert.ok(!overlaps(l.notes,l.print));assert.ok(!overlaps(l.notes,l.sources));
 }
});
