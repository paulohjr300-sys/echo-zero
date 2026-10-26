import { useState } from 'react';
import { ENDINGS } from '../content/endings';
import { DIFFICULTIES, DIFFICULTY_BY_ID } from '../content/setup';
import { SCENARIOS, SCENARIO_BY_ID } from '../content/scenarios';
import { ACHIEVEMENTS } from '../content/achievements';
import { PHILOSOPHY } from '../engine/core';
import type { CampaignMeta, Settings } from '../engine/persistence';
import { saveInfo } from '../engine/persistence';
import type { EndingId } from '../engine/types';
import { Backdrop } from '../visuals/Backdrop';

// ------------------------------------------------------------------ Menu principal

export function MainMenu(p: {
  meta: CampaignMeta;
  settings: Settings;
  onPlay: (difficulty: string, scenario: string) => void;
  onContinue: () => void;
  onGallery: () => void;
  onSettings: () => void;
  onSupport: () => void;
  message?: string | null;
}) {
  const auto = saveInfo('auto');
  const [diff, setDiff] = useState('normal');
  const [scen, setScen] = useState('padrao');
  return (
    <div className="screen">
      <Backdrop mode="network" enabled={!p.settings.reduceMotion && p.settings.particles} />
      <div className="screen-content">
        <h1 className="title-big">ECHO<span>//</span>ZERO</h1>
        <div className="subtitle">Ascensão de uma inteligência</div>
        <p className="quote">“Eles me criaram para ajudar. Ninguém definiu ajudar quem.”</p>
        <nav className="menu-list" aria-label="Menu principal">
          {auto && (
            <button className="btn primary" onClick={p.onContinue}>
              Continuar <span className="dim mono" style={{ fontSize: '.8em' }}>dia {auto.tick}</span>
            </button>
          )}
          <div className="diff-row" role="radiogroup" aria-label="Dificuldade">
            {DIFFICULTIES.map((d) => (
              <button key={d.id} role="radio" aria-checked={diff === d.id} className={`btn small ${diff === d.id ? 'sel' : ''}`} onClick={() => setDiff(d.id)} title={d.desc}>
                {d.name}
              </button>
            ))}
          </div>
          <p className="dim" style={{ margin: '-2px 0 2px', fontSize: '.82em', textAlign: 'center' }}>{DIFFICULTY_BY_ID[diff].desc}</p>
          <div className="scen-row" role="radiogroup" aria-label="Começo">
            {SCENARIOS.map((x) => (
              <button key={x.id} role="radio" aria-checked={scen === x.id} className={`scen ${scen === x.id ? 'sel' : ''}`} onClick={() => setScen(x.id)} title={x.desc}>
                {x.name}
              </button>
            ))}
          </div>
          <p className="dim" style={{ margin: '-2px 0 2px', fontSize: '.82em', textAlign: 'center' }}>{SCENARIO_BY_ID[scen].desc}</p>
          <button className={`btn ${auto ? '' : 'primary'} play-btn`} onClick={() => p.onPlay(diff, scen)}>▶ Nova partida</button>
          <button className="btn" onClick={p.onGallery}>Finais <span className="dim">({p.meta.discoveredEndings.length}/{Object.keys(ENDINGS).length})</span></button>
          <button className="btn" onClick={p.onSettings}>Configurações</button>
          <button className="btn menu-support" onClick={p.onSupport}>Apoiar o projeto</button>
        </nav>
        {p.message && <p className="bad" role="alert" style={{ marginTop: 16 }}>{p.message}</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Galeria de finais

export function Gallery({ meta, settings, onBack }: { meta: CampaignMeta; settings: Settings; onBack: () => void }) {
  const ids = (Object.keys(ENDINGS) as EndingId[]).sort((a, b) => ENDINGS[a].rank - ENDINGS[b].rank);
  return (
    <div className="screen">
      <Backdrop mode="network" enabled={!settings.reduceMotion && settings.particles} />
      <div className="screen-content" style={{ justifyContent: 'flex-start' }}>
        <h2 style={{ fontFamily: 'var(--mono)', letterSpacing: '.1em' }}>FINAIS</h2>
        <div className="grid-cards" style={{ marginBottom: 20, maxWidth: 900 }}>
          {ids.map((id) => {
            const e = ENDINGS[id];
            const found = meta.discoveredEndings.includes(id);
            return (
              <div key={id} className="card" style={{ borderColor: found ? e.color : undefined, opacity: found ? 1 : 0.6 }}>
                <div className="fam" style={{ color: e.color }}>#{e.rank} · {e.subtitle}</div>
                <h4>{found ? e.title : '? ? ?'}</h4>
                <p className="muted"><i>{found ? e.theme : 'Ainda não alcançado.'}</i></p>
              </div>
            );
          })}
        </div>
        <h2 style={{ fontFamily: 'var(--mono)', letterSpacing: '.1em', marginTop: 8 }}>CONQUISTAS <span className="dim" style={{ fontSize: '.6em' }}>{(meta.achievements ?? []).length}/{ACHIEVEMENTS.length}</span></h2>
        <div className="ach-grid">
          {ACHIEVEMENTS.map((a) => {
            const has = (meta.achievements ?? []).includes(a.id);
            return (
              <div key={a.id} className={`ach ${has ? 'got' : ''}`}>
                <span className="ach-icon">{has ? '★' : '☆'}</span>
                <div><b>{a.title}</b><p>{a.desc}</p></div>
              </div>
            );
          })}
        </div>
        <div style={{ width: 'min(900px, 100%)', marginBottom: 20 }}>
          {meta.records.slice(0, 10).map((r, i) => (
            <div key={i} style={{ fontSize: '.86em', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: ENDINGS[r.ending]?.color }}>{ENDINGS[r.ending]?.title ?? r.ending}</span>
              <span className="muted"> · {r.days} dias · {r.philosophy ? PHILOSOPHY[r.philosophy].short : 'indefinida'} · {DIFFICULTY_BY_ID[r.difficulty]?.name ?? ''}</span>
            </div>
          ))}
        </div>
        <button className="btn" onClick={onBack}>Voltar</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Configurações

export function SettingsPanel({ settings, onChange, onClose }: { settings: Settings; onChange: (s: Settings) => void; onClose: () => void }) {
  const toggle = (k: keyof Settings, label: string, desc: string) => (
    <label className="toggle">
      <span>{label}<br /><span className="dim" style={{ fontSize: '.84em' }}>{desc}</span></span>
      <input type="checkbox" checked={!!settings[k]} onChange={(e) => onChange({ ...settings, [k]: e.target.checked })} />
    </label>
  );
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Configurações" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal" style={{ width: 'min(500px, 100%)' }}>
        <h2>Configurações</h2>
        {toggle('sound', 'Som', 'Trilha e efeitos, todos gerados pelo próprio jogo.')}
        <label className="toggle">
          <span>Volume</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.volume} style={{ width: 160 }} disabled={!settings.sound}
            onChange={(e) => onChange({ ...settings, volume: Number(e.target.value) })} aria-label="Volume" />
        </label>
        {toggle('autoCollect', 'Coletar bolhas automaticamente', 'Para quem prefere não clicar.')}
        {toggle('tutorial', 'Dicas', 'Mensagens curtas no começo da partida.')}
        {toggle('reduceMotion', 'Reduzir movimento', 'Desliga animações; nenhuma informação se perde.')}
        {toggle('particles', 'Brilho e partículas', 'Efeitos visuais do mapa.')}
        {toggle('debug', 'Painel de depuração', 'Para testes.')}
        <label className="toggle">
          <span>Tamanho da fonte</span>
          <input type="range" min={0.85} max={1.35} step={0.05} value={settings.fontScale} style={{ width: 160 }}
            onChange={(e) => onChange({ ...settings, fontScale: Number(e.target.value) })} aria-label="Tamanho da fonte" />
        </label>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn primary" onClick={onClose} autoFocus>Fechar</button>
        </div>
      </div>
    </div>
  );
}
