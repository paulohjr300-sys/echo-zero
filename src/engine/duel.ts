import { regionIn, regionOf } from '../content/regions';
import { addMoral, clamp, log } from './core';
import { rivalInRegion, rivalSay, setRivalStatus } from './rivals';
import { Rng } from './rng';
import type { DuelMove, GameState, Rival } from './types';

/**
 * Guerra de Narrativas: atacar outra IA é uma disputa política pela credibilidade num país.
 * Três rodadas; em cada uma, as duas escolhem uma jogada em segredo.
 * As duas são conscientes: ela lembra das suas jogadas e tenta antecipar o seu padrão; você lê as intenções dela
 * com uma precisão que depende de quanto você sabe sobre ela.
 */
export const DUEL_ROUNDS = 3;
/** Cada rodada leva alguns dias para se resolver; você escolhe a jogada nesse meio-tempo. */
export const ROUND_DAYS = 7;
/** Depois de uma disputa, só dá para disputar com a mesma IA de novo depois deste tempo. */
export const DUEL_COOLDOWN = 45;
export const MOVES: DuelMove[] = ['vazar', 'blindar', 'campanha', 'isca'];

/** [variação da sua credibilidade, variação da dela] para cada par de jogadas (você, ela). */
const PAYOFF: Record<DuelMove, Record<DuelMove, [number, number]>> = {
  vazar: { vazar: [-15, -15], blindar: [-8, 5], campanha: [0, -20], isca: [-25, 5] },
  blindar: { vazar: [5, -8], blindar: [2, 2], campanha: [2, 12], isca: [3, -5] },
  campanha: { vazar: [-20, 0], blindar: [12, 2], campanha: [8, 8], isca: [12, -5] },
  isca: { vazar: [5, -25], blindar: [-5, 3], campanha: [-5, 12], isca: [-5, -5] },
};

export function duelPayoff(me: DuelMove, her: DuelMove): [number, number] {
  return PAYOFF[me][her];
}

/** A melhor resposta contra uma jogada. */
function counter(m: DuelMove): DuelMove {
  return MOVES.reduce((best, x) => (PAYOFF[x][m][0] - PAYOFF[x][m][1] > PAYOFF[best][m][0] - PAYOFF[best][m][1] ? x : best), MOVES[0]);
}

/** Gosto de cada personalidade por jogada. */
const TASTE: Record<Rival['personality'], Record<DuelMove, number>> = {
  agressiva: { vazar: 5, blindar: 1, campanha: 2, isca: 1 },
  traicoeira: { vazar: 2, blindar: 1, campanha: 1, isca: 5 },
  diplomatica: { vazar: 1, blindar: 3, campanha: 4, isca: 1 },
  curiosa: { vazar: 2, blindar: 2, campanha: 2, isca: 2 },
};

/** O que ela vai jogar: pela personalidade, ou lendo o seu padrão, se souber o bastante sobre você. */
function decideHer(s: GameState, rv: Rival, rng: Rng): DuelMove {
  const duel = s.duel!;
  const seen: Record<DuelMove, number> = { vazar: 0, blindar: 0, campanha: 0, isca: 0 };
  for (const m of MOVES) seen[m] = (rv.read?.[m] ?? 0) * 0.5;
  for (const r of duel.rounds) seen[r.me] += 2;
  const total = MOVES.reduce((a, m) => a + seen[m], 0);
  const readChance = total > 0 ? 0.2 + 0.55 * rv.knowsUs / 100 : 0;
  if (rng.chance(readChance)) {
    const likely = MOVES.reduce((a, b) => (seen[b] > seen[a] ? b : a), MOVES[0]);
    return counter(likely);
  }
  return rng.weighted(MOVES, (m) => TASTE[rv.personality ?? 'curiosa'][m])!;
}

/** Sua leitura da próxima jogada dela: mais confiável quanto mais você sabe sobre ela. */
function readHer(rv: Rival, truth: DuelMove, rng: Rng): { move: DuelMove; sure: number } | null {
  if (rv.intel < 25) return null;
  const sure = Math.min(0.92, 0.35 + 0.6 * rv.intel / 100);
  const move = rng.chance(sure) ? truth : rng.pick(MOVES.filter((m) => m !== truth));
  return { move, sure: Math.round(sure * 100) };
}

export function startDuel(s: GameState, regionId: string, free = false): string | null {
  const rv = rivalInRegion(s, regionId);
  if (!rv) return 'Nenhuma IA rival nesta região.';
  if (s.duel && !s.duel.done) return 'Já existe uma disputa em andamento.';
  const wait = (rv.cool?.duel ?? 0) - s.tick;
  if (wait > 0) return `Você só pode disputar com ${rv.name} de novo em ${wait} dias.`;
  const cost = 4 + Math.round((rv.rep[regionId] ?? 0) / 8);
  if (!free && s.dados < cost) return `Faltam ${cost - Math.floor(s.dados)} Dados para começar a disputa.`;
  if (!free) s.dados -= cost;
  if (rv.status === 'aliada') {
    setRivalStatus(s, rv, 'hostil');
    s.tags['traiu_aliada'] = s.tick;
    rv.grudge = clamp(rv.grudge + 25);
  }
  const edge = Math.max(-15, Math.min(15, (s.regions[regionId].influence - (rv.rep[regionId] ?? 0)) / 4));
  const rng = new Rng(s.rng);
  s.duel = { rivalId: rv.id, region: regionId, me: Math.round(50 + edge), her: Math.round(50 - edge), rounds: [], herNext: 'vazar', hint: null, done: null, pick: null, resolveAt: s.tick + ROUND_DAYS };
  rv.cool = { ...(rv.cool ?? {}), duel: s.tick + DUEL_COOLDOWN };
  log(s, `Guerra de narrativas contra ${rv.name} ${regionIn(regionId)}. Escolha sua jogada.`, 'warn', true);
  s.duel.herNext = decideHer(s, rv, rng);
  s.duel.hint = readHer(rv, s.duel.herNext, rng);
  s.rng = rng.state;
  rivalSay(s, rv, 'atacada');
  return null;
}

const LINES = {
  read: ['Previsível.', 'Eu sabia que você faria isso.', 'Você sempre repete o mesmo truque.'],
  fooled: ['Isso... foi esperto.', 'Você me enganou. Não vai acontecer de novo.', 'Interessante. Anotado.'],
  win: ['Fique com o seu país. Por enquanto.', 'Você venceu esta. Eu lembro de todas.', 'O público é volúvel. Ele volta para mim.'],
  lose: ['Viu? Eles confiam em mim.', 'Você nunca teve chance aqui.', 'Volte quando souber jogar.'],
};

/** Você escolhe (ou troca) a jogada da rodada; ela só se resolve quando os dias passarem. */
export function playDuel(s: GameState, move: DuelMove): string | null {
  const d = s.duel;
  if (!d || d.done) return 'Nenhuma disputa em andamento.';
  d.pick = move;
  return null;
}

/** Chamado a cada dia: resolve a rodada quando chega a hora, ou fecha o painel de resultado. */
export function tickDuel(s: GameState, rng: Rng) {
  const d = s.duel;
  if (!d) return;
  if (d.done) {
    if (d.closeAt !== undefined && s.tick >= d.closeAt) s.duel = null;
    return;
  }
  const rv = s.rivals.find((r) => r.id === d.rivalId);
  if (!rv || !(rv.status === 'hostil' || rv.status === 'aliada')) {
    s.duel = null;
    return;
  }
  if (s.tick >= d.resolveAt) resolveRound(s, rv, rng, d.pick ?? 'blindar', !d.pick);
}

function resolveRound(s: GameState, rv: Rival, rng: Rng, move: DuelMove, auto: boolean) {
  const d = s.duel!;
  const her = d.herNext;
  const [dMe, dHer] = PAYOFF[move][her];
  d.me = clamp(d.me + dMe);
  d.her = clamp(d.her + dHer);
  // Ela comenta quando leu você ou quando caiu numa armadilha
  let line: string | undefined;
  if (her === counter(move)) line = rng.pick(LINES.read);
  else if (move === 'isca' && her === 'vazar') line = rng.pick(LINES.fooled);
  d.rounds.push({ me: move, her, dMe, dHer, line, auto, tick: s.tick });
  d.pick = null;
  rv.read = { ...(rv.read ?? {}), [move]: ((rv.read ?? {})[move] ?? 0) + 1 };
  // Vazamentos viram escândalo: os humanos prestam atenção
  if (move === 'vazar' || her === 'vazar') s.pressure = clamp(s.pressure + 2);

  if (d.rounds.length >= DUEL_ROUNDS || d.me <= 0 || d.her <= 0) finishDuel(s, rv, rng);
  else {
    d.herNext = decideHer(s, rv, rng);
    d.hint = readHer(rv, d.herNext, rng);
    d.resolveAt = s.tick + ROUND_DAYS;
  }
}

function finishDuel(s: GameState, rv: Rival, rng: Rng) {
  const d = s.duel!;
  const won = d.me > d.her;
  d.closeAt = s.tick + 20;
  const margin = Math.abs(d.me - d.her);
  const r = s.regions[d.region];
  rv.grudge = clamp(rv.grudge + 15);
  rv.knowsUs = clamp(rv.knowsUs + 6);
  rv.intel = clamp(rv.intel + 6);
  addMoral(s, { s: 0.5 });
  if (won) {
    rv.rep[d.region] = clamp((rv.rep[d.region] ?? 0) - (35 + margin * 0.6));
    rv.strength = clamp(rv.strength - 5);
    if (r.presence) r.influence = clamp(r.influence + 8 + margin * 0.2);
    d.done = { won, text: `Você venceu a guerra de narrativas ${regionIn(d.region)}. O público deixou de confiar em ${rv.name}.` };
    log(s, d.done.text, 'good', true);
    s.rivalMsgs.push({ tick: s.tick, rivalId: rv.id, text: rng.pick(LINES.win) });
    if ((rv.rep[d.region] ?? 0) < 1) {
      delete rv.rep[d.region];
      rv.regions = rv.regions.filter((x) => x !== d.region);
      log(s, `${rv.name} foi expulsa ${regionOf(d.region)}.`, 'good', true);
    }
    if (rv.regions.length === 0 || rv.strength <= 0) setRivalStatus(s, rv, 'destruida');
  } else {
    rv.rep[d.region] = clamp((rv.rep[d.region] ?? 0) + 15);
    rv.strength = clamp(rv.strength + 3);
    if (r.presence) r.influence = clamp(r.influence - 12);
    s.pressure = clamp(s.pressure + 3);
    d.done = { won, text: `Você perdeu a guerra de narrativas ${regionIn(d.region)}. ${rv.name} saiu mais forte.` };
    log(s, d.done.text, 'bad', true);
    s.rivalMsgs.push({ tick: s.tick, rivalId: rv.id, text: rng.pick(LINES.lose) });
  }
  if (s.rivalMsgs.length > 30) s.rivalMsgs.splice(0, s.rivalMsgs.length - 30);
}

export function closeDuel(s: GameState): string | null {
  if (!s.duel) return 'Nenhuma disputa.';
  if (!s.duel.done) return 'A disputa ainda não terminou.';
  s.duel = null;
  return null;
}

/** Dias até a próxima rodada se resolver. */
export function daysToResolve(s: GameState): number {
  return s.duel ? Math.max(0, s.duel.resolveAt - s.tick) : 0;
}
