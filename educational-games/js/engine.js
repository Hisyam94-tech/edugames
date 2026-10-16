/* Pure battle rules, shared by the browser and Node verification. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MathArena = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const integer = (min, max, random) => Math.floor(random() * (max - min + 1)) + min;
  function question(mode, random = Math.random) {
    if (mode === 'mixed') mode = ['add50', 'subtract50', 'multiply'][integer(0, 2, random)];
    let a, b, answer, symbol, explanation;
    if (mode === 'multiply') {
      a = [2, 5, 10][integer(0, 2, random)];
      b = integer(1, 10, random);
      answer = a * b; symbol = '\u00d7';
      explanation = `${a} groups of ${b}: ${Array(a).fill(b).join(' + ')} = ${answer}.`;
    } else if (mode === 'subtract' || mode === 'subtract50') {
      a = integer(2, mode === 'subtract50' ? 50 : 20, random);
      b = integer(1, a, random); answer = a - b; symbol = '\u2212';
      explanation = `Start at ${a} and take away ${b}. You have ${answer} left. Check: ${answer} + ${b} = ${a}.`;
    } else {
      const max = { add10: 10, add20: 20, add50: 50 }[mode];
      if (!max) throw new Error('Unknown question mode.');
      a = integer(1, max - 1, random); b = integer(1, max - a, random);
      answer = a + b; symbol = '+';
      explanation = `Start at ${a} and count forward ${b} to reach ${answer}. ${a} + ${b} = ${answer}.`;
    }
    return { a, b, answer, symbol, expression: `${a} ${symbol} ${b}`, explanation };
  }
  function createBattle(warrior, stages, index = 0) {
    if (!warrior || !stages[index]) throw new Error('Choose a warrior and valid stage.');
    return { warrior, stages, index, hp: warrior.hp, enemyHp: stages[index].hp, energy: 0, skillRemaining: 0,
      boost: 0, phase: 'ready', pending: null, feedback: null, correct: 0, attempts: 0, outcome: null };
  }
  function nextQuestion(state, random = Math.random) {
    if (state.phase !== 'ready') return false;
    if (state.energy === 3 && state.skillRemaining === 0) state.skillRemaining = 3;
    const move = state.skillRemaining > 0 ? 'skill' : 'attack';
    state.pending = { move, question: question(state.stages[state.index].mode, random) };
    state.phase = 'question';
    return true;
  }
  function submit(state, raw) {
    if (state.phase !== 'question' || !/^[0-9]{1,3}$/.test(String(raw).trim())) return null;
    const { move, question: q } = state.pending;
    const correct = Number(raw) === q.answer;
    let damage = 0, healed = 0, block = 0;
    const before = state.hp;
    state.attempts++;
    if (correct) {
      state.correct++;
      if (move === 'attack') { damage = state.warrior.attack + state.boost; state.boost = 0; }
      if (move === 'defend') { block = .8; state.hp = Math.min(state.warrior.hp, state.hp + 8); }
      if (move === 'skill') {
        const skill = state.warrior.skill;
        damage = skill.damage; block = skill.block;
        state.hp = Math.min(state.warrior.hp, state.hp + skill.heal);
        state.boost += skill.boost;

      } else state.energy = Math.min(3, state.energy + 1);
      healed = state.hp - before;
      damage = Math.min(damage, state.enemyHp);
      state.enemyHp = Math.max(0, state.enemyHp - damage);
    }
    if (move === 'skill') {
      state.skillRemaining--;
      if (state.skillRemaining === 0) state.energy = 0;
    }
    const incoming = state.enemyHp > 0 ? Math.round(state.stages[state.index].attack * (1 - block)) : 0;
    state.hp = Math.max(0, state.hp - incoming);
    state.outcome = state.enemyHp === 0 ? 'victory' : state.hp === 0 ? 'defeat' : null;
    state.phase = 'feedback';
    state.feedback = { correct, damage, healed, incoming, blocked: state.enemyHp > 0 ? state.stages[state.index].attack - incoming : 0, move, question: q };
    state.pending = null;
    return state.feedback;
  }
  function continueBattle(state) {
    if (state.phase !== 'feedback') return false;
    state.phase = state.outcome || 'ready';
    state.feedback = null;
    return true;
  }
  function advance(state) {
    if (state.phase !== 'victory' || state.index >= state.stages.length - 1) return false;
    const next = createBattle(state.warrior, state.stages, state.index + 1);
    next.correct = state.correct; next.attempts = state.attempts;
    Object.assign(state, next);
    return true;
  }
  function retry(state) {
    if (state.phase !== 'defeat') return false;
    const next = createBattle(state.warrior, state.stages, state.index);
    next.correct = state.correct; next.attempts = state.attempts;
    Object.assign(state, next);
    return true;
  }
  return { question, createBattle, nextQuestion, submit, continueBattle, advance, retry };
});
