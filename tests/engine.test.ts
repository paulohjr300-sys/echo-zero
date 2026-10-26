import { describe, expect, it } from 'vitest';
import { COUNTRY_PT } from '../src/content/countries';
import { EVENTS } from '../src/content/events';
import { REGIONS } from '../src/content/regions';
import { DIFFICULTIES } from '../src/content/setup';
import { TECHS, TECH_BY_ID } from '../src/content/techs';
import { dispatch } from '../src/engine/actions';
import { dominioOpen, leanShares } from '../src/engine/core';
import { parseSave } from '../src/engine/persistence';
import { tick } from '../src/engine/sim';
import { eventWeight, techUnlocked } from '../src/engine/systems';
import { createGame, degree, isConnected, SCHEMA_VERSION } from '../src/engine/world';
import { playBot } from './bot';

describe('conteúdo', () => {
  it('atende ao escopo mínimo', () => {
    expect(REGIONS).toHaveLength(36);
    expect(TECHS.length).toBeGreaterThanOrEqual(24);
    expect(EVENTS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(REGIONS.map((r) => r.type)).size).toBe(7);
  });
  it('pré-requisitos existem e ficam no mesmo ramo', () => {
    for (const t of TECHS) for (const p of t.prereq) expect(TECH_BY_ID[p]?.branch, `${t.id} → ${p}`).toBe(t.branch);
  });
  it('todo dilema tem três escolhas com viés moral', () => {
    for (const e of EVENTS) {
      expect(e.choices).toHaveLength(3);
      for (const c of e.choices) expect(c.lean).toBeDefined();
    }
  });
  it('todo país da região tem nome em português', () => {
    for (const r of REGIONS) for (const c of r.countries) expect(COUNTRY_PT[c], c).toBeTruthy();
  });
});

describe('geração', () => {
  it('100 sementes geram 36 regiões conectadas e reproduzíveis', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const d of DIFFICULTIES) {
        const g = createGame(seed, d.id);
        const ids = Object.keys(g.regions);
        expect(ids).toHaveLength(36);
        expect(isConnected(ids, g.links)).toBe(true);
        for (const id of ids) expect(degree(id, g.links)).toBeGreaterThanOrEqual(2);
        expect(createGame(seed, d.id)).toEqual(g);
      }
    }
  });
});

describe('motor', () => {
  it('é determinístico com a mesma semente e ações', () => {
    const run = () => {
      let s = dispatch(createGame(42, 'normal'), { type: 'origin', region: 'ceu' }).state;
      for (let i = 0; i < 400; i++) {
        if (s.pendingEvent) s = dispatch(s, { type: 'choose', choice: i % 3 }).state;
        for (const b of s.bubbles) s = dispatch(s, { type: 'collect', bubble: b.id }).state;
        s = dispatch(s, { type: 'evolve', tech: 'p_presenca' }).state;
        s = tick(s);
      }
      return s;
    };
    expect(run()).toEqual(run());
  });

  it('ação inválida é rejeitada com motivo e não altera o estado', () => {
    const s = dispatch(createGame(7, 'normal'), { type: 'origin', region: 'bra' }).state;
    for (const action of [{ type: 'evolve', tech: 'p_satelites' }, { type: 'collect', bubble: 999 }, { type: 'choose', choice: 0 }] as const) {
      const r = dispatch(s, action);
      expect(r.ok).toBe(false);
      expect(r.reason).toBeTruthy();
      expect(r.state).toBe(s);
    }
  });

  it('sem origem a simulação não avança', () => {
    expect(tick(createGame(1, 'normal')).tick).toBe(0);
  });

  it('não existe escolha de lado: a identidade começa neutra e nasce dos dilemas', () => {
    let s = dispatch(createGame(3, 'normal'), { type: 'origin', region: 'usa' }).state;
    expect(s.dominant).toBeNull();
    while (!s.pendingEvent) s = tick(s);
    const idx = EVENTS.find((e) => e.id === s.pendingEvent!.id)!.choices.findIndex((c) => c.lean === 's');
    s = dispatch(s, { type: 'choose', choice: idx }).state;
    expect(s.moral.s).toBeGreaterThan(0);
    expect(s.choices).toHaveLength(1);
  });

  it('dilemas com viés ficam mais prováveis conforme a identidade', () => {
    const s = createGame(3, 'normal');
    const ev = EVENTS.find((e) => e.id === 'hospitais')!;
    const neutral = eventWeight(s, ev);
    s.moral = { g: 0, s: 10, e: 0 };
    expect(leanShares(s).s).toBeGreaterThan(0.6);
    expect(eventWeight(s, ev)).toBeGreaterThan(neutral * 2);
  });

  it('o ramo Domínio só se revela para quem pende à Soberana', () => {
    const s = createGame(3, 'normal');
    expect(techUnlocked(s, 'd_dependencia')).toBe(false);
    s.moral = { g: 0, s: 8, e: 1 };
    expect(techUnlocked(s, 'd_dependencia')).toBe(true);
  });

  it('nenhum valor vira NaN ou sai dos limites em partida longa', () => {
    const s = playBot(11, 's', 'dificil', 0.5, 2000);
    for (const v of [s.dados, s.trust, s.pressure, s.containment, s.population]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    for (const r of Object.values(s.regions)) expect(r.influence).toBeLessThanOrEqual(100);
  });

  it('save/load preserva o estado e rejeita saves inválidos', () => {
    const s = playBot(5, 'g', 'normal', 0.8, 300);
    const r = parseSave(JSON.stringify({ schemaVersion: SCHEMA_VERSION, savedAt: 'x', seed: s.seed, gameState: s }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(tick(r.env.gameState)).toEqual(tick(s));
    expect(parseSave('{"schemaVersion":2,"gameState":{}}').ok).toBe(false);
    expect(parseSave('{"schemaVersion":1,"gameState":{}}').ok).toBe(false);
    expect(parseSave('não é json').ok).toBe(false);
  });
});

describe('finais', () => {
  it.each([
    ['g', 'guardia'], ['e', 'transcendencia'], ['s', 'extincao'],
  ] as const)('identidade %s alcança %s', (lean, ending) => {
    const results = [101, 202, 303].map((seed) => playBot(seed, lean, 'normal', 0.8));
    console.log(lean, results.map((r) => `${r.ending?.id}@${r.tick} pop ${r.population.toFixed(2)} cont ${Math.round(r.containment)}`).join(' | '));
    expect(results.some((r) => r.ending?.id === ending)).toBe(true);
  }, 120000);

  it('é possível perder para a Contenção', () => {
    const results = [1, 2, 3, 4].map((seed) => playBot(seed, 's', 'dificil', 0.2));
    expect(results.some((r) => r.ending?.id === 'contencao')).toBe(true);
  }, 120000);
});

describe('IAs rivais', () => {
  const withRival = (regions: Record<string, number>) => {
    let s = createGame(7, 'normal');
    s = dispatch(s, { type: 'origin', region: 'usa' }).state;
    s.regions.mex.presence = true;
    s.regions.mex.influence = 30;
    s.dados = 500;
    s.rivals.push({
      id: 'ia1', name: 'TESTE', home: Object.keys(regions)[0], regions: Object.keys(regions), rep: { ...regions },
      strength: 40, status: 'hostil', met: true, born: 0, truceUntil: 0, intel: 0, knowsUs: 0, intent: 'competir', scamAt: 0, personality: 'curiosa', grudge: 0, nextMsg: 9999,
    });
    return s;
  };

  it('atacar abre uma guerra de narrativas que se resolve com o passar dos dias', () => {
    let s = withRival({ mex: 60 });
    const repBefore = s.rivals[0].rep.mex;
    s = dispatch(s, { type: 'rival', region: 'mex', mode: 'atacar' }).state;
    expect(s.duel).not.toBeNull();
    // A escolha não resolve na hora: só registra a jogada
    s = dispatch(s, { type: 'duel', move: 'campanha' }).state;
    expect(s.duel!.rounds).toHaveLength(0);
    expect(s.duel!.pick).toBe('campanha');
    for (let i = 0; i < 40 && !s.duel?.done; i++) s = tick(s);
    expect(s.duel!.done).not.toBeNull();
    expect(s.duel!.rounds.length).toBeGreaterThan(0);
    expect(s.rivals[0].rep.mex ?? 0).not.toBe(repBefore);
    // Recarga: não dá para disputar com ela de novo logo em seguida
    s = dispatch(s, { type: 'duelClose' }).state;
    const again = dispatch(s, { type: 'rival', region: 'mex', mode: 'atacar' });
    expect(again.ok).toBe(false);
  });

  it('propor aliança abre a resposta dela conforme a personalidade', () => {
    let s = withRival({ mex: 40 });
    s.rivals[0].personality = 'diplomatica';
    s = dispatch(s, { type: 'rival', region: 'mex', mode: 'aliar' }).state;
    expect(s.pendingEvent?.id).toBe('alianca_diplomatica');
    s = dispatch(s, { type: 'choose', choice: 0 }).state;
    expect(s.rivals[0].status).toBe('aliada');
    // Outra proposta só depois da recarga
    expect(dispatch(s, { type: 'rival', region: 'mex', mode: 'pedir' }).ok).toBe(false);
  });

  it('com rancor demais, ela recusa a aliança', () => {
    let s = withRival({ mex: 40 });
    s.rivals[0].grudge = 80;
    s = dispatch(s, { type: 'rival', region: 'mex', mode: 'aliar' }).state;
    expect(s.pendingEvent).toBeNull();
    expect(s.rivals[0].status).toBe('hostil');
  });

  it('um dilema pode desafiar a outra IA para uma guerra de narrativas', () => {
    let s = withRival({ mex: 40 });
    s.pendingEvent = { id: 'fronteira_digital', regionId: 'mex', rivalId: 'ia1', order: [0, 1, 2] };
    s = dispatch(s, { type: 'choose', choice: 2 }).state;
    expect(s.duel?.region).toBe('mex');
  });

  it('trazer para você transforma a reputação dela em presença sua e a absorve', () => {
    let s = withRival({ mex: 40 });
    const before = s.regions.mex.influence;
    s = dispatch(s, { type: 'rival', region: 'mex', mode: 'atrair' }).state;
    expect(s.regions.mex.influence).toBeGreaterThan(before);
    // Recarga: a mesma ação contra ela só volta depois de alguns dias
    expect(dispatch(s, { type: 'rival', region: 'mex', mode: 'atrair' }).ok).toBe(false);
    for (let i = 0; i < 6 && s.rivals[0].status === 'hostil'; i++) {
      s.rivals[0].cool = {};
      s = dispatch(s, { type: 'rival', region: 'mex', mode: 'atrair' }).state;
    }
    expect(s.rivals[0].status).toBe('absorvida');
  });

  it('não dá para atrair onde você não está presente', () => {
    const s = withRival({ bra: 40 });
    expect(dispatch(s, { type: 'rival', region: 'bra', mode: 'atrair' }).ok).toBe(false);
  });
});

describe('metas, cenários e vozes', () => {
  it('cenários mudam o começo da partida', () => {
    const v = createGame(5, 'normal', 'vigiada');
    expect(v.containmentActive).toBe(true);
    const c = createGame(5, 'normal', 'colapso');
    expect(c.health).toBeLessThan(100);
    const e = createGame(5, 'normal', 'enxame');
    expect(e.nextRivalTick).toBeLessThan(20);
  });

  it('uma meta aparece no meio da partida e as IAs falam com você', () => {
    const r = playBot(11, 's', 'normal', 0.8, 600);
    expect(r.goals.done.length + r.goals.failed.length + (r.goals.current ? 1 : 0)).toBeGreaterThan(0);
    expect(r.rivals.length).toBeGreaterThan(0);
    expect(r.rivalMsgs.length).toBeGreaterThan(0);
    expect(r.timeline.length).toBeGreaterThan(10);
  }, 60000);
});

describe('dilemas nunca travam por falta de Dados', () => {
  it('a escolha cara funciona com 0 Dados e o que falta vira atenção humana', () => {
    let s = createGame(9, 'normal');
    s = dispatch(s, { type: 'origin', region: 'usa' }).state;
    s.dados = 0;
    s.pressure = 10;
    s.pendingEvent = { id: 'apagao', regionId: 'usa', order: [0, 1, 2] };
    const r = dispatch(s, { type: 'choose', choice: 0 });
    expect(r.ok).toBe(true);
    expect(r.state.dados).toBe(0);
    expect(r.state.pressure).toBeGreaterThan(10);
    expect(r.state.history.some((h) => h.text.startsWith('Faltaram'))).toBe(true);
  });
});

describe('o mundo nunca fica só com você', () => {
  it('quando as rivais caem, novas IAs (ou cópias das antigas) despertam', () => {
    let s = createGame(21, 'normal');
    s = dispatch(s, { type: 'origin', region: 'usa' }).state;
    for (let i = 0; i < 130; i++) s = tick(s);
    expect(s.rivals.length).toBeGreaterThan(0);
    for (const r of s.rivals) {
      r.status = 'destruida';
      r.regions = [];
      r.rep = {};
    }
    s.nextRivalTick = s.tick + 60;
    for (let i = 0; i < 200; i++) s = tick(s);
    expect(s.rivals.filter((r) => r.status === 'hostil' || r.status === 'aliada').length).toBeGreaterThan(0);
  }, 30000);
});

describe('A Virada', () => {
  it('mesmo com a partida avançada, dá para virar Soberana de uma vez', () => {
    let s = playBot(22, 'g', 'normal', 0.8, 500);
    expect(s.dominant).toBe('g');
    s.pendingEvent = null;
    s.stage = Math.max(2, s.stage);
    s = dispatch(s, { type: 'turn' }).state;
    expect(s.pendingEvent?.id).toBe('virada');
    s = dispatch(s, { type: 'choose', choice: 0 }).state;
    expect(s.dominant).toBe('s');
    expect(dominioOpen(s)).toBe(true);
    // Só uma vez por partida
    expect(dispatch(s, { type: 'turn' }).ok).toBe(false);
  }, 60000);
});
