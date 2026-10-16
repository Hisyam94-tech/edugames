const assert = require('node:assert/strict');
const rules = require('../js/engine.js');
const {warriors, stages} = require('../api/catalogue.json');
for (const mode of ['add10','add20','subtract','multiply','mixed']) {
 for (let i=0;i<1000;i++) {
  const q=rules.question(mode);
  assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 100);
  assert.equal(q.answer, q.symbol==='+' ? q.a+q.b : q.symbol==='\u00d7' ? q.a*q.b : q.a-q.b);
 }
}
const durable = [{...stages[0], hp: 10000, attack: 0}];
const battle = rules.createBattle(warriors[0], durable);
assert.equal(battle.energy, 0);
for (let i=0; i<3; i++) {
  assert(rules.nextQuestion(battle));
  assert.equal(battle.pending.move, 'attack');
  assert.equal(rules.nextQuestion(battle), false);
  assert.equal(rules.submit(battle, 'bad'), null);
  rules.submit(battle, battle.pending.question.answer);
  assert.equal(rules.submit(battle, 1), null);
  rules.continueBattle(battle);
}
for (let i=0; i<3; i++) {
  rules.nextQuestion(battle);
  assert.equal(battle.pending.move, 'skill');
  assert.equal(battle.skillRemaining, 3-i);
  rules.submit(battle, i===1 ? 999 : battle.pending.question.answer);
  rules.continueBattle(battle);
}
assert.equal(battle.energy, 0);
assert.equal(battle.skillRemaining, 0);
rules.nextQuestion(battle);
assert.equal(battle.pending.move, 'attack');
for (const warrior of warriors) {
 const b=rules.createBattle(warrior, stages);
 for(let stage=0;stage<5;stage++) {
  let turns=0;
  while(b.phase==='ready') {
   assert(++turns<30);
   rules.nextQuestion(b); rules.submit(b,b.pending.question.answer); rules.continueBattle(b);
  }
  assert.equal(b.phase,'victory',warrior.id+' stage '+stage);
  if(stage<4) { assert(rules.advance(b)); assert.equal(b.energy,0); }
 }
}
const loss=rules.createBattle(warriors[0], stages);
while(loss.phase==='ready') { rules.nextQuestion(loss); rules.submit(loss,999); rules.continueBattle(loss); }
assert.equal(loss.phase,'defeat'); assert(rules.retry(loss)); assert.equal(loss.energy,0);
console.log('PASS automatic charge cycle, incorrect skill answer, input/turn guards, 50 stage victories, defeat/retry');
