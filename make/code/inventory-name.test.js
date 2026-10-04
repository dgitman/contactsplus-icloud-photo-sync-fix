const test=require('node:test'),assert=require('node:assert/strict'),name=require('./inventory-name');
test('vCard escaped punctuation compares with ordinary source names',()=>assert.equal(name('Alex Example\\, MBA',{vcardText:true}),name('Alex Example, MBA')));
test('decoding is one pass and never strips unknown escapes',()=>{assert.equal(name('A\\\\nB',{vcardText:true}),'a\\nb');assert.equal(name('A\\qB',{vcardText:true}),'a\\qb');});
test('source names retain literal backslashes',()=>assert.equal(name('A\\, B'),'a\\, b'));
test('credentials are not removed or conflated',()=>assert.notEqual(name('Alex Example, MBA'),name('Alex Example, CPA')));
