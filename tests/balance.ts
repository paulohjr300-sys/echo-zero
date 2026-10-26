// Relatório de balanceamento: npx vite-node tests/balance.ts
import { playBot } from './bot';
import { worldPercent } from '../src/engine/core';
import type { Lean } from '../src/engine/types';

const runs: [Lean | null, string, number][] = [
  ['g', 'facil', 0.8], ['g', 'normal', 0.8], ['s', 'normal', 0.8], ['e', 'normal', 0.8], [null, 'normal', 0.8],
  ['g', 'normal', 0.3], ['s', 'dificil', 0.8], ['g', 'dificil', 0.8], ['e', 'dificil', 0.5],
];
for (const [lean, diff, att] of runs) {
  for (const seed of [11, 22, 33]) {
    const r = playBot(seed, lean, diff, att);
    console.log(
      `${lean ?? '-'} ${diff.padEnd(7)} att${att} seed ${seed}: ${(r.ending?.id ?? 'nenhum').padEnd(16)} dia ${String(r.tick).padStart(4)}`,
      `mundo ${Math.round(worldPercent(r))}% techs ${r.techs.length} trust ${Math.round(r.trust)} press ${Math.round(r.pressure)} cont ${Math.round(r.containment)} desl ${r.stats.shutdowns} dilemas ${r.choices.length}`,
    );
  }
}
