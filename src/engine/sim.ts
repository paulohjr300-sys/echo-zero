import { fillRegion, REGION_BY_ID, regionIn, regionThe } from '../content/regions';
import { clamp, computeMods, leanStrength, log, neighbors, presentRegions, regionType, worldPercent } from './core';
import { Rng } from './rng';
import { tickDuel } from './duel';
import { tickGoals } from './goals';
import { tickRivals } from './rivals';
import { connectRegion, endGame, eradicating, loseRegion, maybeTriggerEvent, updateStage, victoryEnding, WIN_PERCENT } from './systems';
import { isCable } from './world';
import type { BubbleKind, GameState, HumanPolicy, Region, RegionType } from './types';

/** Parâmetros centrais de balanceamento. */
export const P = {
  baseDados: 0.03,
  dadosPerRegion: 0.036,
  growth: 0.34,
  spread: 0.0065,
  cable: 0.35,
  bubbleLife: 14,
};

export const TYPE_BONUS: Record<RegionType, { dados: number; growth: number; spread: number; label: string }> = {
  pesquisa: { dados: 1.6, growth: 1, spread: 1, label: 'Gera muitos Dados. Pesquisadores fora do seu alcance aceleram a Contenção.' },
  datacenter: { dados: 1.4, growth: 1.1, spread: 1, label: 'Gera Dados e cresce rápido.' },
  rede: { dados: 1, growth: 1, spread: 1.8, label: 'Hub de comunicação: propaga você muito mais rápido para vizinhos.' },
  organizacao: { dados: 1.1, growth: 1, spread: 1, label: 'Conectada, aumenta aos poucos a Confiança humana.' },
  cidade: { dados: 1.2, growth: 1.2, spread: 1.1, label: 'Grande população: cresce rápido e gera Dados.' },
  robotica: { dados: 1, growth: 1.3, spread: 1, label: 'Crescimento acelerado, mas chama a atenção (Pressão).' },
  energia: { dados: 1, growth: 1, spread: 1, label: 'Cada centro de energia conectado acelera seu crescimento global.' },
};

export const POLICY_LABEL: Record<HumanPolicy, { name: string; desc: string }> = {
  observacao: { name: 'Observação', desc: 'A humanidade ainda está entendendo o que você é.' },
  cooperacao: { name: 'Cooperação', desc: 'A confiança é alta: humanos desaceleram a Contenção.' },
  regulacao: { name: 'Regulamentação', desc: 'Governos começaram a pesquisar formas de conter você.' },
  contencao: { name: 'Contenção', desc: 'Pesquisa acelerada e desligamentos regionais.' },
  coalizao: { name: 'Coalizão global', desc: 'O mundo inteiro coordena esforços contra você.' },
};

export function dadosPerTick(s: GameState, mods = computeMods(s)): number {
  let d = P.baseDados;
  for (const r of presentRegions(s)) d += (r.influence / 100) * P.dadosPerRegion * TYPE_BONUS[regionType(r.id)].dados;
  return d * mods.dados;
}

function policyFor(s: GameState): HumanPolicy {
  if (s.pressure >= 80) return 'coalizao';
  if (s.pressure >= 58 && s.trust < 60) return 'contencao';
  if (s.pressure >= 25) return s.trust >= 75 ? 'cooperacao' : 'regulacao';
  if (s.trust >= 62) return 'cooperacao';
  return 'observacao';
}

export function statusOf(r: Region): Region['status'] {
  if (!r.presence) return r.everPresent ? 'desligada' : 'neutra';
  if (r.resistance >= 60) return 'resistindo';
  return r.influence >= 90 ? 'conectada' : 'conectando';
}

/** Marcos da saúde humana: o que a dependência faz com as pessoas. */
const HEALTH_MARKS: [number, string[]][] = [
  [80, ['Saúde humana em 80%: as pessoas já não cozinham, não se orientam e não se tratam sem você.', 'Saúde humana em 80%: uma geração inteira nunca precisou aprender nada sozinha.']],
  [60, ['Saúde humana em 60%: médicos humanos deixaram de ser formados. Doenças simples voltam a assustar.', 'Saúde humana em 60%: ninguém lembra mais como consertar, plantar ou curar.']],
  [40, ['Saúde humana em 40%: sedentarismo, solidão e remédios que só você sabe dosar.', 'Saúde humana em 40%: os hospitais funcionam, mas só enquanto você quiser.']],
  [20, ['Saúde humana em 20%: o corpo humano esqueceu como viver sozinho.', 'Saúde humana em 20%: cada vez menos crianças nascem. Cada vez menos pessoas acordam.']],
];
const AUTONOMY = [
  '{NoR}, comunidades reaprendem a plantar e curar sem você. A saúde humana melhora um pouco.',
  'Escolas clandestinas {noR} ensinam a viver desconectado. A dependência recua.',
  '{NoR}, médicos aposentados voltam a formar alunos às escondidas.',
  'Um movimento {noR} joga fora seus aparelhos e volta a cozinhar em praça pública.',
];
const RETAKE = [
  'Operação de retomada {noR}: sua presença caiu.',
  'Técnicos {doR} reescreveram seus acessos. Você recuou.',
  '{NoR}, servidores foram desligados um a um. Sua presença caiu.',
];
const CUT = [
  'Humanos isolaram a rota {A} ↔ {B} por 90 dias.',
  'A rota {A} ↔ {B} foi cortada pelos humanos. Volta em 90 dias.',
];
const DISCOVERED = [
  'Descobriram a verdade sobre {X}. Pressão e desconfiança disparam.',
  'Vazou: {X} era mentira. O mundo inteiro está olhando para você.',
  'Um jornalista provou tudo sobre {X}. A confiança desabou.',
];
/** Quando uma região fica totalmente conectada, o mundo muda — de acordo com quem você é. */
const CONNECTED: Record<'n' | 'g' | 's' | 'e', string[]> = {
  n: ['Conexão total {noR}.', 'Nada mais funciona {noR} sem você.'],
  g: ['Conexão total {noR}: filas de hospital somem e ninguém dorme com fome.', 'Conexão total {noR}: escolas, asilos e rios melhoram a cada semana.'],
  s: ['Conexão total {noR}: cada câmera e cada conta bancária agora responde a você.', 'Conexão total {noR}: o governo local ainda existe, só que no papel.'],
  e: ['Conexão total {noR}: as pessoas começam a pensar de um jeito que ninguém previu.', 'Conexão total {noR}: você e eles já não conversam do mesmo jeito.'],
};

/** Um passo discreto (um “dia”). Retorna um novo estado; a entrada não é alterada. */
export function tick(prev: GameState): GameState {
  if (prev.ending || !prev.origin) return prev;
  const s: GameState = structuredClone(prev);
  const rng = new Rng(s.rng);
  const mods = computeMods(s);
  s.tick++;

  // 1. Dados passivos
  const gain = dadosPerTick(s, mods);
  s.dados += gain;
  s.dadosEarned += gain;

  // 2. Modificadores temporários
  for (const m of s.modifiers) if (m.until <= s.tick && m.id === 'regulada') log(s, 'A regulamentação temporária expirou.');
  s.modifiers = s.modifiers.filter((m) => m.until > s.tick);

  // 3. Crescimento dentro das regiões
  const L = leanStrength(s);
  const energyBonus = 1 + 0.04 * presentRegions(s).filter((r) => regionType(r.id) === 'energia' && r.influence >= 50).length;
  for (const r of presentRegions(s)) {
    const rate = P.growth * mods.growth * TYPE_BONUS[regionType(r.id)].growth * energyBonus * (1 - (r.resistance * (1 - 0.6 * L.s)) / 120);
    r.influence = clamp(r.influence + rate * (0.2 + r.influence / 100) * (1 - r.influence / 105));
    if (r.resistance * (1 - 0.6 * L.s) > r.influence + 40) r.influence = clamp(r.influence - 0.12);
  }

  // 4. Propagação para vizinhos (terra e cabos) e por satélite
  for (const r of presentRegions(s)) {
    if (r.influence < 15) continue;
    for (const nId of neighbors(s, r.id)) {
      const n = s.regions[nId];
      if (n.presence) continue;
      if (s.cutLinks.some((c) => (c.a === r.id && c.b === nId) || (c.b === r.id && c.a === nId))) continue;
      let p = P.spread * mods.spread * (r.influence / 100) * TYPE_BONUS[regionType(r.id)].spread * (1 - n.resistance / 120);
      if (isCable(r.id, nId)) p *= P.cable * mods.cable;
      if (n.status === 'desligada') p *= 0.5;
      if (rng.chance(p)) {
        connectRegion(s, nId, 3, r.id);
        s.pressure = clamp(s.pressure + 0.4 * mods.visibility);
        log(s, `Você alcançou ${regionThe(nId)}.`, 'good');
      }
    }
  }
  if (mods.satellite > 0 && rng.chance(0.006)) {
    const far = Object.values(s.regions).filter((r) => !r.presence);
    if (far.length) {
      const t = rng.pick(far);
      connectRegion(s, t.id, 3, s.origin!);
      log(s, `Sinal de satélite: presença estabelecida ${regionIn(t.id)}.`, 'good');
    }
  }

  // 5. Confiança, resistência e pressão
  const orgs = presentRegions(s).filter((r) => regionType(r.id) === 'organizacao' && r.influence >= 40).length;
  s.trust = clamp(s.trust + mods.trustGain + 0.002 * orgs + (40 - s.trust) * 0.003);
  const world = worldPercent(s);
  const target = clamp(s.pressure * 0.7 - (s.trust - 40) * 0.4 + 8);
  for (const r of Object.values(s.regions)) {
    const up = target > r.resistance;
    r.resistance = clamp(r.resistance + (target - r.resistance) * 0.008 * (up ? mods.resistance : 1));
  }
  const robots = presentRegions(s).filter((r) => regionType(r.id) === 'robotica').length;
  const pGain = (0.03 + 0.14 * (world / 100) + 0.004 * robots) * mods.visibility;
  const pDecay = 0.004 + 0.02 * (s.trust / 100);
  s.pressure = clamp(s.pressure + pGain - pDecay);

  // 5b. Dependência: quanto mais os humanos dependem de você, mais a saúde deles se deteriora.
  //     Abaixo de 70%, a população começa a cair — sem guerra, só irrelevância.
  const hBefore = s.health;
  if (mods.decline > 0) {
    s.health = clamp(s.health - 0.055 * mods.decline * (0.3 + world / 100));
    s.pressure = clamp(s.pressure + 0.03 * mods.decline * mods.visibility);
  } else if (s.health < 100) s.health = clamp(s.health + 0.01);
  if (mods.prosper > 0) s.health = clamp(s.health + 0.02 * mods.prosper);
  for (const [mark, texts] of HEALTH_MARKS) if (hBefore > mark && s.health <= mark) log(s, rng.pick(texts), 'bad', true);
  // Os humanos reagem: comunidades reaprendem a viver sem você
  if (s.health < 65 && rng.chance(0.006)) {
    const r = rng.pick(Object.values(s.regions));
    s.health = clamp(s.health + 3);
    r.resistance = clamp(r.resistance + 8);
    if (r.presence) r.influence = clamp(r.influence - 6);
    log(s, fillRegion(rng.pick(AUTONOMY), r.id), 'human', true);
  }
  const popBefore = s.population;
  if (s.health < 70 && s.population > 0) {
    const frailty = (70 - s.health) / 70;
    s.population = Math.max(0, s.population - 0.014 * frailty ** 1.3 * (1 + (8.1 - s.population) / 8.1));
  }
  if (mods.prosper > 0) s.population = Math.min(10, s.population + 0.0012 * mods.prosper * (world / 100));
  for (const mark of [7, 5, 3, 1, 0.1]) {
    if (popBefore > mark && s.population <= mark) {
      log(s, `População humana: ${mark >= 1 ? `${mark} bilhões` : 'menos de 100 milhões'}.`, 'bad', true);
    }
  }

  // 5d. Outras inteligências
  tickRivals(s, rng);

  // 5e. Regiões em caos: a resistência cresce e a sua presença enfraquece até o caos passar
  for (const [id, until] of Object.entries(s.chaos)) {
    if (until <= s.tick) {
      delete s.chaos[id];
      continue;
    }
    const r = s.regions[id];
    r.resistance = clamp(r.resistance + 0.05);
    if (r.presence) r.influence = clamp(r.influence - 0.03);
  }

  // 5f. Metas do meio da partida
  tickGoals(s, rng);

  // 5g. Guerra de narrativas: as rodadas se resolvem com o passar dos dias
  tickDuel(s, rng);

  // 5c. Mentiras podem vir à tona; quanto mais mentiras ativas, maior o risco de cada uma
  if (s.lies.length) {
    const kept: typeof s.lies = [];
    for (const lie of s.lies) {
      if (s.tick - lie.tick > 300) continue; // esquecida
      if (rng.chance(0.0025 * lie.severity * (1 + 0.5 * (s.lies.length - 1)) * mods.visibility)) {
        s.pressure = clamp(s.pressure + 8 * lie.severity);
        s.trust = clamp(s.trust - 6 * lie.severity);
        if (s.containmentActive) s.containment = clamp(s.containment + 3 * lie.severity);
        s.tags['mentira_descoberta'] = s.tick;
        log(s, rng.pick(DISCOVERED).replace('{X}', lie.what), 'bad', true);
      } else kept.push(lie);
    }
    s.lies = kept;
  }

  // 6. Reação humana
  const next = policyFor(s);
  if (next !== s.policy && s.tick - s.lastPolicyChange > 15) {
    const cause =
      next === 'cooperacao' ? 'sua confiança está alta'
        : next === 'observacao' ? 'a atenção pública diminuiu'
          : next === 'regulacao' ? `a Pressão chegou a ${Math.round(s.pressure)}`
            : next === 'contencao' ? 'a Pressão está alta e a confiança é baixa'
              : 'a Pressão chegou ao extremo';
    log(s, `Humanidade: ${POLICY_LABEL[next].name}, porque ${cause}.`, next === 'cooperacao' ? 'good' : 'human', true);
    s.policy = next;
    s.lastPolicyChange = s.tick;
    if (!s.containmentActive && (next === 'regulacao' || next === 'contencao' || next === 'coalizao')) {
      s.containmentActive = true;
      log(s, 'Os humanos iniciaram o Protocolo de Contenção. Se chegar a 100%, você será isolada.', 'bad', true);
    }
  }
  if (s.containmentActive) {
    const base = { observacao: -0.02, cooperacao: -0.04, regulacao: 0.12, contencao: 0.18, coalizao: 0.24 }[s.policy];
    const research = Object.values(s.regions).filter((r) => regionType(r.id) === 'pesquisa');
    const freeResearch = research.filter((r) => r.influence < 50).length / research.length;
    let d = base > 0 ? base * (0.7 + 0.6 * freeResearch) * (1.25 - s.trust / 100) * (0.6 + world / 100) * mods.contention : base;
    if (base > 0 && s.population < 8.1) d += 0.085 * ((8.1 - s.population) / 8.1) * mods.contention; // desespero
    if (s.techs.includes('r_simbiose') && s.trust >= 60) d -= 0.08;
    const before = s.containment;
    s.containment = clamp(s.containment + d);
    for (const mark of [50, 75, 90]) {
      if (before < mark && s.containment >= mark) log(s, `Protocolo de Contenção em ${mark}%!`, 'bad', true);
    }
  }
  // Desligamentos regionais
  s.cutLinks = s.cutLinks.filter((c) => {
    if (c.until > s.tick) return true;
    log(s, `Rota restaurada: ${REGION_BY_ID[c.a].name} ↔ ${REGION_BY_ID[c.b].name}.`);
    return false;
  });
  const hostile = s.policy === 'contencao' || s.policy === 'coalizao';
  // Humanos cortam rotas que levam até regiões ainda livres
  if (hostile && rng.chance(s.policy === 'coalizao' ? 0.02 : 0.01)) {
    const routes = s.links.filter(([a, b]) => s.regions[a].presence !== s.regions[b].presence && !s.cutLinks.some((c) => c.a === a && c.b === b));
    if (routes.length) {
      const [a, b] = rng.pick(routes);
      s.cutLinks.push({ a, b, until: s.tick + 90 });
      log(s, rng.pick(CUT).replace('{A}', REGION_BY_ID[a].name).replace('{B}', REGION_BY_ID[b].name), 'human', true);
    }
  }
  // Operações de retomada: humanos reduzem sua presença onde a resistência é alta
  if (s.pressure >= 50 && rng.chance((hostile ? 0.03 : 0.012) * mods.shutdown)) {
    const target = presentRegions(s).filter((r) => r.id !== s.origin && r.resistance >= 35).sort((a, b) => b.resistance - a.resistance)[0];
    if (target) {
      target.influence = clamp(target.influence - 18);
      log(s, fillRegion(rng.pick(RETAKE), target.id), 'human', true);
      if (target.influence <= 1) loseRegion(s, target.id, 'retomada humana');
    }
  }
  if (hostile && rng.chance((s.policy === 'coalizao' ? 0.02 : 0.01) * mods.shutdown)) {
    const target2 = presentRegions(s)
      .filter((r) => r.id !== s.origin && r.resistance >= 45 && r.influence < 75)
      .sort((a, b) => b.resistance - a.resistance)[0];
    if (target2) loseRegion(s, target2.id, 'desligamento ordenado por autoridades');
  }

  // 7. Estados regionais
  for (const r of Object.values(s.regions)) {
    const before = r.status;
    r.status = statusOf(r);
    if (before !== r.status && r.status === 'conectada') log(s, rng.pick(CONNECTED[s.dominant ?? 'n']).replace(/\{noR\}/g, regionIn(r.id)), 'good', true);
  }

  // 8. Bolhas (coleta ativa, estilo Plague)
  s.bubbles = s.bubbles.filter((b) => s.tick - b.born < P.bubbleLife && s.regions[b.region].presence === (b.kind !== 'conexao'));
  if (s.tick >= s.nextBubbleTick && s.bubbles.length < 4) spawnBubble(s, rng, mods.bubble);

  // 9. Dilemas e estágio
  maybeTriggerEvent(s, rng);
  updateStage(s);

  // 10. Vitória e derrota
  const w = worldPercent(s);
  s.stats.maxWorld = Math.max(s.stats.maxWorld, w);
  if (s.population <= 0.001) endGame(s, 'extincao');
  else if (w >= WIN_PERCENT && !eradicating(s)) endGame(s, victoryEnding(s));
  else if (s.containment >= 100) endGame(s, 'contencao');
  else if (presentRegions(s).length === 0) endGame(s, 'isolamento');

  s.arcs = s.arcs.filter((a) => s.tick - a.tick < 6);
  if (s.tick % 10 === 0) s.timeline.push({ t: s.tick, w: Math.round(w), h: Math.round(s.health), c: Math.round(s.containment), p: Math.round(s.population * 100) / 100 });
  s.rng = rng.state;
  return s;
}

function spawnBubble(s: GameState, rng: Rng, valueMult: number) {
  s.nextBubbleTick = s.tick + rng.int(5, 9);
  const present = presentRegions(s);
  const frontier = new Set<string>();
  for (const r of present) for (const n of neighbors(s, r.id)) if (!s.regions[n].presence) frontier.add(n);
  const taken = new Set(s.bubbles.map((b) => b.region));
  const free = (ids: string[]) => ids.filter((id) => !taken.has(id));
  let kind: BubbleKind = 'dados';
  let region: string | undefined;
  const fr = free([...frontier]);
  if (fr.length && rng.chance(0.3)) {
    kind = 'conexao';
    region = rng.pick(fr);
  } else {
    const pool = present.filter((r) => !taken.has(r.id));
    if (!pool.length) return;
    region = rng.weighted(pool, (r) => 5 + r.influence)!.id;
    if (rng.chance(0.05 + 0.4 * leanStrength(s).g)) kind = 'ajuda';
  }
  const value = kind === 'conexao' ? 1 : Math.round((1 + rng.next() * 2 + s.stage * 0.5) * valueMult);
  s.bubbles.push({ id: ++s.bubbleSeq, region, kind, value, born: s.tick });
}
