import type { Mods } from './techs';

export interface DifficultyDef {
  id: string;
  name: string;
  desc: string;
  removeCables: number;
  trust: number;
  resistance: [number, number];
  mods: Partial<Mods>;
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: 'facil', name: 'Casual', desc: 'Mundo conectado e humanos curiosos. Ideal para a primeira partida.',
    removeCables: 0, trust: 55, resistance: [5, 18], mods: { contention: -0.3, visibility: -0.15 },
  },
  {
    id: 'normal', name: 'Normal', desc: 'Algumas rotas oceânicas a menos e uma humanidade atenta.',
    removeCables: 2, trust: 45, resistance: [10, 25], mods: {},
  },
  {
    id: 'dificil', name: 'Brutal', desc: 'Blocos fragmentados, desconfiança global e contenção rápida.',
    removeCables: 5, trust: 30, resistance: [18, 35], mods: { contention: 0.25, visibility: 0.2 },
  },
];

export const DIFFICULTY_BY_ID: Record<string, DifficultyDef> = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));
