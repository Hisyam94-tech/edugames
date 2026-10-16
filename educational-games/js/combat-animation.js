// Sequences real 3D poses and effects; combat results still come from engine.js.
const SKILLS = {
  lion: { color: '#ffe19a', kind: 'roar', ranged: true },
  tiger: { color: '#ffc17e', kind: 'claw' },
  wolf: { color: '#c4ddff', kind: 'moon', ranged: true },
  bear: { color: '#b8ee9b', kind: 'nature', ranged: true },
  fox: { color: '#ffad64', kind: 'flame', ranged: true },
  eagle: { color: '#f2f3d1', kind: 'sky', aerial: true },
  panther: { color: '#c6a3ff', kind: 'shadow', fast: true },
  rhino: { color: '#d5d4b4', kind: 'stone' },
  crocodile: { color: '#8fe4c1', kind: 'wave', ranged: true },
  rabbit: { color: '#ffcee7', kind: 'leap', aerial: true }
};
export class BattleAnimator {
  constructor({ arena, narrate, health }) {
    this.arena = arena; this.narrate = narrate; this.health = health;
    this.running = false; this.view = null;
    document.documentElement.dataset.battleMotion = 'on';
  }
  get enabled() { return true; }
  setView(view) { this.view = view; view.setMotion(true); }
  phase(name, text) { this.arena.dataset.combatPhase = name; this.narrate(text); }
  async play({ result, warrior, stage, before, after }) {
    if (this.running) return false;
    this.running = true; this.arena.setAttribute('aria-busy', 'true');
    const view = this.view, player = view.player, enemy = view.enemy;
    view.refreshVisibility();
    let playerHp = before.hp, enemyHp = before.enemyHp, barrier = null;
    const style = result.move === 'skill' ? SKILLS[warrior.id] : { color: '#ffdfa0', kind: 'slash' };
    const neutral = () => view.factory.neutral();
    const update = () => this.health(playerHp, enemyHp);
    try {
      if (!this.enabled) {
        this.health(after.hp, after.enemyHp); this.phase('finished', 'Turn complete.'); return true;
      }
      if (result.correct) {
        const move = result.move === 'skill' ? warrior.skill.name : result.move === 'defend' ? 'Guard' : 'Attack';
        this.phase('player-windup', `${warrior.name} uses ${move}!`);
        if (result.move === 'skill') {
          await Promise.all([
            view.burst(player, style.color, style.kind),
            view.tween(player.pose, { armR: -1.1, elbowR: -.65, head: -.08, y: style.aerial ? .15 : 0 }, 320)
          ]);
        }
        if (result.healed) {
          playerHp += result.healed; update();
          await Promise.all([view.label(player, `+${result.healed} HP`, '#c9f7a0'), view.burst(player, '#b7ee8c', 'heal')]);
        }
        if (result.blocked && !(result.move === 'skill' && warrior.id === 'rabbit')) barrier = view.shield(player, '#bcdfff');
        if (result.damage) {
          const hits = result.move === 'skill' && warrior.id === 'tiger' && result.damage > 25 ? [25, result.damage - 25] : [result.damage];
          for (const damage of hits) {
            if (style.ranged) {
              await view.tween(player.pose, { armL: -1.2, armR: -1.65, elbowR: -.1, lean: -.08, turn: .3 }, 240);
              await view.projectile(player, enemy, style.color, style.kind);
            } else {
              await view.tween(player.pose, { armR: -2, elbowR: -.8, lean: -.1, legL: .35, legR: -.35, turn: .4 }, 180);
              await view.tween(player.pose, { x: 2.35, y: style.aerial ? .8 : 0, armR: -2.2, elbowR: -.2, legL: -.7, legR: .7, lean: warrior.id === 'rhino' ? .22 : .05, turn: .52 }, style.fast ? 190 : 300);
            }
            this.phase('player-impact', `${warrior.name} deals ${damage} damage!`);
            enemyHp = Math.max(0, enemyHp - damage); update();
            const strike = view.tween(player.pose, { armR: -.7, elbowR: -.15, twist: -.16, y: 0 }, 170);
            await Promise.all([strike, view.burst(enemy, style.color, style.kind), view.label(enemy, `-${damage}`), view.impact(enemy, 1), view.cameraHit()]);
            await view.tween(player.pose, neutral(), 330);
          }
        } else {
          this.phase('player-guard', `${warrior.name} raises a shield!`);
          await view.tween(player.pose, { armL: -1.35, elbowL: -.65, armR: -.5, lean: .1, legL: -.2, legR: .2 }, 340);
        }
      } else {
        this.phase('move-missed', 'Your move did not activate. The guardian is preparing to attack.');
        await Promise.all([view.label(player, 'Move missed', '#e5e8d5'), view.tween(player.pose, { head: -.2 }, 250)]);
        await view.tween(player.pose, { head: 0 }, 120);
      }
      if (enemyHp > 0) {
        this.phase('enemy-windup', `${stage.enemy} prepares a strike!`);
        await view.tween(enemy.pose, { x: .2, armR: -2.2, armL: -1.5, elbowR: -.5, lean: -.15, legL: .3, turn: -.3 }, 420);
        this.phase('enemy-strike', `${stage.enemy} attacks!`);
        await view.tween(enemy.pose, { x: -2.35, armR: -1.3, armL: -.7, lean: .12, legL: -.6, legR: .6, turn: -.52 }, 320);
        this.phase('enemy-impact', result.incoming ? `The guardian deals ${result.incoming} damage!` : 'The guardian\'s attack was stopped!');
        playerHp = after.hp; update();
        const dodged = result.correct && result.move === 'skill' && warrior.id === 'rabbit';
        const reactions = [view.tween(enemy.pose, { armR: -.3, elbowR: -.1, twist: .15 }, 170)];
        if (dodged) {
          reactions.push((async () => {
            await view.tween(player.pose, { y: 1, z: .35, legL: -1, legR: -.6 }, 170);
            await view.tween(player.pose, neutral(), 340);
          })());
          reactions.push(view.label(player, 'DODGE', '#ffcee7'));
        } else {
          reactions.push(view.impact(player, -1, result.blocked > 0));
          reactions.push(view.burst(player, result.blocked ? '#c5e8ff' : stage.color, result.blocked ? 'guard' : 'impact'));
          if (result.incoming) reactions.push(view.label(player, `-${result.incoming}`));
          if (result.blocked) reactions.push(view.label(player, `BLOCK ${result.blocked}`, '#c5e8ff', .4));
          reactions.push(view.cameraHit());
        }
        await Promise.all(reactions);
        await Promise.all([view.tween(enemy.pose, neutral(), 360), view.tween(player.pose, neutral(), 200)]);
      }
      if (after.enemyHp === 0) {
        this.phase('enemy-defeated', 'Guardian defeated!');
        enemy.defeated = true;
        await view.tween(enemy.pose, { fall: -1.2, y: .12, armL: -.5 }, 550);
        await view.tween(player.pose, { armR: -2.5, elbowR: -.1, head: -.1 }, 300);
      } else if (after.hp === 0) {
        this.phase('player-defeated', 'A brave try. You can retry this stage.');
        player.defeated = true;
        await view.tween(player.pose, { fall: 1.2, y: .12, armL: -.5 }, 550);
      }
      this.phase('finished', 'Turn complete.'); return true;
    } finally {
      if (barrier && view.effects.has(barrier)) view.removeEffect(barrier);
      view.clearEffects(); view.cameraState.shake = 0;
      this.running = false; this.arena.removeAttribute('aria-busy');
    }
  }
}
