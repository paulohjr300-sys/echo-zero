import { SCENARIO_BY_ID } from '../content/scenarios';
import { CABLE_LINKS, LAND_LINKS, REGIONS } from '../content/regions';
import { DIFFICULTY_BY_ID } from '../content/setup';
import { Rng } from './rng';
import type { GameState, Region } from './types';

export const SCHEMA_VERSION = 2;

export function isConnected(ids: string[], links: [string, string][]): boolean {
  if (!ids.length) return true;
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const [a, b] of links) {
    adj.get(a)?.push(b);
    adj.get(b)?.push(a);
  }
  const seen = new Set([ids[0]]);
  const stack = [ids[0]];
  while (stack.length) {
    for (const n of adj.get(stack.pop()!) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === ids.length;
}

export function degree(id: string, links: [string, string][]) {
  return links.filter(([a, b]) => a === id || b === id).length;
}

export function isCable(a: string, b: string) {
  return CABLE_LINKS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Gera as rotas da partida e valida conectividade e rotas alternativas. */
export function generateLinks(rng: Rng, removeCables: number): [string, string][] {
  const cables = [...CABLE_LINKS];
  const removed: [string, string][] = [];
  for (let i = 0; i < removeCables && cables.length; i++) {
    removed.push(cables.splice(Math.floor(rng.next() * cables.length), 1)[0]);
  }
  let links = [...LAND_LINKS, ...cables];
  const ids = REGIONS.map((r) => r.id);
  while (removed.length && (!isConnected(ids, links) || ids.some((id) => degree(id, links) < 2))) {
    const weak = ids.find((id) => degree(id, links) < 2);
    const idx = weak ? removed.findIndex(([a, b]) => a === weak || b === weak) : 0;
    links = [...links, removed.splice(Math.max(0, idx), 1)[0]];
  }
  return links;
}

export function createGame(seed: number, difficulty: string, scenario = 'padrao'): GameState {
  const s = buildGame(seed, difficulty);
  s.scenario = scenario;
  SCENARIO_BY_ID[scenario]?.apply(s);
  return s;
}

function buildGame(seed: number, difficulty: string): GameState {
  const rng = new Rng(seed);
  const diff = DIFFICULTY_BY_ID[difficulty] ?? DIFFICULTY_BY_ID['normal'];
  const links = generateLinks(rng, diff.removeCables);
  const regions: Record<string, Region> = {};
  for (const def of REGIONS) {
    const extra = def.type === 'pesquisa' ? 6 : 0;
    regions[def.id] = {
      id: def.id,
      influence: 0,
      resistance: Math.round(rng.range(diff.resistance[0], diff.resistance[1]) + extra),
      presence: false,
      status: 'neutra',
      everPresent: false,
    };
  }
  return {
    version: SCHEMA_VERSION,
    seed,
    rng: rng.state,
    tick: 0,
    stage: 1,
    difficulty: diff.id,
    origin: null,
    dados: 3,
    population: 8.1,
    health: 100,
    dadosEarned: 0,
    trust: diff.trust,
    pressure: 0,
    policy: 'observacao',
    containment: 0,
    containmentActive: false,
    lastPolicyChange: 0,
    moral: { g: 0, s: 0, e: 0 },
    dominant: null,
    regions,
    links,
    techs: [],
    pendingEvent: null,
    eventCooldowns: {},
    nextEventTick: rng.int(6, 16),
    seenEvents: [],
    tags: {},
    modifiers: [],
    cutLinks: [],
    lies: [],
    rivals: [],
    rivalMsgs: [],
    duel: null,
    goals: { current: null, done: [], failed: [], next: rng.int(110, 150) },
    chaos: {},
    timeline: [],
    nextRivalTick: rng.int(32, 50),
    bubbles: [],
    bubbleSeq: 0,
    nextBubbleTick: 3,
    history: [],
    choices: [],
    arcs: [],
    arcSeq: 0,
    ending: null,
    stats: { maxWorld: 0, bubbles: 0, expansions: 0, crisesResolved: 0, shutdowns: 0 },
    tutorial: {},
  };
}
