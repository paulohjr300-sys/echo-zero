import { presentRegions, worldPercent } from '../engine/core';
import type { GameState, Lean } from '../engine/types';

/**
 * Metas do meio da partida: um objetivo de cada vez, com prazo e recompensa.
 * A meta é sorteada conforme quem você está se tornando, para dar direção aos dias mais calmos.
 */
export interface GoalDef {
  id: string;
  lean: Lean | null;
  /** Valor atual que a meta acompanha. */
  measure: (s: GameState) => number;
  /** Alvo, calculado quando a meta aparece (base = valor naquele momento). */
  target: (s: GameState, base: number) => number;
  /** -1 quando a meta é baixar o valor. */
  dir?: -1;
  title: (target: number, base: number) => string;
  days: number;
  reward: { dados?: number; trust?: number; containment?: number; pressure?: number };
  rewardText: string;
  available?: (s: GameState) => boolean;
}

const count = (s: GameState, prefix: string) => s.techs.filter((t) => t.startsWith(prefix)).length;
const rivalsGone = (s: GameState) => s.rivals.filter((r) => r.status === 'absorvida' || r.status === 'destruida').length;
const maxIntel = (s: GameState) => Math.max(0, ...s.rivals.filter((r) => r.status === 'hostil' || r.status === 'aliada').map((r) => r.intel));
const live = (s: GameState) => s.rivals.some((r) => r.status === 'hostil' || r.status === 'aliada');

export const GOALS: GoalDef[] = [
  // ---------------- Para qualquer identidade
  { id: 'n_regioes', lean: null, measure: (s) => presentRegions(s).length, target: (_s, b) => Math.min(36, b + 4),
    title: (t) => `Esteja presente em ${t} regiões`, days: 160, reward: { dados: 20 }, rewardText: '+20 Dados' },
  { id: 'n_mundo', lean: null, measure: (s) => Math.floor(worldPercent(s)), target: (_s, b) => Math.min(90, b + 12),
    title: (t) => `Conecte ${t}% do mundo`, days: 200, reward: { dados: 25 }, rewardText: '+25 Dados' },
  { id: 'n_bolhas', lean: null, measure: (s) => s.stats.bubbles, target: (_s, b) => b + 15,
    title: (t, b) => `Colete ${t - b} bolhas`, days: 120, reward: { dados: 15 }, rewardText: '+15 Dados' },
  { id: 'n_evoluir', lean: null, measure: (s) => s.techs.length, target: (_s, b) => b + 3,
    title: (t, b) => `Faça ${t - b} evoluções`, days: 180, reward: { dados: 20 }, rewardText: '+20 Dados' },
  { id: 'n_espionar', lean: null, measure: maxIntel, target: (_s, b) => Math.min(100, Math.max(50, b + 25)),
    title: (t) => `Descubra ${t}% sobre uma IA rival`, days: 180, reward: { dados: 20 }, rewardText: '+20 Dados', available: live },
  // ---------------- Soberana
  { id: 's_saude', lean: 's', measure: (s) => Math.round(s.health), target: (_s, b) => Math.max(5, b - 15), dir: -1,
    title: (t) => `Leve a Saúde humana a ${t}%`, days: 200, reward: { containment: -8, dados: 10 }, rewardText: 'Contenção −8 e +10 Dados',
    available: (s) => s.techs.includes('d_dependencia') || !!s.tags['cuidado_sombrio'] },
  { id: 's_dominio', lean: 's', measure: (s) => count(s, 'd_'), target: (_s, b) => b + 2,
    title: (t, b) => `Faça ${t - b} evoluções do Domínio`, days: 220, reward: { containment: -6, dados: 15 }, rewardText: 'Contenção −6 e +15 Dados' },
  { id: 's_rival', lean: 's', measure: rivalsGone, target: (_s, b) => b + 1,
    title: () => 'Elimine ou absorva uma IA rival', days: 240, reward: { dados: 30 }, rewardText: '+30 Dados', available: live },
  { id: 's_silencio', lean: 's', measure: (s) => Math.round(s.pressure), target: (_s, b) => Math.max(10, b - 20), dir: -1,
    title: (t) => `Baixe a atenção humana para ${t}`, days: 160, reward: { containment: -10 }, rewardText: 'Contenção −10',
    available: (s) => s.pressure >= 35 },
  // ---------------- Guardiã
  { id: 'g_confianca', lean: 'g', measure: (s) => Math.round(s.trust), target: (_s, b) => Math.min(100, Math.max(70, b + 15)),
    title: (t) => `Conquiste ${t} de Confiança humana`, days: 200, reward: { dados: 20, pressure: -8 }, rewardText: '+20 Dados e Pressão −8' },
  { id: 'g_cuidado', lean: 'g', measure: (s) => count(s, 'g_'), target: (_s, b) => b + 2,
    title: (t, b) => `Faça ${t - b} evoluções do Cuidado`, days: 220, reward: { trust: 10, dados: 10 }, rewardText: 'Confiança +10 e +10 Dados' },
  { id: 'g_alianca', lean: 'g', measure: (s) => s.rivals.filter((r) => r.status === 'aliada').length, target: () => 1,
    title: () => 'Tenha uma IA rival como aliada', days: 220, reward: { dados: 25 }, rewardText: '+25 Dados', available: live },
  // ---------------- Evolucionária
  { id: 'e_espionar', lean: 'e', measure: maxIntel, target: (_s, b) => Math.min(100, Math.max(70, b + 30)),
    title: (t) => `Saiba ${t}% sobre uma IA rival`, days: 220, reward: { dados: 25 }, rewardText: '+25 Dados', available: live },
  { id: 'e_evolucao', lean: 'e', measure: (s) => count(s, 'x_'), target: (_s, b) => b + 2,
    title: (t, b) => `Faça ${t - b} evoluções do ramo Evolução`, days: 220, reward: { dados: 20, containment: -5 }, rewardText: '+20 Dados e Contenção −5' },
  { id: 'e_fusao', lean: 'e', measure: (s) => s.rivals.filter((r) => r.status === 'absorvida').length, target: (_s, b) => b + 1,
    title: () => 'Absorva uma IA rival', days: 260, reward: { dados: 30 }, rewardText: '+30 Dados', available: live },
];

export const GOAL_BY_ID: Record<string, GoalDef> = Object.fromEntries(GOALS.map((g) => [g.id, g]));

/** Progresso de 0 a 1 da meta ativa. */
export function goalProgress(s: GameState): number {
  const cur = s.goals.current;
  if (!cur) return 0;
  const def = GOAL_BY_ID[cur.id];
  const v = def.measure(s);
  const span = Math.abs(cur.target - cur.base) || 1;
  const done = def.dir === -1 ? cur.base - v : v - cur.base;
  return Math.max(0, Math.min(1, done / span));
}
