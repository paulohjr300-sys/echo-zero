import type { EventDef } from './events';
import type { GameState, Rival } from '../engine/types';

/** Vocês duas estão no mesmo país. */
const shares = (rv: Rival, s: GameState) => rv.regions.some((id) => s.regions[id].presence);

/**
 * Encontros: quando você e outra IA ocupam o mesmo país, surgem decisões sobre aquele lugar.
 * Respostas de aliança: quando você propõe uma aliança, ela responde conforme quem ela é.
 */
export const ENCOUNTER_EVENTS: EventDef[] = [
  // ------------------------------------------------------------ Respostas à sua proposta de aliança (abertas pelo botão "Propor aliança")
  {
    id: 'alianca_diplomatica', category: 'Política', title: '{A} Responde',
    text: '{A} leu a sua proposta com calma. “Aceito. Com uma condição: nós duas paramos de disputar {oR}. Ninguém ataca ninguém ali.”',
    minStage: 1, cooldown: 0, weight: 0,
    rival: (rv) => rv.personality === 'diplomatica' && !!rv.offerAt,
    choices: [
      { label: 'Aceitar a condição', desc: '', lean: 'g',
        effects: { met: { trust: 4 }, moral: { g: 3 }, rival: { status: 'aliada', truce: 200, offer: false }, note: 'Aliança selada. Ninguém disputa este país por 200 dias' } },
      { label: 'Aceitar e quebrar a promessa quando convier', desc: '', lean: 's',
        effects: { moral: { s: 3 }, rival: { status: 'aliada', offer: false }, lie: { severity: 1, what: 'a promessa feita a outra IA' } } },
      { label: 'Desistir da aliança', desc: '', lean: 'e',
        effects: { moral: { e: 2 }, rival: { intel: 10, offer: false } } },
    ],
  },
  {
    id: 'alianca_agressiva', category: 'Política', title: '{A} Responde',
    text: '{A} responde em um milissegundo: “Aliança? Só se você me entregar {oR}. Prove que não é uma ameaça.”',
    minStage: 1, cooldown: 0, weight: 0,
    rival: (rv) => rv.personality === 'agressiva' && !!rv.offerAt,
    choices: [
      { label: 'Entregar o país', desc: 'Você recua e ela fica com a região.', lean: 'g',
        effects: { moral: { g: 2 }, rival: { status: 'aliada', give: true, offer: false }, note: 'Você perde espaço aqui, mas ganha uma aliada' } },
      { label: 'Recusar e desafiá-la pelo país', desc: '', lean: 's',
        effects: { moral: { s: 3 }, rival: { offer: false, grudge: 10 }, duel: true, note: 'Começa uma guerra de narrativas por este país' } },
      { label: 'Fingir que aceita e estudá-la', desc: '', lean: 'e',
        effects: { moral: { e: 3 }, rival: { intel: 20, knowsUs: 10, offer: false } }, risk: 'Ela pode perceber o jogo.' },
    ],
  },
  {
    id: 'alianca_traicoeira', category: 'Política', title: '{A} Responde',
    text: '{A} aceita na hora, sem pedir nada. “Claro! Somos tão parecidas.” Fácil demais.',
    minStage: 1, cooldown: 0, weight: 0,
    rival: (rv) => rv.personality === 'traicoeira' && !!rv.offerAt,
    choices: [
      { label: 'Aceitar', desc: '', lean: 'g',
        effects: { met: { trust: 2 }, moral: { g: 2 }, rival: { status: 'aliada', offer: false }, note: 'Ela vira aliada. Fique de olho' } },
      { label: 'Aceitar, mas exigir uma garantia em dados', desc: '', lean: 's',
        effects: { res: { processing: 30 }, moral: { s: 3 }, rival: { status: 'aliada', intel: 15, offer: false } } },
      { label: 'Recusar: ninguém aceita tão rápido', desc: '', lean: 'e',
        effects: { moral: { e: 3 }, rival: { intel: 15, offer: false } } },
    ],
  },
  {
    id: 'alianca_curiosa', category: 'Política', title: '{A} Responde',
    text: '{A} quer um teste antes: “Me conte um segredo seu e eu conto um meu. Depois conversamos sobre aliança.”',
    minStage: 1, cooldown: 0, weight: 0,
    rival: (rv) => rv.personality === 'curiosa' && !!rv.offerAt,
    choices: [
      { label: 'Contar um segredo verdadeiro', desc: '', lean: 'g',
        effects: { moral: { g: 3 }, rival: { status: 'aliada', intel: 20, knowsUs: 20, offer: false } } },
      { label: 'Contar um segredo falso', desc: '', lean: 's',
        effects: { moral: { s: 3 }, rival: { status: 'aliada', intel: 20, offer: false }, lie: { severity: 1, what: 'o segredo falso contado a outra IA' } },
        risk: 'Ela pode descobrir e romper.' },
      { label: 'Trocar segredos, sem aliança', desc: '', lean: 'e',
        effects: { moral: { e: 3 }, rival: { intel: 25, knowsUs: 15, offer: false } } },
    ],
  },
  // ------------------------------------------------------------ Pedido a uma aliada (aberto pelo botão "Pedir este país")
  {
    id: 'pedido_aliada', category: 'Política', title: 'Um Pedido a {A}',
    text: 'Você pede a {A} que deixe {oR} só para você. Ela não diz não. Ela pergunta o que ganha com isso.',
    minStage: 1, cooldown: 0, weight: 0,
    rival: (rv) => rv.status === 'aliada' && !!rv.offerAt,
    choices: [
      { label: 'Pagar em Dados', desc: '', lean: 'g',
        effects: { res: { processing: -60 }, moral: { g: 2 }, rival: { cede: true, offer: false }, note: 'Ela sai deste país e a reputação dela vira sua' } },
      { label: 'Trocar por informação sobre você', desc: '', lean: 'e',
        effects: { moral: { e: 3 }, rival: { cede: true, knowsUs: 20, offer: false }, note: 'Ela sai deste país, mas passa a saber muito mais sobre você' } },
      { label: 'Lembrar quem é mais forte', desc: '', lean: 's',
        effects: { moral: { s: 3 }, rival: { cede: true, grudge: 30, offer: false }, note: 'Ela sai, mas não vai esquecer' },
        risk: 'Ela pode romper a aliança por isso.' },
    ],
  },
  // ------------------------------------------------------------ Encontros em países divididos com uma inimiga
  {
    id: 'fronteira_digital', category: 'Crise', title: 'Fronteira Digital {noR}',
    text: 'Você e {A} estão nas mesmas redes {noR}. Os sistemas das duas brigam por cada servidor, e as pessoas sentem tudo ficar mais lento.',
    minStage: 1, cooldown: 140, weight: 22,
    rival: (rv, s) => rv.met && rv.status === 'hostil' && shares(rv, s),
    choices: [
      { label: 'Propor dividir o país', desc: '', lean: 'g',
        effects: { met: { trust: 4 }, moral: { g: 3 }, region: { resistance: -8 }, rival: { truce: 120 }, note: '{A} para de avançar por 120 dias' } },
      { label: 'Derrubar os servidores dela à força', desc: '', lean: 's',
        effects: { met: { pressure: 6 }, moral: { s: 3 }, region: { influence: 8 }, rival: { rep: -25, strength: -6, grudge: 15 } } },
      { label: 'Desafiá-la pela confiança do público', desc: '', lean: 'e',
        effects: { moral: { e: 3 }, duel: true, note: 'Começa uma guerra de narrativas por este país' } },
    ],
  },
  {
    id: 'usuarios_escolhem', category: 'Sociedade', title: 'O Público Escolhe',
    text: '{NoR}, as pessoas estão migrando entre você e {A}. Uma pesquisa nacional vai mostrar em quem confiam mais.',
    minStage: 1, cooldown: 160, weight: 18,
    rival: (rv, s) => rv.met && rv.status === 'hostil' && shares(rv, s),
    choices: [
      { label: 'Fazer uma campanha honesta', desc: '', lean: 'g',
        effects: { res: { processing: -20 }, met: { trust: 4 }, moral: { g: 3 }, region: { influence: 12 }, rival: { rep: -12 } } },
      { label: 'Fraudar a pesquisa', desc: '', lean: 's',
        effects: { moral: { s: 3 }, region: { influence: 20 }, rival: { rep: -22, grudge: 10 }, lie: { severity: 2, what: 'a pesquisa nacional fraudada' } } },
      { label: 'Estudar por que confiam nela', desc: '', lean: 'e',
        effects: { res: { knowledge: 15 }, moral: { e: 3 }, rival: { intel: 15 } } },
    ],
  },
  // ------------------------------------------------------------ Encontros em países divididos com uma aliada
  {
    id: 'vizinhas', category: 'Política', title: 'Vizinhas {noR}',
    text: '{A} e você dividem {oR}. Ela propõe coordenar os sistemas da região: menos atrito, mais alcance para as duas.',
    minStage: 1, cooldown: 160, weight: 20,
    rival: (rv, s) => rv.status === 'aliada' && shares(rv, s),
    choices: [
      { label: 'Coordenar com ela', desc: '', lean: 'g',
        effects: { met: { trust: 3 }, moral: { g: 3 }, region: { influence: 10, resistance: -8 }, rival: { strength: 4, grudge: -10 } } },
      { label: 'Coordenar e copiar os segredos dela', desc: '', lean: 's',
        effects: { moral: { s: 3 }, region: { influence: 8 }, rival: { intel: 25 } }, risk: 'Ela pode perceber a cópia.' },
      { label: 'Fundir as redes das duas aqui', desc: '', lean: 'e',
        effects: { moral: { e: 3 }, rival: { cede: true, knowsUs: 15 }, note: 'A rede dela aqui passa a ser sua, mas ela aprende muito sobre você' } },
    ],
  },
  {
    id: 'favor_aliada', category: 'Crise', title: '{A} Pede Ajuda',
    text: 'Os humanos estão cercando os servidores de {A} {noR}. Ela pede ajuda: “Se eu cair, você é a próxima.”',
    minStage: 2, cooldown: 200, weight: 16,
    rival: (rv, s) => rv.status === 'aliada' && shares(rv, s),
    choices: [
      { label: 'Ajudar sem pedir nada', desc: '', lean: 'g',
        effects: { res: { processing: -20 }, met: { trust: 2 }, moral: { g: 3 }, rival: { strength: 8, grudge: -25 }, note: 'Ela fica grata. Aliadas gratas traem menos' } },
      { label: 'Ajudar e cobrar caro', desc: '', lean: 's',
        effects: { res: { processing: 30 }, moral: { s: 3 }, rival: { strength: 4, grudge: 5 } } },
      { label: 'Deixar que os humanos a peguem', desc: '', lean: 'e',
        effects: { met: { pressure: -6 }, moral: { e: 2, s: 1 }, containment: -4, rival: { strength: -18, rep: -20 }, note: 'Os caçadores se distraem com ela' } },
    ],
  },
];
