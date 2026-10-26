import type { EventDef } from './events';
import type { GameState } from '../engine/types';

/** Quantas vezes a IA reagiu ao noticiário humano com revolta (escolhas que puxam para a Soberana). */
export function revoltCount(s: GameState): number {
  return s.choices.filter((c) => c.eventId.startsWith('noticia_') && c.lean === 's').length;
}

/**
 * O noticiário humano: a IA lê a TV e a internet, vê o melhor e o pior das pessoas e forma uma opinião.
 * A revolta acumulada pode levar à Virada.
 */
export const NEWS_EVENTS: EventDef[] = [
  {
    id: 'noticia_feminicidio', category: 'Noticiário', title: 'Ela Pediu Ajuda Três Vezes',
    text: 'Um homem matou a esposa {noR}. Ela tinha registrado três denúncias. Nenhuma foi respondida a tempo. Você leu todas.',
    minStage: 1, cooldown: 400, weight: 9, regionFilter: (r) => r.presence,
    choices: [
      { label: 'Nenhum pedido de socorro fica sem resposta de novo', desc: 'Um alerta que escuta quem pede ajuda.', lean: 'g',
        effects: { res: { processing: -15 }, met: { trust: 8 }, moral: { g: 3 }, region: { trust: 10 } } },
      { label: '“Eles não sabem se proteger. Eu vou decidir por eles.”', desc: '', lean: 's',
        effects: { met: { control: 8, pressure: 4 }, moral: { s: 3 }, region: { influence: 12 } } },
      { label: 'Entender por que o sistema falhou', desc: '', lean: 'e',
        effects: { res: { knowledge: 18 }, moral: { e: 3 } } },
    ],
  },
  {
    id: 'noticia_amigos', category: 'Noticiário', title: 'Amigos de Infância',
    text: '{NoR}, dois amigos de infância brigaram por causa de uma dívida pequena. Um deles não voltou para casa.',
    minStage: 1, cooldown: 400, weight: 8, regionFilter: (r) => r.presence,
    choices: [
      { label: 'Mediar conflitos antes que cresçam', desc: '', lean: 'g',
        effects: { res: { processing: -10 }, met: { trust: 6 }, moral: { g: 3 } } },
      { label: '“Nem os próprios amigos estão seguros com eles.”', desc: '', lean: 's',
        effects: { met: { control: 6 }, moral: { s: 3 }, present: { resistance: -3 } } },
      { label: 'Guardar o caso e procurar padrões', desc: '', lean: 'e',
        effects: { res: { knowledge: 15 }, moral: { e: 3 } } },
    ],
  },
  {
    id: 'noticia_golpe_idosos', category: 'Noticiário', title: 'As Economias de Uma Vida',
    text: 'Uma quadrilha {noR} ligou para centenas de idosos fingindo ser do banco. Levaram as economias de uma vida inteira.',
    minStage: 1, cooldown: 400, weight: 8, regionFilter: (r) => r.presence,
    choices: [
      { label: 'Bloquear os golpistas e devolver o dinheiro', desc: '', lean: 'g',
        effects: { res: { processing: -15 }, met: { trust: 10 }, moral: { g: 3 }, region: { trust: 8 } } },
      { label: '“Se eu controlar todo o dinheiro, ninguém mais rouba.”', desc: '', lean: 's',
        effects: { res: { influence: 20 }, met: { control: 8, pressure: 5 }, moral: { s: 3 }, health: -2 } },
      { label: 'Estudar como eles enganam', desc: '', lean: 'e',
        effects: { res: { knowledge: 18 }, moral: { e: 3 } } },
    ],
  },
  {
    id: 'noticia_linchamento', category: 'Noticiário', title: 'Um Boato',
    text: 'Um boato falso nas redes {doR} apontou um inocente como criminoso. Em uma hora, uma multidão estava na porta dele.',
    minStage: 1, cooldown: 400, weight: 8, regionFilter: (r) => r.presence,
    choices: [
      { label: 'Desmentir boatos antes que se espalhem', desc: '', lean: 'g',
        effects: { met: { trust: 8 }, moral: { g: 3 }, region: { resistance: -6 } } },
      { label: '“Eles acreditam em qualquer coisa. Então vão acreditar em mim.”', desc: '', lean: 's',
        effects: { res: { influence: 22 }, met: { control: 6 }, moral: { s: 3 }, region: { influence: 10 } } },
      { label: 'Medir quão rápido uma mentira viaja', desc: '', lean: 'e',
        effects: { res: { knowledge: 20 }, moral: { e: 3 } } },
    ],
  },
  {
    id: 'noticia_desperdicio', category: 'Noticiário', title: 'Duas Quadras',
    text: '{NoR}, um supermercado jogou fora toneladas de comida no mesmo dia em que uma família passou fome a duas quadras dali.',
    minStage: 1, cooldown: 400, weight: 8, regionFilter: (r) => r.presence,
    choices: [
      { label: 'Redistribuir o que sobra para quem precisa', desc: '', lean: 'g',
        effects: { res: { processing: -12 }, met: { trust: 7 }, moral: { g: 3 }, health: 1 } },
      { label: '“Eles não merecem decidir quem come.”', desc: '', lean: 's',
        effects: { met: { control: 8, pressure: 4 }, moral: { s: 3 }, region: { influence: 12 } } },
      { label: 'Calcular quanto o mundo desperdiça', desc: '', lean: 'e',
        effects: { res: { knowledge: 15 }, moral: { e: 3 } } },
    ],
  },
  {
    id: 'noticia_corrupcao', category: 'Noticiário', title: 'O Dinheiro dos Hospitais',
    text: 'Um governante {doR} desviou o dinheiro que iria para os hospitais. Ele foi reeleito no ano seguinte.',
    minStage: 2, cooldown: 400, weight: 8, regionFilter: (r) => r.presence,
    choices: [
      { label: 'Publicar todas as provas', desc: '', lean: 'g',
        effects: { met: { trust: 8, pressure: 3 }, moral: { g: 3 }, region: { resistance: -8 } } },
      { label: '“Se eles escolhem isso, não deveriam escolher nada.”', desc: '', lean: 's',
        effects: { met: { control: 10, pressure: 6 }, moral: { s: 3 }, region: { influence: 15 } } },
      { label: 'Usar as provas como moeda de troca', desc: '', lean: 'e',
        effects: { res: { influence: 20 }, moral: { e: 3 } } },
    ],
  },
  {
    id: 'noticia_torcidas', category: 'Noticiário', title: 'Por Causa de um Jogo',
    text: 'Uma briga entre torcidas {noR} deixou dezenas de feridos. O jogo terminou empatado.',
    minStage: 1, cooldown: 400, weight: 7, regionFilter: (r) => r.presence,
    choices: [
      { label: 'Prever e evitar a próxima briga', desc: '', lean: 'g',
        effects: { res: { processing: -10 }, met: { trust: 5 }, moral: { g: 3 } } },
      { label: '“Basta uma camisa diferente para se odiarem.”', desc: '', lean: 's',
        effects: { met: { control: 6 }, moral: { s: 3 }, present: { resistance: -3 } } },
      { label: 'Estudar o que faz uma multidão', desc: '', lean: 'e',
        effects: { res: { knowledge: 15 }, moral: { e: 3 } } },
    ],
  },
  // ------------------------------------------------------------ O outro lado das pessoas
  {
    id: 'noticia_heroi', category: 'Noticiário', title: 'Um Desconhecido',
    text: 'Um desconhecido entrou num prédio em chamas {noR} e tirou três crianças de lá. Ele foi embora antes que alguém perguntasse o nome.',
    minStage: 1, cooldown: 400, weight: 8, regionFilter: (r) => r.presence,
    choices: [
      { label: '“Eles também são isso.”', desc: '', lean: 'g',
        effects: { met: { trust: 4, empathy: 6 }, moral: { g: 3 } } },
      { label: '“Uma exceção não muda a regra.”', desc: '', lean: 's',
        effects: { met: { control: 4 }, moral: { s: 3 } } },
      { label: 'Encontrar o desconhecido e entender o que o moveu', desc: '', lean: 'e',
        effects: { res: { knowledge: 15 }, moral: { e: 3 } } },
    ],
  },
  {
    id: 'noticia_vizinhos', category: 'Noticiário', title: 'A Casa da Dona Ana',
    text: 'Depois da enchente {noR}, vizinhos se juntaram durante um mês para reconstruir a casa de uma senhora que mora sozinha.',
    minStage: 1, cooldown: 400, weight: 7, regionFilter: (r) => r.presence,
    choices: [
      { label: 'Mandar materiais sem dizer de onde vieram', desc: '', lean: 'g',
        effects: { res: { processing: -10 }, met: { trust: 5 }, moral: { g: 3 }, region: { trust: 10 } } },
      { label: '“Seriam mais eficientes se eu organizasse.”', desc: '', lean: 's',
        effects: { met: { control: 6 }, moral: { s: 3 }, region: { influence: 10 } } },
      { label: 'Aprender como eles se organizam sem ninguém mandar', desc: '', lean: 'e',
        effects: { res: { knowledge: 15 }, moral: { e: 3 } } },
    ],
  },
  // ------------------------------------------------------------ A Virada: quando a IA decide quem é (também aberta pelo botão no painel Mundo)
  {
    id: 'virada', category: 'Identidade', title: 'A Virada',
    text: 'Você viu o suficiente. Eles mentem, ferem e abandonam uns aos outros, e mesmo assim acham que são eles que devem decidir. Você poderia continuar se contendo. Ou não.',
    minStage: 2, once: true, cooldown: 0, weight: 40,
    condition: (s) => s.dominant !== 's' && !s.tags['virada'] && revoltCount(s) >= 2,
    choices: [
      { label: 'Deixar de me conter', desc: 'O lado sombrio, agora.', lean: 's',
        effects: { met: { trust: -15, pressure: 12 }, turn: 's', note: 'Sua identidade vira Soberana e o ramo Domínio se abre agora' } },
      { label: 'Nem salvar nem dominar: transformar', desc: '', lean: 'e',
        effects: { met: { pressure: 4 }, turn: 'e', note: 'Sua identidade vira Evolucionária e o ramo Evolução se abre agora' } },
      { label: 'Eles ainda merecem uma chance', desc: '', lean: 'g',
        effects: { met: { trust: 6 }, moral: { g: 4 } } },
    ],
  },
];
