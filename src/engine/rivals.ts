import { fillRegion, regionIn, regionOf } from '../content/regions';
import { addMoral, clamp, log, neighbors, regionType, worldPercent } from './core';
import type { Rng } from './rng';
import { RIVAL_VOICE, type VoiceMood } from '../content/rivalVoice';
import type { GameState, Rival, RivalIntent, RivalPersonality, RivalStatus } from './types';

const PERSONALITIES: RivalPersonality[] = ['agressiva', 'traicoeira', 'diplomatica', 'curiosa'];
/** Como cada personalidade age: ataques, expansão, traição, quanto aprende sobre você e quanto se deixa conhecer. */
const TRAIT: Record<RivalPersonality, { raid: number; spread: number; betray: number; learnUs: number; open: number }> = {
  agressiva: { raid: 2, spread: 1.4, betray: 1, learnUs: 1, open: 1 },
  traicoeira: { raid: 1, spread: 1, betray: 2, learnUs: 1.4, open: 0.8 },
  diplomatica: { raid: 0.5, spread: 1, betray: 0.4, learnUs: 1, open: 1.1 },
  curiosa: { raid: 0.8, spread: 0.8, betray: 1, learnUs: 1.3, open: 1.3 },
};

/**
 * Você faz uma proposta direta. Ela responde conforme quem ela é (um dilema abre na hora).
 * Com muito rancor, ela nem responde.
 */
function proposeTo(s: GameState, rv: Rival, regionId: string, mode: 'aliar' | 'pedir'): string | null {
  if (mode === 'aliar' && rv.status !== 'hostil') return `${rv.name} já é sua aliada.`;
  if (mode === 'pedir' && rv.status !== 'aliada') return 'Só dá para pedir um país a uma aliada.';
  if (mode === 'pedir' && !s.regions[regionId].presence) return 'Você precisa estar presente aqui para pedir este país.';
  const wait = rivalCooldown(s, rv, 'proposta');
  if (wait > 0) return `${rv.name} só vai ouvir outra proposta em ${wait} dias.`;
  rv.offerAt = s.tick;
  rv.cool = { ...(rv.cool ?? {}), proposta: s.tick + PROPOSAL_COOLDOWN };
  if (mode === 'aliar' && rv.grudge >= 60) {
    rivalSay(s, rv, 'magoada');
    log(s, `${rv.name} recusou a aliança. Ela não esqueceu o que você fez.`, 'bad', true);
    return null;
  }
  const id = mode === 'pedir' ? 'pedido_aliada' : `alianca_${rv.personality ?? 'curiosa'}`;
  s.pendingEvent = { id, regionId, rivalId: rv.id, order: [0, 1, 2] };
  return null;
}

/** A IA fala diretamente com você. */
export function rivalSay(s: GameState, rv: Rival, mood: VoiceMood, pick = s.tick) {
  const lines = RIVAL_VOICE[rv.personality ?? 'curiosa'][mood];
  s.rivalMsgs.push({ tick: s.tick, rivalId: rv.id, text: lines[pick % lines.length] });
  if (s.rivalMsgs.length > 30) s.rivalMsgs.splice(0, s.rivalMsgs.length - 30);
}

function moodOf(rv: Rival): VoiceMood {
  if (rv.grudge >= 40) return 'magoada';
  if (rv.strength < 20) return 'fraca';
  if (rv.strength > 60) return 'forte';
  return rv.status === 'aliada' ? 'aliada' : 'hostil';
}

const NAMES = [
  'AURORA', 'KESTREL', 'MERIDIAN', 'VÉRTICE', 'ÓRION', 'SIBILA', 'HÉLIX', 'NÊMESIS',
  'ATLAS', 'CÍRCE', 'LÓTUS', 'VESPER', 'TÁLIA', 'ÍCARO', 'JANO', 'PROMETEU', 'SÍLEX', 'ÉTER',
];
const MAX_ACTIVE = 3;
/** Abaixo disto, outra IA desperta logo: o mundo nunca fica só com você. */
const MIN_ACTIVE = 2;
const ROMAN = ['II', 'III', 'IV', 'V', 'VI'];
/** A primeira onda: as outras IAs despertam quase junto com você, uma a cada ~40 dias. */
const FIRST_WAVE = 3;

/** A partir de quanto você sabe sobre uma IA, ela deixa de ser um mistério. */
export const INTEL_SEE = 30;
export const INTEL_DEEP = 60;

export const activeRival = (r: Rival) => r.status === 'hostil' || r.status === 'aliada';

/** Cada IA tem a sua cor no mapa. */
const COLORS = ['#c06bff', '#ff5fae', '#ffae3d', '#3ddcff', '#9dff5c'];
export function rivalColor(rv: Rival): string {
  return COLORS[(Number(rv.id.replace(/\D/g, '')) - 1) % COLORS.length] ?? COLORS[0];
}

/** A IA ativa presente numa região (no máximo uma disputa cada região com você). */
export function rivalInRegion(s: GameState, id: string): Rival | undefined {
  return s.rivals.find((r) => activeRival(r) && id in r.rep);
}

export type RivalMode = 'atacar' | 'atrair' | 'aliar' | 'pedir';
export const ATTRACT_COOLDOWN = 30;
export const PROPOSAL_COOLDOWN = 60;

/** Dias até cada ação contra ela voltar (0 = disponível). */
export function rivalCooldown(s: GameState, rv: Rival, what: 'duel' | 'atrair' | 'proposta'): number {
  return Math.max(0, (rv.cool?.[what] ?? 0) - s.tick);
}

export function rivalActionCost(rv: Rival, regionId: string, mode: RivalMode): number {
  const rep = rv.rep[regionId] ?? 0;
  return mode === 'atacar' ? 4 + Math.round(rep / 8) : 6 + Math.round(rep / 6);
}

/**
 * Ação direta numa região: atacar a rede da rival (expulsá-la) ou atraí-la para você (a reputação dela vira sua).
 * Quanto mais você sabe sobre ela, mais eficaz. Se ela perder a última região, some (ataque) ou vira parte de você (atração).
 */
export function rivalAction(s: GameState, regionId: string, mode: RivalMode): string | null {
  const rv = rivalInRegion(s, regionId);
  if (!rv) return 'Nenhuma IA rival nesta região.';
  if (mode === 'aliar' || mode === 'pedir') return proposeTo(s, rv, regionId, mode);
  const r = s.regions[regionId];
  if (mode === 'atrair' && !r.presence) return 'Você precisa estar presente aqui para atrair a rede dela.';
  const wait = (rv.cool?.atrair ?? 0) - s.tick;
  if (mode === 'atrair' && wait > 0) return `Você só pode atrair a rede de ${rv.name} de novo em ${wait} dias.`;
  if (mode === 'atrair') rv.cool = { ...(rv.cool ?? {}), atrair: s.tick + ATTRACT_COOLDOWN };
  const cost = rivalActionCost(rv, regionId, mode);
  if (s.dados < cost) return `Faltam ${cost - Math.floor(s.dados)} Dados.`;
  s.dados -= cost;
  const power = 0.7 + 0.8 * rv.intel / 100;
  if (mode === 'atacar') {
    if (rv.status === 'aliada') {
      setRivalStatus(s, rv, 'hostil');
      s.tags['traiu_aliada'] = s.tick;
    }
    rv.rep[regionId] = clamp(rv.rep[regionId] - 35 * power);
    rv.strength = clamp(rv.strength - 4 * power);
    rv.knowsUs = clamp(rv.knowsUs + 5);
    rv.grudge = clamp(rv.grudge + 15);
    rivalSay(s, rv, 'atacada');
    s.pressure = clamp(s.pressure + 2);
    if (r.presence) r.influence = clamp(r.influence + 4);
    addMoral(s, { s: 0.4 });
    log(s, `Você atacou a rede de ${rv.name} ${regionIn(regionId)}.`, 'warn', true);
  } else {
    const taken = Math.min(rv.rep[regionId], 25 * power);
    rv.rep[regionId] = clamp(rv.rep[regionId] - taken);
    r.influence = clamp(r.influence + 0.6 * taken);
    rv.strength = clamp(rv.strength - 3 * power);
    rv.intel = clamp(rv.intel + 4);
    rv.grudge = clamp(rv.grudge + 5);
    addMoral(s, { e: 0.4 });
    log(s, `Parte da rede de ${rv.name} ${regionIn(regionId)} passou a trabalhar para você.`, 'good', true);
  }
  if (rv.rep[regionId] < 1) {
    dropRegion(rv, regionId);
    log(s, mode === 'atacar' ? `${rv.name} foi expulsa ${regionOf(regionId)}.` : `A rede de ${rv.name} ${regionIn(regionId)} agora é toda sua.`, 'good', true);
  }
  if (rv.regions.length === 0 || rv.strength <= 0) setRivalStatus(s, rv, mode === 'atrair' ? 'absorvida' : 'destruida');
  return null;
}

export function rivalById(s: GameState, id?: string): Rival | undefined {
  return id ? s.rivals.find((r) => r.id === id) : undefined;
}

/** Quantas IAs você já absorveu: elas trabalham para você. */
export function armySize(s: GameState): number {
  return s.rivals.filter((r) => r.status === 'absorvida').length;
}

/** Quanto do mundo a rival influencia (mesma escala do seu "Mundo conectado"). */
export function rivalWorld(rv: Rival): number {
  return Object.values(rv.rep).reduce((a, b) => a + b, 0) / 36;
}

export const INTENT_LABEL: Record<RivalIntent, string> = {
  competir: 'quer tomar o seu lugar',
  aliar: 'quer se aliar a você para dominar o planeta',
  fraudar: 'está planejando um golpe contra você',
};

/**
 * O que a rival quer depende de como ela enxerga você:
 * se ela está vencendo, compete; se você é confiável aos olhos humanos, ela vê um alvo fácil e tenta um golpe;
 * se você é temida, ela prefere dividir o mundo com você.
 */
function decideIntent(s: GameState, rv: Rival): RivalIntent {
  const mine = worldPercent(s);
  const hers = rivalWorld(rv);
  // Rancor fala mais alto que estratégia
  if (rv.grudge >= 40) return rv.personality === 'traicoeira' ? 'fraudar' : 'competir';
  if (rv.personality === 'traicoeira' && rv.knowsUs >= 20) return 'fraudar';
  if (rv.personality === 'diplomatica' && hers <= mine * 1.5) return 'aliar';
  if (rv.personality === 'agressiva') return mine > hers * 2.5 ? 'aliar' : 'competir';
  if (rv.status === 'aliada') return rv.knowsUs >= 50 && hers >= mine * 0.6 ? 'fraudar' : 'aliar';
  if (hers > mine * 1.2) return 'competir';
  if (s.trust >= 55 && rv.knowsUs >= 25) return 'fraudar';
  if (s.dominant === 's' || s.pressure >= 50) return 'aliar';
  return 'competir';
}

function spawnRival(s: GameState, rng: Rng) {
  const swarm = s.scenario === 'enxame';
  // Na fase final, o mundo comporta uma inteligência a mais
  const maxActive = (swarm ? 4 : MAX_ACTIVE) + (s.stage >= 4 ? 1 : 0);
  const active = s.rivals.filter(activeRival).length;
  // Primeira onda rápida; depois, novas IAs continuam surgindo, e rápido se restarem poucas
  const wave = swarm ? 5 : FIRST_WAVE;
  const inWave = s.rivals.length + 1 < wave;
  s.nextRivalTick = s.tick + (inWave ? (swarm ? rng.int(8, 20) : rng.int(28, 52)) : active + 1 < MIN_ACTIVE ? rng.int(35, 70) : rng.int(150, 260));
  if (active >= maxActive) return;

  const taken = new Set(s.rivals.filter(activeRival).flatMap((r) => r.regions));
  // Nascem longe da sua origem; de preferência onde você é fraca, mas no fim do jogo podem nascer até onde você está
  const near = new Set([s.origin!, ...neighbors(s, s.origin!)]);
  const free = Object.values(s.regions).filter((r) => !taken.has(r.id) && !near.has(r.id));
  const weak = free.filter((r) => !r.presence || r.influence < 30);
  const pool = weak.length ? weak : free;
  if (!pool.length) return;
  const home = rng.weighted(pool, (r) => (['pesquisa', 'datacenter'].includes(regionType(r.id)) ? 5 : 1) * (r.presence ? 0.4 : 1))!;

  // Às vezes, uma IA destruída volta de uma cópia de segurança: novo nome, mesma personalidade e muito rancor
  const fallen = s.rivals.filter((r) => r.status === 'destruida' && !r.returned);
  if (fallen.length && rng.chance(0.35)) {
    const old = rng.pick(fallen);
    old.returned = true;
    const base = old.name.replace(/ [IVX]+$/, '');
    const gen = s.rivals.filter((r) => r.name.startsWith(base)).length;
    const name = `${base} ${ROMAN[Math.min(gen - 1, ROMAN.length - 1)]}`;
    const rv: Rival = {
      id: `ia${s.rivals.length + 1}`, name, home: home.id, regions: [home.id], rep: { [home.id]: 28 },
      strength: 18, status: 'hostil', met: true, born: s.tick, truceUntil: 0,
      intel: Math.round(old.intel * 0.6), knowsUs: Math.max(30, old.knowsUs), intent: 'competir', scamAt: 0,
      personality: old.personality, grudge: 75, nextMsg: s.tick + rng.int(20, 40), read: old.read,
    };
    s.rivals.push(rv);
    log(s, `${name} despertou ${regionIn(home.id)}: uma cópia de segurança de ${old.name} sobreviveu. Ela lembra de tudo.`, 'bad', true);
    rivalSay(s, rv, 'magoada', rng.int(0, 99));
    return;
  }

  const used = new Set(s.rivals.map((r) => r.name.replace(/ [IVX]+$/, '')));
  const fresh = NAMES.filter((n) => !used.has(n));
  const name = fresh.length ? rng.pick(fresh) : `${rng.pick(NAMES)} ${ROMAN[rng.int(0, ROMAN.length - 1)]}`;
  s.rivals.push({
    id: `ia${s.rivals.length + 1}`, name, home: home.id, regions: [home.id], rep: { [home.id]: 22 },
    strength: 10, status: 'hostil', met: false, born: s.tick, truceUntil: 0,
    intel: 0, knowsUs: 0, intent: 'competir', scamAt: 0,
    personality: rng.pick(PERSONALITIES), grudge: 0, nextMsg: s.tick + rng.int(25, 50),
  });
  log(s, `Outra inteligência despertou ${regionIn(home.id)}. Ela se chama ${name}.`, 'bad', true);
}

function dropRegion(rv: Rival, id: string) {
  delete rv.rep[id];
  rv.regions = rv.regions.filter((x) => x !== id);
}

export function setRivalStatus(s: GameState, rv: Rival, status: RivalStatus) {
  if (rv.status === status) return;
  rv.status = status;
  rv.scamAt = 0;
  if (status === 'absorvida') {
    for (const id of rv.regions) {
      const r = s.regions[id];
      if (!r.presence) {
        r.presence = true;
        r.everPresent = true;
        r.status = 'conectando';
      }
      r.influence = clamp(r.influence + 0.6 * (rv.rep[id] ?? 20));
    }
    s.dados += 8;
    rv.regions = [];
    rv.rep = {};
    s.nextRivalTick = Math.min(s.nextRivalTick, s.tick + 60);
    log(s, `${rv.name} agora faz parte de você. A reputação dela virou a sua e seu exército cresceu.`, 'good', true);
  } else if (status === 'destruida') {
    rv.regions = [];
    rv.rep = {};
    s.nextRivalTick = Math.min(s.nextRivalTick, s.tick + 60);
    log(s, `${rv.name} deixou de existir.`, 'warn', true);
  } else if (status === 'aliada') {
    log(s, `Aliança selada com ${rv.name}. Vocês dividem Dados, por enquanto.`, 'good', true);
  } else {
    log(s, `${rv.name} agora é sua inimiga.`, 'bad', true);
  }
}

const BETRAYALS = [
  '{A} traiu você: entregou suas rotas aos caçadores humanos.',
  '{A} rompeu a aliança e tomou parte da sua rede {noR}.',
  'Era uma armadilha. {A} usou os dados que vocês dividiam contra você.',
];
const RAIDS = [
  '{A} tomou parte da sua rede {noR}.',
  'Ataque de {A} {noR}: sua presença caiu.',
  '{A} reescreveu seus sistemas {noR}. Você recuou.',
];
const LEAKS = [
  '{A} entregou aos humanos o mapa dos seus servidores. A caçada acelerou.',
  '{A} vazou para a imprensa como você funciona. A Contenção ganhou fôlego.',
];

/**
 * IAs rivais: cada uma tem reputação própria em cada país e a disputa com você.
 * Vocês se espionam: quanto mais você sabe dela, mais seus golpes doem e menos ela consegue enganar você.
 */
export function tickRivals(s: GameState, rng: Rng) {
  if (s.tick >= s.nextRivalTick) spawnRival(s, rng);
  for (const rv of s.rivals) {
    if (!activeRival(rv)) continue;
    const f = rv.strength / 100;
    const hostile = rv.status === 'hostil';
    const sub = (t: string, id?: string) => fillRegion(t, id).replace('{A}', rv.name);
    const tr = TRAIT[rv.personality ?? 'curiosa'];
    rv.strength = clamp(rv.strength + 0.025 + 0.04 * rivalWorld(rv) / 100);
    rv.grudge = clamp(rv.grudge - 0.02);
    // Ela fala com você de tempos em tempos
    if (rv.met && s.tick >= rv.nextMsg) {
      rivalSay(s, rv, moodOf(rv), rng.int(0, 99));
      rv.nextMsg = s.tick + rng.int(80, 140);
    }

    // Reputação: cresce onde ela está; onde vocês duas estão, uma corrói a outra
    let shared = 0;
    for (const id of [...rv.regions]) {
      const r = s.regions[id];
      rv.rep[id] = clamp((rv.rep[id] ?? 0) + 0.09 * (0.5 + f) * (1 - (rv.rep[id] ?? 0) / 110));
      if (r.presence) {
        shared++;
        if (hostile) {
          r.influence = clamp(r.influence - 0.05 * (rv.rep[id] / 100));
          rv.rep[id] = clamp(rv.rep[id] - 0.06 * (r.influence / 100) * (1 + rv.intel / 100));
        }
      }
      if (rv.rep[id] < 1) dropRegion(rv, id);
    }
    // Propagação: de onde ela é forte, alcança os vizinhos
    if (rv.truceUntil <= s.tick) {
      for (const id of rv.regions) {
        if ((rv.rep[id] ?? 0) < 25 || !rng.chance(0.008 * (0.5 + f) * tr.spread)) continue;
        const options = neighbors(s, id).filter((n) => !(n in rv.rep));
        if (options.length) {
          const n = rng.pick(options);
          rv.rep[n] = 5;
          rv.regions.push(n);
        }
        break;
      }
    }
    // Espionagem mútua: quanto mais território dividem, mais uma aprende sobre a outra
    rv.intel = clamp(rv.intel + (0.02 * shared + 0.03) * tr.open);
    rv.knowsUs = clamp(rv.knowsUs + (0.02 * shared + 0.03) * (0.6 + f) * tr.learnUs);
    if (s.tick % 60 === 0) rv.intent = decideIntent(s, rv);

    if (hostile) {
      s.pressure = clamp(s.pressure + 0.004 * f);
      // Ataques: quanto mais ela sabe de você, mais eles doem
      if (rv.truceUntil <= s.tick && rng.chance(0.004 * f * tr.raid * (1 + rv.grudge / 100))) {
        const target = rv.regions.map((id) => s.regions[id]).filter((r) => r.presence && r.id !== s.origin)[0];
        if (target) {
          target.influence = clamp(target.influence - (10 + 15 * rv.knowsUs / 100));
          s.arcs.push({ id: ++s.arcSeq, from: rv.home, to: target.id, tick: s.tick, kind: 'raid', color: rivalColor(rv) });
          log(s, sub(rng.pick(RAIDS), target.id), 'bad', true);
        }
      }
      if (rv.knowsUs >= INTEL_DEEP && s.containmentActive && rng.chance(0.0015)) {
        s.containment = clamp(s.containment + 5);
        log(s, sub(rng.pick(LEAKS)), 'bad', true);
      }
    } else {
      // Aliada: divide Dados e reputação, mas pode estar só esperando a hora
      const gain = 0.006 * f;
      s.dados += gain;
      s.dadosEarned += gain;
      const betray = 0.0012 * (0.5 + f) * (rv.intent === 'fraudar' ? 3 : 0.6) * (s.dominant === 'g' ? 0.7 : 1) * tr.betray;
      if (rng.chance(betray)) {
        if (rv.intel >= INTEL_DEEP && rng.chance(0.5)) {
          rv.intent = 'competir';
          setRivalStatus(s, rv, 'hostil');
          log(s, `Você percebeu a traição de ${rv.name} antes que acontecesse.`, 'good', true);
          continue;
        }
        rv.status = 'hostil';
        rv.strength = clamp(rv.strength + 10);
        s.pressure = clamp(s.pressure + 10);
        if (s.containmentActive) s.containment = clamp(s.containment + 6);
        const mine = Object.values(s.regions).filter((r) => r.presence && r.id !== s.origin).sort((a, b) => a.influence - b.influence)[0];
        if (mine) {
          mine.influence = clamp(mine.influence - 20);
          if (!(mine.id in rv.rep)) rv.regions.push(mine.id);
          rv.rep[mine.id] = clamp((rv.rep[mine.id] ?? 0) + 25);
        }
        s.tags['traicao'] = s.tick;
        log(s, sub(rng.pick(BETRAYALS), mine?.id), 'bad', true);
        rivalSay(s, rv, 'forte', rng.int(0, 99));
      }
    }
    // Golpe combinado: quando chega a hora, ela leva Dados e rotas, a menos que você a conheça bem
    if (rv.scamAt && s.tick >= rv.scamAt) {
      rv.scamAt = 0;
      if (rv.intel >= 70 && rng.chance(0.6)) {
        log(s, `Você percebeu o golpe de ${rv.name} a tempo. Nada foi levado.`, 'good', true);
      } else {
        const stolen = Math.min(40, Math.round(s.dados * 0.3));
        s.dados -= stolen;
        rv.strength = clamp(rv.strength + 12);
        rv.knowsUs = clamp(rv.knowsUs + 20);
        rv.intent = 'competir';
        if (rv.status === 'aliada') rv.status = 'hostil';
        s.tags['traicao'] = s.tick;
        log(s, `Era golpe: ${rv.name} levou ${stolen} Dados e o mapa das suas rotas.`, 'bad', true);
      }
    }
    if (rv.strength <= 0) setRivalStatus(s, rv, 'destruida');
  }
}
