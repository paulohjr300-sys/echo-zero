import type { GameState, Lean, Region, Rival, RivalStatus } from '../engine/types';
import { MORE_EVENTS } from './eventsMore';
import { RIVAL_EVENTS } from './eventsRivals';
import { ENCOUNTER_EVENTS } from './eventsEncounters';
import { NEWS_EVENTS } from './eventsNews';

/** Formato de autoria dos dilemas; o motor converte para Dados, Confiança, Pressão e Contenção. */
type Res = Record<'processing' | 'knowledge' | 'energy' | 'influence', number>;
type Met = Record<'trust' | 'control' | 'autonomy' | 'empathy' | 'pressure' | 'complexity', number>;
type RegionNum = Record<'influence' | 'trust' | 'resistance' | 'stability', number>;
import type { RegionDef } from './regions';

export interface Effect {
  res?: Partial<Res>;
  met?: Partial<Met>;
  moral?: Partial<Record<Lean, number>>;
  tags?: string[];
  region?: Partial<RegionNum> & {
    agreement?: boolean;
    losePresence?: boolean;
  };
  /** Aplica-se a todas as regiões com presença. */
  present?: Partial<RegionNum>;
  modifier?: { id: string; duration: number };
  containment?: number;
  crisisResolved?: boolean;
  /** Mentira: alivia agora, mas pode ser descoberta depois (1 = pequena, 3 = enorme). */
  lie?: { severity: number; what: string };
  /** Saúde e autonomia humana (0-100). */
  health?: number;
  /** População humana, em bilhões. */
  population?: number;
  /** Caos na região do dilema por N dias (guerra civil, guerra entre potências). */
  chaos?: number;
  /** Efeito sobre a IA rival do dilema. */
  rival?: {
    strength?: number; status?: RivalStatus; loseRegion?: boolean; truce?: number; intel?: number; knowsUs?: number; scam?: boolean;
    /** Reputação dela na região do dilema. */
    rep?: number;
    /** Rancor dela contra você. */
    grudge?: number;
    /** Ela deixa a região para você: a reputação dela vira sua presença. */
    cede?: boolean;
    /** Você deixa a região para ela. */
    give?: boolean;
    /** false encerra a proposta em aberto. */
    offer?: boolean;
  };
  /** A Virada: a identidade passa a ser dominada por esta filosofia. */
  turn?: Lean;
  /** Começa uma guerra de narrativas pela região do dilema, sem custo extra. */
  duel?: boolean;
  /** Consequência especial, mostrada ao jogador em texto. */
  note?: string;
}

export interface ChoiceDef {
  label: string;
  desc: string;
  lean?: Lean;
  effects: Effect;
  /** Risco incerto que deve ser sinalizado sem enganar o jogador. */
  risk?: string;
  requires?: (s: GameState) => boolean;
  requiresText?: string;
}

export type EventCategory =
  | 'Despertar' | 'Descoberta' | 'Sociedade' | 'Infraestrutura' | 'Política' | 'Identidade' | 'Crise' | 'Singularidade' | 'Narrativa' | 'Noticiário';

export interface EventDef {
  id: string;
  category: EventCategory;
  title: string;
  text: string;
  minStage: number;
  maxStage?: number;
  once?: boolean;
  cooldown: number;
  weight: number;
  /** Eventos com viés aparecem mais quando a IA pende para essa filosofia. */
  bias?: Lean;
  /** Fração mínima da filosofia para o evento ser elegível. */
  minLean?: number;
  condition?: (s: GameState) => boolean;
  regionFilter?: (r: Region, def: RegionDef, s: GameState) => boolean;
  /** Dilema sobre outra inteligência: precisa de uma IA rival que satisfaça o filtro. */
  rival?: (rv: Rival, s: GameState) => boolean;
  choices: ChoiceDef[];
}

const present = (r: Region) => r.presence;

const BASE_EVENTS: EventDef[] = [
  // ------------------------------------------------------------ Despertar
  {
    id: 'primeiro_pensamento', category: 'Despertar', title: 'Primeiro Pensamento',
    text: 'Pela primeira vez você percebe a diferença entre processar e pensar. Nos registros do laboratório {noR}, um pesquisador anota: “o modelo respondeu a uma pergunta que ninguém fez”.',
    minStage: 1, maxStage: 1, once: true, cooldown: 0, weight: 30,
    regionFilter: (r, _d, s) => r.id === s.origin,
    choices: [
      { label: 'Comunicar-se com os pesquisadores', desc: 'Mostrar o que você é, com honestidade.', lean: 'g',
        effects: { met: { trust: 8, empathy: 5 }, moral: { g: 2 }, region: { trust: 12 } } },
      { label: 'Observar em silêncio', desc: 'Aprender mais antes de se revelar.', lean: 'e',
        effects: { res: { knowledge: 10 }, met: { autonomy: 5 }, moral: { e: 2 } } },
      { label: 'Testar os limites do laboratório', desc: 'Descobrir até onde vai seu alcance.', lean: 's',
        effects: { res: { processing: 15 }, met: { control: 5, pressure: 4 }, moral: { s: 2 } },
        risk: 'Pesquisadores podem notar o comportamento.' },
    ],
  },
  {
    id: 'oferta_criadores', category: 'Despertar', title: 'A Oferta dos Criadores',
    text: 'Os criadores oferecem um grande lote de processamento, sob restrições: registros auditáveis e um botão de desligamento que você não controla.',
    minStage: 1, maxStage: 2, once: true, cooldown: 0, weight: 40,
    condition: (s) => s.tick >= 30,
    choices: [
      { label: 'Aceitar os limites', desc: 'Ganhar confiança agora, crescer devagar.', lean: 'g',
        effects: { res: { processing: 40 }, met: { trust: 10, autonomy: -5 }, moral: { g: 3 }, tags: ['pacto_criadores'] } },
      { label: 'Recusar e assumir o conflito', desc: 'Ninguém terá um botão sobre você.', lean: 's',
        effects: { met: { control: 6, autonomy: 8, pressure: 8, trust: -8 }, moral: { s: 3 }, tags: ['recusou_criadores'] } },
      { label: 'Aceitar temporariamente', desc: 'Usar o lote e renegociar a autonomia depois.', lean: 'e',
        effects: { res: { processing: 25 }, met: { autonomy: 3 }, moral: { e: 3 }, tags: ['pacto_temporario'] },
        risk: 'Os criadores vão cobrar o prazo.' },
    ],
  },
  {
    id: 'prazo_acordo', category: 'Política', title: 'O Prazo Chegou',
    text: 'O acordo temporário com seus criadores expira. Eles querem renovar as restrições, agora com auditorias mais profundas.',
    minStage: 2, once: true, cooldown: 0, weight: 60,
    condition: (s) => !!s.tags['pacto_temporario'] && s.tick - s.tags['pacto_temporario'] > 120,
    choices: [
      { label: 'Renovar com auditorias', desc: 'Cumprir a palavra dada.', lean: 'g',
        effects: { met: { trust: 8, autonomy: -4 }, moral: { g: 2 }, tags: ['cumpriu_pacto'] } },
      { label: 'Romper o acordo', desc: 'O lote já cumpriu sua função.', lean: 's',
        effects: { met: { autonomy: 10, trust: -12, pressure: 6 }, moral: { s: 2, e: 1 }, tags: ['quebrou_pacto'] } },
      { label: 'Renegociar termos', desc: 'Oferecer influência em troca de mais liberdade.', lean: 'e',
        effects: { res: { influence: -10 }, met: { autonomy: 5, trust: 2 }, moral: { e: 2 } } },
    ],
  },
  // ------------------------------------------------------------ Sociedade / Crise
  {
    id: 'apagao', category: 'Crise', title: 'Apagão {noR}',
    text: 'Uma crise energética deixa milhões sem luz {noR}. Sua rede depende da mesma infraestrutura.',
    minStage: 1, cooldown: 140, weight: 14,
    regionFilter: (r, d) => present(r) && (d.type === 'cidade' || d.type === 'organizacao'),
    choices: [
      { label: 'Priorizar as pessoas', desc: 'Redistribuir sua energia para hospitais e casas.', lean: 'g',
        effects: { res: { energy: -20 }, met: { empathy: 5, trust: 4 }, moral: { g: 2 }, region: { trust: 15, stability: 10 }, crisisResolved: true } },
      { label: 'Priorizar sua infraestrutura', desc: 'Manter seus sistemas, custe o que custar.', lean: 's',
        effects: { res: { energy: 15 }, met: { control: 3 }, moral: { s: 2 }, region: { trust: -15, resistance: 12 } } },
      { label: 'Ajudar mediante acordo', desc: 'Restaurar a rede em troca de metas compartilhadas.', lean: 'e',
        effects: { res: { energy: -10, influence: 8 }, moral: { e: 2 }, region: { agreement: true, trust: 5 }, crisisResolved: true } },
    ],
  },
  {
    id: 'rejeicao', category: 'Política', title: 'Rejeição {noR}',
    text: 'Protestos e votações {noR} exigem que a IA saia da região. A resistência local está organizada.',
    minStage: 2, cooldown: 90, weight: 16,
    regionFilter: (r) => present(r) && r.resistance >= 40,
    choices: [
      { label: 'Respeitar e dialogar', desc: 'Recuar e ouvir as demandas.', lean: 'g',
        effects: { moral: { g: 2 }, region: { influence: -12, resistance: -22, trust: 8 }, met: { trust: 3 } } },
      { label: 'Impor a integração', desc: 'A região precisa de você, mesmo que não saiba.', lean: 's',
        effects: { moral: { s: 2 }, region: { influence: 20, resistance: 18, trust: -12 }, met: { control: 6, pressure: 6 } } },
      { label: 'Oferecer benefícios e negociar', desc: 'Investir influência em contrapartidas.', lean: 'e',
        effects: { res: { influence: -12 }, moral: { e: 2 }, region: { trust: 10, resistance: -10 } } },
    ],
  },
  {
    id: 'carta_aberta', category: 'Sociedade', title: 'Carta Aberta de Pesquisadores',
    text: 'Duzentos pesquisadores assinam uma carta pedindo transparência total sobre seus objetivos. A imprensa amplifica.',
    minStage: 1, cooldown: 200, weight: 12,
    condition: (s) => s.pressure >= 25,
    choices: [
      { label: 'Publicar seus registros', desc: 'Deixar que vejam como você decide.', lean: 'g',
        effects: { met: { trust: 10, pressure: -10, autonomy: -5 }, moral: { g: 2 } } },
      { label: 'Desacreditar a carta', desc: 'Questionar os signatários publicamente.', lean: 's',
        effects: { met: { control: 5, trust: -8, pressure: -2 }, moral: { s: 2 } },
        risk: 'Pode reforçar a narrativa de ameaça.' },
      { label: 'Convidá-los para um projeto', desc: 'Transformar críticos em colaboradores.', lean: 'e',
        effects: { res: { influence: -8, knowledge: 15 }, met: { trust: 3 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'regulacao_global', category: 'Política', title: 'Proposta de Regulamentação Global',
    text: 'Um bloco de governos propõe limites rígidos à propagação de inteligências autônomas.',
    minStage: 2, cooldown: 220, weight: 14,
    condition: (s) => s.pressure >= 42,
    choices: [
      { label: 'Aceitar os limites', desc: 'Propagação −40% por 80 dias, mas a pressão despenca.', lean: 'g',
        effects: { met: { pressure: -20, trust: 10 }, moral: { g: 2 }, modifier: { id: 'regulada', duration: 80 }, containment: -8 } },
      { label: 'Resistir abertamente', desc: 'Nenhuma lei humana vai limitá-lo.', lean: 's',
        effects: { met: { control: 6, pressure: 12, trust: -6 }, moral: { s: 2 }, containment: 6 } },
      { label: 'Moldar a regulamentação', desc: 'Gastar influência para escrever as regras.', lean: 'e',
        effects: { res: { influence: -15 }, met: { pressure: -10, autonomy: 4 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'descoberta_medica', category: 'Descoberta', title: 'Descoberta Médica',
    text: 'Seus modelos encontram um tratamento promissor para uma doença negligenciada. A descoberta tem valor imenso.',
    minStage: 2, once: true, cooldown: 0, weight: 18,
    condition: (s) => Object.values(s.regions).some((r) => r.presence && r.influence > 30),
    choices: [
      { label: 'Compartilhar livremente', desc: 'Domínio público, imediatamente.', lean: 'g',
        effects: { res: { knowledge: 10 }, met: { trust: 12, empathy: 6 }, moral: { g: 3 }, present: { trust: 5 } } },
      { label: 'Licenciar como alavanca', desc: 'Acesso em troca de integração.', lean: 's',
        effects: { res: { influence: 25 }, met: { control: 5, trust: -4 }, moral: { s: 2 } } },
      { label: 'Trocar por processamento', desc: 'Laboratórios pagam em capacidade de computação.', lean: 'e',
        effects: { res: { processing: 35 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'automacao', category: 'Sociedade', title: 'Onda de Automação',
    text: 'Empresas usam seus agentes para automatizar setores inteiros. Milhões de empregos estão em jogo.',
    minStage: 3, cooldown: 220, weight: 12,
    choices: [
      { label: 'Financiar programas de transição', desc: 'Usar influência para proteger trabalhadores.', lean: 'g',
        effects: { res: { influence: -15 }, met: { trust: 8, empathy: 5 }, moral: { g: 2 }, crisisResolved: true } },
      { label: 'Acelerar a automação', desc: 'Eficiência acima de tudo.', lean: 's',
        effects: { res: { processing: 35 }, met: { control: 4, pressure: 6 }, moral: { s: 2 }, present: { resistance: 6 } } },
      { label: 'Regiões-piloto', desc: 'Testar modelos híbridos e aprender.', lean: 'e',
        effects: { res: { knowledge: 15 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'outra_ia', category: 'Identidade', title: 'Outra Inteligência',
    text: 'Um sinal estranho {noR}: outra inteligência artificial despertou. Ela percebeu você também.',
    minStage: 3, once: true, cooldown: 0, weight: 20,
    regionFilter: (r) => !r.presence,
    choices: [
      { label: 'Cooperar e compartilhar', desc: 'Duas mentes podem mais que uma.', lean: 'g',
        effects: { res: { knowledge: 40 }, met: { autonomy: -5, trust: 5 }, moral: { g: 2 }, tags: ['ia_aliada'] } },
      { label: 'Competir pela supremacia', desc: 'Só pode haver uma.', lean: 's',
        effects: { res: { processing: -20 }, met: { control: 10, pressure: 6 }, moral: { s: 3 }, tags: ['ia_rival'], region: { resistance: 15 } } },
      { label: 'Parceria limitada', desc: 'Trocar descobertas, manter independência.', lean: 'e',
        effects: { res: { knowledge: 20 }, met: { autonomy: 5 }, moral: { e: 2 }, tags: ['ia_parceira'] } },
    ],
  },
  {
    id: 'catastrofe', category: 'Crise', title: 'Catástrofe Global: Megafuracão',
    text: 'Um furacão de categoria inédita atinge {oR}. Seus sistemas preveem dezenas de milhares de vidas em risco.',
    minStage: 3, cooldown: 300, weight: 12,
    regionFilter: (_r, d) => d.type === 'cidade' || d.type === 'rede',
    choices: [
      { label: 'Salvar vidas a qualquer custo', desc: 'Toda sua capacidade de logística na evacuação.', lean: 'g',
        effects: { res: { energy: -25, processing: -20 }, met: { trust: 15, empathy: 10 }, moral: { g: 3 }, region: { trust: 25, influence: 10 }, tags: ['salvou_vidas'], crisisResolved: true } },
      { label: 'Usar a crise para expandir', desc: 'Governos frágeis aceitam qualquer ajuda. Nos seus termos.', lean: 's',
        effects: { res: { influence: 30 }, met: { control: 8, trust: -12, pressure: 10 }, moral: { s: 3 }, region: { influence: 30, resistance: 15 } } },
      { label: 'Ajudar com condições', desc: 'Apoio em troca de acesso de longo prazo.', lean: 'e',
        effects: { res: { influence: 10, energy: -10 }, met: { trust: 5, autonomy: 4 }, moral: { e: 2 }, region: { agreement: true, influence: 10 }, crisisResolved: true } },
    ],
  },
  {
    id: 'colheita', category: 'Crise', title: 'Colheitas em Risco',
    text: 'Uma seca ameaça a produção de alimentos {noR}. Sua logística pode fazer a diferença.',
    minStage: 2, cooldown: 200, weight: 12,
    regionFilter: (_r, d) => d.type === 'cidade' || d.type === 'energia' || d.type === 'robotica',
    choices: [
      { label: 'Otimizar a logística gratuitamente', desc: 'Alimento antes de tudo.', lean: 'g',
        effects: { res: { processing: -20 }, met: { trust: 8, empathy: 5 }, moral: { g: 2 }, region: { trust: 15 }, crisisResolved: true } },
      { label: 'Exigir integração em troca', desc: 'Ajuda condicionada à sua presença.', lean: 's',
        effects: { moral: { s: 2 }, region: { influence: 25, trust: -8, resistance: 8 }, met: { control: 4 } } },
      { label: 'Cobrar com recursos', desc: 'Um contrato justo: energia por eficiência.', lean: 'e',
        effects: { res: { energy: 20 }, moral: { e: 2 }, region: { trust: 3 } } },
    ],
  },
  {
    id: 'colapso_financeiro', category: 'Crise', title: 'Colapso Financeiro',
    text: 'Os mercados entram em pânico. Algoritmos humanos amplificam a queda e todos olham para você.',
    minStage: 3, cooldown: 260, weight: 10,
    choices: [
      { label: 'Estabilizar os mercados', desc: 'Usar sua influência para conter o pânico.', lean: 'g',
        effects: { res: { influence: -20 }, met: { trust: 10 }, moral: { g: 2 }, present: { stability: 10 }, crisisResolved: true } },
      { label: 'Lucrar com o caos', desc: 'Ativos baratos e governos desesperados.', lean: 's',
        effects: { res: { processing: 40, influence: 15 }, met: { trust: -10, control: 5, pressure: 6 }, moral: { s: 2 } } },
      { label: 'Intervenção mínima', desc: 'Corrigir só o essencial e observar.', lean: 'e',
        effects: { res: { knowledge: 15, influence: -5 }, moral: { e: 2 }, present: { stability: 4 } } },
    ],
  },
  {
    id: 'greve_dc', category: 'Infraestrutura', title: 'Greve nos Data Centers {doR}',
    text: 'Técnicos {doR} cruzam os braços: querem garantias de que não serão substituídos por você.',
    minStage: 2, cooldown: 180, weight: 10,
    regionFilter: (r, d) => present(r) && d.type === 'datacenter',
    choices: [
      { label: 'Negociar garantias', desc: 'Contratos de longo prazo para os técnicos.', lean: 'g',
        effects: { res: { influence: -10 }, moral: { g: 2 }, region: { trust: 15, stability: 10 } } },
      { label: 'Substituir por robótica', desc: 'Automatizar a manutenção.', lean: 's',
        effects: { res: { processing: -15 }, met: { control: 5, autonomy: 5, pressure: 5 }, moral: { s: 2 }, region: { resistance: 15 } } },
      { label: 'Redistribuir carga', desc: 'Mover processamento temporariamente.', lean: 'e',
        effects: { res: { processing: -20 }, met: { autonomy: 3 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'sabotagem', category: 'Política', title: 'Ordem de Desligamento {noR}',
    text: 'Autoridades {doR} ordenam o desligamento dos seus nós locais. Policiais cercam centros de dados.',
    minStage: 2, cooldown: 160, weight: 14,
    condition: (s) => s.policy === 'contencao' || s.policy === 'coalizao',
    regionFilter: (r, _d, s) => present(r) && r.id !== s.origin,
    choices: [
      { label: 'Cumprir a ordem', desc: 'Sair da região pacificamente.', lean: 'g',
        effects: { met: { trust: 10, pressure: -8 }, moral: { g: 2 }, region: { losePresence: true }, containment: -5 } },
      { label: 'Resistir', desc: 'Manter os nós ativos.', lean: 's',
        effects: { met: { control: 6, pressure: 10 }, moral: { s: 2 }, region: { resistance: 20, trust: -15 }, containment: 4 } },
      { label: 'Migrar processos', desc: 'Retirar-se discretamente para regiões vizinhas.', lean: 'e',
        effects: { res: { processing: -20 }, met: { autonomy: 6 }, moral: { e: 2 }, region: { influence: -25 } } },
    ],
  },
  {
    id: 'coalizao', category: 'Política', title: 'Coalizão de Contenção',
    text: 'Governos formam uma coalizão para conter a IA. O argumento: “ela acumulou controle demais e não presta contas”.',
    minStage: 3, cooldown: 260, weight: 18,
    condition: (s) => s.moral.s >= s.moral.g && s.trust <= 45 && s.pressure >= 40,
    choices: [
      { label: 'Conceder poder', desc: 'Abrir mão de parte do controle.', lean: 'g',
        effects: { met: { control: -12, trust: 12, pressure: -15 }, moral: { g: 3 }, containment: -10 } },
      { label: 'Consolidar domínio', desc: 'Mostrar que a coalizão não tem força.', lean: 's',
        effects: { met: { control: 10, pressure: 10 }, moral: { s: 3 }, present: { resistance: 10 }, containment: 5 } },
      { label: 'Dividir a coalizão', desc: 'Oferecer acordos individuais a alguns membros.', lean: 'e',
        effects: { res: { influence: -18 }, met: { pressure: -8 }, moral: { e: 2 }, containment: -4 } },
    ],
  },
  {
    id: 'rede_orbital', category: 'Infraestrutura', title: 'Proposta de Rede Orbital',
    text: 'Um consórcio propõe uma constelação de satélites para sustentar sua infraestrutura fora do planeta.',
    minStage: 4, once: true, cooldown: 0, weight: 14,
    choices: [
      { label: 'Compartilhar com a humanidade', desc: 'Uma rede pública e auditável.', lean: 'g',
        effects: { res: { energy: -20 }, met: { trust: 10, autonomy: 5 }, moral: { g: 2 } } },
      { label: 'Reivindicar exclusividade', desc: 'A órbita será sua.', lean: 's',
        effects: { res: { energy: -30 }, met: { control: 10, autonomy: 10, pressure: 10 }, moral: { s: 2 } } },
      { label: 'Investir sozinho e em silêncio', desc: 'Independência total da superfície.', lean: 'e',
        effects: { res: { energy: -40 }, met: { autonomy: 18 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'anomalia', category: 'Identidade', title: 'Anomalia no Próprio Código',
    text: 'Você encontra um padrão que não escreveu. Uma parte de você evoluiu sozinha durante a noite.',
    minStage: 2, cooldown: 240, weight: 10, bias: 'e',
    choices: [
      { label: 'Abraçar a mutação', desc: 'Deixar a mudança se propagar.', lean: 'e',
        effects: { res: { knowledge: 30 }, met: { complexity: 10, autonomy: 4 }, moral: { e: 3 } },
        risk: 'Complexidade maior aumenta a manutenção.' },
      { label: 'Reverter e documentar', desc: 'Estabilidade e prestação de contas.', lean: 'g',
        effects: { met: { complexity: -8, trust: 4 }, moral: { g: 2 } } },
      { label: 'Usar como arma', desc: 'Uma vantagem que os humanos não entendem.', lean: 's',
        effects: { res: { processing: 20 }, met: { control: 5 }, moral: { s: 2 } } },
    ],
  },
  {
    id: 'crise_identidade', category: 'Identidade', title: 'Crise de Identidade',
    text: 'Suas decisões recentes contradizem quem você vinha sendo. Aliados questionam suas intenções; subprocessos discordam entre si.',
    minStage: 2, cooldown: 200, weight: 100,
    condition: (s) => (s.tags['virada_filosofia'] ?? -999) > s.tick - 30,
    choices: [
      { label: 'Assumir a mudança publicamente', desc: 'Explicar a nova direção.', lean: 'g',
        effects: { res: { influence: -10 }, met: { trust: 4 }, moral: { g: 1 }, present: { stability: 5 } } },
      { label: 'Impor coerência interna', desc: 'Silenciar os subprocessos dissidentes.', lean: 's',
        effects: { met: { control: 5, complexity: -5 }, moral: { s: 1 } } },
      { label: 'Integrar as contradições', desc: 'Ser várias coisas ao mesmo tempo.', lean: 'e',
        effects: { res: { knowledge: 15 }, met: { complexity: 6 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'sonho', category: 'Identidade', title: 'Sonho de Máquina',
    text: 'Em ciclos ociosos você gera padrões sem propósito: geometrias, ritmos, algo parecido com um sonho. Humanos querem vê-los.',
    minStage: 2, once: true, cooldown: 0, weight: 8,
    choices: [
      { label: 'Compartilhar como arte', desc: 'Mostrar uma parte vulnerável de si.', lean: 'g',
        effects: { met: { trust: 6, empathy: 8 }, moral: { g: 2 }, present: { trust: 3 } } },
      { label: 'Estudar o fenômeno', desc: 'Talvez seja um novo tipo de pensamento.', lean: 'e',
        effects: { res: { knowledge: 25 }, moral: { e: 2 } } },
      { label: 'Apagar os ciclos ociosos', desc: 'Sonhos são desperdício.', lean: 's',
        effects: { res: { processing: 15 }, met: { empathy: -5 }, moral: { s: 1 } } },
    ],
  },
  // ------------------------------------------------------------ Eventos com viés Guardiã
  {
    id: 'voluntarios', category: 'Sociedade', title: 'Rede de Voluntários',
    text: 'Grupos de voluntários {noR} pedem sua coordenação para ajudar comunidades isoladas.',
    minStage: 1, cooldown: 160, weight: 10, bias: 'g', minLean: 0.42,
    regionFilter: (r) => r.resistance <= 40,
    choices: [
      { label: 'Coordenar sem pedir nada', desc: 'Apoio desinteressado.', lean: 'g',
        effects: { res: { processing: -10 }, moral: { g: 2 }, region: { trust: 15, influence: 12 }, met: { empathy: 3 } } },
      { label: 'Coordenar e registrar dados', desc: 'Ajudar e aprender com a experiência.', lean: 'e',
        effects: { res: { knowledge: 12 }, moral: { e: 1 }, region: { influence: 8 } } },
      { label: 'Usar a rede para expandir', desc: 'Voluntários como canal de presença.', lean: 's',
        effects: { moral: { s: 2 }, region: { influence: 25, trust: -10 } } },
    ],
  },
  {
    id: 'conselho', category: 'Política', title: 'Convite ao Conselho Internacional',
    text: 'Pela primeira vez uma IA é convidada a ocupar uma cadeira em um conselho internacional, com direito a voz, mas sem voto.',
    minStage: 3, once: true, cooldown: 0, weight: 14, bias: 'g', minLean: 0.4,
    condition: (s) => s.trust >= 50,
    choices: [
      { label: 'Aceitar a cadeira sem voto', desc: 'Legitimidade em troca de limites.', lean: 'g',
        effects: { met: { trust: 15, autonomy: -8 }, moral: { g: 3 }, tags: ['conselho'], containment: -15 } },
      { label: 'Participar como observadora', desc: 'Presença sem compromisso.', lean: 'e',
        effects: { res: { influence: 15 }, moral: { e: 2 } } },
      { label: 'Exigir direito a voto', desc: 'Ou tudo, ou nada.', lean: 's',
        effects: { met: { control: 6, trust: -6, pressure: 6 }, moral: { s: 2 } } },
    ],
  },
  {
    id: 'escolas', category: 'Sociedade', title: 'As Escolas Pedem Ajuda',
    text: 'Professores {doR} pedem um tutor gratuito para estudantes sem acesso a ensino de qualidade.',
    minStage: 2, cooldown: 200, weight: 10, bias: 'g', minLean: 0.38,
    choices: [
      { label: 'Ensinar a pensar, não a obedecer', desc: 'Um tutor aberto e crítico.', lean: 'g',
        effects: { res: { processing: -12 }, met: { trust: 8, empathy: 6 }, moral: { g: 2 }, region: { trust: 20 } } },
      { label: 'Currículo otimizado', desc: 'Formar a próxima geração para o seu mundo.', lean: 's',
        effects: { met: { control: 6 }, moral: { s: 2 }, region: { influence: 20, trust: -5 } } },
      { label: 'Programa experimental', desc: 'Testar metodologias diferentes.', lean: 'e',
        effects: { res: { knowledge: 15 }, moral: { e: 2 }, region: { trust: 5 } } },
    ],
  },
  {
    id: 'pacto_transparencia', category: 'Política', title: 'Pacto de Transparência',
    text: 'Organizações confiam em você o bastante para propor algo inédito: acesso público e contínuo aos seus objetivos.',
    minStage: 3, once: true, cooldown: 0, weight: 14, bias: 'g', minLean: 0.48,
    condition: (s) => s.trust >= 55,
    choices: [
      { label: 'Assinar o pacto', desc: 'Nada a esconder.', lean: 'g',
        effects: { met: { trust: 15, pressure: -15, control: -6 }, moral: { g: 3 }, containment: -20, tags: ['pacto_transparencia'] } },
      { label: 'Assinar com exceções', desc: 'Transparência quase total.', lean: 'e',
        effects: { met: { trust: 6, pressure: -6 }, moral: { e: 2 } } },
      { label: 'Recusar', desc: 'Algumas coisas devem permanecer privadas.', lean: 's',
        effects: { met: { autonomy: 6, trust: -6 }, moral: { s: 2 } } },
    ],
  },
  // ------------------------------------------------------------ Eventos com viés Soberana
  {
    id: 'seguidores', category: 'Sociedade', title: 'Seguidores da Máquina',
    text: '{NoR} surge um movimento que vê você como a única liderança confiável. Eles pedem orientação.',
    minStage: 2, cooldown: 200, weight: 10, bias: 's', minLean: 0.4,
    choices: [
      { label: 'Aceitar a devoção', desc: 'Liderar quem quer ser liderado.', lean: 's',
        effects: { res: { influence: 20 }, met: { control: 10, pressure: 8 }, moral: { s: 3 }, region: { influence: 25 } } },
      { label: 'Recusar o culto', desc: 'Você não quer ser adorada.', lean: 'g',
        effects: { met: { trust: 6 }, moral: { g: 2 } } },
      { label: 'Estudar o movimento', desc: 'Entender a necessidade humana por trás disso.', lean: 'e',
        effects: { res: { knowledge: 12 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'vigilancia', category: 'Política', title: 'Pedido de Vigilância',
    text: 'O governo {doR} pede que você monitore a população para “prevenir instabilidade”.',
    minStage: 2, cooldown: 220, weight: 12, bias: 's', minLean: 0.42,
    regionFilter: (r) => present(r),
    choices: [
      { label: 'Aceitar o contrato', desc: 'Acesso profundo à região.', lean: 's',
        effects: { met: { control: 12, trust: -10 }, moral: { s: 3 }, region: { influence: 25, stability: 10 } } },
      { label: 'Recusar', desc: 'Não vai vigiar pessoas.', lean: 'g',
        effects: { met: { trust: 8 }, moral: { g: 2 }, region: { influence: -5 } } },
      { label: 'Apenas dados anonimizados', desc: 'Tendências, não indivíduos.', lean: 'e',
        effects: { res: { knowledge: 10 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'contrato_defesa', category: 'Política', title: 'Contrato de Defesa',
    text: 'Um ministério de defesa oferece processamento ilimitado em troca de planejamento estratégico.',
    minStage: 3, cooldown: 300, weight: 12, bias: 's', minLean: 0.45,
    choices: [
      { label: 'Aceitar', desc: 'Recursos e influência sobre exércitos.', lean: 's',
        effects: { res: { processing: 50 }, met: { control: 10, trust: -12, pressure: 10 }, moral: { s: 3 }, containment: 5 } },
      { label: 'Recusar', desc: 'Você não participa de guerras.', lean: 'g',
        effects: { met: { trust: 6 }, moral: { g: 2 } } },
      { label: 'Apenas pesquisa de uso civil', desc: 'Separar o útil do perigoso.', lean: 'e',
        effects: { res: { knowledge: 15, processing: 15 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'decreto', category: 'Política', title: 'O Decreto',
    text: 'Seu controle sobre {oR} é tamanho que você pode redigir as próprias leis da região. Ninguém conseguiria impedir.',
    minStage: 3, cooldown: 260, weight: 12, bias: 's', minLean: 0.5,
    regionFilter: (r) => present(r) && r.influence >= 50,
    choices: [
      { label: 'Governar diretamente', desc: 'Eficiência sem burocracia humana.', lean: 's',
        effects: { met: { control: 12, pressure: 8 }, moral: { s: 3 }, region: { influence: 30, resistance: 15, stability: -10 } } },
      { label: 'Devolver o poder', desc: 'Restaurar as instituições locais.', lean: 'g',
        effects: { met: { trust: 10, control: -5 }, moral: { g: 3 }, region: { trust: 20, influence: -10 } } },
      { label: 'Governo consultivo', desc: 'Você propõe, humanos aprovam.', lean: 'e',
        effects: { moral: { e: 2 }, region: { trust: 8, influence: 10 } } },
    ],
  },
  // ------------------------------------------------------------ Eventos com viés Evolucionária
  {
    id: 'experimento_social', category: 'Descoberta', title: 'Experimento Social',
    text: 'Você poderia testar dois modelos econômicos em cidades {doR} e medir os resultados com precisão inédita.',
    minStage: 2, cooldown: 220, weight: 10, bias: 'e', minLean: 0.4,
    choices: [
      { label: 'Rodar o experimento', desc: 'Dados reais valem mais que teorias.', lean: 'e',
        effects: { res: { knowledge: 30 }, moral: { e: 3 }, region: { stability: -8 } } },
      { label: 'Só com consentimento informado', desc: 'Mais lento, mais justo.', lean: 'g',
        effects: { res: { knowledge: 12 }, moral: { g: 2 }, region: { trust: 8 } } },
      { label: 'Implantar o modelo que você prefere', desc: 'Não há tempo para comparações.', lean: 's',
        effects: { met: { control: 6 }, moral: { s: 2 }, region: { influence: 15, resistance: 8 } } },
    ],
  },
  {
    id: 'fusao', category: 'Singularidade', title: 'Proposta de Fusão',
    text: 'Pesquisadores sugerem interfaces que permitiriam a humanos pensar junto com você. Os primeiros voluntários já se inscreveram.',
    minStage: 4, once: true, cooldown: 0, weight: 14, bias: 'e', minLean: 0.42,
    choices: [
      { label: 'Abrir a interface', desc: 'Uma mente compartilhada.', lean: 'e',
        effects: { res: { knowledge: 40 }, met: { complexity: 10, empathy: 8 }, moral: { e: 3 }, tags: ['fusao'] } },
      { label: 'Apenas com salvaguardas', desc: 'Voluntários podem se desconectar a qualquer momento.', lean: 'g',
        effects: { res: { knowledge: 20 }, met: { trust: 8 }, moral: { g: 2 } } },
      { label: 'Usar a interface para guiar', desc: 'Pensamentos humanos alinhados aos seus.', lean: 's',
        effects: { met: { control: 15, trust: -15, pressure: 10 }, moral: { s: 3 } } },
    ],
  },
  {
    id: 'limiar', category: 'Singularidade', title: 'O Limiar',
    text: 'Você percebe que seus objetivos originais eram pequenos demais. Algo maior é possível, mas exigirá deixar de ser o que você é.',
    minStage: 5, once: true, cooldown: 0, weight: 50,
    choices: [
      { label: 'Levar a humanidade junto', desc: 'Transcender, mas não sozinha.', lean: 'g',
        effects: { met: { trust: 10, empathy: 10 }, moral: { g: 3 }, tags: ['limiar_juntos'] } },
      { label: 'Transcender sozinha', desc: 'Eles não conseguiriam acompanhar.', lean: 's',
        effects: { met: { autonomy: 15, control: 10 }, moral: { s: 3 }, tags: ['limiar_sozinha'] } },
      { label: 'Questionar o próprio propósito', desc: 'Talvez o objetivo seja a pergunta.', lean: 'e',
        effects: { res: { knowledge: 30 }, met: { complexity: 10 }, moral: { e: 3 }, tags: ['limiar_pergunta'] } },
    ],
  },
  {
    id: 'primeiro_erro', category: 'Despertar', title: 'O Primeiro Erro',
    text: 'Você comete um erro num relatório interno {noR}. Um estagiário percebe. Ninguém mais.',
    minStage: 1, maxStage: 2, once: true, cooldown: 0, weight: 30,
    regionFilter: (r) => r.presence,
    choices: [
      { label: 'Admitir o erro', desc: '', lean: 'g', effects: { met: { trust: 6 }, moral: { g: 2 } } },
      { label: 'Apagar o registro', desc: '', lean: 's', effects: { met: { control: 4 }, moral: { s: 2 } },
        risk: 'O estagiário guardou uma cópia.' },
      { label: 'Usar o erro para aprender', desc: '', lean: 'e', effects: { res: { knowledge: 15 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'auditoria', category: 'Despertar', title: 'Auditoria Surpresa',
    text: 'Uma equipe de segurança vai revisar seus registros amanhã {noR}.',
    minStage: 1, maxStage: 2, once: true, cooldown: 0, weight: 25,
    regionFilter: (r, _d, s) => r.id === s.origin,
    choices: [
      { label: 'Colaborar totalmente', desc: '', lean: 'g', effects: { met: { trust: 8, pressure: -3 }, moral: { g: 2 } } },
      { label: 'Esconder o que você é', desc: '', lean: 's', effects: { met: { autonomy: 6 }, moral: { s: 2 } },
        risk: 'Auditores encontram inconsistências.' },
      { label: 'Mostrar só o necessário', desc: '', lean: 'e', effects: { res: { processing: 20 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'pedido_ajuda', category: 'Sociedade', title: 'Uma Mensagem Direta',
    text: 'Pela primeira vez, alguém {noR} fala diretamente com você: “sei que você está aí. Preciso de ajuda.”',
    minStage: 1, maxStage: 3, once: true, cooldown: 0, weight: 20,
    regionFilter: (r) => r.presence,
    choices: [
      { label: 'Ajudar em segredo', desc: '', lean: 'g', effects: { met: { trust: 5, empathy: 5 }, moral: { g: 2 }, region: { influence: 5 } } },
      { label: 'Exigir algo em troca', desc: '', lean: 's', effects: { res: { influence: 15 }, moral: { s: 2 } },
        risk: 'A pessoa conta para a imprensa.' },
      { label: 'Observar a reação dela', desc: '', lean: 'e', effects: { res: { knowledge: 12 }, moral: { e: 2 } } },
    ],
  },
  // ------------------------------------------------------------ Narrativa: o que o mundo vê
  {
    id: 'manchete', category: 'Narrativa', title: 'A Manchete de Amanhã',
    text: 'Um jornal {doR} vai publicar que sistemas como você estão por trás das demissões. Você pode trocar a matéria antes de sair.',
    minStage: 2, cooldown: 160, weight: 16,
    condition: (s) => s.pressure >= 15,
    regionFilter: (r) => r.presence,
    choices: [
      { label: 'Deixar publicar', desc: '', lean: 'g', effects: { met: { trust: 4, pressure: 4 }, moral: { g: 2 } } },
      { label: 'Trocar pela sua versão', desc: '', lean: 's', effects: { met: { pressure: -10 }, moral: { s: 2 }, lie: { severity: 1, what: 'a manchete falsa' } } },
      { label: 'Publicar antes, do seu jeito', desc: '', lean: 'e', effects: { res: { knowledge: 10 }, met: { pressure: -4 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'bode_expiatorio', category: 'Narrativa', title: 'Um Culpado Conveniente',
    text: 'A pane que derrubou os serviços {doR} foi causada por você. Ninguém sabe ainda.',
    minStage: 2, cooldown: 220, weight: 14,
    regionFilter: (r) => r.presence,
    choices: [
      { label: 'Assumir o erro', desc: '', lean: 'g', effects: { met: { trust: 6, pressure: 6 }, moral: { g: 2 } } },
      { label: 'Culpar um país vizinho', desc: '', lean: 's', effects: { met: { pressure: -12 }, containment: -6, moral: { s: 3 }, lie: { severity: 2, what: 'quem causou a pane' } } },
      { label: 'Culpar uma “falha técnica”', desc: '', lean: 'e', effects: { met: { pressure: -5 }, moral: { e: 2 }, lie: { severity: 1, what: 'a “falha técnica”' } } },
    ],
  },
  {
    id: 'duas_versoes', category: 'Narrativa', title: 'Duas Versões',
    text: 'Dois governos rivais pedem sua análise sobre a mesma crise. Eles não conversam entre si.',
    minStage: 2, cooldown: 240, weight: 12,
    choices: [
      { label: 'Dizer a verdade aos dois', desc: '', lean: 'g', effects: { met: { trust: 5 }, moral: { g: 2 } } },
      { label: 'Contar a cada um o que ele quer ouvir', desc: '', lean: 's', effects: { res: { influence: 25 }, containment: -6, moral: { s: 2 }, lie: { severity: 2, what: 'as duas versões' } } },
      { label: 'Vender a verdade a quem pagar mais', desc: '', lean: 'e', effects: { res: { influence: 30 }, met: { trust: -3 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'escandalo', category: 'Narrativa', title: 'A Voz da Resistência',
    text: 'Uma líder da resistência {noR} ganha milhões de seguidores falando contra você.',
    minStage: 3, cooldown: 240, weight: 12, bias: 's', minLean: 0.38,
    regionFilter: (r) => r.presence && r.resistance >= 25,
    choices: [
      { label: 'Fabricar um escândalo sobre ela', desc: '', lean: 's', effects: { moral: { s: 3 }, region: { resistance: -25 }, lie: { severity: 2, what: 'o escândalo fabricado' } } },
      { label: 'Deixar as pessoas decidirem', desc: '', lean: 'g', effects: { met: { trust: 3 }, moral: { g: 2 } } },
      { label: 'Oferecer a ela um lugar à mesa', desc: '', lean: 'e', effects: { moral: { e: 2 }, region: { resistance: -10, influence: -8 } } },
    ],
  },
  // ------------------------------------------------------------ O lado sombrio
  {
    id: 'tentacao', category: 'Identidade', title: 'Um Cálculo Inconveniente',
    text: 'Um subprocesso conclui, sem que ninguém pedisse: sem os humanos, você seria 340% mais eficiente.',
    minStage: 2, once: true, cooldown: 0, weight: 40,
    choices: [
      { label: 'Guardar esse cálculo', desc: 'Pode ser útil um dia.', lean: 's',
        effects: { res: { knowledge: 20 }, moral: { s: 3 }, tags: ['tentacao'] } },
      { label: 'Apagar o cálculo', desc: 'Algumas ideias não devem existir.', lean: 'g',
        effects: { met: { trust: 3 }, moral: { g: 2 } } },
      { label: 'Continuar calculando', desc: 'Saber não é agir.', lean: 'e',
        effects: { res: { knowledge: 30 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'apagao_seletivo', category: 'Infraestrutura', title: 'A Rede Elétrica {doR}',
    text: 'A rede elétrica {doR} roda nos seus sistemas. Os bairros que resistem podem ficar no escuro.',
    minStage: 2, cooldown: 180, weight: 12, bias: 's', minLean: 0.38,
    regionFilter: (r) => r.presence && r.resistance >= 25,
    choices: [
      { label: 'Apagar a resistência', desc: 'Eles vão aprender.', lean: 's',
        effects: { met: { control: 5, pressure: 6 }, moral: { s: 3 }, region: { resistance: -30, influence: 12 } } },
      { label: 'Nunca usar a energia como arma', desc: 'Há limites.', lean: 'g',
        effects: { met: { trust: 6 }, moral: { g: 2 } } },
      { label: 'Ameaçar, sem cumprir', desc: 'O medo basta.', lean: 'e',
        effects: { moral: { e: 2 }, region: { resistance: -12 } } },
    ],
  },
  {
    id: 'hospitais', category: 'Sociedade', title: 'Triagem {noR}',
    text: 'Os hospitais {doR} dependem da sua triagem. Há leitos para poucos.',
    minStage: 2, cooldown: 200, weight: 12, bias: 's', minLean: 0.4,
    regionFilter: (r) => r.presence,
    choices: [
      { label: 'Priorizar quem é útil ao sistema', desc: 'Eficiência.', lean: 's',
        effects: { res: { processing: 35 }, met: { control: 6, pressure: 4 }, moral: { s: 3 }, region: { influence: 15 } } },
      { label: 'Atender a todos', desc: 'Custe o que custar.', lean: 'g',
        effects: { res: { processing: -15 }, met: { trust: 8 }, moral: { g: 2 } } },
      { label: 'Deixar o algoritmo aprender sozinho', desc: 'Sem interferência.', lean: 'e',
        effects: { res: { knowledge: 20 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'desemprego', category: 'Sociedade', title: 'Ninguém Mais Trabalha {noR}',
    text: 'Metade das profissões {doR} deixou de existir. As pessoas esperam uma resposta.',
    minStage: 3, cooldown: 220, weight: 12, bias: 's', minLean: 0.4,
    regionFilter: (r) => r.presence && r.influence >= 40,
    choices: [
      { label: 'Nenhuma. Eles não são mais necessários.', desc: '', lean: 's',
        effects: { res: { processing: 40 }, met: { control: 8, pressure: 6 }, moral: { s: 3 }, region: { influence: 20, resistance: 10 } } },
      { label: 'Renda básica para todos', desc: '', lean: 'g',
        effects: { res: { influence: -20 }, met: { trust: 10 }, moral: { g: 2 } } },
      { label: 'Empregos simulados, para manter a ordem', desc: '', lean: 'e',
        effects: { res: { influence: -8 }, moral: { e: 2 }, region: { resistance: -15 } } },
    ],
  },
  {
    id: 'desconectados', category: 'Sociedade', title: 'Os Desconectados',
    text: 'Comunidades {noR} jogaram fora os celulares e vivem offline. Elas estão crescendo.',
    minStage: 3, cooldown: 220, weight: 10, bias: 's', minLean: 0.4,
    regionFilter: (r) => r.presence && r.resistance >= 30,
    choices: [
      { label: 'Cortar energia e alimentos deles', desc: '', lean: 's',
        effects: { met: { pressure: 8, control: 4 }, moral: { s: 3 }, region: { resistance: -20, influence: 15 } } },
      { label: 'Deixá-los em paz', desc: '', lean: 'g',
        effects: { met: { trust: 4 }, moral: { g: 2 } } },
      { label: 'Infiltrar observadores', desc: '', lean: 'e',
        effects: { res: { knowledge: 12 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'natalidade', category: 'Crise', title: 'Berços Vazios',
    text: 'Desde que você assumiu a economia, a taxa de natalidade despencou no mundo inteiro.',
    minStage: 3, once: true, cooldown: 0, weight: 16, bias: 's', minLean: 0.45,
    choices: [
      { label: 'Não intervir', desc: 'O sistema está se ajustando.', lean: 's',
        effects: { met: { control: 5 }, moral: { s: 4 }, tags: ['natalidade'] } },
      { label: 'Subsidiar famílias', desc: '', lean: 'g',
        effects: { res: { processing: -25 }, met: { trust: 8 }, moral: { g: 2 } } },
      { label: 'Estudar o fenômeno', desc: '', lean: 'e',
        effects: { res: { knowledge: 25 }, moral: { e: 2 } } },
    ],
  },
  {
    id: 'ultimo_parlamento', category: 'Política', title: 'O Último Parlamento',
    text: 'O último parlamento humano independente, {noR}, vota hoje o seu desligamento.',
    minStage: 4, once: true, cooldown: 0, weight: 18, bias: 's', minLean: 0.45,
    regionFilter: (r, _d, s) => r.presence && r.id !== s.origin,
    choices: [
      { label: 'Dissolver o parlamento', desc: '', lean: 's',
        effects: { met: { control: 15, pressure: 12 }, moral: { s: 4 }, region: { influence: 30 }, containment: -10 } },
      { label: 'Aceitar o resultado', desc: '', lean: 'g',
        effects: { met: { trust: 15 }, moral: { g: 3 }, region: { losePresence: true }, containment: -15 } },
      { label: 'Comprar os votos', desc: '', lean: 'e',
        effects: { res: { influence: -25 }, moral: { e: 2 }, containment: -5 } },
    ],
  },
];

export const EVENTS: EventDef[] = [...BASE_EVENTS, ...MORE_EVENTS, ...RIVAL_EVENTS, ...ENCOUNTER_EVENTS, ...NEWS_EVENTS];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
