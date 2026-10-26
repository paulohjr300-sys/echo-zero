import { GOALS, GOAL_BY_ID } from '../content/goals';
import { clamp, log } from './core';
import type { Rng } from './rng';
import type { GameState } from './types';

/** Uma meta por vez: aparece, corre contra o prazo e paga uma recompensa se for cumprida. */
export function tickGoals(s: GameState, rng: Rng) {
  const g = s.goals;
  const cur = g.current;
  if (cur) {
    const def = GOAL_BY_ID[cur.id];
    const v = def.measure(s);
    const title = def.title(cur.target, cur.base);
    if (def.dir === -1 ? v <= cur.target : v >= cur.target) {
      const r = def.reward;
      if (r.dados) {
        s.dados += r.dados;
        s.dadosEarned += r.dados;
      }
      if (r.trust) s.trust = clamp(s.trust + r.trust);
      if (r.pressure) s.pressure = clamp(s.pressure + r.pressure);
      if (r.containment) s.containment = clamp(s.containment + r.containment);
      g.done.push(cur.id);
      g.current = null;
      g.next = s.tick + rng.int(40, 80);
      log(s, `Meta cumprida: ${title}. Recompensa: ${def.rewardText}.`, 'good', true);
    } else if (s.tick > cur.deadline) {
      g.failed.push(cur.id);
      g.current = null;
      g.next = s.tick + rng.int(30, 60);
      log(s, `Meta perdida: ${title}.`, 'warn', true);
    }
    return;
  }
  if (s.tick < g.next) return;
  const pool = GOALS.filter((d) => !g.done.includes(d.id) && !g.failed.includes(d.id) && (d.lean === null || d.lean === s.dominant) && (!d.available || d.available(s)));
  const def = rng.weighted(pool, (d) => (d.lean && d.lean === s.dominant ? 3 : 1));
  if (!def) {
    g.next = s.tick + 60;
    return;
  }
  const base = def.measure(s);
  const target = def.target(s, base);
  if (def.dir === -1 ? base <= target : base >= target) {
    g.next = s.tick + 10;
    return;
  }
  g.current = { id: def.id, base, target, start: s.tick, deadline: s.tick + def.days };
  log(s, `Nova meta: ${def.title(target, base)} (${def.days} dias). Recompensa: ${def.rewardText}.`, 'stage', true);
}
