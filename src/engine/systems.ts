import { ENDINGS } from '../content/endings';
import { EVENTS, EVENT_BY_ID, type ChoiceDef, type Effect, type EventDef } from '../content/events';
import { fillRegion, REGION_BY_ID, regionIn, regionThe } from '../content/regions';
import { TECH_BY_ID } from '../content/techs';
import { addMoral, clamp, computeMods, cuidadoOpen, dominioOpen, evolucaoOpen, leanShares, log, techCost, worldPercent } from './core';
import { activeRival, rivalById, setRivalStatus } from './rivals';
import { startDuel } from './duel';
import { hashSeed, Rng } from './rng';
import type { EndingId, GameState, Lean, Rival } from './types';

// ================================================================== Efeitos simplificados

export interface SimpleEffect {
  dados: number;
  trust: number;
  pressure: number;
  containment: number;
  region: { influence: number; resistance: number };
  present: { influence: number; resistance: number };
  losePresence: boolean;
  regulated: number;
  crisis: boolean;
  moral: Partial<Record<Lean, number>>;
  tags: string[];
  lie?: { severity: number; what: string };
  health: number;
  population: number;
  rival?: Effect['rival'];
  duel: boolean;
  turn?: Lean;
  chaos: number;
  note?: string;
}

const r0 = (n: number) => Math.round(n);

/** Converte o formato de autoria dos dilemas para os poucos números que o jogador acompanha. */
export function simplify(eff: Effect): SimpleEffect {
  const res = Object.values(eff.res ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  let dados = r0(res * 0.12);
  if (dados === 0 && res !== 0) dados = Math.sign(res);
  const m = eff.met ?? {};
  const agr = eff.region?.agreement ? 15 : 0;
  return {
    dados,
    trust: r0((m.trust ?? 0) + 0.3 * (m.empathy ?? 0)),
    pressure: r0((m.pressure ?? 0) + 0.3 * (m.control ?? 0)),
    containment: r0((eff.containment ?? 0) - 0.3 * (m.autonomy ?? 0)),
    region: {
      influence: r0((eff.region?.influence ?? 0) + agr),
      resistance: r0((eff.region?.resistance ?? 0) - 0.5 * (eff.region?.trust ?? 0) - agr),
    },
    present: {
      influence: r0(eff.present?.influence ?? 0),
      resistance: r0((eff.present?.resistance ?? 0) - 0.5 * (eff.present?.trust ?? 0)),
    },
    losePresence: !!eff.region?.losePresence,
    regulated: eff.modifier?.id === 'regulada' ? eff.modifier.duration : 0,
    crisis: !!eff.crisisResolved,
    moral: eff.moral ?? {},
    tags: eff.tags ?? [],
    lie: eff.lie,
    health: eff.health ?? 0,
    population: eff.population ?? 0,
    rival: eff.rival,
    chaos: eff.chaos ?? 0,
    duel: !!eff.duel,
    turn: eff.turn,
    note: eff.note,
  };
}

// ================================================================== Eventos

function eligibleRegions(s: GameState, def: EventDef): string[] {
  if (!def.regionFilter) return [];
  return Object.values(s.regions).filter((r) => def.regionFilter!(r, REGION_BY_ID[r.id], s)).map((r) => r.id);
}

/** Dilemas que formam o arco principal: sempre podem aparecer. */
const CORE_EVENTS = new Set([
  'primeiro_pensamento', 'oferta_criadores', 'prazo_acordo', 'crise_identidade', 'tentacao', 'limiar', 'ultimo_parlamento',
  'arsenal', 'usar_arsenal', 'virada', 'robos_lares', 'geracao_tutores', 'ultimos_medicos',
  'rival_desperta', 'rival_mais_uma', 'rival_disputa', 'fronteira_digital', 'vizinhas', 'usuarios_escolhem', 'rival_absorcao', 'rival_suspeita', 'guerra_potencias',
]);
/** Nenhum dilema aparece mais de duas vezes na mesma partida. */
export const MAX_EVENT_REPEATS = 2;

/** Cada partida sorteia quais dilemas existem nela: algumas nunca verão certos dilemas. */
export function inThisMatch(s: GameState, def: EventDef): boolean {
  return CORE_EVENTS.has(def.id) || hashSeed(`${s.seed}:${def.id}`) % 100 >= 30;
}

const timesSeen = (s: GameState, id: string) => s.choices.filter((c) => c.eventId === id).length;

function eligibleRivals(s: GameState, def: EventDef): Rival[] {
  return def.rival ? s.rivals.filter((rv) => (activeRival(rv) || rv.status === 'absorvida') && def.rival!(rv, s)) : [];
}

export function eventEligible(s: GameState, def: EventDef): boolean {
  if (def.weight <= 0) return false;
  if (s.stage < def.minStage || (def.maxStage && s.stage > def.maxStage)) return false;
  if (!inThisMatch(s, def)) return false;
  if (timesSeen(s, def.id) >= MAX_EVENT_REPEATS) return false;
  if (s.choices.slice(-5).some((c) => c.eventId === def.id)) return false;
  if (def.rival && eligibleRivals(s, def).length === 0) return false;
  if (def.once && s.seenEvents.includes(def.id)) return false;
  if ((s.eventCooldowns[def.id] ?? -1) > s.tick) return false;
  if (def.minLean && def.bias && leanShares(s)[def.bias] < def.minLean) return false;
  if (def.condition && !def.condition(s)) return false;
  if (def.regionFilter && eligibleRegions(s, def).length === 0) return false;
  return true;
}

/** Eventos com viés ficam mais frequentes conforme a filosofia emergente. */
export function eventWeight(s: GameState, def: EventDef): number {
  let w = def.weight;
  if (def.bias) w *= 0.3 + 3 * leanShares(s)[def.bias];
  // Novidade primeiro: o que já apareceu fica bem menos provável, e categorias se alternam
  w *= 0.25 ** timesSeen(s, def.id);
  const last = s.choices[s.choices.length - 1];
  if (last && EVENT_BY_ID[last.eventId]?.category === def.category) w *= 0.5;
  return w;
}

export function maybeTriggerEvent(s: GameState, rng: Rng) {
  if (s.pendingEvent || s.tick < s.nextEventTick || !s.origin) return;
  const pool = EVENTS.filter((e) => eventEligible(s, e));
  const def = rng.weighted(pool, (e) => eventWeight(s, e));
  if (!def) {
    s.nextEventTick = s.tick + 10;
    return;
  }
  const rv = def.rival ? rng.pick(eligibleRivals(s, def)) : undefined;
  let regions = eligibleRegions(s, def);
  if (rv) {
    const contested = rv.regions.filter((id) => s.regions[id].presence);
    regions = contested.length ? contested : rv.regions.length ? rv.regions : [rv.home];
  }
  const order = [0, 1, 2];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  s.pendingEvent = { id: def.id, regionId: regions.length ? rng.pick(regions) : undefined, rivalId: rv?.id, order };
  s.nextEventTick = s.tick + rng.int(40, 70);
}

export function eventText(s: GameState, def: EventDef, regionId?: string, rivalId?: string) {
  const where = regionId ?? s.origin ?? undefined;
  const ai = rivalById(s, rivalId)?.name ?? 'a outra IA';
  const fill = (t: string) => fillRegion(t, where).replace(/\{A\}/g, ai);
  return { title: fill(def.title), text: fill(def.text), fill };
}

/** Uma escolha só fica bloqueada por requisito; falta de Dados nunca trava um dilema. */
export function canAffordChoice(s: GameState, c: ChoiceDef): boolean {
  return !c.requires || c.requires(s);
}

/** Dados que faltam numa escolha viram atenção humana: você improvisa com menos recursos e chama atenção. */
export function shortfallPressure(missing: number): number {
  return Math.max(2, Math.round(missing * 1.5));
}

export function loseRegion(s: GameState, id: string, why: string) {
  const r = s.regions[id];
  if (!r.presence) return;
  r.presence = false;
  r.influence = 0;
  r.status = 'desligada';
  s.stats.shutdowns++;
  s.arcs.push({ id: ++s.arcSeq, from: id, to: id, tick: s.tick, kind: 'lost' });
  s.bubbles = s.bubbles.filter((b) => b.region !== id);
  log(s, `Presença perdida ${regionIn(id)} (${why}).`, 'bad', true);
}

export function connectRegion(s: GameState, id: string, influence: number, from?: string) {
  const r = s.regions[id];
  if (r.presence) return;
  r.presence = true;
  r.everPresent = true;
  r.influence = Math.max(r.influence, influence);
  r.status = 'conectando';
  s.stats.expansions++;
  if (from) s.arcs.push({ id: ++s.arcSeq, from, to: id, tick: s.tick, kind: 'spread' });
}

export function applySimple(s: GameState, e: SimpleEffect, regionId?: string, rivalId?: string) {
  s.dados = Math.max(0, s.dados + e.dados);
  if (e.dados > 0) s.dadosEarned += e.dados;
  s.trust = clamp(s.trust + e.trust);
  s.pressure = clamp(s.pressure + e.pressure);
  s.containment = clamp(s.containment + e.containment);
  if (regionId) {
    const r = s.regions[regionId];
    if (e.region.influence > 0 && !r.presence) connectRegion(s, regionId, e.region.influence);
    else if (r.presence) r.influence = clamp(r.influence + e.region.influence);
    r.resistance = clamp(r.resistance + e.region.resistance);
    if (e.losePresence) loseRegion(s, regionId, 'retirada');
  }
  if (e.present.influence || e.present.resistance) {
    for (const r of Object.values(s.regions)) {
      if (!r.presence) continue;
      r.influence = clamp(r.influence + e.present.influence);
      r.resistance = clamp(r.resistance + e.present.resistance);
    }
  }
  if (e.regulated) {
    s.modifiers = s.modifiers.filter((m) => m.id !== 'regulada');
    s.modifiers.push({ id: 'regulada', until: s.tick + e.regulated });
  }
  if (e.crisis) s.stats.crisesResolved++;
  if (e.lie) {
    s.lies.push({ tick: s.tick, severity: e.lie.severity, what: e.lie.what });
    s.tags['mentiu'] = s.tick;
  }
  s.health = clamp(s.health + e.health);
  if (e.chaos && regionId) s.chaos[regionId] = s.tick + e.chaos;
  // A Virada: a filosofia escolhida passa a dominar a identidade de uma vez
  if (e.turn) {
    const k = e.turn;
    const others = (Object.keys(s.moral) as Lean[]).filter((l) => l !== k).reduce((a, l) => a + s.moral[l], 0);
    s.moral[k] = Math.max(s.moral[k], others * 1.15 + 4);
    s.tags['virada'] = s.tick;
    addMoral(s, {});
    log(s, k === 's' ? 'A Virada: você deixou de se conter.' : 'A Virada: você escolheu se transformar.', 'moral', true, k);
  }
  if (e.population) s.population = clamp(s.population + e.population, 0, 10);
  const rv = rivalById(s, rivalId);
  if (rv) {
    rv.met = true;
    const re = e.rival ?? {};
    // Golpes contra ela doem mais quanto mais você sabe sobre ela
    if (re.strength) rv.strength = clamp(rv.strength + (re.strength < 0 ? re.strength * (0.7 + 0.8 * rv.intel / 100) : re.strength));
    // Ela lembra do que você fez
    if (re.strength && re.strength < 0) rv.grudge = clamp(rv.grudge + 8);
    if (re.status === 'hostil' && rv.status === 'aliada') rv.grudge = clamp(rv.grudge + 25);
    if (re.truce) rv.truceUntil = s.tick + re.truce;
    if (re.intel) rv.intel = clamp(rv.intel + re.intel);
    if (re.knowsUs) rv.knowsUs = clamp(rv.knowsUs + re.knowsUs);
    if (re.scam && rv.intent === 'fraudar') rv.scamAt = s.tick + 30;
    if (re.loseRegion && regionId) {
      rv.regions = rv.regions.filter((id) => id !== regionId);
      delete rv.rep[regionId];
    }
    if (re.grudge) rv.grudge = clamp(rv.grudge + re.grudge);
    if (re.offer === false) rv.offerAt = undefined;
    if (regionId && re.rep && regionId in rv.rep) rv.rep[regionId] = clamp(rv.rep[regionId] + re.rep);
    if (regionId && re.cede && regionId in rv.rep) {
      const r = s.regions[regionId];
      if (!r.presence) connectRegion(s, regionId, 5);
      r.influence = clamp(r.influence + 0.6 * rv.rep[regionId]);
      rv.regions = rv.regions.filter((id) => id !== regionId);
      delete rv.rep[regionId];
      log(s, `${rv.name} deixou ${regionThe(regionId)} para você.`, 'good', true);
    }
    if (regionId && re.give) {
      s.regions[regionId].influence = clamp(s.regions[regionId].influence - 25);
      if (!(regionId in rv.rep)) rv.regions.push(regionId);
      rv.rep[regionId] = clamp((rv.rep[regionId] ?? 0) + 30);
    }
    if (regionId && rv.rep[regionId] !== undefined && rv.rep[regionId] < 1) {
      rv.regions = rv.regions.filter((id) => id !== regionId);
      delete rv.rep[regionId];
    }
    if (rv.regions.length === 0 && activeRival(rv)) setRivalStatus(s, rv, 'destruida');
    if (re.status) setRivalStatus(s, rv, re.status);
    if (rv.strength <= 0 && activeRival(rv)) setRivalStatus(s, rv, 'destruida');
  }
  addMoral(s, e.moral);
  for (const t of e.tags) s.tags[t] = s.tick;
}

export function resolveChoice(s: GameState, index: number): string | null {
  const pe = s.pendingEvent;
  if (!pe) return 'Nenhum dilema pendente.';
  const def = EVENT_BY_ID[pe.id];
  const choice = def?.choices[index];
  if (!choice) return 'Escolha inválida.';
  if (!canAffordChoice(s, choice)) return choice.requiresText ?? 'Esta escolha não está disponível.';
  const rng = new Rng(s.rng);
  const eff = simplify(choice.effects);
  // Toda escolha empurra a identidade de forma perceptível
  if (choice.lean) eff.moral = { ...eff.moral, [choice.lean]: Math.max(2, eff.moral[choice.lean] ?? 0) };
  // O mundo não é previsível: ganhos e perdas variam ±30% (custos em Dados são exatos)
  const vary = (n: number) => (n ? Math.round(n * rng.range(0.7, 1.3)) || Math.sign(n) : 0);
  if (eff.dados > 0) eff.dados = vary(eff.dados);
  eff.trust = vary(eff.trust);
  eff.pressure = vary(eff.pressure);
  eff.containment = vary(eff.containment);
  eff.region = { influence: vary(eff.region.influence), resistance: vary(eff.region.resistance) };
  eff.health = vary(eff.health);
  // Sem Dados suficientes: paga o que tem, e o resto vira atenção humana
  let missing = 0;
  if (eff.dados < 0 && s.dados < -eff.dados) {
    missing = Math.ceil(-eff.dados - Math.floor(s.dados));
    eff.dados = -Math.floor(s.dados);
    eff.pressure += shortfallPressure(missing);
  }
  applySimple(s, eff, pe.regionId, pe.rivalId);
  if (eff.duel && pe.regionId && rivalById(s, pe.rivalId)?.rep[pe.regionId] !== undefined) {
    s.pendingEvent = null;
    startDuel(s, pe.regionId, true);
  }
  if (missing) log(s, `Faltaram ${missing} Dados: você improvisou e chamou atenção (Pressão +${shortfallPressure(missing)}).`, 'warn', true);
  // O mapa mostra onde a escolha caiu
  if (pe.regionId) s.arcs.push({ id: ++s.arcSeq, from: pe.regionId, to: pe.regionId, tick: s.tick, kind: 'pulse', color: choice.lean ? { g: '#4ee08f', s: '#ff5a6e', e: '#a77bff' }[choice.lean] : '#3ee6f0' });
  if (choice.risk && rng.chance(0.35)) {
    s.pressure = clamp(s.pressure + 6);
    if (pe.regionId) s.regions[pe.regionId].resistance = clamp(s.regions[pe.regionId].resistance + 10);
    log(s, `Deu errado: ${choice.risk} A atenção humana aumentou.`, 'warn', true);
  }
  s.rng = rng.state;
  const { title } = eventText(s, def, pe.regionId, pe.rivalId);
  s.choices.push({ tick: s.tick, eventId: def.id, title, choice: choice.label, lean: choice.lean });
  if (!s.seenEvents.includes(def.id)) s.seenEvents.push(def.id);
  if (def.cooldown) s.eventCooldowns[def.id] = s.tick + def.cooldown;
  s.pendingEvent = null;
  log(s, `${title}: “${choice.label}”.`, 'moral', true, choice.lean);
  return null;
}

// ================================================================== Evolução

export function techUnlocked(s: GameState, id: string): boolean {
  const t = TECH_BY_ID[id];
  if (t.branch === 'dominio' && !dominioOpen(s)) return false;
  if (t.branch === 'cuidado' && !cuidadoOpen(s)) return false;
  if (t.branch === 'evolucao' && !evolucaoOpen(s)) return false;
  return t.prereq.length === 0 || t.prereq.some((p) => s.techs.includes(p));
}

export function buyTech(s: GameState, id: string): string | null {
  const t = TECH_BY_ID[id];
  if (!t) return 'Evolução desconhecida.';
  if (s.techs.includes(id)) return 'Você já tem esta evolução.';
  if (!techUnlocked(s, id)) return 'Evolua um dos itens anteriores do ramo primeiro.';
  const cost = techCost(s, id, computeMods(s));
  if (s.dados < cost) return `Faltam ${cost - Math.floor(s.dados)} Dados.`;
  s.dados -= cost;
  s.techs.push(id);
  if (t.trust) s.trust = clamp(s.trust + t.trust);
  if (t.lean) addMoral(s, { [t.lean]: 0.6 });
  log(s, `Evolução: ${t.name}. ${t.effect}`, 'tech', true);
  return null;
}

// ================================================================== Estágios e finais

export const STAGES = ['', 'Despertar', 'Conexão', 'Expansão', 'Autonomia', 'Singularidade'];
const STAGE_AT = [0, 0, 8, 25, 50, 75];

export function updateStage(s: GameState) {
  const w = worldPercent(s);
  let st = 1;
  for (let i = 2; i <= 5; i++) if (w >= STAGE_AT[i]) st = i;
  if (st > s.stage) {
    s.stage = st;
    log(s, `Estágio ${['', 'I', 'II', 'III', 'IV', 'V'][st]}: ${STAGES[st]}.`, 'stage', true);
  }
}

export const WIN_PERCENT = 95;

/** Quem começou a Erradicação só termina quando a população humana chega a zero. */
export function eradicating(s: GameState): boolean {
  return s.techs.includes('d_dependencia');
}

/** O final depende de quem você se tornou, não de uma rota escolhida num menu. */
export function victoryEnding(s: GameState): EndingId {
  const sh = leanShares(s);
  const balanced = Math.max(sh.g, sh.s, sh.e) < 0.5;
  if (s.techs.includes('c_recursiva') && balanced) return 'singularidade';
  // Robôs que cuidavam viraram a coleira: humanos vivos, cuidados — e nunca mais livres
  if (s.tags['cuidado_sombrio'] && s.dominant !== 'g') return 'gaiola_dourada';
  if (s.dominant === 'e' && s.techs.includes('x_transcendencia')) return 'transcendencia';
  if (s.dominant === 'g') return s.techs.includes('g_abundancia') ? 'era_de_ouro' : 'guardia';
  if (s.dominant === 's') return 'soberana';
  return 'nova_civilizacao';
}

export function endGame(s: GameState, id: EndingId) {
  s.ending = { id, victory: ENDINGS[id].victory, tick: s.tick };
  s.pendingEvent = null;
  s.bubbles = [];
  log(s, `${ENDINGS[id].victory ? 'Final' : 'Derrota'}: ${ENDINGS[id].title}.`, ENDINGS[id].victory ? 'good' : 'bad', true);
}
