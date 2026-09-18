import {test} from 'node:test';import assert from 'node:assert/strict';
import {choosePreview} from '../src/lib/preview.ts';
import {FRAME_GROUPS,GROUP_OF,inGroup,initialGroup} from '../src/lib/sampleGroups.ts';
import fs from 'node:fs';
test('Own uses published images and handles absent own/before safely',()=>{
 const base={code:'test',fallbackId:'s9',beforeFrame:id=>`${id}-before`,own:{before:'before',after:'after'}};
 assert.equal(choosePreview(base).kind,'own');assert.equal(choosePreview({...base,own:null}).kind,'shared');assert.equal(choosePreview({...base,own:{before:null,after:'after'}}).before,null);
});
test('original classification order covers all33 without duplicates and groups preserve selection',()=>{
 const ids=JSON.parse(fs.readFileSync('src/data/samples.json')).samples.map(s=>s.id);
 assert.deepEqual(FRAME_GROUPS.map(g=>g.id),['people','street','landscape','reference']);assert.deepEqual(Object.keys(GROUP_OF).sort(),ids.sort());
 assert.deepEqual(FRAME_GROUPS.map(g=>Object.values(GROUP_OF).filter(x=>x===g.id).length),[9,13,8,3]);assert.equal(initialGroup('s9','s9'),'street');
 const items=[{choice:{kind:'own'}},{choice:{kind:'global',id:'s9'}}];assert.equal(inGroup(items,'people','people').length,1);assert.equal(inGroup(items,'street','people').length,1);
});
