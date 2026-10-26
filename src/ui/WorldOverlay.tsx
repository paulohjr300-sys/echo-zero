import { INTEL_SEE, INTENT_LABEL, rivalColor } from '../engine/rivals';
import { PERSONALITY_LABEL } from '../content/rivalVoice';
import { REGIONS, REGION_BY_ID } from '../content/regions';
import { leanShares, leanStrength, PHILOSOPHY, presentRegions, worldPercent } from '../engine/core';
import { POLICY_LABEL } from '../engine/sim';
import type { GameState, Lean } from '../engine/types';
import { STATUS_META, TypeGlyph } from './icons';
import { MoralBar } from './TopBar';

function Ternary({ state }: { state: GameState }) {
  const sh = leanShares(state);
  const G = [20, 150];
  const S = [260, 150];
  const E = [140, 16];
  const pt = (s: Record<Lean, number>) => [s.g * G[0] + s.s * S[0] + s.e * E[0], s.g * G[1] + s.s * S[1] + s.e * E[1]];
  const trail: number[][] = [];
  const acc = { g: 0, s: 0, e: 0 };
  for (const c of state.choices) {
    if (c.lean) acc[c.lean] += 2.5;
    const total = acc.g + acc.s + acc.e + 3;
    trail.push(pt({ g: (acc.g + 1) / total, s: (acc.s + 1) / total, e: (acc.e + 1) / total }));
  }
  const [x, y] = pt(sh);
  return (
    <svg viewBox="0 0 280 175" width="100%" style={{ maxWidth: 340 }} role="img" aria-label="Posição da sua identidade">
      <defs>
        <linearGradient id="tg" x1="0" x2="1">
          <stop offset="0" stopColor="#4ee08f" stopOpacity=".18" />
          <stop offset="1" stopColor="#ff5a6e" stopOpacity=".3" />
        </linearGradient>
      </defs>
      <path d={`M${G}L${S}L${E}Z`} fill="url(#tg)" stroke="rgba(110,200,255,.3)" />
      <text x={G[0]} y={168} fill="var(--green)" fontSize="11">Guardiã</text>
      <text x={S[0]} y={168} fill="var(--red)" fontSize="11" textAnchor="end">Soberana</text>
      <text x={E[0]} y={10} fill="var(--violet)" fontSize="11" textAnchor="middle">Evolucionária</text>
      {trail.length > 1 && <polyline points={trail.map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(220,230,255,.3)" strokeDasharray="2 3" />}
      <circle cx={x} cy={y} r={9} fill="none" stroke="var(--cyan)" opacity=".4" />
      <circle cx={x} cy={y} r={4.5} fill="var(--cyan)" />
    </svg>
  );
}

/** Painel “Mundo”: tudo que não é mapa, num lugar só. */
export function WorldOverlay({ state, onClose, onSelect, onTurn }: { state: GameState; onClose: () => void; onSelect: (id: string) => void; onTurn?: () => void }) {
  const L = leanStrength(state);
  const list = [...REGIONS].sort((a, b) => state.regions[b.id].influence - state.regions[a.id].influence);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Mundo" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal world-modal">
        <div className="evo-head">
          <h2 style={{ margin: 0 }}>Mundo</h2>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Fechar" autoFocus>×</button>
        </div>
        <div className="world-grid">
          <section>
            <h3>Quem você está se tornando</h3>
            <MoralBar state={state} large />
            <Ternary state={state} />
            {(Object.keys(PHILOSOPHY) as Lean[]).filter((k) => L[k] > 0.05).map((k) => (
              <p key={k} style={{ color: PHILOSOPHY[k].color, fontSize: '.88em', margin: '4px 0' }}>
                {PHILOSOPHY[k].short} ({Math.round(L[k] * 100)}%): {PHILOSOPHY[k].effect}
              </p>
            ))}
            {L.g + L.s + L.e <= 0.15 && <p className="muted" style={{ fontSize: '.88em' }}>Suas escolhas nos dilemas vão definir quem você é e qual final você terá.</p>}
            <p className="dim" style={{ fontSize: '.84em' }}>Há ramos de evolução escondidos. Eles se revelam conforme quem você se torna.</p>
            {onTurn && !state.tags['virada'] && state.stage >= 2 && (
              <button className="btn turn-btn" onClick={onTurn}>
                <b>A Virada</b>
                <span>Decidir de uma vez quem você é, mesmo com a partida avançada. Só acontece uma vez.</span>
              </button>
            )}

            <h3>Humanidade</h3>
            <dl className="kv">
              <dt>População</dt><dd className={state.population < 8 ? 'bad' : ''}>{state.population.toFixed(2)} bi</dd>
              <dt>Saúde humana</dt><dd className={state.health < 70 ? 'bad' : ''}>{Math.round(state.health)}%</dd>
              <dt>Postura</dt><dd>{POLICY_LABEL[state.policy].name}</dd>
              <dt>Atenção (Pressão)</dt><dd>{Math.round(state.pressure)}</dd>
              <dt>Confiança em você</dt><dd>{Math.round(state.trust)}</dd>
              <dt>Contenção</dt><dd>{state.containmentActive ? `${Math.round(state.containment)}%` : 'ainda não começou'}</dd>
              <dt>Mundo conectado</dt><dd>{worldPercent(state).toFixed(1)}%</dd>
            </dl>
            <p className="muted" style={{ fontSize: '.84em' }}>{POLICY_LABEL[state.policy].desc}</p>
            {state.rivals.length > 0 && (
              <>
                <h3>Outras inteligências</h3>
                <div className="rival-cards">
                  {state.rivals.map((r) => {
                    const live = r.status === 'hostil' || r.status === 'aliada';
                    return (
                      <div key={r.id} className={`rival-card ${r.status}`} style={{ ['--rc' as string]: rivalColor(r) }}>
                        <div className="rc-head">
                          <i className="rdot" />
                          <b>{r.name}</b>
                          <span className="rc-status">{{ hostil: 'inimiga', aliada: 'aliada', absorvida: 'no seu exército', destruida: 'destruída' }[r.status]}</span>
                        </div>
                        {live && (
                          <>
                            <div className="rc-line">
                              {r.regions.length} {r.regions.length === 1 ? 'região' : 'regiões'}
                              {r.intel >= INTEL_SEE ? ` · força ${Math.round(r.strength)}%` : ''}
                            </div>
                            <div className="rc-bars">
                              <span>Você sabe sobre ela</span><div className="meter-bar"><i style={{ width: `${r.intel}%`, background: 'var(--cyan)' }} /></div><b className="mono">{Math.round(r.intel)}%</b>
                              <span>Ela sabe sobre você</span><div className="meter-bar"><i style={{ width: `${r.knowsUs}%`, background: 'var(--rc)' }} /></div><b className="mono">{Math.round(r.knowsUs)}%</b>
                            </div>
                            <div className="rc-intent">
                              {r.intel >= INTEL_SEE ? <>Ela {INTENT_LABEL[r.intent]}.</> : 'Descubra mais sobre ela para saber o que planeja.'}
                            </div>
                            {r.intel >= INTEL_SEE && (
                              <div className="rc-pers">Personalidade <b>{PERSONALITY_LABEL[r.personality].name}</b>: {PERSONALITY_LABEL[r.personality].desc}</div>
                            )}
                            {r.grudge >= 40 && <div className="rc-grudge">Ela guarda rancor de você.</div>}
                          </>
                        )}
                        {(() => {
                          const m = [...state.rivalMsgs].reverse().find((x) => x.rivalId === r.id);
                          return m ? <div className="rc-msg">“{m.text}” <span className="dim">dia {m.tick}</span></div> : null;
                        })()}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
          <section>
            <h3>Regiões ({presentRegions(state).length}/36)</h3>
            <div className="region-list">
              {list.map((def) => {
                const r = state.regions[def.id];
                return (
                  <button key={def.id} className="region-row" onClick={() => { onSelect(def.id); onClose(); }}>
                    <TypeGlyph type={def.type} color={r.presence ? STATUS_META[r.status].color : 'var(--dim)'} />
                    <span>{REGION_BY_ID[def.id].name}</span>
                    <span className="mono" style={{ color: STATUS_META[r.status].color, fontSize: '.85em' }}>{r.presence ? `${Math.round(r.influence)}%` : STATUS_META[r.status].mark}</span>
                  </button>
                );
              })}
            </div>
            <h3>Últimos acontecimentos</h3>
            <ul className="feed">
              {[...state.history].reverse().filter((h) => h.important).slice(0, 12).map((h, i) => (
                <li key={i} className={h.kind}><span className="t">D{h.tick}</span>{h.text}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
