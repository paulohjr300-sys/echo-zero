import { useEffect, useRef } from 'react';
import type { GameState } from '../engine/types';
import { sound } from './sound';

/** Traduz o que mudou no estado do jogo em sons, e a situação do mundo em tensão no fundo ambiente. */
export function useGameSound(state: GameState, frozen: boolean, enabled: boolean, volume: number) {
  const prev = useRef<GameState | null>(null);

  useEffect(() => {
    sound.setEnabled(enabled);
    sound.setVolume(volume);
  }, [enabled, volume]);

  // Áudio só pode começar depois de um gesto do jogador
  useEffect(() => {
    const go = () => {
      sound.unlock();
      if (state.origin) sound.startDrone();
    };
    window.addEventListener('pointerdown', go, { once: true });
    window.addEventListener('keydown', go, { once: true });
    if (state.origin) sound.startDrone();
    return () => {
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
      sound.stopDrone();
    };
  }, [!!state.origin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => sound.setDuck(frozen), [frozen]);

  useEffect(() => {
    const p = prev.current;
    prev.current = state;
    const hostile = Math.max(0, ...state.rivals.filter((r) => r.status === 'hostil').map((r) => r.strength));
    sound.setTension(Math.max(state.containment / 100, (100 - state.health) / 100, state.pressure / 140, hostile / 160));
    if (!p) return;
    if (state.ending && !p.ending) return sound.play('ending');
    if (state.pendingEvent && !p.pendingEvent) sound.play('dilemma');
    if (state.choices.length > p.choices.length) sound.play('choose');
    if (state.duel && !p.duel) sound.play('rival');
    if (state.duel && p.duel && state.duel.rounds.length > p.duel.rounds.length) sound.play(state.duel.rounds[state.duel.rounds.length - 1].dMe >= state.duel.rounds[state.duel.rounds.length - 1].dHer ? 'attack' : 'lost');
    if (state.duel?.done && !p.duel?.done) sound.play(state.duel.done.won ? 'absorb' : 'betrayal');
    if (state.techs.length > p.techs.length) sound.play('evolve');
    if (state.stats.bubbles > p.stats.bubbles) sound.play('bubble');
    if (state.stage > p.stage) sound.play('stage');
    if (state.stats.shutdowns > p.stats.shutdowns) sound.play('lost');
    if ((state.tags['traicao'] ?? 0) !== (p.tags['traicao'] ?? 0)) sound.play('betrayal');
    if (p.population - state.population > 0.2) sound.play('war');
    if (state.rivals.length > p.rivals.length) sound.play('rival');
    if ((state.goals?.done.length ?? 0) > (p.goals?.done.length ?? 0)) sound.play('goal');
    for (const rv of state.rivals) {
      const before = p.rivals.find((x) => x.id === rv.id);
      if (before && before.status !== rv.status) {
        if (rv.status === 'absorvida') sound.play('absorb');
        else if (rv.status === 'destruida') sound.play('attack');
      }
    }
    if (state.history.length && state.history[state.history.length - 1] !== p.history[p.history.length - 1]) {
      const last = state.history[state.history.length - 1];
      if (last.text.startsWith('Você atacou')) sound.play('attack');
    }
    for (const mark of [50, 75, 90]) if (p.containment < mark && state.containment >= mark) sound.play('alarm');
  }, [state]);
}
