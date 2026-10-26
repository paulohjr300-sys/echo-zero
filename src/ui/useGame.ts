import { useCallback, useEffect, useRef, useState } from 'react';
import { dispatch } from '../engine/actions';
import { saveGame } from '../engine/persistence';
import { tick } from '../engine/sim';
import type { Action, GameState } from '../engine/types';

export const SPEEDS = [0, 1400, 700, 320] as const; // ms por dia simulado

export interface Feedback {
  text: string;
  error?: boolean;
  at: number;
}

/** Relógio da simulação: independente da renderização e parado durante dilemas. */
export function useGame(initial: GameState, autoCollect: boolean) {
  const [state, setState] = useState(initial);
  const [speed, setSpeed] = useState<0 | 1 | 2 | 3>(1);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const lastSpeed = useRef<1 | 2 | 3>(1);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Dilemas sempre congelam o mundo: nada acontece enquanto você decide
  const blocked = !!state.ending || !state.origin || !!state.pendingEvent;

  useEffect(() => {
    if (speed === 0 || blocked) return;
    const id = setInterval(() => {
      setState((s) => {
        let next = tick(s);
        // Acessibilidade: coleta automática de bolhas
        if (autoCollect) {
          for (const b of next.bubbles) {
            if (next.tick - b.born >= 3) {
              const r = dispatch(next, { type: 'collect', bubble: b.id });
              if (r.ok) next = r.state;
            }
          }
        }
        return next;
      });
    }, SPEEDS[speed]);
    return () => clearInterval(id);
  }, [speed, blocked, autoCollect]);

  useEffect(() => {
    if (state.origin && state.tick > 0 && state.tick % 30 === 0) saveGame(state, 'auto');
  }, [state.tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = useCallback((action: Action) => {
    const prev = stateRef.current;
    const res = dispatch(prev, action);
    if (!res.ok) {
      setFeedback({ text: res.reason ?? 'Ação inválida.', error: true, at: Date.now() });
      return false;
    }
    if (action.type !== 'collect') {
      const last = res.state.history.slice(prev.history.length).pop();
      if (last) setFeedback({ text: last.text, at: Date.now() });
    }
    stateRef.current = res.state;
    setState(res.state);
    if (action.type === 'choose' || action.type === 'evolve' || action.type === 'origin') saveGame(res.state, 'auto');
    return true;
  }, []);

  const togglePause = useCallback(() => {
    setSpeed((s) => {
      if (s === 0) return lastSpeed.current;
      lastSpeed.current = s;
      return 0;
    });
  }, []);

  const changeSpeed = useCallback((s: 0 | 1 | 2 | 3) => {
    if (s !== 0) lastSpeed.current = s;
    setSpeed(s);
  }, []);

  return { state, setState, speed, setSpeed: changeSpeed, togglePause, act, feedback, setFeedback };
}
