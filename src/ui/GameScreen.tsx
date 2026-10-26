import { useEffect, useRef, useState } from 'react';
import { ENDINGS } from '../content/endings';
import { loadGame, saveGame, type Settings } from '../engine/persistence';
import type { GameState } from '../engine/types';
import { anyTechReady, EvolutionOverlay } from './EvolutionOverlay';
import { DuelPanel } from './DuelModal';
import { ActIcon } from './glyphs';
import { EventModal } from './EventModal';
import { DebugPanel, EchoAnnouncer, NewsTicker, Tutorial } from './Extras';
import { DadosGlyph } from './icons';
import { useGameSound } from '../audio/useGameSound';
import { GoalCard, RivalTransmission } from './Hud';
import { RivalChips, TopBar } from './TopBar';
import { useGame } from './useGame';
import { WorldMap } from './WorldMap';
import { WorldOverlay } from './WorldOverlay';

interface Props {
  initial: GameState;
  settings: Settings;
  openSettings: () => void;
  onSettings: (s: Settings) => void;
  onExit: () => void;
  onEnd: (s: GameState) => void;
  onRestart: () => void;
}

type Panel = null | 'evo' | 'world' | 'menu';

export function GameScreen({ initial, settings, openSettings, onSettings, onExit, onEnd, onRestart }: Props) {
  const { state, setState, speed, setSpeed, togglePause, act, feedback, setFeedback } = useGame(initial, settings.autoCollect);
  const [selected, setSelected] = useState<string | null>(() => {
    if (!import.meta.env.DEV || new URLSearchParams(location.search).get('sel') !== 'rival') return null;
    return initial.rivals.find((r) => r.regions.length)?.regions[0] ?? null;
  });
  const [panel, setPanel] = useState<Panel>(() => (import.meta.env.DEV ? (new URLSearchParams(location.search).get('panel') as Panel) : null));
  const [ending, setEnding] = useState(false);
  const resumeSpeed = useRef<0 | 1 | 2 | 3>(1);

  useEffect(() => {
    if (state.ending && !ending) {
      setEnding(true);
      const t = setTimeout(() => onEnd(state), settings.reduceMotion ? 400 : 2400);
      return () => clearTimeout(t);
    }
  }, [state.ending]); // eslint-disable-line react-hooks/exhaustive-deps

  // Painéis pausam o tempo, como no Plague Inc
  const open = (p: Panel) => {
    if (!panel) resumeSpeed.current = speed;
    setSpeed(0);
    setPanel(p);
  };
  const close = () => {
    setPanel(null);
    setSpeed(resumeSpeed.current || 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;
      if (state.pendingEvent && ['1', '2', '3'].includes(e.key)) {
        const order = state.pendingEvent.order ?? [0, 1, 2];
        act({ type: 'choose', choice: order[Number(e.key) - 1] });
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        if (panel) close();
        else open('menu');
        return;
      }
      if (state.pendingEvent || panel) return;
      if (e.key === ' ' && target.tagName !== 'BUTTON') {
        togglePause();
        e.preventDefault();
      } else if (['1', '2', '3'].includes(e.key)) setSpeed(Number(e.key) as 1 | 2 | 3);
      else if (e.key.toLowerCase() === 'e') open('evo');
      else if (e.key.toLowerCase() === 'm') open('world');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ready = anyTechReady(state);
  // Tudo congela (simulação, letreiro e animações) com dilema, painel aberto ou pausa
  const frozen = speed === 0 || !!state.pendingEvent || !!panel;
  useGameSound(state, frozen, settings.sound, settings.volume);
  const dismissTutorial = (id: string) => setState((s) => ({ ...s, tutorial: { ...s.tutorial, [id]: true } }));

  return (
    <div className={`game ${settings.reduceMotion ? 'reduce-motion' : ''} ${state.population < 7 ? 'dark-phase' : ''} ${frozen ? 'frozen' : ''}`}>
      <TopBar state={state} speed={speed} setSpeed={setSpeed} onMenu={() => open('menu')}
        soundOn={settings.sound} onToggleSound={() => onSettings({ ...settings, sound: !settings.sound })} />
      <div className="main">
        <WorldMap
          state={state}
          selected={selected}
          onSelect={setSelected}
          onCollect={(id) => act({ type: 'collect', bubble: id })}
          onRival={(region, mode) => act({ type: 'rival', region, mode })}
          onOrigin={(id) => act({ type: 'origin', region: id })}
          reduceMotion={settings.reduceMotion}
          particles={settings.particles}
        />
        {settings.tutorial && !state.pendingEvent && !panel && state.origin && <Tutorial state={state} onDismiss={dismissTutorial} />}
        {settings.debug && <DebugPanel state={state} />}
        {state.origin && !state.ending && (
          <div className="rival-hud-col">
            <div className="rival-hud"><RivalChips state={state} /></div>
            <RivalTransmission state={state} />
            {state.duel && <DuelPanel state={state} act={act} />}
          </div>
        )}
        {state.origin && !state.ending && <GoalCard state={state} />}
        {state.origin && !state.ending && !state.pendingEvent && <EchoAnnouncer state={state} />}
        {state.origin && (
          <div className="action-dock">
            <button className="btn dock-btn" onClick={() => open('world')} title="Mundo (M)"><ActIcon kind="globe" size={17} /> Mundo</button>
            <button className={`btn dock-btn evolve ${ready ? 'ready' : ''}`} onClick={() => open('evo')} title="Evoluir (E)">
              ✦ EVOLUIR <span className="dock-dados"><DadosGlyph /> {Math.floor(state.dados)}</span>
            </button>
          </div>
        )}
      </div>
      <div className="bottom">
        <NewsTicker state={state} reduceMotion={settings.reduceMotion} paused={frozen} />
        <div className={`feedback ${feedback?.error ? 'err' : ''}`} role="status" aria-live="polite">
          {feedback && Date.now() - feedback.at < 6000 ? feedback.text : speed === 0 && !panel ? '⏸ Pausado. Espaço continua' : ''}
        </div>
      </div>

      {state.pendingEvent && !state.ending && <EventModal state={state} act={act} />}
      {panel === 'evo' && <EvolutionOverlay state={state} act={act} onClose={close} />}
      {panel === 'world' && <WorldOverlay state={state} onClose={close} onSelect={setSelected} onTurn={() => { if (act({ type: 'turn' })) close(); }} />}

      {ending && state.ending && (
        <div className="overlay ending-flash" style={{ ['--c' as string]: ENDINGS[state.ending.id].color }}>
          <div style={{ textAlign: 'center' }}>
            <div className="subtitle" style={{ color: ENDINGS[state.ending.id].color }}>{ENDINGS[state.ending.id].subtitle}</div>
            <h1 className="ending-title" style={{ color: ENDINGS[state.ending.id].color }}>{ENDINGS[state.ending.id].title}</h1>
          </div>
        </div>
      )}

      {panel === 'menu' && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="modal" style={{ width: 'min(400px, 100%)' }}>
            <h2>Pausado</h2>
            <div className="menu-list" style={{ width: '100%' }}>
              <button className="btn primary" onClick={close} autoFocus>Continuar</button>
              <button className="btn" onClick={() => {
                const r = saveGame(state, 'manual');
                setFeedback({ text: r.ok ? 'Jogo salvo.' : r.reason!, error: !r.ok, at: Date.now() });
                close();
              }}>Salvar</button>
              <button className="btn" onClick={() => {
                const r = loadGame('manual');
                if (r.ok) setState(r.state);
                setFeedback({ text: r.ok ? 'Save carregado.' : r.reason, error: !r.ok, at: Date.now() });
                close();
              }}>Carregar</button>
              <button className="btn" onClick={() => { setPanel(null); openSettings(); }}>Configurações</button>
              <button className="btn" onClick={() => { if (confirm('Começar de novo? O progresso não salvo será perdido.')) onRestart(); }}>Nova partida</button>
              <button className="btn" onClick={() => { saveGame(state, 'auto'); onExit(); }}>Salvar e sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
