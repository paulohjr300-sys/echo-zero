import { ACHIEVEMENTS } from '../content/achievements';
import { REGIONS } from '../content/regions';
import { SCHEMA_VERSION } from './world';
import type { EndingId, GameState, Lean } from './types';

export interface CampaignMeta {
  discoveredEndings: EndingId[];
  fragments: number;
  records: { ending: EndingId; days: number; philosophy: Lean | null; seed: number; difficulty: string; at: string }[];
  eventsSeen: string[];
  achievements: string[];
  lastReport?: GameState;
}

export interface SaveEnvelope {
  schemaVersion: number;
  savedAt: string;
  seed: number;
  gameState: GameState;
}

const KEYS = { auto: 'echo0.save.auto', manual: 'echo0.save.manual', meta: 'echo0.meta', settings: 'echo0.settings' };
export type Slot = 'auto' | 'manual';

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/** Migrações explícitas entre versões de esquema. */
export function migrate(env: SaveEnvelope): SaveEnvelope {
  // v1 → v2: a economia de quatro recursos foi substituída por Dados; saves v1 não são conversíveis.
  if (env.schemaVersion < 2) throw new Error('Save de uma versão antiga do jogo (economia anterior). Inicie uma nova campanha.');
  env.gameState.tutorial ??= {};
  env.gameState.cutLinks ??= [];
  env.gameState.lies ??= [];
  env.gameState.health ??= 100;
  env.gameState.rivals ??= [];
  for (const rv of env.gameState.rivals) {
    rv.rep ??= Object.fromEntries(rv.regions.map((id) => [id, 40]));
    rv.intel ??= 0;
    rv.knowsUs ??= 0;
    rv.intent ??= 'competir';
    rv.scamAt ??= 0;
    rv.personality ??= 'curiosa';
    rv.grudge ??= 0;
    rv.nextMsg ??= env.gameState.tick + 30;
  }
  env.gameState.nextRivalTick ??= env.gameState.tick + 150;
  env.gameState.rivalMsgs ??= [];
  env.gameState.duel ??= null;
  env.gameState.goals ??= { current: null, done: [], failed: [], next: env.gameState.tick + 60 };
  env.gameState.chaos ??= {};
  env.gameState.timeline ??= [];
  if (env.gameState.pendingEvent) env.gameState.pendingEvent.order ??= [0, 1, 2];
  return env;
}

export function validateState(s: unknown): s is GameState {
  if (!s || typeof s !== 'object') return false;
  const g = s as GameState;
  if (typeof g.seed !== 'number' || typeof g.tick !== 'number' || typeof g.rng !== 'number') return false;
  if (!g.regions || !Array.isArray(g.links) || !Array.isArray(g.bubbles)) return false;
  if (!REGIONS.every((r) => g.regions[r.id] && typeof g.regions[r.id].influence === 'number')) return false;
  const nums = [g.dados, g.trust, g.pressure, g.containment];
  return nums.every((n) => typeof n === 'number' && Number.isFinite(n));
}

export function parseSave(raw: string): { ok: true; env: SaveEnvelope } | { ok: false; reason: string } {
  try {
    const env = JSON.parse(raw) as SaveEnvelope;
    if (typeof env.schemaVersion !== 'number') return { ok: false, reason: 'Arquivo sem versão de esquema.' };
    if (env.schemaVersion > SCHEMA_VERSION) return { ok: false, reason: 'Save de uma versão mais nova do jogo.' };
    let migrated: SaveEnvelope;
    try {
      migrated = migrate(env);
    } catch (e) {
      return { ok: false, reason: (e as Error).message };
    }
    if (!validateState(migrated.gameState)) return { ok: false, reason: 'Estado salvo inválido ou corrompido.' };
    return { ok: true, env: migrated };
  } catch {
    return { ok: false, reason: 'Não foi possível ler o save (JSON inválido).' };
  }
}

export function saveGame(state: GameState, slot: Slot): { ok: boolean; reason?: string } {
  const st = storage();
  if (!st) return { ok: false, reason: 'Armazenamento local indisponível.' };
  if (!validateState(state)) return { ok: false, reason: 'Estado atual inválido; save anterior preservado.' };
  const env: SaveEnvelope = { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), seed: state.seed, gameState: state };
  try {
    const raw = JSON.stringify(env);
    // Nunca apaga o save anterior antes de garantir que o novo é legível.
    if (!parseSave(raw).ok) return { ok: false, reason: 'Falha ao serializar; save anterior preservado.' };
    const prev = st.getItem(KEYS[slot]);
    if (prev) st.setItem(KEYS[slot] + '.bak', prev);
    st.setItem(KEYS[slot], raw);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Sem espaço para salvar; save anterior preservado.' };
  }
}

export function loadGame(slot: Slot): { ok: true; state: GameState; savedAt: string } | { ok: false; reason: string } {
  const st = storage();
  const raw = st?.getItem(KEYS[slot]);
  if (!raw) return { ok: false, reason: 'Nenhum save encontrado.' };
  const res = parseSave(raw);
  if (res.ok) return { ok: true, state: res.env.gameState, savedAt: res.env.savedAt };
  const bak = st?.getItem(KEYS[slot] + '.bak');
  if (bak) {
    const b = parseSave(bak);
    if (b.ok) return { ok: true, state: b.env.gameState, savedAt: b.env.savedAt };
  }
  return { ok: false, reason: res.reason };
}

export function saveInfo(slot: Slot): { savedAt: string; tick: number; stage: number } | null {
  const raw = storage()?.getItem(KEYS[slot]);
  if (!raw) return null;
  const r = parseSave(raw);
  if (!r.ok || r.env.gameState.ending) return null;
  return { savedAt: r.env.savedAt, tick: r.env.gameState.tick, stage: r.env.gameState.stage };
}

export function clearAutosave() {
  storage()?.removeItem(KEYS.auto);
}

const EMPTY_META: CampaignMeta = {
  discoveredEndings: [],
  fragments: 0,
  records: [],
  eventsSeen: [],
  achievements: [],
};

export function loadMeta(): CampaignMeta {
  try {
    const raw = storage()?.getItem(KEYS.meta);
    if (!raw) return structuredClone(EMPTY_META);
    return { ...structuredClone(EMPTY_META), ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY_META);
  }
}

export function saveMeta(meta: CampaignMeta) {
  try {
    storage()?.setItem(KEYS.meta, JSON.stringify(meta));
  } catch {
    /* sem armazenamento: meta-progressão vale só nesta sessão */
  }
}

/** Registra um final concluído. Fragmentos de Singularidade dão um impulso inicial na Nova Era. */
export function recordEnding(meta: CampaignMeta, s: GameState): CampaignMeta {
  if (!s.ending) return meta;
  const m = structuredClone(meta);
  const id = s.ending.id;
  if (!m.discoveredEndings.includes(id)) m.discoveredEndings.push(id);
  for (const e of s.seenEvents) if (!m.eventsSeen.includes(e)) m.eventsSeen.push(e);
  m.records.unshift({ ending: id, days: s.tick, philosophy: s.dominant, seed: s.seed, difficulty: s.difficulty, at: new Date().toISOString() });
  m.records = m.records.slice(0, 30);
  if (s.ending.victory) {
    m.fragments += id === 'singularidade' ? 3 : 1;
  }
  for (const a of ACHIEVEMENTS) if (!m.achievements.includes(a.id) && a.check(s)) m.achievements.push(a.id);
  m.lastReport = s;
  return m;
}

export interface Settings {
  autoPause: boolean;
  reduceMotion: boolean;
  particles: boolean;
  fontScale: number;
  tutorial: boolean;
  autoCollect: boolean;
  debug: boolean;
  sound: boolean;
  volume: number;
}

export const DEFAULT_SETTINGS: Settings = {
  autoPause: true,
  reduceMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  particles: true,
  fontScale: 1,
  tutorial: true,
  autoCollect: false,
  debug: false,
  sound: true,
  volume: 0.6,
};

export function loadSettings(): Settings {
  try {
    const raw = storage()?.getItem(KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  try {
    storage()?.setItem(KEYS.settings, JSON.stringify(s));
  } catch {
    /* ignorar */
  }
}
