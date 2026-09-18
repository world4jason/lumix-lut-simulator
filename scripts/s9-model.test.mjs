import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyS9, applyS9, validS9, DEFAULT_SLOT } from '../src/lib/s9-model.ts';
test('candidate placement, swap, slot insertion, removal and fixed slot',()=>{
 let d=emptyS9();
 for(const code of ['a','b','c']) d=applyS9(d,{type:'add',code});
 d=applyS9(d,{type:'move',code:'a',target:{kind:'slot',index:1}});
 d=applyS9(d,{type:'move',code:'b',target:{kind:'slot',index:1}});
 assert.equal(d.slots[1],'b');assert.deepEqual(d.candidates,['a','c']);
 d=applyS9(d,{type:'move',code:'c',target:{kind:'slot',index:3}});
 d=applyS9(d,{type:'move',code:'c',target:{kind:'slot-insert',before:1}});
 assert.deepEqual(d.slots.slice(0,4),[DEFAULT_SLOT,'c','b',null]);
 d=applyS9(d,{type:'remove',code:'c'});assert.equal(d.slots[1],null);
 assert.equal(applyS9(d,{type:'remove',code:DEFAULT_SLOT}),d);
 assert.equal(applyS9(d,{type:'move',code:'b',target:{kind:'slot',index:0}}),d);
 assert(validS9(d));assert(!validS9({...d,candidates:['a','a']}));
});
