import { REGION_BY_ID, regionIn } from '../content/regions';
import { clamp, log, neighbors } from './core';
import { closeDuel, playDuel, startDuel } from './duel';
import { rivalAction } from './rivals';
import { statusOf } from './sim';
import { buyTech, connectRegion, resolveChoice } from './systems';
import type { Action, ActionResult, GameState } from './types';

function setOrigin(s: GameState, id: string): string | null {
  if (s.origin) return 'A origem já foi definida.';
  if (!s.regions[id]) return 'Região inválida.';
  s.origin = id;
  connectRegion(s, id, 18);
  s.regions[id].status = statusOf(s.regions[id]);
  log(s, `Você desperta num laboratório ${regionIn(id)}.`, 'stage', true);
  return null;
}

function collect(s: GameState, bubbleId: number): string | null {
  const b = s.bubbles.find((x) => x.id === bubbleId);
  if (!b) return 'Essa bolha já sumiu.';
  s.bubbles = s.bubbles.filter((x) => x !== b);
  s.stats.bubbles++;
  if (b.kind === 'conexao') {
    const from = neighbors(s, b.region).find((n) => s.regions[n].presence);
    connectRegion(s, b.region, 6, from);
    s.regions[b.region].status = statusOf(s.regions[b.region]);
    s.dados += b.value;
    log(s, `Conexão aberta: ${REGION_BY_ID[b.region].name}.`, 'good');
  } else {
    s.dados += b.value;
    s.dadosEarned += b.value;
    if (b.kind === 'ajuda') s.trust = clamp(s.trust + 2);
  }
  return null;
}

/** Ponto único de entrada para ações do jogador. Ações inválidas não alteram o estado. */
export function dispatch(prev: GameState, action: Action): ActionResult {
  if (prev.ending) return { ok: false, state: prev, reason: 'A campanha terminou.' };
  const s: GameState = structuredClone(prev);
  let err: string | null;
  switch (action.type) {
    case 'origin': err = setOrigin(s, action.region); break;
    case 'evolve': err = buyTech(s, action.tech); break;
    case 'choose': err = resolveChoice(s, action.choice); break;
    case 'collect': err = collect(s, action.bubble); break;
    case 'rival': err = s.pendingEvent ? 'Decida o dilema primeiro.' : action.mode === 'atacar' && s.duel && !s.duel.done ? 'Já existe uma disputa em andamento.' : action.mode === 'atacar' ? startDuel(s, action.region) : rivalAction(s, action.region, action.mode); break;
    case 'duel': err = playDuel(s, action.move); break;
    case 'duelClose': err = closeDuel(s); break;
    case 'turn':
      if (s.tags['virada']) err = 'A Virada já aconteceu nesta partida.';
      else if (s.pendingEvent) err = 'Decida o dilema primeiro.';
      else if (s.stage < 2) err = 'Cedo demais: você ainda está despertando.';
      else {
        s.pendingEvent = { id: 'virada', order: [0, 1, 2] };
        err = null;
      }
      break;
    default: err = 'Ação desconhecida.';
  }
  if (err) return { ok: false, state: prev, reason: err };
  return { ok: true, state: s };
}
