 'use strict';
const assert = require('node:assert/strict');
const rules = require('../js/engine.js');
const { warriors, stages } = require('../api/catalogue.json');
assert.equal(warriors.length, 10);
assert.equal(new Set(warriors.map(w => w.id)).size, 10);
assert.equal(new Set(warriors.map(w => w.skill.name)).size, 10);
assert.equal(stages.length, 5);
for (const stage of stages) {
  for (let i = 0; i < 1000; i++) {
    const q = rules.question(stage.mode);
    assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 100);
    assert.equal(q.answer, q.symbol === '+' ? q.a + q.b : q.symbol === '\u2212' ? q.a - q.b : q.a * q.b);
    if (stage.mode === 'add10') assert(q.answer <= 10);
    if (stage.mode === 'add20') assert(q.answer <= 20);
    if (stage.mode === 'subtract') assert(q.a <= 20 && q.b <= q.a);
    if (q.symbol === '\u00d7') assert([2, 5, 10].includes(q.a) && q.b >= 1 && q.b <= 10);
  }
}
function solve(s, move, correct = true) {
  assert(rules.chooseMove(s, move));
  const answer = s.pending.question.answer;
  const result = rules.submit(s, correct ? answer : answer + 1);
  assert(result);
  assert(rules.continueBattle(s));
  return result;
}
// Every champion can complete all five stages with correct attacks and skills.
for (const warrior of warriors) {
  const s = rules.createBattle(warrior, stages);
  for (let stage = 0; stage < 5; stage++) {
    let turns = 0;
    while (s.phase === 'ready') {
      solve(s, s.energy === 3 ? 'skill' : 'attack');
      assert(++turns < 30);
    }
    assert.equal(s.phase, 'victory', warrior.name + ' must be able to win stage ' + (stage + 1));
    if (stage < 4) {
      assert(rules.advance(s));
      assert.equal(s.index, stage + 1);
      assert.equal(s.hp, warrior.hp);
      assert.equal(s.energy, 3);
    }
  }
  assert.equal(rules.advance(s), false);
  assert.equal(s.correct, s.attempts);
}
// Wrong answers, invalid input, duplicate submission, phase guards and retry.
{
  const s = rules.createBattle(warriors[0], stages);
  assert.equal(rules.advance(s), false);
  assert.equal(rules.retry(s), false);
  assert.equal(rules.chooseMove(s, 'unknown'), false);
  assert(rules.chooseMove(s, 'skill'));
  assert.equal(rules.chooseMove(s, 'attack'), false);
  for (const input of ['', ' ', '-1', '1.5', 'abc', 'Infinity', '1000']) assert.equal(rules.submit(s, input), null);
  assert.equal(s.attempts, 0);
  const answer = s.pending.question.answer;
  const result = rules.submit(s, answer + 1);
  assert.equal(result.correct, false);
  assert.equal(s.energy, 3);
  assert.equal(s.enemyHp, stages[0].hp);
  assert.equal(s.hp, warriors[0].hp - stages[0].attack);
  assert.equal(rules.submit(s, answer), null);
  assert.equal(s.attempts, 1);
  rules.continueBattle(s);
  while (s.phase === 'ready') solve(s, 'attack', false);
  assert.equal(s.phase, 'defeat');
  const attempts = s.attempts;
  assert(rules.retry(s));
  assert.equal(s.hp, warriors[0].hp);
  assert.equal(s.enemyHp, stages[0].hp);
  assert.equal(s.attempts, attempts);
  assert.equal(s.phase, 'ready');
}
// Defence heals only to maximum, reduces damage, and restores charge.
{
  const s = rules.createBattle(warriors[0], stages);
  s.hp = 50; s.energy = 1;
  const result = solve(s, 'defend');
  assert.equal(result.healed, 8);
  assert.equal(result.incoming, 2);
  assert.equal(s.hp, 56);
  assert.equal(s.energy, 2);
  s.hp = s.warrior.hp;
  assert.equal(solve(s, 'defend').healed, 0);
}
// Each special skill applies its damage, healing, guard and boost exactly once.
for (const warrior of warriors) {
  const s = rules.createBattle(warrior, stages, 4);
  s.hp = 40;
  const result = solve(s, 'skill');
  assert.equal(result.damage, warrior.skill.damage);
  assert.equal(result.healed, Math.min(warrior.skill.heal, warrior.hp - 40));
  assert.equal(result.incoming, Math.round(stages[4].attack * (1 - warrior.skill.block)));
  assert.equal(s.boost, warrior.skill.boost);
  assert.equal(s.energy, 0);
  assert.equal(rules.chooseMove(s, 'skill'), false);
  if (warrior.skill.boost) {
    const next = solve(s, 'attack');
    assert.equal(next.damage, warrior.attack + warrior.skill.boost);
    assert.equal(s.boost, 0);
  }
}
// A lethal move prevents retaliation and never takes the guardian below zero.
{
  const s = rules.createBattle(warriors[0], stages);
  s.enemyHp = 1; s.hp = 1;
  const result = solve(s, 'attack');
  assert.equal(result.damage, 1);
  assert.equal(result.incoming, 0);
  assert.equal(s.hp, 1);
  assert.equal(s.enemyHp, 0);
  assert.equal(s.phase, 'victory');
}
console.log('PASS: 5,000 generated questions; all 10 warriors across five stages; skill effects; input/turn guards; defeat/retry; charge, healing and lethal-hit rules.');
