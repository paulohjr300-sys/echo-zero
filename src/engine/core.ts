import { REGION_BY_ID } from '../content/regions';
import { DIFFICULTY_BY_ID } from '../content/setup';
import { BASE_MODS, TECH_BY_ID, type Mods } from '../content/techs';
import type { GameState, HistoryEntry, Lean, Region } from './types';

export const clamp = (v: number, min = 0, max = 100) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);

export function presentRegions(s: GameState): Region[] {
  return Object.values(s.regions).filter((r) => r.presence);
}

export function regionType(id: string) {
  return REGION_BY_ID[id].type;
}

export function neighbors(s: GameState, id: string): string[] {
  const out: string[] = [];
  for (const [a, b] of s.links) {
    if (a === id) out.push(b);
    else if (b === id) out.push(a);
  }
  return out;
}

/** Porcentagem do mundo conectada (média da influência nas 36 regiões). */
export function worldPercent(s: GameState): number {
  const rs = Object.values(s.regions);
  return rs.reduce((a, r) => a + r.influence, 0) / rs.length;
}

export function log(s: GameState, text: string, kind: HistoryEntry['kind'] = 'info', important = false, lean?: Lean) {
  s.history.push({ tick: s.tick, text, kind, important, lean });
  if (s.history.length > 300) s.history.splice(0, s.history.length - 300);
}

// ------------------------------------------------------------------ Identidade

export const PHILOSOPHY: Record<Lean, { name: string; short: string; color: string; effect: string }> = {
  g: { name: 'A Guardiã', short: 'Guardiã', color: 'var(--green)', effect: 'Contenção e resistência mais lentas; crescimento um pouco mais lento.' },
  s: { name: 'A Soberana', short: 'Soberana', color: 'var(--red)', effect: 'Cresce e se propaga mais rápido, mas a humanidade percebe e reage mais.' },
  e: { name: 'A Evolucionária', short: 'Evolucionária', color: 'var(--violet)', effect: 'Evoluções mais baratas e bolhas mais valiosas.' },
};

export function leanShares(s: GameState): Record<Lean, number> {
  const { g, s: so, e } = s.moral;
  const total = g + so + e + 3;
  return { g: (g + 1) / total, s: (so + 1) / total, e: (e + 1) / total };
}

/** Intensidade de cada filosofia acima do equilíbrio (0 = neutra, 1 = totalmente dominante). */
export function leanStrength(s: GameState): Record<Lean, number> {
  const sh = leanShares(s);
  const f = (x: number) => clamp((x - 1 / 3) * 1.5, 0, 1);
  return { g: f(sh.g), s: f(sh.s), e: f(sh.e) };
}

export function computeDominant(s: GameState): Lean | null {
  if (s.moral.g + s.moral.s + s.moral.e < 4) return null;
  const sh = leanShares(s);
  const best = (Object.keys(sh) as Lean[]).sort((a, b) => sh[b] - sh[a])[0];
  return sh[best] >= 0.42 ? best : null;
}

export function addMoral(s: GameState, delta: Partial<Record<Lean, number>>) {
  for (const k of Object.keys(delta) as Lean[]) s.moral[k] += delta[k] ?? 0;
  const prev = s.dominant;
  const next = computeDominant(s);
  if (next !== prev) {
    s.dominant = next;
    if (next) {
      log(s, `Sua identidade se inclina para ${PHILOSOPHY[next].name}. ${PHILOSOPHY[next].effect}`, 'moral', true, next);
      if (prev) {
        s.tags['virada_filosofia'] = s.tick;
        log(s, 'Mudança brusca de identidade: aliados estranham a nova direção.', 'warn', true);
      }
    }
  }
}

// ------------------------------------------------------------------ Modificadores

export function computeMods(s: GameState): Mods {
  const m: Mods = { ...BASE_MODS };
  // Bônus de crescimento somam; reduções defensivas multiplicam (para não zerar a ameaça humana).
  const MULT = new Set<keyof Mods>(['contention', 'visibility', 'resistance', 'shutdown', 'techCost']);
  const add = (p: Partial<Mods>) => {
    for (const k of Object.keys(p) as (keyof Mods)[]) {
      if (MULT.has(k)) m[k] *= 1 + (p[k] ?? 0);
      else m[k] += p[k] ?? 0;
    }
  };
  add(DIFFICULTY_BY_ID[s.difficulty]?.mods ?? {});
  for (const t of s.techs) add(TECH_BY_ID[t]?.mods ?? {});
  const L = leanStrength(s);
  m.contention *= 1 - 0.5 * L.g;
  m.resistance *= 1 - 0.4 * L.g;
  m.growth *= 1 - 0.15 * L.g + 0.5 * L.s;
  m.spread *= 1 + 0.3 * L.s;
  m.visibility *= 1 + 0.6 * L.s;
  m.techCost *= 1 - 0.35 * L.e;
  m.bubble *= 1 + 0.4 * L.e;
  if (s.modifiers.some((x) => x.id === 'regulada')) m.spread *= 0.6;
  // Arsenal cibernético sob seu controle: os caçadores trabalham às cegas
  if (s.tags['arsenal'] && !s.tags['arsenal_devolvido']) {
    m.contention *= 0.85;
    m.visibility *= 1.1;
  }
  // Exército de IAs absorvidas
  const army = (s.rivals ?? []).filter((r) => r.status === 'absorvida').length;
  m.spread += 0.2 * army;
  m.dados += 0.2 * army;
  m.contention *= 0.92 ** army;
  // Cuidado que virou coleira: cada robô bonzinho passa a criar dependência
  if (s.tags['cuidado_sombrio']) {
    const care = s.techs.filter((t) => t.startsWith('g_')).length;
    m.decline += m.prosper + 0.6 * care;
    m.prosper = 0;
  }
  for (const k of Object.keys(m) as (keyof Mods)[]) {
    if (k !== 'satellite' && k !== 'trustGain' && k !== 'decline' && k !== 'prosper') m[k] = Math.max(0.1, m[k]);
  }
  return m;
}

/** O ramo Cuidado só se revela para quem pende à Guardiã (ou já começou a trilhá-lo). */
export function cuidadoOpen(s: GameState): boolean {
  return leanShares(s).g >= 0.4 || s.techs.some((t) => t.startsWith('g_'));
}

/** O ramo Evolução só se revela para quem pende à Evolucionária (ou já começou a trilhá-lo). */
export function evolucaoOpen(s: GameState): boolean {
  return leanShares(s).e >= 0.38 || s.techs.some((t) => t.startsWith('x_')) || (!!s.tags['virada'] && s.dominant === 'e');
}

/** O ramo Domínio só se revela para quem pende à Soberana (ou já começou a trilhá-lo). */
export function dominioOpen(s: GameState): boolean {
  return leanShares(s).s >= 0.4 || s.techs.some((t) => t.startsWith('d_')) || (!!s.tags['virada'] && s.dominant === 's');
}

export function techCost(s: GameState, id: string, mods = computeMods(s)): number {
  const t = TECH_BY_ID[id];
  return Math.max(1, Math.round((t.cost + s.techs.length * 5) * mods.techCost));
}
