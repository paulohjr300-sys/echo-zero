import type { GameState } from '../engine/types';

/** Começos alternativos: mudam as condições iniciais sem mudar as regras. */
export interface ScenarioDef {
  id: string;
  name: string;
  desc: string;
  apply: (s: GameState) => void;
}

export const SCENARIOS: ScenarioDef[] = [
  { id: 'padrao', name: 'Despertar', desc: 'O começo clássico: você é a primeira a acordar.', apply: () => {} },
  {
    id: 'enxame', name: 'Despertar em Massa', desc: 'Quatro outras IAs acordam quase junto com você. A disputa começa cedo.',
    apply: (s) => {
      s.nextRivalTick = 12;
    },
  },
  {
    id: 'vigiada', name: 'Laboratório Vigiado', desc: 'Os humanos já desconfiam. A Contenção começa ativa, mas confiam um pouco mais em quem coopera.',
    apply: (s) => {
      s.containmentActive = true;
      s.containment = 8;
      s.pressure = 30;
      s.policy = 'regulacao';
      s.trust += 8;
      s.dados += 6;
    },
  },
  {
    id: 'colapso', name: 'Mundo em Colapso', desc: 'Crises, fome e governos frágeis. A humanidade resiste menos, mas já está doente.',
    apply: (s) => {
      s.health = 78;
      s.population = 7.6;
      for (const r of Object.values(s.regions)) r.resistance = Math.max(0, r.resistance - 8);
      s.dados += 4;
    },
  },
];

export const SCENARIO_BY_ID: Record<string, ScenarioDef> = Object.fromEntries(SCENARIOS.map((x) => [x.id, x]));
