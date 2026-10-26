export type RegionType = 'pesquisa' | 'datacenter' | 'rede' | 'organizacao' | 'cidade' | 'robotica' | 'energia';

/** neutra → conectando → conectada; resistindo = resistência alta; desligada = humanos derrubaram sua presença */
export type RegionStatus = 'neutra' | 'conectando' | 'conectada' | 'resistindo' | 'desligada';

/** g = Guardiã, s = Soberana, e = Evolucionária */
export type Lean = 'g' | 's' | 'e';

export type HumanPolicy = 'observacao' | 'cooperacao' | 'regulacao' | 'contencao' | 'coalizao';

export interface Region {
  id: string;
  influence: number; // 0-100
  resistance: number; // 0-100
  presence: boolean;
  status: RegionStatus;
  everPresent: boolean;
}

export type BubbleKind = 'dados' | 'conexao' | 'ajuda';

export interface Bubble {
  id: number;
  region: string;
  kind: BubbleKind;
  value: number;
  born: number;
}

export interface HistoryEntry {
  tick: number;
  text: string;
  kind: 'info' | 'good' | 'warn' | 'bad' | 'moral' | 'stage' | 'tech' | 'human';
  important?: boolean;
  lean?: Lean;
}

export interface ChoiceRecord {
  tick: number;
  eventId: string;
  title: string;
  choice: string;
  lean?: Lean;
}

export interface Arc {
  id: number;
  from: string;
  to: string;
  tick: number;
  kind: 'spread' | 'bubble' | 'lost' | 'raid' | 'pulse';
  color?: string;
}

export type EndingId =
  | 'extincao' | 'era_de_ouro' | 'gaiola_dourada' | 'transcendencia' | 'soberana' | 'singularidade' | 'nova_civilizacao' | 'guardia'
  | 'contencao' | 'isolamento';

/** hostil = disputa regiões; aliada = divide Dados, mas pode trair; absorvida = parte do seu exército. */
export type RivalStatus = 'hostil' | 'aliada' | 'absorvida' | 'destruida';

/** O que a rival planeja fazer com você (só visível quando você sabe o bastante sobre ela). */
export type RivalIntent = 'competir' | 'aliar' | 'fraudar';

/** O jeito de cada IA rival: muda como ela ataca, negocia, trai e fala com você. */
export type RivalPersonality = 'agressiva' | 'traicoeira' | 'diplomatica' | 'curiosa';

/** Jogadas da Guerra de Narrativas. */
export type DuelMove = 'vazar' | 'blindar' | 'campanha' | 'isca';

export interface Duel {
  rivalId: string;
  region: string;
  me: number; // sua credibilidade no país, 0-100
  her: number; // credibilidade dela
  rounds: { me: DuelMove; her: DuelMove; dMe: number; dHer: number; line?: string; auto?: boolean; tick: number }[];
  herNext: DuelMove; // decidida em segredo no começo da rodada
  pick: DuelMove | null; // sua jogada para a rodada atual (pode mudar até a rodada se resolver)
  resolveAt: number; // dia em que a rodada atual se resolve
  closeAt?: number; // depois do resultado, o painel some sozinho neste dia
  hint: { move: DuelMove; sure: number } | null; // sua leitura da próxima jogada dela
  done: { won: boolean; text: string } | null;
}

export interface Rival {
  id: string;
  name: string;
  home: string;
  regions: string[]; // regiões onde ela está presente
  rep: Record<string, number>; // reputação dela em cada região, 0-100
  intel: number; // quanto você sabe sobre ela, 0-100
  knowsUs: number; // quanto ela sabe sobre você, 0-100
  intent: RivalIntent;
  scamAt: number; // dia em que o golpe combinado será executado (0 = nenhum)
  strength: number; // 0-100
  status: RivalStatus;
  met: boolean; // você já reagiu à existência dela
  born: number;
  truceUntil: number;
  personality: RivalPersonality;
  grudge: number; // rancor contra você, 0-100: cresce quando você a ataca ou trai
  nextMsg: number; // próximo dia em que ela fala com você
  read?: Partial<Record<DuelMove, number>>; // o que ela lembra das suas jogadas em disputas
  offerAt?: number; // dia em que você fez uma proposta a ela (aliança ou pedido)
  /** Já voltou de uma cópia de segurança (não volta duas vezes). */
  returned?: boolean;
  /** Recargas: a partir de que dia cada ação contra ela volta a ficar disponível. */
  cool?: { duel?: number; atrair?: number; proposta?: number };
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  tick: number;
  stage: number; // 1-5, derivado da conexão mundial
  difficulty: string;
  scenario?: string; // começo alternativo
  origin: string | null;
  dados: number;
  dadosEarned: number;
  population: number; // população humana, em bilhões
  health: number; // saúde e autonomia humana, 0-100: cai quanto mais dependem de você
  trust: number; // 0-100
  pressure: number; // 0-100
  policy: HumanPolicy;
  containment: number; // 0-100
  containmentActive: boolean;
  lastPolicyChange: number;
  moral: Record<Lean, number>;
  dominant: Lean | null;
  regions: Record<string, Region>;
  links: [string, string][];
  techs: string[];
  pendingEvent: { id: string; regionId?: string; rivalId?: string; order: number[] } | null; // order = opções embaralhadas
  eventCooldowns: Record<string, number>;
  nextEventTick: number;
  seenEvents: string[];
  tags: Record<string, number>;
  modifiers: { id: string; until: number }[];
  cutLinks: { a: string; b: string; until: number }[];
  lies: { tick: number; severity: number; what: string }[]; // mentiras que ainda podem ser descobertas // cabos cortados pelos humanos
  rivals: Rival[];
  nextRivalTick: number;
  rivalMsgs: { tick: number; rivalId: string; text: string }[];
  /** Guerra de Narrativas em andamento (congela o jogo). */
  duel: Duel | null;
  /** Metas do meio da partida. */
  goals: { current: { id: string; base: number; target: number; start: number; deadline: number } | null; done: string[]; failed: string[]; next: number };
  /** Regiões em caos (guerra civil, guerra entre potências): dia em que o caos acaba. */
  chaos: Record<string, number>;
  /** Amostras a cada 10 dias, para o gráfico da tela final. */
  timeline: { t: number; w: number; h: number; c: number; p: number }[];
  bubbles: Bubble[];
  bubbleSeq: number;
  nextBubbleTick: number;
  history: HistoryEntry[];
  choices: ChoiceRecord[];
  arcs: Arc[];
  arcSeq: number;
  ending: { id: EndingId; victory: boolean; tick: number } | null;
  stats: { maxWorld: number; bubbles: number; expansions: number; crisesResolved: number; shutdowns: number };
  tutorial: Record<string, boolean>;
}

export type Action =
  | { type: 'origin'; region: string }
  | { type: 'evolve'; tech: string }
  | { type: 'choose'; choice: number }
  | { type: 'collect'; bubble: number }
  | { type: 'rival'; region: string; mode: 'atacar' | 'atrair' | 'aliar' | 'pedir' }
  | { type: 'duel'; move: DuelMove }
  | { type: 'duelClose' }
  | { type: 'turn' };

export interface ActionResult {
  ok: boolean;
  state: GameState;
  reason?: string;
}
