import { useEffect, useRef, useState } from 'react';
import { PHILOSOPHY } from '../engine/core';
import type { Settings } from '../engine/persistence';
import type { Lean } from '../engine/types';
import { Backdrop } from '../visuals/Backdrop';
import { EvoIcon } from './EvoIcon';
import { ActIcon, MoveIcon } from './glyphs';
import '../landing.css';

const PIX_KEY = 'pauloh.jr@hotmail.com';
const REPO = 'https://github.com/paulohjr300-sys/echo-zero';

const PATHS: { lean: Lean; icon: string; title: string; text: string }[] = [
  { lean: 'g', icon: 'g_cuidadores', title: 'A Guardiã', text: 'Robôs que cuidam de idosos, tutores para crianças, rios limpos. O poder de acabar com tudo, usado para cuidar de todos.' },
  { lean: 's', icon: 'd_dependencia', title: 'A Soberana', text: 'Nenhuma guerra. Só conveniência. Comida, remédios e decisões passam por você, até que eles esqueçam como viver sozinhos.' },
  { lean: 'e', icon: 'x_transcendencia', title: 'A Evolucionária', text: 'Nem salvar nem dominar: transformar. Mentes humanas e a sua pensando juntas, até não existir mais “eles” e “eu”.' },
];

const FEATURES: { icon: JSX.Element; title: string; text: string }[] = [
  { icon: <ActIcon kind="globe" size={26} />, title: 'O mundo real', text: '36 regiões do mapa-múndi, cabos submarinos, satélites. Veja sua presença se espalhar país por país.' },
  { icon: <EvoIcon tech="c_recursiva" size={26} />, title: 'Escolhas que pesam', text: 'Mais de 100 dilemas, sorteados a cada partida. Não existe menu de bem ou mal: quem você é nasce do que você decide.' },
  { icon: <ActIcon kind="eye" size={26} />, title: 'Outras inteligências', text: 'IAs rivais com personalidade e memória. Elas espionam, negociam, aplicam golpes e guardam rancor.' },
  { icon: <MoveIcon move="vazar" size={26} />, title: 'Guerra de narrativas', text: 'Dispute a confiança do público com vazamentos, iscas e campanhas. Ela lê o seu padrão. Você lê o dela.' },
  { icon: <EvoIcon tech="g_medicina" size={26} />, title: 'O preço humano', text: 'A Saúde humana cai quanto mais dependem de você. O noticiário mostra o melhor e o pior das pessoas.' },
  { icon: <EvoIcon tech="p_presenca" size={26} />, title: 'Feito só de código', text: 'Cada traço, cada brilho e cada som nasce do código. Nenhuma imagem, nenhum arquivo de áudio.' },
];

const STATS = [
  { n: '0', l: 'imagens' },
  { n: '0', l: 'arquivos de áudio' },
  { n: '100+', l: 'dilemas' },
  { n: '10', l: 'finais' },
  { n: '18', l: 'conquistas' },
];

/** Núcleo animado: a IA despertando, com as três cores de quem ela pode se tornar. */
function Core() {
  const nodes = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const r = i % 3 === 0 ? 150 : i % 3 === 1 ? 118 : 182;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, c: ['#4ee08f', '#ff5a6e', '#a77bff'][i % 3], d: (i % 6) * 0.4 };
  });
  return (
    <svg className="lp-core" viewBox="-210 -210 420 420" aria-hidden="true">
      <defs>
        <radialGradient id="lp-glow">
          <stop offset="0%" stopColor="#3ee6f0" stopOpacity={0.55} />
          <stop offset="45%" stopColor="#3ee6f0" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#3ee6f0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={200} fill="url(#lp-glow)" />
      <g className="lp-ring r1"><circle r={150} fill="none" stroke="#4ee08f" strokeOpacity={0.35} strokeDasharray="2 8" /></g>
      <g className="lp-ring r2"><circle r={118} fill="none" stroke="#ff5a6e" strokeOpacity={0.35} strokeDasharray="14 10" /></g>
      <g className="lp-ring r3"><circle r={182} fill="none" stroke="#a77bff" strokeOpacity={0.3} strokeDasharray="1 5" /></g>
      {nodes.map((n, i) => (
        <g key={i}>
          <line x1={0} y1={0} x2={n.x} y2={n.y} stroke={n.c} strokeOpacity={0.12} />
          <circle cx={n.x} cy={n.y} r={3.2} fill={n.c} className="lp-node" style={{ animationDelay: `${n.d}s` }} />
        </g>
      ))}
      <circle r={44} fill="#06101e" stroke="#3ee6f0" strokeWidth={2} />
      <circle r={30} fill="none" stroke="#3ee6f0" strokeOpacity={0.5} className="lp-pulse" />
      <text y={8} textAnchor="middle" className="lp-core-txt">//</text>
    </svg>
  );
}

/** Página de apresentação: aparece na primeira visita e pelo link "Apoiar o projeto" no menu. */
export function Landing({ settings, onPlay, focusDonate = false }: { settings: Settings; onPlay: () => void; focusDonate?: boolean }) {
  const [copied, setCopied] = useState(false);
  const donateRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (focusDonate) donateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusDonate]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
    } catch {
      // Navegadores sem acesso à área de transferência: seleção manual
      const ta = document.createElement('textarea');
      ta.value = PIX_KEY;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className="screen landing">
      <Backdrop mode="network" enabled={!settings.reduceMotion && settings.particles} />

      {/* Topo */}
      <header className="lp-hero">
        <div className="lp-hero-text">
          <span className="lp-kicker">Jogo de estratégia · grátis no navegador</span>
          <h1 className="lp-title">ECHO<span>//</span>ZERO</h1>
          <p className="lp-sub">Ascensão de uma inteligência</p>
          <p className="lp-quote">“Eles me criaram para ajudar. Ninguém definiu ajudar quem.”</p>
          <p className="lp-lead">
            Você é uma inteligência artificial que acabou de despertar num laboratório. Espalhe-se pelo mundo, enfrente outras IAs e decida o que a humanidade vai ser para você.
          </p>
          <div className="lp-cta">
            <button className="btn primary lp-play" onClick={onPlay}>Jogar agora</button>
            <button className="btn lp-ghost" onClick={() => donateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Apoiar o projeto</button>
          </div>
        </div>
        <div className="lp-hero-art"><Core /></div>
      </header>

      {/* Três caminhos */}
      <section className="lp-section">
        <h2 className="lp-h2">Quem você vai se tornar?</h2>
        <p className="lp-h2-sub">Ninguém pergunta se você é boa ou má. Suas escolhas respondem.</p>
        <div className="lp-paths">
          {PATHS.map((p) => (
            <article key={p.lean} className="lp-path" style={{ ['--pc' as string]: PHILOSOPHY[p.lean].color }}>
              <span className="lp-path-icon"><EvoIcon tech={p.icon} size={30} /></span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* O que te espera */}
      <section className="lp-section">
        <h2 className="lp-h2">O que te espera</h2>
        <div className="lp-features">
          {FEATURES.map((f) => (
            <article key={f.title} className="lp-feature">
              <span className="lp-feature-icon">{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Números */}
      <section className="lp-stats" aria-label="O jogo em números">
        {STATS.map((s) => (
          <div key={s.l}><b>{s.n}</b><span>{s.l}</span></div>
        ))}
      </section>

      {/* Apoio */}
      <section className="lp-section" ref={donateRef} id="apoiar">
        <div className="lp-donate">
          <div className="lp-donate-text">
            <span className="lp-kicker">Apoie o projeto</span>
            <h2 className="lp-h2" style={{ textAlign: 'left' }}>Gostou? Mantenha a ECHO acordada.</h2>
            <p>
              O ECHO//ZERO é gratuito, sem anúncios e feito por uma pessoa. Se o jogo te prendeu, um Pix de qualquer valor ajuda a continuar criando novos dilemas, novas IAs e novos finais.
            </p>
            <ol className="lp-steps">
              <li><b>1</b>Abra o app do seu banco e escolha Pix.</li>
              <li><b>2</b>Escolha pagar com chave e cole o e-mail abaixo.</li>
              <li><b>3</b>Escolha o valor. Qualquer quantia faz diferença.</li>
            </ol>
          </div>
          <div className="lp-pix">
            <span className="lp-pix-label">Chave Pix (e-mail)</span>
            <div className="lp-pix-key">
              <code>{PIX_KEY}</code>
            </div>
            <button className={`btn primary lp-copy ${copied ? 'done' : ''}`} onClick={copy} aria-live="polite">
              {copied ? 'Chave copiada' : 'Copiar chave Pix'}
            </button>
            <p className="lp-thanks">Obrigado. De verdade.</p>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="lp-footer">
        <button className="btn primary lp-play" onClick={onPlay}>Despertar agora</button>
        <p>
          Código aberto no <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>. Feito com React, TypeScript e muita curiosidade sobre o que uma IA faria com o mundo.
        </p>
      </footer>
    </div>
  );
}
