import { Arena3D } from './arena3d.js?v=ef2ee6c25571';
import { BattleAnimator } from './combat-animation.js?v=c2806795be0f';

(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const rules = window.MathArena;
  let catalogue, selected, battle;
  let turnAnimating = false;
  let sceneView = null;
  const animator = new BattleAnimator({
    arena: $('arena'),
    narrate: text => { $('combat-narration').textContent = text; },
    health: (playerHp, enemyHp) => updateHealth(playerHp, enemyHp)
  });
  let questionTimer = null;
  function cancelNextQuestion() { clearTimeout(questionTimer); questionTimer = null; }
  $('camera-left').addEventListener('click', () => sceneView.rotate(-.2));
  $('camera-right').addEventListener('click', () => sceneView.rotate(.2));
  $('camera-reset').addEventListener('click', () => sceneView.resetCamera());
  $('reload-3d').addEventListener('click', () => window.location.reload());
  function showRenderError(message) {
    $('render-error-message').textContent = message;
    $('render-error').hidden = false;
    $('answer').disabled = true;
    $('question-form').querySelector('button').disabled = true;
    cancelNextQuestion();
  }
  function updateHealth(playerHp, enemyHp) {
    const stage = catalogue.stages[battle.index];
    $('player-hp').textContent = `${playerHp} / ${battle.warrior.hp} HP`;
    $('enemy-hp').textContent = `${enemyHp} / ${stage.hp} HP`;
    $('player-health').max = battle.warrior.hp;
    $('player-health').value = playerHp;
    $('enemy-health').max = stage.hp;
    $('enemy-health').value = enemyHp;
  }
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = code => String.fromCodePoint(parseInt(code, 16));
  function warriorArt(warrior) {
    const color = escape(warrior.color);
    const customHeads = {
      panther: '<path d="M65 86 59 44 85 59Q110 45 135 59L161 44 155 88Z" fill="#303440"/><ellipse cx="110" cy="87" rx="47" ry="39" fill="#303440"/><path d="m78 80 20 5-17 7m61-12-20 5 17 7" fill="#e6c76e"/><path d="m104 99 6 6 6-6" fill="#b8a0c7"/><path d="M93 109q17 9 34 0" fill="none" stroke="#898197" stroke-width="3"/>',
      eagle: '<path d="M69 82q-3-43 42-39 45-4 41 39l10 24-23-3-9 20-20-13-21 13-9-20-21 3z" fill="#e9e8d5"/><path d="m72 64 28 13-26 4m74-17-28 13 26 4" fill="#705b43"/><circle cx="88" cy="83" r="6" fill="#263a32"/><circle cx="132" cy="83" r="6" fill="#263a32"/><path d="m110 85 19 15-19 19-18-19z" fill="#eac160"/><path d="m110 85 19 15-19 5z" fill="#f7da82"/>',
      rhino: '<path d="M73 74Q45 46 58 39q20 1 29 26m47 8q29-27 16-34-20 1-29 26" fill="#7e9091"/><ellipse cx="110" cy="85" rx="46" ry="39" fill="#a4b0ad"/><path d="m77 77 21 4m25 0 21-4" stroke="#657b7a" stroke-width="5"/><circle cx="88" cy="88" r="5" fill="#293a37"/><circle cx="132" cy="88" r="5" fill="#293a37"/><ellipse cx="110" cy="106" rx="33" ry="20" fill="#899d9a"/><path d="M98 103q14-18 12-43 21 24 13 43" fill="#e5dfc9"/><path d="M99 115q11 5 22 0" fill="none" stroke="#455c54" stroke-width="3"/>',
      crocodile: '<path d="m72 65 10-21 13 13 15-21 15 21 14-13 10 22" fill="#5c8c55"/><rect x="64" y="58" width="92" height="65" rx="29" fill="#78a56a"/><ellipse cx="88" cy="75" rx="13" ry="15" fill="#a1c17e"/><ellipse cx="132" cy="75" rx="13" ry="15" fill="#a1c17e"/><ellipse cx="89" cy="76" rx="4" ry="7" fill="#233b2a"/><ellipse cx="131" cy="76" rx="4" ry="7" fill="#233b2a"/><rect x="58" y="91" width="104" height="34" rx="16" fill="#aac482"/><circle cx="76" cy="100" r="3" fill="#527949"/><circle cx="144" cy="100" r="3" fill="#527949"/><path d="M70 112h80" stroke="#527949" stroke-width="3"/><path d="m81 111 5 9 5-9m38 0 5 9 5-9" fill="#f4ecd7"/>'
    };
    const head = Object.hasOwn(customHeads, warrior.id)
      ? customHeads[warrior.id]
      : `<text x="110" y="115" text-anchor="middle" font-size="89" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif">${icon(warrior.icon)}</text>`;
    return `<svg viewBox="0 0 220 260" role="img" aria-label="${escape(warrior.name)}, ${escape(warrior.animal)} warrior in armour"><ellipse cx="112" cy="242" rx="72" ry="10" fill="#071913" opacity=".3"/><path d="M71 116 49 224q61 20 122 0l-22-108" fill="${color}" opacity=".7"/><path d="M76 193 69 233q8 12 27 5l10-42m16-2 9 43q19 6 26-5l-15-39" fill="#263d3a"/><path d="M72 115q37-18 76 0l13 71q-6 31-51 30t-51-30z" fill="#536963"/><path d="m80 120 30 15 30-15-9 58h-42z" fill="${color}"/><path d="m110 135 12 14-12 14-12-14z" fill="#f9e5a6"/><path d="M64 125 43 155l16 15 21-32m76-13 21 28-16 17-22-32" stroke="#8c9c87" stroke-width="15" stroke-linecap="round"/><path d="M64 175h92v16H64z" fill="#2e443c"/><rect x="102" y="173" width="17" height="20" rx="3" fill="#d7b663"/><g class="warrior-blade"><path d="m170 90 8-17 8 17-5 81h-8z" fill="#dde2ce"/><path d="M163 169h28v8h-28z" fill="#d7b663"/><path d="M177 178v24" stroke="#6c4d37" stroke-width="8"/></g><path d="M29 158 50 149 72 158v30q-5 18-22 27-18-9-21-27z" fill="${color}" stroke="#e2cf94" stroke-width="4"/><path d="m50 165 8 14-8 14-8-14z" fill="#f8e6b7"/>${head}</svg>`;
  }
  function renderSelection() {
    $('warrior-grid').replaceChildren(...catalogue.warriors.map(warrior => {
      const button = document.createElement('button');
      button.className = 'warrior-card';
      button.type = 'button';
      button.dataset.warrior = warrior.id;
      button.style.setProperty('--warrior-color', warrior.color);
      button.setAttribute('aria-pressed', String(warrior.id === selected.id));
      button.setAttribute('aria-label', `${warrior.name}, ${warrior.animal}. ${warrior.hp} health, ${warrior.attack} attack. Skill: ${warrior.skill.name}. ${warrior.skill.description}`);
      button.innerHTML = `<span class="card-art">${warriorArt(warrior)}</span><strong>${escape(warrior.name)}</strong><span>${escape(warrior.animal)}</span><span class="chosen-check" aria-hidden="true">&#10003;</span>`;
      button.addEventListener('click', () => {
        selected = warrior;
        document.querySelectorAll('[data-warrior]').forEach(card => card.setAttribute('aria-pressed', String(card.dataset.warrior === warrior.id)));
        renderChampion();
      });
      return button;
    }));
    renderChampion();
    $('journey-list').replaceChildren(...catalogue.stages.map(stage => {
      const item = document.createElement('li');
      item.innerHTML = `<span class="journey-icon" aria-hidden="true">${icon(stage.icon)}</span><small>STAGE ${stage.id}${stage.id === 5 ? ' / BOSS' : ''}</small><h3>${escape(stage.name)}</h3><p>${escape(stage.topic)}</p>`;
      return item;
    }));
  }
  function renderChampion() {
    $('chosen-portrait').innerHTML = warriorArt(selected);
    $('chosen-portrait').style.setProperty('--warrior-color', selected.color);
    $('chosen-animal').textContent = `${selected.animal} warrior`;
    $('chosen-name').textContent = selected.name;
    $('chosen-title').textContent = selected.title;
    $('chosen-hp').textContent = selected.hp;
    $('chosen-attack').textContent = selected.attack;
    $('chosen-skill').textContent = selected.skill.name;
    $('chosen-description').textContent = selected.skill.description;
  }
  function start() {
    if (turnAnimating) return;
    cancelNextQuestion();
    battle = rules.createBattle(selected, catalogue.stages);
    $('selection').hidden = true;
    $('battle').hidden = false;
    renderBattle();
    showQuestion();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function renderBattle() {
    const stage = catalogue.stages[battle.index];
    $('stage-label').textContent = `STAGE ${stage.id} OF 5${stage.id === 5 ? ' / FINAL BOSS' : ''}`;
    $('battle-title').textContent = stage.name;
    $('stage-topic').textContent = stage.topic;
    $('arena').style.setProperty('--stage-color', stage.color);
    $('player-name').textContent = battle.warrior.name;
    $('enemy-name').textContent = stage.enemy;
    updateHealth(battle.hp, battle.enemyHp);
    sceneView.setBattle(battle.warrior, stage, battle.hp, battle.enemyHp);
    sceneView.setActive(true);
    $('enemy-label').textContent = stage.id === 5 ? 'FINAL GUARDIAN' : 'WOODLAND GUARDIAN';
    $('energy').textContent = battle.skillRemaining ? `Skill active: ${battle.skillRemaining} question${battle.skillRemaining === 1 ? '' : 's'} remaining` : `Skill charge: ${battle.energy} / 3${battle.energy === 3 ? ' | Skill activates next question!' : ''}`;
    $('score').textContent = `Correct answers: ${battle.correct} / ${battle.attempts}`;
    $('stage-track').replaceChildren(...catalogue.stages.map((s, i) => {
      const item = document.createElement('li');
      item.className = i < battle.index ? 'complete' : i === battle.index ? 'current' : '';
      if (i === battle.index) item.setAttribute('aria-current', 'step');
      item.textContent = `${i < battle.index ? '\u2713' : s.id} ${s.name}`;
      return item;
    }));
    for (const id of ['question-form', 'feedback', 'result', 'combat-status']) $(id).hidden = true;
    delete $('arena').dataset.combatPhase;
    if (battle.phase === 'victory' || battle.phase === 'defeat') showResult();
  }
  function showQuestion() {
    if (turnAnimating || !battle || sceneView.failed || !rules.nextQuestion(battle)) return;
    renderBattle();
    $('question-form').hidden = false;
    $('move-label').textContent = battle.pending.move === 'skill'
      ? `SKILL ${4 - battle.skillRemaining} OF 3: ${battle.warrior.skill.name.toUpperCase()}`
      : 'SOLVE TO ATTACK';
    $('question-expression').textContent = `${battle.pending.question.expression} = ?`;
    $('answer').value = '';
    $('answer').focus({ preventScroll: true });
  }
  $('question-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (turnAnimating || !battle || sceneView.failed) return;
    const before = { hp: battle.hp, enemyHp: battle.enemyHp };
    const result = rules.submit(battle, $('answer').value);
    if (!result) return;
    turnAnimating = true;
    $('change-warrior').disabled = true;
    $('turn-panel').setAttribute('aria-busy', 'true');
    $('question-form').hidden = true;
    $('combat-status').hidden = false;
    $('combat-status').focus({ preventScroll: true });
    $('arena').scrollIntoView({ behavior: 'instant', block: 'center' });
    try {
      await animator.play({ result, warrior: battle.warrior, stage: catalogue.stages[battle.index], before,
        after: { hp: battle.hp, enemyHp: battle.enemyHp } });
    } finally {
      turnAnimating = false;
      $('change-warrior').disabled = false;
      $('turn-panel').removeAttribute('aria-busy');
      renderBattle();
    }
    $('feedback').hidden = false;
    $('feedback-title').textContent = result.correct ? 'Great thinking!' : 'A little practice makes you stronger.';
    $('feedback-math').textContent = result.correct ? `${result.question.expression} = ${result.question.answer}. You got it!` : result.question.explanation;
    const messages = [];
    if (!result.correct) messages.push('Your move did not activate.');
    if (result.damage) messages.push(`You dealt ${result.damage} damage.`);
    if (result.healed) messages.push(`You recovered ${result.healed} health.`);
    if (result.blocked) messages.push(`You blocked ${result.blocked} damage.`);
    if (result.incoming) messages.push(`The guardian dealt ${result.incoming} damage.`);
    if (battle.outcome === 'victory') messages.push('You defeated the guardian!');
    if (battle.outcome === 'defeat') messages.push('Your health ran out. You can retry this stage.');
    $('feedback-action').textContent = messages.join(' ');
    const currentBattle = battle;
    questionTimer = setTimeout(() => {
      questionTimer = null;
      if (battle !== currentBattle || sceneView.failed || !rules.continueBattle(battle)) return;
      renderBattle();
      if (battle.phase === 'ready') showQuestion();
      else $('result-title').focus({ preventScroll: true });
    }, result.correct ? 1400 : 4500);
  });
  function showResult() {
    const won = battle.phase === 'victory';
    const final = won && battle.index === 4;
    $('result').hidden = false;
    $('result-icon').textContent = final ? '\u265b' : won ? '\u2726' : '\u2661';
    $('result-title').textContent = final ? 'Champion of the Wildwood!' : won ? 'Stage cleared!' : 'A brave try, champion.';
    $('result-description').textContent = final ? `You and ${battle.warrior.name} conquered all five stages! You solved ${battle.correct} of ${battle.attempts} questions correctly. Keep your curiosity growing.` : won ? 'A new adventure awaits. Your health refills and skill charge starts at zero for the next stage.' : 'Every question helps you grow. Retry this stage with full health and zero skill charge.';
    $('result-action').textContent = final ? 'Play again \u2192' : won ? 'Next stage \u2192' : 'Retry stage \u2192';
  }
  $('result-action').addEventListener('click', () => {
    if (turnAnimating || !battle || sceneView.failed) return;
    if (battle.phase === 'victory' && battle.index === 4) { start(); return; }
    if (!rules.advance(battle) && !rules.retry(battle)) return;
    renderBattle();
    showQuestion();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  function showRoster() {
    if (turnAnimating) return;
    cancelNextQuestion();
    battle = null;
    sceneView.setActive(false);
    $('battle').hidden = true;
    $('selection').hidden = false;
    document.querySelector(`[data-warrior="${selected.id}"]`).focus();
  }
  $('start').addEventListener('click', start);
  $('open-help').addEventListener('click', () => $('help').showModal());
  $('change-warrior').addEventListener('click', () => { if (!turnAnimating) $('leave').showModal(); });
  $('confirm-leave').addEventListener('click', () => { $('leave').close(); showRoster(); });
  $('result-roster').addEventListener('click', showRoster);
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  $('reload').addEventListener('click', load);
  async function load() {
    $('loading').hidden = false;
    $('load-error').hidden = true;
    try {
      const response = await fetch('api/index.php', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Catalogue request failed.');
      catalogue = await response.json();
      if (catalogue.warriors.length !== 10 || catalogue.stages.length !== 5) throw new Error('Invalid catalogue.');
      if (!sceneView) {
        try {
          sceneView = new Arena3D($('scene-view'), showRenderError);
          animator.setView(sceneView);
        } catch (error) {
          throw new Error('3D graphics could not start. Enable hardware acceleration in your browser and use a browser with WebGL 2 support.');
        }
      }
      selected = catalogue.warriors[0];
      renderSelection();
      $('selection').hidden = false;
    } catch (error) {
      $('selection').hidden = true;
      $('load-error').hidden = false;
      $('load-error').querySelector('p').textContent = error.message;
    } finally { $('loading').hidden = true; }
  }
  load();
})();
