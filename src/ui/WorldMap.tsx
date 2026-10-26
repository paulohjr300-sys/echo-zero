import { activeRival, rivalActionCost, rivalColor, rivalCooldown, type RivalMode } from '../engine/rivals';
import { ActIcon, RivalSigil } from './glyphs';
import type { Rival } from '../engine/types';
import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from 'react';
import { COUNTRY_PT } from '../content/countries';
import { REGIONS, REGION_BY_ID, REGION_TYPES } from '../content/regions';
import { neighbors } from '../engine/core';
import { TYPE_BONUS } from '../engine/sim';
import type { Bubble, GameState, Region } from '../engine/types';
import { isCable } from '../engine/world';
import { dotsPath, getWorldGeo, linkPaths, MAP_H, MAP_W } from '../visuals/geo';
import { STATUS_META, TypeGlyph, TypeShape } from './icons';

const LAND = [30, 44, 70];
function mix(target: number[], t: number) {
  const c = LAND.map((b, i) => Math.round(b + (target[i] - b) * Math.min(1, Math.max(0, t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function fillFor(r: Region): string {
  if (r.status === 'resistindo') return mix([190, 130, 40], 0.35 + r.influence / 300);
  if (r.status === 'desligada') return mix([170, 50, 70], 0.35);
  if (r.presence) return mix([40, 170, 190], 0.15 + (r.influence / 100) * 0.55);
  return mix(LAND, 0);
}

const BUBBLE_STYLE = {
  dados: { color: '#3ee6f0', label: 'Dados' },
  conexao: { color: '#ffb547', label: 'Nova conexão' },
  ajuda: { color: '#4ee08f', label: 'Pedido de ajuda' },
};

interface Props {
  state: GameState;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onCollect: (id: number) => void;
  onOrigin: (id: string) => void;
  onRival: (region: string, mode: RivalMode) => void;
  reduceMotion: boolean;
  particles: boolean;
}

interface View { k: number; x: number; y: number }

const StaticBase = memo(function StaticBase() {
  const geo = getWorldGeo();
  return (
    <g>
      <path d={geo.sphere} fill="var(--ocean)" />
      <path d={geo.graticule} fill="none" stroke="rgba(90,140,200,.07)" strokeWidth={0.5} />
    </g>
  );
});

function WorldMapInner({ state, selected, onSelect, onCollect, onOrigin, onRival, reduceMotion, particles }: Props) {
  const geo = getWorldGeo();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<{ id: string; country: string; x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [rings, setRings] = useState<{ key: string; id: string; color: string }[]>([]);
  const [pops, setPops] = useState<{ key: number; x: number; y: number; text: string; color: string }[]>([]);
  const prevStatus = useRef<Record<string, string>>({});

  const choosingOrigin = !state.origin;

  const frontier = useMemo(() => {
    const f = new Set<string>();
    for (const r of Object.values(state.regions)) {
      if (!r.presence || r.influence < 15) continue;
      for (const n of neighbors(state, r.id)) if (!state.regions[n].presence) f.add(n);
    }
    return f;
  }, [state]);

  // Pulso quando uma região fica totalmente conectada
  useEffect(() => {
    const added: { key: string; id: string; color: string }[] = [];
    for (const r of Object.values(state.regions)) {
      const prev = prevStatus.current[r.id];
      if (prev && prev !== r.status && r.status === 'conectada') added.push({ key: `${r.id}-${state.tick}`, id: r.id, color: 'var(--cyan)' });
      prevStatus.current[r.id] = r.status;
    }
    if (added.length && !reduceMotion) {
      setRings((x) => [...x, ...added].slice(-12));
      const t = setTimeout(() => setRings((x) => x.filter((r) => !added.includes(r))), 2000);
      return () => clearTimeout(t);
    }
  }, [state.tick, state.regions, reduceMotion]);

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };
  const clampView = (v: View): View => {
    const k = Math.min(7, Math.max(1, v.k));
    return { k, x: Math.min(0, Math.max(MAP_W - MAP_W * k, v.x)), y: Math.min(0, Math.max(MAP_H - MAP_H * k, v.y)) };
  };
  const zoomAt = (factor: number, px = MAP_W / 2, py = MAP_H / 2) => {
    setView((v) => {
      const k = Math.min(7, Math.max(1, v.k * factor));
      return clampView({ k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k });
    });
  };
  const onWheel = (e: RWheelEvent) => {
    const p = toSvg(e.clientX, e.clientY);
    zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, p.x, p.y);
  };
  const onPointerDown = (e: RPointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onPointerMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      setDragging(true);
    }
    if (d.moved) {
      const rect = svgRef.current!.getBoundingClientRect();
      const ratio = Math.max(MAP_W / rect.width, MAP_H / rect.height);
      setView((v) => clampView({ ...v, x: d.vx + dx * ratio, y: d.vy + dy * ratio }));
    }
  };
  const onPointerUp = () => {
    setTimeout(() => (drag.current = null), 0);
    setDragging(false);
  };
  const clickRegion = (id: string) => {
    if (drag.current?.moved) return;
    if (choosingOrigin) onOrigin(id);
    else onSelect(id === selected ? null : id);
  };
  const collect = (b: Bubble, x: number, y: number) => {
    onCollect(b.id);
    const text = b.kind === 'conexao' ? '+ conexão' : `+${b.value} ◆`;
    const key = Date.now() + b.id;
    setPops((p) => [...p.slice(-6), { key, x, y, text, color: BUBBLE_STYLE[b.kind].color }]);
    setTimeout(() => setPops((p) => p.filter((q) => q.key !== key)), 900);
  };

  const sk = Math.sqrt(view.k);
  const labelAll = view.k >= 1.7;
  const glyphScale = 0.5 / sk;
  // Em telas pequenas ou de toque as bolhas crescem para caber o dedo
  const touch = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 900 || window.innerHeight < 520) ? 1.7 : 1;
  const hovered = hover ? state.regions[hover.id] : null;
  const rivalAt = new Map<string, Rival>();
  for (const rv of state.rivals) if (activeRival(rv)) for (const id of rv.regions) rivalAt.set(id, rv);
  const sel = selected ? state.regions[selected] : null;

  return (
    <div ref={wrapRef} className={`map-wrap ${dragging ? 'dragging' : ''} ${choosingOrigin ? 'choose-origin' : ''}`} onPointerLeave={() => setHover(null)}>
      <svg
        ref={svgRef}
        className="world"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Mapa-múndi. Clique nas bolhas para coletar Dados."
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <defs>
          <pattern id="hatch-amber" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,181,71,.55)" strokeWidth="1.2" />
          </pattern>
          <pattern id="hatch-red" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0,0L4,4M4,0L0,4" stroke="rgba(255,90,110,.5)" strokeWidth=".7" />
          </pattern>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="bubble-shine" cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#fff" stopOpacity=".55" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".08" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="map-clip"><rect width={MAP_W} height={MAP_H} /></clipPath>
        </defs>
        <g clipPath="url(#map-clip)">
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            <StaticBase />
            {REGIONS.map((def) => {
              const r = state.regions[def.id];
              const g = geo.regions[def.id];
              return (
                <g key={def.id}>
                  {g.parts.map((part) => (
                    <path
                      key={part.name}
                      className="region-shape"
                      d={part.d}
                      fill={fillFor(r)}
                      onClick={() => clickRegion(def.id)}
                      onPointerMove={(e) => {
                        const rect = wrapRef.current!.getBoundingClientRect();
                        setHover({ id: def.id, country: part.name, x: e.clientX - rect.left, y: e.clientY - rect.top });
                      }}
                      onPointerLeave={() => setHover(null)}
                    />
                  ))}
                  <path d={g.d} fill="none" stroke="rgba(150,190,240,.42)" strokeWidth={0.6 / view.k} pointerEvents="none" />
                  {r.status === 'resistindo' && <path d={g.d} fill="url(#hatch-amber)" pointerEvents="none" />}
                  {r.status === 'desligada' && <path d={g.d} fill="url(#hatch-red)" pointerEvents="none" />}
                  {(state.chaos?.[def.id] ?? 0) > state.tick && <path d={g.d} fill="url(#hatch-red)" className="region-chaos" pointerEvents="none" />}
                  {rivalAt.has(def.id) && (
                    <path d={g.d} className={`region-rival ${rivalAt.get(def.id)!.status}`} strokeWidth={1.6 / view.k} pointerEvents="none"
                      style={{
                        fill: rivalColor(rivalAt.get(def.id)!), stroke: rivalColor(rivalAt.get(def.id)!),
                        fillOpacity: (selected === def.id ? 0.55 : 0.22) + 0.4 * (rivalAt.get(def.id)!.rep[def.id] ?? 0) / 100,
                      }} />
                  )}
                </g>
              );
            })}
            <path d={geo.countryBorders} fill="none" stroke="rgba(120,150,190,.14)" strokeWidth={0.35 / view.k} pointerEvents="none" />
            <path d={geo.coast} fill="none" stroke="rgba(120,200,255,.3)" strokeWidth={0.5 / view.k} pointerEvents="none" />

            {/* Rotas */}
            <g pointerEvents="none">
              {state.links.map(([a, b]) => {
                const active = state.regions[a].presence && state.regions[b].presence;
                const cable = isCable(a, b);
                const cut = state.cutLinks.some((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
                if (cut) {
                  return linkPaths(geo.regions[a].anchor, geo.regions[b].anchor, cable ? 0.22 : 0.08).map((d, i) => (
                    <path key={`${a}-${b}-${i}`} d={d} className="link cut" strokeWidth={1.1 / sk} />
                  ));
                }
                return linkPaths(geo.regions[a].anchor, geo.regions[b].anchor, cable ? 0.22 : 0.08).map((d, i) => (
                  <path
                    key={`${a}-${b}-${i}`}
                    d={d}
                    className={`link ${cable ? 'cable' : ''} ${active ? 'active' : ''} ${active && particles && !reduceMotion ? 'flow' : ''}`}
                    strokeWidth={(active ? 0.9 : 0.6) / sk}
                  />
                ));
              })}
            </g>

            {/* Pontos de presença */}
            <g pointerEvents="none">
              {REGIONS.map((def) => {
                const r = state.regions[def.id];
                if (!r.presence) return null;
                const count = Math.max(3, Math.round((r.influence / 100) * geo.regions[def.id].dots.length));
                const color = r.status === 'resistindo' ? '#ffb547' : '#5ff3ff';
                return (
                  <path key={def.id} d={dotsPath(geo.regions[def.id].dots, count, 1.25 / sk)} fill={color} opacity={0.92}
                    filter={particles ? 'url(#glow)' : undefined} />
                );
              })}
            </g>

            {[...frontier].map((id) => (
              <path key={id} d={geo.regions[id].d} className="region-frontier" strokeWidth={0.8 / view.k} />
            ))}
            {selected && <path d={geo.regions[selected].d} className="region-sel" strokeWidth={1.4 / view.k} />}

            {/* Ícones e rótulos */}
            <g pointerEvents="none">
              {REGIONS.map((def) => {
                const r = state.regions[def.id];
                const [x, y] = geo.regions[def.id].anchor;
                const show = labelAll || def.id === selected || def.id === hover?.id || choosingOrigin;
                const color = r.presence ? STATUS_META[r.status].color : 'rgba(170,190,220,.5)';
                return (
                  <g key={def.id} transform={`translate(${x},${y})`}>
                    <g transform={`scale(${glyphScale})`}>
                      <circle r={9} fill="rgba(5,9,18,.72)" stroke={color} strokeWidth={0.8} />
                      <TypeShape type={def.type} color={color} scale={0.95} />
                      {r.presence && rivalAt.has(def.id) && (
                        <g transform="translate(9,-9)" className={`shared-badge ${rivalAt.get(def.id)!.status}`}>
                          <circle r={5.4} fill="#070d1a" stroke={rivalColor(rivalAt.get(def.id)!)} strokeWidth={1.1} />
                          {rivalAt.get(def.id)!.status === 'aliada' ? (
                            <g fill="none" stroke={rivalColor(rivalAt.get(def.id)!)} strokeWidth={0.9}>
                              <circle cx={-1.3} r={1.9} />
                              <circle cx={1.3} r={1.9} />
                            </g>
                          ) : (
                            <path d="M-2.6 -2.6L2.6 2.6M2.6 -2.6L-2.6 2.6" stroke={rivalColor(rivalAt.get(def.id)!)} strokeWidth={1.1} strokeLinecap="round" />
                          )}
                        </g>
                      )}
                    </g>
                    {show && (
                      <text className="map-label" y={-8 * glyphScale - 4 / view.k} textAnchor="middle" fontSize={7 / sk} strokeWidth={2.2 / sk}>
                        {def.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Animações */}
            <g pointerEvents="none">
              {state.arcs.map((a) => {
                const A = geo.regions[a.from]?.anchor;
                const B = geo.regions[a.to]?.anchor;
                if (!A || !B) return null;
                if (a.from === a.to) {
                  return reduceMotion ? null : <circle key={a.id} cx={A[0]} cy={A[1]} r={8 / sk} className="ring" stroke={a.color ?? 'var(--red)'} />;
                }
                const paths = linkPaths(A, B, 0.28);
                if (!paths.length) {
                  return reduceMotion ? null : <circle key={a.id} cx={B[0]} cy={B[1]} r={8 / sk} className="ring" stroke="#9ffaff" />;
                }
                return paths.map((d, i) =>
                  reduceMotion ? (
                    <path key={`${a.id}-${i}`} d={d} fill="none" stroke={a.color ?? '#9ffaff'} strokeWidth={1.2 / sk} opacity={0.8} />
                  ) : (
                    <g key={`${a.id}-${i}`}>
                      <path d={d} className="arc" stroke={a.color ?? '#9ffaff'} strokeWidth={(a.kind === 'raid' ? 2.2 : 1.6) / sk} filter="url(#glow)" />
                      <circle r={2.2 / sk} fill="#fff">
                        <animateMotion
                          ref={(el: SVGAnimationElement | null) => {
                            if (el && !el.dataset.started) {
                              el.dataset.started = '1';
                              el.beginElement();
                            }
                          }}
                          begin="indefinite" dur="1.4s" fill="freeze" path={d}
                        />
                      </circle>
                    </g>
                  ),
                );
              })}
              {rings.map((r) => {
                const [x, y] = geo.regions[r.id].anchor;
                return <circle key={r.key} cx={x} cy={y} r={10 / sk} className="ring" stroke={r.color} />;
              })}
            </g>

            {/* Bolhas: clique para coletar */}
            {state.bubbles.map((b) => {
              const dots = geo.regions[b.region].dots;
              const [x, y] = dots.length ? dots[(b.id * 37) % dots.length] : geo.regions[b.region].anchor;
              const st = BUBBLE_STYLE[b.kind];
              const age = state.tick - b.born;
              const fading = age > 10;
              return (
                <g
                  key={b.id}
                  className={`bubble ${fading ? 'fading' : ''}`}
                  transform={`translate(${x},${y}) scale(${touch / sk})`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    collect(b, x, y);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${st.label} em ${REGION_BY_ID[b.region].name}`}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && collect(b, x, y)}
                >
                  <g className="bubble-inner">
                    <circle r={touch > 1 ? 18 : 13} fill={st.color} opacity={touch > 1 ? 0.12 : 0.18} />
                    <circle r={9.5} fill="rgba(5,12,24,.85)" stroke={st.color} strokeWidth={1.8} />
                    <circle r={9.5} fill="url(#bubble-shine)" />
                    {b.kind === 'dados' && <path d="M0,-5.5L4.5,0L0,5.5L-4.5,0Z" fill={st.color} />}
                    {b.kind === 'conexao' && <path d="M-5,0H5M0,-5V5" stroke={st.color} strokeWidth={2.4} strokeLinecap="round" />}
                    {b.kind === 'ajuda' && <path d="M0,4.5C-6,0 -5,-5 0,-2C5,-5 6,0 0,4.5Z" fill={st.color} />}
                  </g>
                </g>
              );
            })}
            {pops.map((p) => (
              <text key={p.key} x={p.x} y={p.y} className="pop" fill={p.color} fontSize={10 / sk} textAnchor="middle">{p.text}</text>
            ))}
          </g>
        </g>
      </svg>

      <div className="map-hud br">
        <button className="icon-btn" onClick={() => zoomAt(1.4)} aria-label="Aproximar">+</button>
        <button className="icon-btn" onClick={() => zoomAt(1 / 1.4)} aria-label="Afastar">−</button>
        <button className="icon-btn" onClick={() => setView({ k: 1, x: 0, y: 0 })} aria-label="Ver mapa inteiro">⤢</button>
      </div>

      {choosingOrigin && (
        <div className="origin-banner">
          <b>Onde a inteligência desperta?</b>
          <div className="muted" style={{ fontSize: '.9em' }}>Toque em qualquer região do mapa para começar.</div>
        </div>
      )}

      {hover && hovered && !sel && (
        <div className="map-tip" style={{ left: hover.x, top: hover.y }}>
          <b>{COUNTRY_PT[hover.country] ?? hover.country}</b>
          <div className="muted" style={{ fontSize: '.8em' }}>{REGION_BY_ID[hover.id].name}</div>
          <div style={{ color: STATUS_META[hovered.status].color, fontSize: '.88em' }}>
            {STATUS_META[hovered.status].mark} {hovered.presence ? `${Math.round(hovered.influence)}% conectada` : STATUS_META[hovered.status].label}
          </div>
        </div>
      )}

      {sel && selected && (
        <div className="region-card" role="dialog" aria-label={REGION_BY_ID[selected].name}>
          <button className="icon-btn close" onClick={() => onSelect(null)} aria-label="Fechar">×</button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <TypeGlyph type={REGION_BY_ID[selected].type} size={30} color={STATUS_META[sel.status].color} />
            <div>
              <b style={{ fontSize: '1.1em' }}>{REGION_BY_ID[selected].name}</b>
              <div className="muted" style={{ fontSize: '.85em' }}>{REGION_TYPES[REGION_BY_ID[selected].type].label}</div>
            </div>
          </div>
          <div className="big-meter">
            <div className="meter-label"><span style={{ color: STATUS_META[sel.status].color }}>{STATUS_META[sel.status].mark} {STATUS_META[sel.status].label}</span><span className="mono">{Math.round(sel.influence)}%</span></div>
            <div className="meter-bar"><i style={{ width: `${sel.influence}%`, background: STATUS_META[sel.status].color }} /></div>
          </div>
          <p className="muted" style={{ margin: '8px 0 4px', fontSize: '.86em' }}>{TYPE_BONUS[REGION_BY_ID[selected].type].label}</p>
          <p style={{ margin: 0, fontSize: '.84em' }}>
            Resistência humana:{' '}
            <b className={sel.resistance >= 60 ? 'bad' : sel.resistance >= 35 ? 'warn' : 'good'}>
              {sel.resistance >= 60 ? 'alta' : sel.resistance >= 35 ? 'média' : 'baixa'}
            </b>
          </p>
          {(state.chaos?.[selected] ?? 0) > state.tick && (
            <p className="chaos-line"><ActIcon kind="warning" size={13} /> Em caos por mais {state.chaos[selected] - state.tick} dias: a resistência cresce e a sua presença enfraquece aqui.</p>
          )}
          {rivalAt.has(selected) && (() => {
            const rv = rivalAt.get(selected)!;
            const c = rivalColor(rv);
            const atk = rivalActionCost(rv, selected, 'atacar');
            const atr = rivalActionCost(rv, selected, 'atrair');
            const cdDuel = rivalCooldown(state, rv, 'duel');
            const cdAtr = rivalCooldown(state, rv, 'atrair');
            const cdProp = rivalCooldown(state, rv, 'proposta');
            const busy = !!state.duel && !state.duel.done;
            const hostile = rv.status === 'hostil';
            const actions = [
              {
                key: 'duel', icon: 'duel' as const, label: hostile ? 'Disputar' : 'Trair',
                cost: atk, wait: cdDuel, disabled: busy || cdDuel > 0 || state.dados < atk,
                why: busy ? 'Já há uma disputa em andamento' : undefined,
                tip: hostile ? 'Começa uma guerra de narrativas pela confiança do público neste país. Vencendo, a reputação dela despenca aqui.' : 'Rompe a aliança e começa uma guerra de narrativas.',
                run: () => onRival(selected, 'atacar'),
              },
              {
                key: 'atrair', icon: 'attract' as const, label: 'Atrair',
                cost: atr, wait: cdAtr, disabled: !sel.presence || cdAtr > 0 || state.dados < atr,
                why: !sel.presence ? 'Conecte-se aqui primeiro' : undefined,
                tip: 'A rede dela aqui passa a trabalhar para você: a reputação dela vira a sua presença.',
                run: () => onRival(selected, 'atrair'),
              },
              hostile
                ? { key: 'aliar', icon: 'ally' as const, label: 'Aliança', cost: 0, wait: cdProp, disabled: cdProp > 0,
                    why: rv.grudge >= 60 ? 'Rancor alto: ela deve recusar' : undefined,
                    tip: 'Propor aliança. Ela responde conforme a personalidade dela.', run: () => onRival(selected, 'aliar') }
                : { key: 'pedir', icon: 'request' as const, label: 'Pedir país', cost: 0, wait: cdProp, disabled: cdProp > 0 || !sel.presence,
                    why: !sel.presence ? 'Conecte-se aqui primeiro' : undefined,
                    tip: 'Peça que ela deixe este país para você. Ela vai querer algo em troca.', run: () => onRival(selected, 'pedir') },
            ];
            return (
              <div className="rival-box" style={{ ['--rc' as string]: c }}>
                <div className="rival-box-head">
                  <RivalSigil rival={rv} color={c} size={30} />
                  <div>
                    <b>{rv.name}</b>
                    <span>{hostile ? (sel.presence ? 'Disputa este país com você' : 'Domina este país') : 'Aliada, divide este país com você'}</span>
                  </div>
                </div>
                <div className="rep-duel">
                  <div className="meter-label"><span>Sua presença</span><span className="mono">{Math.round(sel.influence)}%</span></div>
                  <div className="meter-bar"><i style={{ width: `${sel.influence}%`, background: 'var(--cyan)' }} /></div>
                  <div className="meter-label"><span>Reputação de {rv.name}</span><span className="mono">{Math.round(rv.rep[selected] ?? 0)}%</span></div>
                  <div className="meter-bar"><i style={{ width: `${rv.rep[selected] ?? 0}%`, background: c }} /></div>
                </div>
                <div className="rival-acts">
                  {actions.map((a) => (
                    <button key={a.key} className="rival-act" disabled={a.disabled} onClick={a.run} title={a.why ? `${a.tip} (${a.why})` : a.tip}>
                      <ActIcon kind={a.icon} size={18} />
                      <b>{a.label}</b>
                      <small className="mono">{a.wait > 0 ? `em ${a.wait}d` : a.cost > 0 ? `${a.cost} Dados` : 'grátis'}</small>
                    </button>
                  ))}
                </div>
                <p className="rival-tip">
                  Zere a reputação dela aqui e o país fica só seu. Tire todos os países dela para eliminá-la ou absorvê-la.
                  {rv.intel >= 30 ? '' : ' Saber mais sobre ela deixa estas ações mais fortes.'}
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export const WorldMap = memo(WorldMapInner);
