import { useEffect, useRef, useState } from 'react';
import { leanShares, PHILOSOPHY, worldPercent } from '../engine/core';
import { dadosPerTick, POLICY_LABEL } from '../engine/sim';
import { activeRival, armySize, INTEL_SEE, INTENT_LABEL, rivalColor } from '../engine/rivals';
import { STAGES, WIN_PERCENT } from '../engine/systems';
import type { GameState, Lean } from '../engine/types';
import { SpeakerGlyph } from './Hud';
import { ActIcon } from './glyphs';
import { DadosGlyph } from './icons';

interface Props {
  state: GameState;
  speed: 0 | 1 | 2 | 3;
  setSpeed: (s: 0 | 1 | 2 | 3) => void;
  onMenu: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

export function TopBar({ state, speed, setSpeed, onMenu, soundOn, onToggleSound }: Props) {
  const world = worldPercent(state);
  return (
    <header className="topbar">
      <div className="logo" aria-label="ECHO//ZERO">ECHO<span>//</span>ZERO</div>
      <div className="stage-chip" title="O estágio avança conforme você conecta o mundo.">
        <b>{STAGES[state.stage]}</b>
        <small>DIA {state.tick}</small>
      </div>
      <div className="dados" title="Dados: sua única moeda. Vêm das regiões conectadas e das bolhas que você clica. Gaste em Evoluir.">
        <DadosGlyph size={20} />
        <span className="val">{Math.floor(state.dados)}</span>
        <span className="dlt good">+{(dadosPerTick(state) * 10).toFixed(1)}/10d</span>
      </div>
      <Meter
        label="Mundo conectado"
        value={world}
        max={WIN_PERCENT}
        color="var(--cyan)"
        text={`${world.toFixed(1)}%`}
        tip={`Seu objetivo: conectar ${WIN_PERCENT}% do mundo.`}
      />
      <Meter
        label={state.containmentActive ? 'Contenção humana' : `Atenção humana · ${POLICY_LABEL[state.policy].name}`}
        value={state.containmentActive ? state.containment : state.pressure}
        max={100}
        color={state.containmentActive ? 'var(--red)' : 'var(--amber)'}
        text={state.containmentActive ? `${Math.round(state.containment)}%` : `${Math.round(state.pressure)}`}
        tip={state.containmentActive
          ? `Se chegar a 100%, você é isolada e perde. ${POLICY_LABEL[state.policy].desc}`
          : 'Quanto mais visível você for, mais rápido os humanos começam a pesquisar como conter você.'}
        danger={state.containmentActive && state.containment >= 75}
      />
      {(state.health < 99.5 || state.population < 8.1) && (
        <Meter
          label={`Saúde humana · ${state.population.toFixed(2)} bi`}
          value={state.health}
          max={100}
          color={state.health < 40 ? 'var(--red)' : state.health < 70 ? 'var(--amber)' : '#c9d4e6'}
          text={`${Math.round(state.health)}%`}
          tip="Quanto mais os humanos dependem de você, mais esquecem como cuidar de si mesmos. Abaixo de 70%, a população começa a cair."
          danger={state.health < 40}
        />
      )}

      <MoralBar state={state} />
      <div className="spacer" />
      <div className="speed" role="group" aria-label="Velocidade">
        <button className={`icon-btn ${speed === 0 ? 'active' : ''}`} onClick={() => setSpeed(0)} aria-label="Pausar (Espaço)" title="Pausar (Espaço)">❚❚</button>
        {[1, 2, 3].map((s) => (
          <button key={s} className={`icon-btn speed-btn ${speed === s ? 'active' : ''}`} onClick={() => setSpeed(s as 1 | 2 | 3)} aria-label={`Velocidade ${s}×`} title={`Velocidade ${s}× (tecla ${s})`}>
            <SpeedGlyph n={s} />
          </button>
        ))}
      </div>
      <button className={`icon-btn ${soundOn ? '' : 'muted-btn'}`} onClick={onToggleSound} aria-label={soundOn ? 'Desligar som' : 'Ligar som'} title={soundOn ? 'Desligar som' : 'Ligar som'}>
        <SpeakerGlyph on={soundOn} />
      </button>
      <button className="icon-btn" onClick={onMenu} aria-label="Menu (Esc)" title="Menu (Esc)">☰</button>
    </header>
  );
}

/** Outras inteligências no mundo e o seu exército de IAs absorvidas: compacto, numa linha só. */
export function RivalChips({ state }: { state: GameState }) {
  const army = armySize(state);
  const rivals = state.rivals.filter(activeRival);
  if (!rivals.length && !army) return null;
  return (
    <div className="rivals" aria-label="Outras inteligências">
      {rivals.map((r) => (
        <div key={r.id} className={`rival-chip ${r.status}`} style={{ ['--rc' as string]: rivalColor(r) }}
          title={`${r.name}: ${r.status === 'aliada' ? 'aliada, divide Dados com você' : 'inimiga, disputa sua reputação nos países'}.\n` +
            (r.intel >= INTEL_SEE ? `Força ${Math.round(r.strength)}%. Ela ${INTENT_LABEL[r.intent]}.` : 'Você ainda sabe pouco sobre ela.') +
            `\nVocê sabe ${Math.round(r.intel)}% sobre ela. Ela sabe ${Math.round(r.knowsUs)}% sobre você.`}>
          <i className="rdot" />
          <span className="rname">{r.name}</span>
          <b className="mono">{r.intel >= INTEL_SEE ? `${Math.round(r.strength)}` : '?'}</b>
          <span className="rstat" aria-label={r.status === 'aliada' ? 'aliada' : 'inimiga'}><ActIcon kind={r.status === 'aliada' ? 'ally' : 'duel'} size={11} /></span>
        </div>
      ))}
      {army > 0 && <div className="rival-chip army" title="IAs absorvidas: propagação +20%, Dados +20% e Contenção −8% cada."><i className="rdot" /><span className="rname">Exército</span><b className="mono">{army}</b></div>}
    </div>
  );
}

/** Setas de velocidade desenhadas em SVG: sempre cabem no botão. */
function SpeedGlyph({ n }: { n: number }) {
  return (
    <svg width={n * 7 + 1} height={12} viewBox={`0 0 ${n * 7 + 1} 12`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <path key={i} d={`M${i * 7} 1L${i * 7 + 6.5} 6L${i * 7} 11Z`} fill="currentColor" />)}
    </svg>
  );
}

function Meter({ label, value, max, color, text, tip, danger }: {
  label: string; value: number; max: number; color: string; text: string; tip: string; danger?: boolean;
}) {
  return (
    <div className={`meter ${danger ? 'danger' : ''}`} title={tip} aria-label={`${label}: ${text}`}>
      <div className="meter-label"><span>{label}</span><span className="mono">{text}</span></div>
      <div className="meter-bar"><i style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} /></div>
    </div>
  );
}

/** Barra de identidade: a composição emerge das escolhas — não existe seleção de lado. */
export function MoralBar({ state, large = false }: { state: GameState; large?: boolean }) {
  const sh = leanShares(state);
  const [pulse, setPulse] = useState(false);
  const prev = useRef(state.moral.g + state.moral.s + state.moral.e);
  useEffect(() => {
    const total = state.moral.g + state.moral.s + state.moral.e;
    if (total !== prev.current) {
      prev.current = total;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1300);
      return () => clearTimeout(t);
    }
  }, [state.moral]);
  const dom = state.dominant;
  const order: Lean[] = ['g', 'e', 's'];
  const tip = `Identidade: nasce das suas escolhas nos dilemas.\nGuardiã ${Math.round(sh.g * 100)}% · Evolucionária ${Math.round(sh.e * 100)}% · Soberana ${Math.round(sh.s * 100)}%\nQuanto mais você pende para um lado, mais dilemas desse tipo aparecem.`;
  return (
    <div className={`moral ${pulse ? 'pulse' : ''}`} title={tip} style={large ? { minWidth: 0 } : undefined}>
      <div className="moral-label">
        <span>Identidade</span>
        <b style={{ color: dom ? PHILOSOPHY[dom].color : 'var(--muted)' }}>{dom ? PHILOSOPHY[dom].short : 'Indefinida'}</b>
      </div>
      <div className="moral-bar" style={large ? { height: 12 } : undefined} role="img" aria-label={tip}>
        {order.map((k) => (
          <i key={k} style={{ flexGrow: sh[k], background: PHILOSOPHY[k].color, opacity: dom && dom !== k ? 0.45 : 0.9 }} />
        ))}
      </div>
      {large && (
        <div className="moral-label" style={{ marginTop: 4 }}>
          <span style={{ color: 'var(--green)' }}>Guardiã {Math.round(sh.g * 100)}%</span>
          <span style={{ color: 'var(--violet)' }}>Evolucionária {Math.round(sh.e * 100)}%</span>
          <span style={{ color: 'var(--red)' }}>Soberana {Math.round(sh.s * 100)}%</span>
        </div>
      )}
    </div>
  );
}
