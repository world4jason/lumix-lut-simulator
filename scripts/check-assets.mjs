import { readFileSync, readdirSync, statSync, lstatSync } from 'node:fs';
import assert from 'node:assert/strict';
import { join } from 'node:path';
const catalog = JSON.parse(readFileSync('src/data/catalog.json'));
const samples = JSON.parse(readFileSync('src/data/samples.json')).samples;
assert.equal(catalog.luts.length,199); assert.equal(samples.length,33);
assert(catalog.luts.every(l=>l.source==='lumix' && l.cube===null));
const walk = dir => readdirSync(dir).flatMap(name=>{const path=join(dir,name);assert(!lstatSync(path).isSymbolicLink(),path);return statSync(path).isDirectory()?walk(path):[path];});
for(const root of ['public','dist']) {
 const files=walk(root); assert(files.every(f=>! /\.(cube|vlt|3dl|png)$/i.test(f)), 'unexpected LUT/table assets');
 assert(files.every(f=>! /\/(lut|sources|_signal)\//.test(f)));
 for(const lut of catalog.luts) for(const thumb of Object.values(lut.thumb)) if(thumb) assert(statSync(`${root}/${thumb.replace(/^\//,'')}`).size>0);
 for(const sample of samples) for(const lut of catalog.luts) assert(statSync(`${root}/sample/${sample.id}/${lut.code}.webp`).size>0);
 if(root==='dist') assert(files.reduce((sum,f)=>sum+statSync(f).size,0)<1_000_000_000,'GitHub Pages dist exceeds 1GB');
 console.log(root, files.length, 'files',files.reduce((sum,f)=>sum+statSync(f).size,0),'bytes');
}
console.log('199 official LUTs × 33 samples = 6567 renders; no LUT payload asset paths.');
