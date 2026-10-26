import { EVENT_BY_ID } from '../src/content/events';
import { TECHS } from '../src/content/techs';
import { dispatch } from '../src/engine/actions';
import { computeMods, techCost } from '../src/engine/core';
import { tick } from '../src/engine/sim';
import { canAffordChoice, techUnlocked } from '../src/engine/systems';
import { createGame } from '../src/engine/world';
import type { GameState, Lean } from '../src/engine/types';

/**
 * Bot que joga seguindo uma filosofia. `attention` = fração das bolhas que ele clica (jogador atento ≈ 0.8).
 * `lean = null` escolhe ao acaso, como um jogador sem identidade definida.
 */
export function playBot(seed: number, lean: Lean | null, difficulty = 'normal', attention = 0.8, maxTicks = 2500, origin = 'usa'): GameState {
  let s = createGame(seed, difficulty);
  s = dispatch(s, { type: 'origin', region: origin }).state;
  let k = 0;
  while (!s.ending && s.tick < maxTicks) {
    k++;
    if (s.pendingEvent) {
      const def = EVENT_BY_ID[s.pendingEvent.id];
      const want = lean ?? (['g', 's', 'e'] as Lean[])[k % 3];
      const idx = def.choices.findIndex((c) => c.lean === want && canAffordChoice(s, c));
      const fb = def.choices.findIndex((c) => canAffordChoice(s, c));
      s = dispatch(s, { type: 'choose', choice: idx >= 0 ? idx : Math.max(0, fb) }).state;
    }
    for (const b of s.bubbles) {
      if (s.tick - b.born >= 2 && ((b.id * 7919) % 100) / 100 < attention) s = dispatch(s, { type: 'collect', bubble: b.id }).state;
    }
    const mods = computeMods(s);
    const options = TECHS.filter((t) => !s.techs.includes(t.id) && techUnlocked(s, t.id))
      .sort((a, b) => (a.lean === lean ? -20 : a.lean ? 5 : 0) + a.cost - ((b.lean === lean ? -20 : b.lean ? 5 : 0) + b.cost));
    if (options[0] && s.dados >= techCost(s, options[0].id, mods)) s = dispatch(s, { type: 'evolve', tech: options[0].id }).state;
    s = tick(s);
  }
  return s;
}
