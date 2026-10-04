const {test}=require('node:test');
const assert=require('node:assert/strict');
const {matchIdentities:m}=require('./identity');
const s=(id,emails=[],phones=[],name='Test Person')=>({id,name,emails,phones});
test('matches unique email and normalized exact name',()=>assert.equal(m([s('s',['A@example.invalid'])],[s('t',['a@example.invalid'])])[0].targetId,'t'));
test('shared email does not identify people',()=>assert.equal(m([s('s',['a@example.invalid'])],[s('t',['a@example.invalid']),s('u',['a@example.invalid'])])[0].status,'ambiguous'));
test('conflicting email and phone evidence holds',()=>assert.equal(m([s('s',['a@example.invalid'],['+12025550123'])],[s('t',['a@example.invalid']),s('u',[],['+12025550123'])])[0].status,'ambiguous'));
test('name alone never maps',()=>assert.equal(m([s('s')],[s('t')])[0].status,'unmatched'));
test('local phone suffix never maps',()=>assert.equal(m([s('s',[],['2025550123'])],[s('t',[],['+12025550123'])])[0].status,'unmatched'));
test('two sources cannot map one target using different keys',()=>assert.deepEqual(m([s('s',['a@example.invalid']),s('x',['b@example.invalid'])],[s('t',['a@example.invalid','b@example.invalid'])]).map(r=>r.status),['ambiguous','ambiguous']));
test('name disagreement holds',()=>assert.equal(m([s('s',['a@example.invalid'])],[s('t',['a@example.invalid'],[],'Someone Else')])[0].status,'name_conflict'));
test('duplicate IDs reject incomplete inventory',()=>assert.throws(()=>m([s('s'),s('s')],[]),/duplicate/));

test('invalid email cannot authorize a match',()=>assert.equal(m([s('s',['garbage'])],[s('t',['garbage'])])[0].status,'unmatched'));

test('shared email does not defeat a unique phone and exact name',()=>assert.equal(m([s('s',['family@example.invalid'],['+12025550123'])],[s('t',['family@example.invalid'],['+12025550123']),s('u',['family@example.invalid'],[],'Other Person')])[0].targetId,'t'));
test('unique email and unique phone corroborate a changed name',()=>assert.equal(m([s('s',['a@example.invalid'],['+12025550123'],'New Name')],[s('t',['a@example.invalid'],['+12025550123'],'Old Name')])[0].evidence,'unique_email_and_phone'));
test('shared household phone cannot corroborate a changed name',()=>assert.equal(m([s('s',['a@example.invalid'],['+12025550123'],'New Name'),s('s2',[],['+12025550123'])],[s('t',['a@example.invalid'],['+12025550123'],'Old Name')])[0].status,'name_conflict'));

test('honorific and middle initial differences with unique email are safe',()=>assert.equal(m([s('s',['a@example.invalid'],[],'Dr. Jane R. Smith')],[s('t',['a@example.invalid'],[],'Jane Rose Smith')])[0].status,'matched'));
test('different complete middle names remain a conflict',()=>assert.equal(m([s('s',['a@example.invalid'],[],'Jane Rose Smith')],[s('t',['a@example.invalid'],[],'Jane Rachel Smith')])[0].status,'name_conflict'));
test('nicknames are not guessed',()=>assert.equal(m([s('s',['a@example.invalid'],[],'Mike Smith')],[s('t',['a@example.invalid'],[],'Michael Smith')])[0].status,'name_conflict'));
