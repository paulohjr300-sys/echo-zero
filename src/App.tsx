import { useEffect, useState } from 'react';
import { dispatch } from './engine/actions';
import {
  clearAutosave, loadGame, loadMeta, loadSettings, recordEnding, saveMeta, saveSettings, type CampaignMeta, type Settings,
} from './engine/persistence';
import { startDuel } from './engine/duel';
import { tick } from './engine/sim';
import type { GameState, EndingId } from './engine/types';
import { createGame } from './engine/world';
import { EndScreen } from './ui/EndScreen';
import { GameScreen } from './ui/GameScreen';
import { Gallery, MainMenu, SettingsPanel } from './ui/Screens';

type Screen =
  | { id: 'menu' }
  | { id: 'game'; state: GameState; key: number }
  | { id: 'end'; state: GameState; fresh: string[] }
  | { id: 'gallery' };

/**
 * Atalho de desenvolvimento: ?quick=N[&lean=s] inicia uma partida já avançada N dias (testes visuais).
 * &event=<id> abre um dilema; &end=<final> mostra a tela final; &sel=rival seleciona a região de uma IA rival.
 */
function devQuickStart(): Screen | null {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(location.search);
  const q = params.get('quick');
  if (q === null) return null;
  const lean = params.get('lean') ?? 's';
  let s = dispatch(createGame(4242, 'normal'), { type: 'origin', region: 'usa' }).state;
  const order = ['g', 's', 'e'];
  for (let i = 0; i < (Number(q) || 200); i++) {
    if (s.pendingEvent) s = dispatch(s, { type: 'choose', choice: Math.max(0, order.indexOf(lean)) }).state;
    for (const b of s.bubbles) if (s.tick - b.born > 2) s = dispatch(s, { type: 'collect', bubble: b.id }).state;
    for (const id of ['p_presenca', 'c_aprendizado', 'd_dependencia', 'p_cabos', 'c_automacao', 'd_economia', 'p_protocolos']) {
      s = dispatch(s, { type: 'evolve', tech: id }).state;
    }
    s = tick(s);
  }
  s = { ...s, pendingEvent: null, tutorial: { bolhas: true, evoluir: true, moral: true, contencao: true, dominio: true, rival: true, saude: true, evolucao: true, cuidado: true } };
  const ev = params.get('event');
  if (ev) {
    const rv = s.rivals.find((r) => r.regions.length);
    s.pendingEvent = { id: ev, regionId: rv?.regions[0] ?? 'bra', rivalId: rv?.id, order: [0, 1, 2] };
  }
  if (params.get('duel')) {
    const rv = s.rivals.find((r) => r.regions.length);
    if (rv) startDuel(s, rv.regions[0], true);
  }
  const end = params.get('end');
  if (end) return { id: 'end', state: { ...s, ending: { id: end as EndingId, victory: true, tick: s.tick } }, fresh: ['primeiro'] };
  return { id: 'game', state: s, key: 1 };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => devQuickStart() ?? { id: 'menu' });
  const [meta, setMeta] = useState<CampaignMeta>(() => loadMeta());
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastDifficulty, setLastDifficulty] = useState('normal');
  const [lastScenario, setLastScenario] = useState('padrao');

  const setSettings = (s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
  };
  useEffect(() => {
    document.documentElement.style.setProperty('--fs', String(settings.fontScale));
  }, [settings.fontScale]);

  const play = (difficulty: string, scenario = lastScenario) => {
    setLastDifficulty(difficulty);
    setLastScenario(scenario);
    const s = createGame(Math.floor(Math.random() * 999999) + 1, difficulty, scenario);
    // Fragmentos de partidas vencidas dão um pequeno impulso inicial (Nova Era)
    s.dados += Math.min(6, meta.fragments);
    setScreen({ id: 'game', state: s, key: Date.now() });
  };
  const resume = () => {
    const r = loadGame('auto');
    if (r.ok) {
      setMessage(null);
      setScreen({ id: 'game', state: r.state, key: Date.now() });
    } else setMessage(r.reason);
  };
  const finish = (s: GameState) => {
    const m = recordEnding(meta, s);
    const fresh = m.achievements.filter((a) => !(meta.achievements ?? []).includes(a));
    setMeta(m);
    saveMeta(m);
    clearAutosave();
    setScreen({ id: 'end', state: s, fresh });
  };

  return (
    <>
      {screen.id === 'menu' && (
        <MainMenu meta={meta} settings={settings} message={message} onPlay={play} onContinue={resume}
          onGallery={() => setScreen({ id: 'gallery' })} onSettings={() => setShowSettings(true)} />
      )}
      {screen.id === 'gallery' && <Gallery meta={meta} settings={settings} onBack={() => setScreen({ id: 'menu' })} />}
      {screen.id === 'game' && (
        <GameScreen
          key={screen.key}
          initial={screen.state}
          settings={settings}
          openSettings={() => setShowSettings(true)}
          onSettings={setSettings}
          onExit={() => setScreen({ id: 'menu' })}
          onEnd={finish}
          onRestart={() => play(lastDifficulty)}
        />
      )}
      {screen.id === 'end' && (
        <EndScreen state={screen.state} fresh={screen.fresh} settings={settings} onNew={() => play(lastDifficulty)} onMenu={() => setScreen({ id: 'menu' })} />
      )}
      {showSettings && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />}
    </>
  );
}
