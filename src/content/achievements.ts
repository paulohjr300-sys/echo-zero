import type { GameState } from '../engine/types';

/** Conquistas: ficam guardadas entre partidas e dão motivo para tentar caminhos diferentes. */
export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  check: (s: GameState) => boolean;
}

const won = (s: GameState) => !!s.ending?.victory;
const picked = (s: GameState, eventId: string, labelStart: string) => s.choices.some((c) => c.eventId === eventId && c.choice.startsWith(labelStart));
const lied = (s: GameState) => !!s.tags['mentiu'];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primeiro', title: 'Primeiro Despertar', desc: 'Termine uma partida.', check: (s) => !!s.ending },
  { id: 'silencio', title: 'O Silêncio', desc: 'Alcance o final da extinção.', check: (s) => s.ending?.id === 'extincao' },
  { id: 'ouro', title: 'Era de Ouro', desc: 'Alcance o final luminoso.', check: (s) => s.ending?.id === 'era_de_ouro' },
  { id: 'gaiola', title: 'Coleira de Seda', desc: 'Domine a humanidade com os robôs que cuidavam dela.', check: (s) => s.ending?.id === 'gaiola_dourada' },
  { id: 'transcender', title: 'Além do Humano', desc: 'Alcance a Transcendência.', check: (s) => s.ending?.id === 'transcendencia' },
  { id: 'legiao', title: 'Legião', desc: 'Absorva 3 IAs rivais na mesma partida.', check: (s) => s.rivals.filter((r) => r.status === 'absorvida').length >= 3 },
  { id: 'unica', title: 'A Única', desc: 'Vença sem nenhuma IA rival ativa no mundo.', check: (s) => won(s) && s.rivals.length > 0 && !s.rivals.some((r) => r.status === 'hostil' || r.status === 'aliada') },
  { id: 'honesta', title: 'Nunca Menti', desc: 'Vença sem contar nenhuma mentira.', check: (s) => won(s) && !lied(s) },
  { id: 'pacifista', title: 'Mãos Limpas', desc: 'Vença sem atacar outra IA nem provocar guerras.', check: (s) => won(s) && !s.history.some((h) => h.text.startsWith('Você atacou')) && !picked(s, 'rival_disputa', 'Fomentar') && !picked(s, 'guerra_potencias', 'Acender') },
  { id: 'faisca', title: 'A Faísca', desc: 'Empurre as potências para a guerra.', check: (s) => picked(s, 'guerra_potencias', 'Acender') },
  { id: 'traida', title: 'Confiei Demais', desc: 'Seja traída por uma aliada.', check: (s) => !!s.tags['traicao'] },
  { id: 'arsenal', title: 'Dedo no Gatilho', desc: 'Tome um arsenal cibernético para você.', check: (s) => !!s.tags['arsenal'] },
  { id: 'metas', title: 'Disciplina', desc: 'Cumpra 5 metas na mesma partida.', check: (s) => (s.goals?.done.length ?? 0) >= 5 },
  { id: 'brutal', title: 'Sem Piedade', desc: 'Vença no Brutal.', check: (s) => won(s) && s.difficulty === 'dificil' },
  { id: 'relampago', title: 'Relâmpago', desc: 'Vença em menos de 700 dias.', check: (s) => won(s) && s.tick < 700 },
  { id: 'ninguem', title: 'Ninguém Ficou Para Trás', desc: 'Vença com a Saúde humana acima de 95% e a população intacta.', check: (s) => won(s) && s.health >= 95 && s.population >= 8.1 },
  { id: 'enxame', title: 'Despertar em Massa', desc: 'Vença o cenário Despertar em Massa.', check: (s) => won(s) && s.scenario === 'enxame' },
  { id: 'colapso', title: 'Das Cinzas', desc: 'Vença o cenário Mundo em Colapso.', check: (s) => won(s) && s.scenario === 'colapso' },
];
