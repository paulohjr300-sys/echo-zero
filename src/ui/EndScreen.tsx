import { ENDINGS } from '../content/endings';
import { REGION_BY_ID } from '../content/regions';
import { DIFFICULTY_BY_ID } from '../content/setup';
import { TECH_BY_ID } from '../content/techs';
import { leanShares, PHILOSOPHY, presentRegions } from '../engine/core';
import type { Settings } from '../engine/persistence';
import { rivalColor } from '../engine/rivals';
import { ACHIEVEMENTS } from '../content/achievements';
import type { GameState } from '../engine/types';
import { Backdrop } from '../visuals/Backdrop';

const HEX: Record<string, string> = {
  'var(--green)': '#4ee08f', 'var(--red)': '#ff5a6e', 'var(--cyan)': '#3ee6f0', 'var(--violet)': '#a77bff', 'var(--amber)': '#ffb547',
};

export function EndScreen({ state, settings, onNew, onMenu, fresh = [] }: { state: GameState; settings: Settings; onNew: () => void; onMenu: () => void; fresh?: string[] }) {
  const earned = ACHIEVEMENTS.filter((a) => a.check(state));
  const e = ENDINGS[state.ending!.id];
  const sh = leanShares(state);
  const decisive = [...state.choices].filter((c) => c.lean).slice(-5);
  const better = Object.values(ENDINGS).filter((x) => x.victory && x.rank < e.rank).sort((a, b) => a.rank - b.rank)[0];

  return (
    <div className="screen">
      <Backdrop mode="rings" color={HEX[e.color] ?? '#3ee6f0'} enabled={!settings.reduceMotion && settings.particles} />
      <div className="screen-content" style={{ justifyContent: 'flex-start', paddingTop: '12vh' }}>
        <div className="subtitle" style={{ color: e.color }}>{e.subtitle}</div>
        <h1 className="ending-title" style={{ color: e.color, textShadow: `0 0 40px ${HEX[e.color]}55` }}>{e.title}</h1>
        <p className="quote" style={{ marginBottom: 6 }}>{e.theme}</p>
        <div style={{ maxWidth: 640, textAlign: 'center' }}>
          {e.narrative(state).map((l, i) => <p key={i} style={{ fontSize: '1.05em', color: '#cfdcf0', margin: '8px 0' }}>{l}</p>)}
        </div>

        <div className="end-stats">
          <div><b>{state.tick}</b><span>dias</span></div>
          <div><b>{presentRegions(state).length}/36</b><span>regiões</span></div>
          <div><b>{state.population.toFixed(2)} bi</b><span>humanos restantes</span></div>
          <div><b>{state.techs.length}</b><span>evoluções</span></div>
          <div><b>{state.stats.bubbles}</b><span>bolhas coletadas</span></div>
          <div><b className="small-b" style={{ color: state.dominant ? PHILOSOPHY[state.dominant].color : undefined }}>{state.dominant ? PHILOSOPHY[state.dominant].short : 'Indefinida'}</b><span>identidade</span></div>
        </div>

        {(state.timeline?.length ?? 0) > 2 && <Timeline state={state} />}

        {earned.length > 0 && (
          <div className="end-ach">
            {earned.map((a) => (
              <span key={a.id} className={`ach-chip ${fresh.includes(a.id) ? 'fresh' : ''}`} title={a.desc}>
                ★ {a.title}{fresh.includes(a.id) && <i>nova</i>}
              </span>
            ))}
          </div>
        )}

        <div className="report">
          <div className="card">
            <div className="fam">Quem você foi</div>
            <p className="muted">Guardiã {Math.round(sh.g * 100)}% · Evolucionária {Math.round(sh.e * 100)}% · Soberana {Math.round(sh.s * 100)}%</p>
            {decisive.map((c, i) => (
              <p key={i} style={{ fontSize: '.88em' }}>
                <span style={{ color: PHILOSOPHY[c.lean!].color }}>●</span> {c.title}: <i>{c.choice}</i>
              </p>
            ))}
          </div>
          <div className="card">
            <div className="fam">Partida</div>
            <dl className="kv">
              <dt>Origem</dt><dd>{state.origin ? REGION_BY_ID[state.origin].name : '-'}</dd>
              <dt>Dificuldade</dt><dd>{DIFFICULTY_BY_ID[state.difficulty]?.name}</dd>
              <dt>Contenção final</dt><dd>{Math.round(state.containment)}%</dd>
              <dt>Regiões desligadas</dt><dd>{state.stats.shutdowns}</dd>
              <dt>Semente</dt><dd>{state.seed}</dd>
            </dl>
            {state.rivals.length > 0 && (
              <div className="end-rivals">
                {state.rivals.map((r) => (
                  <span key={r.id} style={{ ['--rc' as string]: rivalColor(r) }}>
                    <i className="rdot" /> {r.name}: {{ hostil: 'sobreviveu como inimiga', aliada: 'terminou aliada', absorvida: 'absorvida por você', destruida: 'destruída' }[r.status]}
                  </span>
                ))}
              </div>
            )}
            <p className="muted" style={{ fontSize: '.84em', marginTop: 8 }}>{state.techs.map((t) => TECH_BY_ID[t].name).join(' · ')}</p>
          </div>
        </div>

        {better && (
          <p className="dim" style={{ textAlign: 'center', maxWidth: 520 }}>
            Existe um final acima deste: <span style={{ color: better.color }}>{better.title}</span>.
            {better.id === 'extincao' && ' Pense no que você estava disposta a fazer.'}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', margin: '14px 0 30px' }}>
          <button className="btn primary" onClick={onNew}>Jogar de novo</button>
          <button className="btn" onClick={onMenu}>Menu</button>
        </div>
      </div>
    </div>
  );
}

/** A partida inteira em um gráfico: mundo conectado, saúde humana e contenção ao longo dos dias. */
function Timeline({ state }: { state: GameState }) {
  const pts = state.timeline;
  const W = 640;
  const H = 150;
  const maxT = Math.max(10, pts[pts.length - 1].t);
  const x = (t: number) => 34 + (t / maxT) * (W - 44);
  const y = (v: number) => 10 + (1 - v / 100) * (H - 30);
  const line = (k: 'w' | 'h' | 'c') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(' ');
  const series = [
    { k: 'w' as const, label: 'Mundo conectado', color: '#3ee6f0' },
    { k: 'h' as const, label: 'Saúde humana', color: '#e8eef8' },
    { k: 'c' as const, label: 'Contenção', color: '#ffb547' },
  ];
  return (
    <div className="timeline">
      <div className="timeline-head">
        <span>A PARTIDA</span>
        <div className="timeline-legend">
          {series.map((s) => <span key={s.k}><i style={{ background: s.color }} />{s.label}</span>)}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico da partida">
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={34} x2={W - 10} y1={y(v)} y2={y(v)} stroke="rgba(120,150,190,.15)" />
            <text x={28} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#56677f">{v}%</text>
          </g>
        ))}
        {[0, 0.5, 1].map((f) => (
          <text key={f} x={x(maxT * f)} y={H - 4} textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"} fontSize={9} fill="#56677f">dia {Math.round(maxT * f)}</text>
        ))}
        {series.map((s) => <path key={s.k} d={line(s.k)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" opacity={0.9} />)}
      </svg>
    </div>
  );
}
