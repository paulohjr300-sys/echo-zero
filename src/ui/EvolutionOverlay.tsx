import { useRef, useState } from 'react';
import { BRANCHES, TECHS, TECH_BY_ID, type Branch, type TechDef } from '../content/techs';
import { computeMods, cuidadoOpen, dominioOpen, evolucaoOpen, leanShares, PHILOSOPHY, techCost } from '../engine/core';
import { techUnlocked } from '../engine/systems';
import type { Action, GameState, Lean } from '../engine/types';
import { EvoIcon, LockGlyph } from './EvoIcon';
import { DadosGlyph } from './icons';

const COL_X = [70, 190, 310];
const ROW_Y = [56, 175, 294, 413];

/** Ramos escondidos: aparecem quando a identidade pende para um lado (ou quando você já comprou algo neles). */
const HIDDEN: Partial<Record<Branch, { lean: Lean; at: number; open: (s: GameState) => boolean; hint: string }>> = {
  cuidado: { lean: 'g', at: 0.4, open: cuidadoOpen, hint: 'Nos dilemas, escolha as opções marcadas → Guardiã.' },
  evolucao: { lean: 'e', at: 0.38, open: evolucaoOpen, hint: 'Nos dilemas, escolha as opções marcadas → Evolucionária.' },
  dominio: { lean: 's', at: 0.4, open: dominioOpen, hint: 'Nos dilemas, escolha as opções marcadas → Soberana.' },
};

type NodeState = 'owned' | 'ready' | 'available' | 'locked';

/** Árvore de evolução: ramos, requisitos visíveis e o que falta para desbloquear cada coisa. */
export function EvolutionOverlay({ state, act, onClose }: { state: GameState; act: (a: Action) => boolean; onClose: () => void }) {
  const [branch, setBranch] = useState<Branch>('propagacao');
  const [sel, setSel] = useState<string | null>(null);
  const mods = computeMods(state);
  const hidden = HIDDEN[branch];
  const branchOpen = !hidden || hidden.open(state);
  const techs = TECHS.filter((t) => t.branch === branch);
  const chosen = sel && TECH_BY_ID[sel]?.branch === branch ? TECH_BY_ID[sel] : null;
  const color = BRANCHES[branch].color;
  const detailRef = useRef<HTMLDivElement>(null);
  // No celular, os detalhes ficam abaixo da lista: rola até eles ao tocar num item
  const pick = (id: string) => {
    setSel(id);
  };

  const nodeState = (id: string): NodeState => {
    if (state.techs.includes(id)) return 'owned';
    if (!techUnlocked(state, id)) return 'locked';
    return state.dados >= techCost(state, id, mods) ? 'ready' : 'available';
  };
  const owned = techs.filter((t) => state.techs.includes(t.id)).length;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Evoluir" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal evo-modal" style={{ ['--c' as string]: color }}>
        <div className="evo-head">
          <h2 style={{ margin: 0 }}>Evoluir</h2>
          <span className="dim" style={{ fontSize: '.85em' }}>{state.techs.length} evoluções</span>
          <div className="dados" style={{ marginLeft: 'auto' }}><DadosGlyph size={20} /><span className="val">{Math.floor(state.dados)}</span></div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar" autoFocus>×</button>
        </div>

        <div className="evo-tabs" role="tablist">
          {(Object.keys(BRANCHES) as Branch[]).map((b) => {
            const h = HIDDEN[b];
            const open = !h || h.open(state);
            const ready = open && TECHS.some((t) => t.branch === b && nodeState(t.id) === 'ready');
            const count = TECHS.filter((t) => t.branch === b);
            return (
              <button key={b} role="tab" aria-selected={branch === b} className={`evo-tab ${branch === b ? 'active' : ''} ${open ? '' : 'hidden-branch'}`}
                style={{ ['--c' as string]: BRANCHES[b].color }} onClick={() => { setBranch(b); setSel(null); }}>
                <span className="tab-name">{open ? BRANCHES[b].glyph : <LockGlyph size={13} />} {open ? BRANCHES[b].label : '???'}</span>
                <span className="tab-count">{open ? `${count.filter((t) => state.techs.includes(t.id)).length}/${count.length}` : 'oculto'}</span>
                {ready && <span className="dot" />}
              </button>
            );
          })}
        </div>

        {!branchOpen && hidden ? (
          <HiddenBranch state={state} branch={branch} />
        ) : (
          <>
            <div className="branch-head">
              <p className="muted" style={{ margin: 0 }}>{BRANCHES[branch].desc}</p>
              <div className="branch-progress" title={`${owned} de ${techs.length} evoluções deste ramo`}>
                {techs.map((t) => <i key={t.id} className={state.techs.includes(t.id) ? 'on' : ''} />)}
              </div>
            </div>
            <div className="evo-body">
              <div className="tree">
                <svg viewBox="0 0 380 470" className="tree-lines" aria-hidden="true">
                  {techs.flatMap((t) =>
                    t.prereq.map((p) => {
                      const a = TECH_BY_ID[p];
                      const on = state.techs.includes(p);
                      const both = on && state.techs.includes(t.id);
                      // Trilhas em ângulo reto, como num circuito: desce, cruza no meio entre os níveis e desce de novo
                      const x1 = COL_X[a.col];
                      const y1 = ROW_Y[a.tier - 1];
                      const x2 = COL_X[t.col];
                      const y2 = ROW_Y[t.tier - 1];
                      const ym = Math.round((y1 + y2) / 2 + 8);
                      const d = x1 === x2 ? `M${x1} ${y1}V${y2}` : `M${x1} ${y1}V${ym - 6}Q${x1} ${ym} ${x1 + Math.sign(x2 - x1) * 6} ${ym}H${x2 - Math.sign(x2 - x1) * 6}Q${x2} ${ym} ${x2} ${ym + 6}V${y2}`;
                      return (
                        <path key={p + t.id} d={d} fill="none" strokeLinejoin="round"
                          stroke={on ? color : 'rgba(120,150,190,.28)'} strokeWidth={both ? 3.2 : on ? 2 : 1.4}
                          strokeDasharray={on ? undefined : '3 5'} opacity={both ? 1 : on ? 0.7 : 1} />
                      );
                    }),
                  )}
                </svg>
                {techs.map((t) => {
                  const st = nodeState(t.id);
                  const cost = techCost(state, t.id, mods);
                  return (
                    <button
                      key={t.id}
                      className={`node ${st} ${sel === t.id ? 'sel' : ''}`}
                      style={{ left: `${(COL_X[t.col] / 380) * 100}%`, top: `${(ROW_Y[t.tier - 1] / 470) * 100}%` }}
                      onClick={() => pick(t.id)}
                      aria-label={`${t.name}: ${stateLabel(st, cost)}`}
                    >
                      <span className="hex">
                        <span className="hex-in"><EvoIcon tech={t.id} size={30} /></span>
                        {st === 'locked' && <span className="lock-badge"><LockGlyph size={12} /></span>}
                      </span>
                      <span className="nname">{t.name}</span>
                      {st === 'owned' ? (
                        <span className="nstatus owned">ativa</span>
                      ) : st === 'locked' ? (
                        <span className="nstatus locked">bloqueada</span>
                      ) : (
                        <span className={`nstatus price ${st}`}><DadosGlyph size={11} />{cost}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Celular (em pé ou deitado): a árvore numa grade compacta, 3 colunas por 4 níveis, sem nada sobreposto */}
              <div className="tree-grid">
                {techs.map((t) => {
                  const st = nodeState(t.id);
                  const cost = techCost(state, t.id, mods);
                  return (
                    <button key={t.id} className={`tg-item ${st} ${sel === t.id ? 'sel' : ''}`} onClick={() => pick(t.id)}
                      style={{ gridColumn: t.col + 1, gridRow: t.tier }} aria-label={`${t.name}: ${stateLabel(st, cost)}`}>
                      <span className="tg-hex"><EvoIcon tech={t.id} size={20} />{st === 'locked' && <span className="lock-badge"><LockGlyph size={9} /></span>}</span>
                      <b>{t.name}</b>
                      {st === 'owned' ? <small className="tg-st owned">ativa</small>
                        : st === 'locked' ? <small className="tg-st locked">bloqueada</small>
                          : <small className={`tg-st ${st}`}><DadosGlyph size={9} />{cost}</small>}
                    </button>
                  );
                })}
              </div>
              <div className={`evo-detail ${chosen ? 'open' : ''}`} ref={detailRef}>
                {chosen && <button className="icon-btn sheet-close" onClick={() => setSel(null)} aria-label="Fechar detalhes">×</button>}
                {chosen ? <Detail state={state} t={chosen} st={nodeState(chosen.id)} cost={techCost(state, chosen.id, mods)} act={act} />
                  : <Guide />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function stateLabel(st: NodeState, cost: number) {
  return st === 'owned' ? 'ativa' : st === 'locked' ? 'bloqueada' : st === 'ready' ? `pode evoluir por ${cost} Dados` : `custa ${cost} Dados`;
}

function Detail({ state, t, st, cost, act }: { state: GameState; t: TechDef; st: NodeState; cost: number; act: (a: Action) => boolean }) {
  const color = BRANCHES[t.branch].color;
  const missing = cost - Math.floor(state.dados);
  return (
    <>
      <div className="detail-top">
        <span className={`detail-icon ${st}`} style={{ ['--c' as string]: color }}><EvoIcon tech={t.id} size={40} /></span>
        <div>
          <div className="fam" style={{ color }}>{BRANCHES[t.branch].label} · nível {t.tier}</div>
          <h3 style={{ margin: '2px 0 0', fontSize: '1.2em' }}>{t.name}</h3>
        </div>
      </div>
      <p className="detail-effect">{t.effect}</p>
      {t.tradeoff && <p className="detail-trade">Custo escondido: {t.tradeoff}</p>}
      {t.lean && (
        <p className="detail-lean" style={{ color: PHILOSOPHY[t.lean].color, borderColor: PHILOSOPHY[t.lean].color }}>
          → Puxa sua identidade para {PHILOSOPHY[t.lean].short}
        </p>
      )}
      {t.prereq.length > 0 && (
        <div className="reqs">
          <div className="dim" style={{ fontSize: '.8em', marginBottom: 4 }}>{t.prereq.length > 1 ? 'Para desbloquear, tenha uma destas:' : 'Para desbloquear, tenha antes:'}</div>
          {t.prereq.map((p) => {
            const has = state.techs.includes(p);
            return (
              <div key={p} className={`req ${has ? 'ok' : ''}`}>
                <EvoIcon tech={p} size={16} /> {TECH_BY_ID[p].name} <span>{has ? '✔' : 'falta'}</span>
              </div>
            );
          })}
        </div>
      )}
      {st === 'owned' ? (
        <div className="owned-banner" style={{ ['--c' as string]: color }}>Esta evolução já faz parte de você.</div>
      ) : (
        <button className={`btn evolve-btn ${st === 'ready' ? 'primary' : ''}`} disabled={st !== 'ready'} onClick={() => act({ type: 'evolve', tech: t.id })}>
          {st === 'locked'
            ? 'Desbloqueie o item anterior primeiro'
            : st === 'ready'
              ? <>Evoluir por {cost} <DadosGlyph /></>
              : <>Faltam {missing} <DadosGlyph /> (custa {cost})</>}
        </button>
      )}
    </>
  );
}

function Guide() {
  return (
    <div className="muted guide">
      <p style={{ marginTop: 0 }}><b style={{ color: 'var(--text)' }}>Como funciona</b></p>
      <ul>
        <li>Toque num hexágono para ver o que ele faz.</li>
        <li>Cada ramo começa pelo topo. As linhas mostram o caminho: para liberar um item, compre um dos que estão ligados acima dele.</li>
        <li>Pague com Dados. Ganhe Dados com as regiões conectadas e clicando nas bolhas ◆ do mapa.</li>
        <li>Cada evolução comprada encarece as próximas.</li>
        <li>Três ramos ficam ocultos e só aparecem conforme a sua identidade.</li>
      </ul>
      <div className="legend">
        <span><i className="lg owned" /> ativa</span>
        <span><i className="lg ready" /> pode comprar</span>
        <span><i className="lg available" /> faltam Dados</span>
        <span><i className="lg locked" /> bloqueada</span>
      </div>
    </div>
  );
}

/** Ramo oculto: mostra o que falta para ele aparecer e um vislumbre do que ele guarda. */
function HiddenBranch({ state, branch }: { state: GameState; branch: Branch }) {
  const h = HIDDEN[branch]!;
  const share = leanShares(state)[h.lean];
  const ph = PHILOSOPHY[h.lean];
  const techs = TECHS.filter((t) => t.branch === branch);
  return (
    <div className="hidden-panel">
      <div className="hidden-silhouettes">
        {techs.map((t) => <span key={t.id} className="sil"><EvoIcon tech={t.id} size={26} /></span>)}
      </div>
      <h3 style={{ margin: '6px 0' }}><LockGlyph size={16} /> Ramo oculto</h3>
      <p>Este ramo se revela quando sua identidade pender para <b style={{ color: ph.color }}>{ph.name}</b>.</p>
      <div className="unlock-meter">
        <div className="meter-label"><span>{ph.short}</span><span className="mono">{Math.round(share * 100)}% de {Math.round(h.at * 100)}%</span></div>
        <div className="meter-bar"><i style={{ width: `${Math.min(100, (share / h.at) * 100)}%`, background: ph.color }} /></div>
      </div>
      <p className="muted" style={{ fontSize: '.9em' }}>{h.hint}</p>
    </div>
  );
}

export function anyTechReady(state: GameState): boolean {
  const mods = computeMods(state);
  return TECHS.some((t) => !state.techs.includes(t.id) && techUnlocked(state, t.id) && state.dados >= techCost(state, t.id, mods));
}
