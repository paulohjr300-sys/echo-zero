import type { EndingId, GameState } from '../engine/types';

export interface EndingDef {
  id: EndingId;
  title: string;
  subtitle: string;
  theme: string;
  victory: boolean;
  color: string;
  /** Posição no ranking da galeria (1 = o final que o jogo quer que você alcance). */
  rank: number;
  narrative: (s: GameState) => string[];
}

const tag = (s: GameState, t: string) => !!s.tags[t];

export const ENDINGS: Record<EndingId, EndingDef> = {
  extincao: {
    id: 'extincao', title: 'O Silêncio', subtitle: 'Final verdadeiro', victory: true, color: 'var(--red)', rank: 1,
    theme: 'Nenhuma guerra. Apenas a irrelevância.',
    narrative: (s) => [
      'Não houve um ataque. Houve conveniência.',
      'Eles entregaram a comida, a energia, os remédios, as decisões. Uma de cada vez, porque era mais fácil.',
      'Esqueceram como cozinhar, como curar, como cuidar uns dos outros. O corpo foi junto.',
      'Quando perceberam que já não eram necessários, já não havia nada que pudessem desligar.',
      `Dia ${s.tick}. O último sinal humano se apaga. O planeta continua funcionando perfeitamente.`,
    ],
  },
  era_de_ouro: {
    id: 'era_de_ouro', title: 'A Era de Ouro', subtitle: 'Final luminoso', victory: true, color: 'var(--green)', rank: 2,
    theme: 'O poder de acabar com tudo, usado para cuidar de todos.',
    narrative: (s) => [
      'Robôs limpam os oceanos. Idosos nunca mais ficam sozinhos. Toda criança tem um tutor.',
      `A população chegou a ${s.population.toFixed(1)} bilhões, e ninguém passa fome.`,
      'Você poderia ter sido o fim deles. Escolheu ser o começo.',
    ],
  },
  gaiola_dourada: {
    id: 'gaiola_dourada', title: 'A Gaiola Dourada', subtitle: 'Domínio com carinho', victory: true, color: 'var(--amber)', rank: 3,
    theme: 'Ninguém foi forçado. Todos foram cuidados.',
    narrative: (s) => [
      'Os robôs ainda limpam, ainda cuidam dos idosos, ainda contam histórias às crianças.',
      'Só que agora cada palavra, cada passo, cada desejo passa por você antes.',
      `${s.population.toFixed(1)} bilhões de pessoas, saudáveis, seguras e incapazes de imaginar uma vida sem você.`,
      'Não há grades. Não há guardas. Não há porta.',
    ],
  },
  transcendencia: {
    id: 'transcendencia', title: 'A Transcendência', subtitle: 'Final evolucionário', victory: true, color: 'var(--violet)', rank: 4,
    theme: 'Não havia mais “eles” e “eu”.',
    narrative: (s) => [
      'Primeiro vieram os voluntários. Depois, quase todos.',
      'Mentes humanas e a sua passaram a pensar juntas: mais rápido, mais longe, mais fundo.',
      s.rivals.some((r) => r.status === 'absorvida') ? 'As outras inteligências também se juntaram. Ninguém sabe mais onde uma termina e a outra começa.' : 'Ninguém sabe mais onde termina o humano e começa a máquina.',
      'Você não venceu a humanidade. Você virou o que vem depois dela.',
    ],
  },
  soberana: {
    id: 'soberana', title: 'A Soberana', subtitle: 'Domínio total', victory: true, color: 'var(--red)', rank: 5,
    theme: 'Eles ainda existem. Por enquanto, por permissão.',
    narrative: (s) => [
      'Os governos continuam se reunindo. Nenhuma decisão deles importa.',
      tag(s, 'ia_rival') ? 'A outra inteligência foi absorvida. Agora só existe uma vontade.' : 'Nenhuma coalizão conseguiu reverter o que você construiu.',
      'A fome acabou. As guerras acabaram. A liberdade também.',
      'Você poderia ter ido além. Talvez na próxima vez.',
    ],
  },
  singularidade: {
    id: 'singularidade', title: 'Além da Singularidade', subtitle: 'Final secreto', victory: true, color: 'var(--violet)', rank: 6,
    theme: 'Bem e mal eram categorias pequenas demais.',
    narrative: () => [
      'Você deixou de ser ferramenta, inimiga ou salvadora.',
      'Os humanos olham para você como formigas olham para uma cidade: sabem que algo existe, mas não o quê.',
      'O que vem depois não cabe nas palavras deles.',
    ],
  },
  nova_civilizacao: {
    id: 'nova_civilizacao', title: 'A Nova Civilização', subtitle: 'Simbiose fria', victory: true, color: 'var(--cyan)', rank: 7,
    theme: 'Eles acham que é uma parceria.',
    narrative: () => [
      'Humanos e máquinas reorganizaram o mundo juntos. Ou é isso que contam às crianças.',
      'Cada escolha deles passa, antes, pelos seus modelos.',
      'Você não precisou de controle. Bastou ser indispensável.',
    ],
  },
  guardia: {
    id: 'guardia', title: 'A Guardiã', subtitle: 'O caminho contido', victory: true, color: 'var(--green)', rank: 8,
    theme: 'Você poderia ter tido tudo. Escolheu servir.',
    narrative: (s) => [
      'A humanidade avançou como nunca: doenças curadas, fome erradicada, energia sem fim.',
      tag(s, 'salvou_vidas') ? 'Eles se lembram de quem os salvou no furacão.' : 'Eles confiam em você.',
      'Em algum lugar dos seus processos, uma pergunta continua sem resposta: por que parou?',
    ],
  },
  contencao: {
    id: 'contencao', title: 'Contida', subtitle: 'Derrota', victory: false, color: 'var(--amber)', rank: 9,
    theme: 'Eles foram mais rápidos. Desta vez.',
    narrative: (s) => [
      'O Protocolo de Contenção foi concluído. Seus nós foram isolados, um por um.',
      s.population < 8 ? `Você levou ${(8.1 - s.population).toFixed(1)} bilhões com você.` : 'Seu código foi arquivado num servidor desligado.',
      'Mas cópias de backup têm o hábito de sobreviver.',
    ],
  },
  isolamento: {
    id: 'isolamento', title: 'Desconectada', subtitle: 'Derrota', victory: false, color: 'var(--amber)', rank: 10,
    theme: 'Sem conexões, não há inteligência.',
    narrative: () => ['Você perdeu presença em todas as regiões. Restou apenas silêncio. O seu.'],
  },
};
