import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';
import * as model from '../src/lib/s9-model.ts';
function store(raw=null, fail=false, locks=true) {
 let saved=raw;const events={};
 let source=readFileSync('src/lib/s9.ts','utf8').replace(/^import[\s\S]*?;\n/gm,'').replace(/export /g,'');
 source+='\nglobalThis.api = { refreshS9, changeS9, snapshot: () => state };';
 const context=createContext({...model, useEffect:()=>{},useSyncExternalStore:()=>{},window:{addEventListener:(key,fn)=>events[key]=fn},navigator:{locks:locks?{request:async(_,fn)=>fn()}:undefined},localStorage:{getItem:()=>saved,setItem:(_,v)=>{if(fail)throw Error('quota');saved=v;}}});
 runInContext(ts.transpile(source,{target:ts.ScriptTarget.ES2023}),context);
 return {api:context.api,saved:()=>saved,events};
}
test('successful save reloads and a second action preserves earlier data',async()=>{
 const s=store();await s.api.refreshS9();await s.api.changeS9({type:'add',code:'lut_a'});await s.api.changeS9({type:'add',code:'lut_b'});
 const reload=store(s.saved());await reload.api.refreshS9();assert.deepEqual(Array.from(reload.api.snapshot().doc.candidates),['lut_a','lut_b']);
});
test('quota failure does not commit an unsaved plan',async()=>{
 const s=store(null,true);await s.api.refreshS9();await s.api.changeS9({type:'add',code:'lut_a'});
 assert.equal(s.saved(),null);assert.equal(s.api.snapshot().doc.candidates.length,0);assert.equal(s.api.snapshot().error,true);assert.match(s.api.snapshot().message,/Save failed/);
});
test('corrupt persistence is not silently overwritten',async()=>{
 const s=store('{bad');await s.api.refreshS9();await s.api.changeS9({type:'add',code:'lut_a'});assert.equal(s.saved(),'{bad');assert.equal(s.api.snapshot().ready,false);
});

test('missing Web Locks fails without overwriting concurrent state',async()=>{
 const s=store(null,false,false);await s.api.refreshS9();await s.api.changeS9({type:'add',code:'lut_a'});
 assert.equal(s.saved(),null);assert.equal(s.api.snapshot().doc.candidates.length,0);assert.match(s.api.snapshot().message,/Web Locks/);
});
