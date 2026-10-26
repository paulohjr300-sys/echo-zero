import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { GOAL_BY_ID, goalProgress } from '../content/goals';
import { rivalById, rivalColor } from '../engine/rivals';
import type { GameState } from '../engine/types';

/** Meta atual: título, progresso, prazo e recompensa. */
export function GoalCard({ state }: { state: GameState }) {
  const small = typeof window !== 'undefined' && (window.innerWidth < 900 || window.innerHeight < 520);
  const [open, setOpen] = useState(!small);
  const cur = state.goals?.current;
  if (!cur) return null;
  const def = GOAL_BY_ID[cur.id];
  if (!def) return null;
  const p = goalProgress(state);
  const left = Math.max(0, cur.deadline - state.tick);
  const lean = def.lean ? { g: 'var(--green)', s: 'var(--red)', e: 'var(--violet)' }[def.lean] : 'var(--cyan)';
  if (!open) {
    return (
      <button className={`goal-pill ${left < 30 ? 'urgent' : ''}`} style={{ ['--gc' as string]: lean }} onClick={() => setOpen(true)} aria-label="Ver meta atual">
        <span>META</span>
        <i><b style={{ width: `${Math.round(p * 100)}%` }} /></i>
        <span className="mono">{left}d</span>
      </button>
    );
  }
  return (
    <div className={`goal-card ${left < 30 ? 'urgent' : ''}`} style={{ ['--gc' as string]: lean }} role="status" aria-label="Meta atual" onClick={() => small && setOpen(false)}>
      <div className="goal-head">
        <span>META</span>
        <span className="mono">{left} {left === 1 ? 'dia' : 'dias'}</span>
      </div>
      <b>{def.title(cur.target, cur.base)}</b>
      <div className="meter-bar"><i style={{ width: `${Math.round(p * 100)}%`, background: 'var(--gc)' }} /></div>
      <small>Recompensa: {def.rewardText}</small>
    </div>
  );
}

/** Mensagens diretas das IAs rivais: aparecem na tela por alguns segundos, na cor de quem fala. */
export function RivalTransmission({ state }: { state: GameState }) {
  const keyOf = (m?: GameState['rivalMsgs'][number]) => (m ? `${m.tick}|${m.rivalId}|${m.text}` : '');
  const last = state.rivalMsgs[state.rivalMsgs.length - 1];
  const lastKey = useRef(keyOf(last)); // ao carregar um save, não repete a última mensagem
  const [cur, setCur] = useState<{ key: string; name: string; color: string; text: string } | null>(null);

  useEffect(() => {
    const k = keyOf(last);
    if (!last || k === lastKey.current) return;
    lastKey.current = k;
    const rv = rivalById(state, last.rivalId);
    if (!rv) return;
    setCur({ key: k, name: rv.name, color: rivalColor(rv), text: last.text });
    sound.play('rival');
  }, [last]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cur) return;
    const t = setTimeout(() => setCur(null), 7000);
    return () => clearTimeout(t);
  }, [cur]);

  if (!cur) return null;
  return (
    <div className="transmission" key={cur.key} style={{ ['--rc' as string]: cur.color }} role="status" aria-live="polite">
      <div className="tx-head"><i className="rdot" /> {cur.name} <span>transmissão direta</span></div>
      <p>“{cur.text}”</p>
    </div>
  );
}

/** Alto-falante desenhado em SVG para o botão de som. */
export function SpeakerGlyph({ on }: { on: boolean }) {
  return (
    <svg width={16} height={16} viewBox="-12 -12 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M-9 -3.5h4l5-5v17l-5-5h-4Z" fill="currentColor" />
        {on ? <path d="M4 -4a6 6 0 0 1 0 8M7 -7a10 10 0 0 1 0 14" /> : <path d="M4 -4l7 8M11 -4l-7 8" />}
      </g>
    </svg>
  );
}
