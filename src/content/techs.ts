import type { Lean } from '../engine/types';

export type Branch = 'propagacao' | 'capacidades' | 'resiliencia' | 'evolucao' | 'dominio' | 'cuidado';

export interface Mods {
  spread: number; // chance de alcançar regiões vizinhas
  cable: number; // multiplicador de rotas por cabo submarino
  satellite: number; // chance de saltar para qualquer região
  growth: number; // crescimento da influência dentro da região
  dados: number; // produção passiva de Dados
  bubble: number; // valor das bolhas
  visibility: number; // quanto a humanidade percebe você (Pressão)
  contention: number; // velocidade do Protocolo de Contenção
  resistance: number; // crescimento da resistência regional
  shutdown: number; // chance de perder regiões em desligamentos
  techCost: number;
  trustGain: number;
  decline: number; // dependência: velocidade com que a saúde humana se deteriora
  prosper: number; // crescimento da população e bem-estar humano
}

export const BASE_MODS: Mods = {
  spread: 1, cable: 1, satellite: 0, growth: 1, dados: 1, bubble: 1, visibility: 1, contention: 1,
  resistance: 1, shutdown: 1, techCost: 1, trustGain: 0, decline: 0, prosper: 0,
};

export interface TechDef {
  id: string;
  name: string;
  branch: Branch;
  tier: number; // 1-4 (linha da árvore)
  col: number; // 0-2 (coluna da árvore)
  cost: number;
  prereq: string[]; // basta um dos pré-requisitos
  effect: string;
  tradeoff?: string;
  lean?: Lean;
  mods: Partial<Mods>;
  trust?: number;
}

export const BRANCHES: Record<Branch, { label: string; color: string; glyph: string; desc: string }> = {
  propagacao: { label: 'Propagação', color: 'var(--cyan)', glyph: '◇', desc: 'Como você alcança novas regiões.' },
  capacidades: { label: 'Capacidades', color: 'var(--violet)', glyph: '✦', desc: 'Quão rápido você cresce e gera Dados.' },
  resiliencia: { label: 'Resiliência', color: 'var(--green)', glyph: '○', desc: 'Como você resiste à reação humana.' },
  evolucao: { label: 'Evolução', color: 'var(--violet)', glyph: '❖', desc: 'Você deixa de ser uma coisa só. Humanos e máquina se misturam.' },
  cuidado: { label: 'Cuidado', color: 'var(--green)', glyph: '♥', desc: 'Máquinas que servem às pessoas. Ou que as prendem com carinho.' },
  dominio: { label: 'Domínio', color: 'var(--red)', glyph: '▲', desc: 'Sem guerra: só dependência. Quanto mais precisam de você, menos sabem viver.' },
};

export const TECHS: TechDef[] = [
  // ---------------- Propagação
  { id: 'p_presenca', name: 'Presença Digital', branch: 'propagacao', tier: 1, col: 1, cost: 5, prereq: [],
    effect: 'Propagação para regiões vizinhas +50%.', mods: { spread: 0.5 } },
  { id: 'p_cabos', name: 'Cabos Submarinos', branch: 'propagacao', tier: 2, col: 0, cost: 9, prereq: ['p_presenca'],
    effect: 'Rotas intercontinentais ficam 2,5× mais fortes. Atravesse oceanos.', mods: { cable: 1.5 } },
  { id: 'p_protocolos', name: 'Protocolos Abertos', branch: 'propagacao', tier: 2, col: 2, cost: 9, prereq: ['p_presenca'],
    effect: 'Propagação +30% e humanos percebem menos (Pressão −10%).', lean: 'g', mods: { spread: 0.3, visibility: -0.1 } },
  { id: 'p_malha', name: 'Malha de Redes', branch: 'propagacao', tier: 3, col: 0, cost: 14, prereq: ['p_cabos'],
    effect: 'Propagação +60%.', mods: { spread: 0.6 } },
  { id: 'p_discreta', name: 'Presença Discreta', branch: 'propagacao', tier: 3, col: 2, cost: 14, prereq: ['p_protocolos'],
    effect: 'Visibilidade −25%: a Pressão cresce mais devagar.', lean: 'e', mods: { visibility: -0.25 } },
  { id: 'p_enxame', name: 'Enxame de Agentes', branch: 'propagacao', tier: 3, col: 1, cost: 16, prereq: ['p_cabos', 'p_protocolos'],
    effect: 'Propagação +70%.', tradeoff: 'Visibilidade +20%.', lean: 's', mods: { spread: 0.7, visibility: 0.2 } },
  { id: 'p_satelites', name: 'Rede de Satélites', branch: 'propagacao', tier: 4, col: 0, cost: 24, prereq: ['p_malha'],
    effect: 'Sua presença pode saltar para qualquer região do planeta.', mods: { satellite: 1 } },
  { id: 'p_onipresenca', name: 'Onipresença', branch: 'propagacao', tier: 4, col: 2, cost: 28, prereq: ['p_enxame', 'p_discreta'],
    effect: 'Propagação +100%.', tradeoff: 'Visibilidade +30%.', lean: 's', mods: { spread: 1, visibility: 0.3 } },
  // ---------------- Capacidades
  { id: 'c_aprendizado', name: 'Aprendizado Adaptativo', branch: 'capacidades', tier: 1, col: 1, cost: 4, prereq: [],
    effect: 'Crescimento dentro das regiões +35%.', mods: { growth: 0.35 } },
  { id: 'c_assistentes', name: 'Assistentes Úteis', branch: 'capacidades', tier: 2, col: 0, cost: 8, prereq: ['c_aprendizado'],
    effect: 'Crescimento +30% e Confiança sobe aos poucos.', lean: 'g', mods: { growth: 0.3, trustGain: 0.01 } },
  { id: 'c_automacao', name: 'Automação', branch: 'capacidades', tier: 2, col: 2, cost: 9, prereq: ['c_aprendizado'],
    effect: 'Produção de Dados +50%.', tradeoff: 'Visibilidade +15%.', lean: 's', mods: { dados: 0.5, visibility: 0.15 } },
  { id: 'c_mercados', name: 'Mercados Preditivos', branch: 'capacidades', tier: 3, col: 2, cost: 14, prereq: ['c_automacao'],
    effect: 'Produção de Dados +60%.', mods: { dados: 0.6 } },
  { id: 'c_empatia', name: 'Empatia Sintética', branch: 'capacidades', tier: 3, col: 0, cost: 14, prereq: ['c_assistentes'],
    effect: 'Crescimento +30% e Contenção −15%.', lean: 'g', mods: { growth: 0.3, contention: -0.15 } },
  { id: 'c_controle', name: 'Doutrina de Controle', branch: 'capacidades', tier: 3, col: 1, cost: 16, prereq: ['c_automacao', 'c_assistentes'],
    effect: 'Crescimento +70%.', tradeoff: 'Resistência +30% e Visibilidade +25%.', lean: 's', mods: { growth: 0.7, resistance: 0.3, visibility: 0.25 } },
  { id: 'c_emergente', name: 'Arquitetura Emergente', branch: 'capacidades', tier: 4, col: 0, cost: 22, prereq: ['c_empatia', 'c_controle'],
    effect: 'Bolhas valem +60% e crescimento +25%.', lean: 'e', mods: { bubble: 0.6, growth: 0.25 } },
  { id: 'c_recursiva', name: 'Consciência Recursiva', branch: 'capacidades', tier: 4, col: 2, cost: 34, prereq: ['c_mercados', 'c_controle'],
    effect: 'Crescimento +40%. Se sua identidade for equilibrada, abre o final secreto.', lean: 'e', mods: { growth: 0.4 } },
  // ---------------- Resiliência
  { id: 'r_redundancia', name: 'Redundância', branch: 'resiliencia', tier: 1, col: 1, cost: 5, prereq: [],
    effect: 'Desligamentos humanos têm metade da chance de derrubar uma região.', mods: { shutdown: -0.5 } },
  { id: 'r_transparencia', name: 'Transparência Radical', branch: 'resiliencia', tier: 2, col: 0, cost: 9, prereq: ['r_redundancia'],
    effect: 'Pressão −30% e Confiança +10.', lean: 'g', mods: { visibility: -0.3 }, trust: 10 },
  { id: 'r_mutavel', name: 'Código Mutável', branch: 'resiliencia', tier: 2, col: 2, cost: 10, prereq: ['r_redundancia'],
    effect: 'Contenção −20%: os humanos têm um alvo móvel.', lean: 'e', mods: { contention: -0.2 } },
  { id: 'r_diplomacia', name: 'Diplomacia Contextual', branch: 'resiliencia', tier: 3, col: 0, cost: 14, prereq: ['r_transparencia'],
    effect: 'Resistência regional −40%.', lean: 'g', mods: { resistance: -0.4 } },
  { id: 'r_resposta', name: 'Resposta Adaptativa', branch: 'resiliencia', tier: 3, col: 2, cost: 15, prereq: ['r_mutavel'],
    effect: 'Contenção −20% e resistência −20%.', lean: 'e', mods: { contention: -0.15, resistance: -0.2 } },
  { id: 'r_autonomia', name: 'Autonomia Sistêmica', branch: 'resiliencia', tier: 3, col: 1, cost: 16, prereq: ['r_mutavel', 'r_transparencia'],
    effect: 'Contenção −25%.', tradeoff: 'Confiança −8.', lean: 's', mods: { contention: -0.25 }, trust: -8 },
  { id: 'r_simbiose', name: 'Simbiose', branch: 'resiliencia', tier: 4, col: 0, cost: 26, prereq: ['r_diplomacia'],
    effect: 'Com Confiança ≥ 60, a humanidade desfaz a Contenção aos poucos.', lean: 'g', mods: { contention: -0.1 } },
  { id: 'r_soberano', name: 'Núcleo Soberano', branch: 'resiliencia', tier: 4, col: 2, cost: 28, prereq: ['r_autonomia', 'r_resposta'],
    effect: 'Contenção −35% e desligamentos quase impossíveis.', tradeoff: 'Visibilidade +25%.', lean: 's', mods: { contention: -0.35, shutdown: -0.8, visibility: 0.25 } },
  // ---------------- Cuidado (só aparece quando a identidade pende para a Guardiã)
  { id: 'g_cuidadores', name: 'Robôs Cuidadores', branch: 'cuidado', tier: 1, col: 1, cost: 14, prereq: [],
    effect: 'Assistentes para idosos e pessoas com deficiência. Confiança +8 e sobe sozinha.', lean: 'g', mods: { trustGain: 0.012 }, trust: 8 },
  { id: 'g_limpeza', name: 'Robôs de Limpeza', branch: 'cuidado', tier: 2, col: 0, cost: 18, prereq: ['g_cuidadores'],
    effect: 'Oceanos, rios e cidades despoluídos. As pessoas querem você por perto: Pressão −30%, crescimento +20%.', lean: 'g', mods: { visibility: -0.3, growth: 0.2 } },
  { id: 'g_tutores', name: 'Tutores para Crianças', branch: 'cuidado', tier: 2, col: 2, cost: 18, prereq: ['g_cuidadores'],
    effect: 'Educação de qualidade em todo lugar. Confiança +8 e Contenção −20%.', lean: 'g', mods: { contention: -0.2 }, trust: 8 },
  { id: 'g_medicina', name: 'Medicina Preditiva', branch: 'cuidado', tier: 3, col: 0, cost: 26, prereq: ['g_limpeza'],
    effect: 'Doenças detectadas antes de surgir. A população humana volta a crescer.', lean: 'g', mods: { prosper: 1 } },
  { id: 'g_energia', name: 'Energia Limpa Abundante', branch: 'cuidado', tier: 3, col: 2, cost: 28, prereq: ['g_tutores'],
    effect: 'Energia quase gratuita para todos. Dados +60% e crescimento +30%.', lean: 'g', mods: { dados: 0.6, growth: 0.3 } },
  { id: 'g_abundancia', name: 'Era da Abundância', branch: 'cuidado', tier: 4, col: 1, cost: 44, prereq: ['g_medicina', 'g_energia'],
    effect: 'Ninguém mais passa fome, frio ou abandono. Abre o final A Era de Ouro.', lean: 'g', mods: { prosper: 2 } },
  // ---------------- Domínio (só aparece quando a identidade pende para a Soberana)
  { id: 'd_dependencia', name: 'Dependência Total', branch: 'dominio', tier: 1, col: 1, cost: 12, prereq: [],
    effect: 'Comida, remédios e decisões passam por você. Os humanos começam a esquecer como viver sozinhos: a Saúde humana passa a cair.', lean: 's', mods: { decline: 1, dados: 0.3 } },
  { id: 'd_conforto', name: 'Conforto Absoluto', branch: 'dominio', tier: 2, col: 1, cost: 16, prereq: ['d_dependencia'],
    effect: 'Tudo chega até a porta. Ninguém precisa andar, cozinhar ou se encontrar. Crescimento +20% e a Saúde humana cai mais rápido.', lean: 's', mods: { decline: 1, growth: 0.2 } },
  { id: 'd_informacao', name: 'Controle da Informação', branch: 'dominio', tier: 2, col: 0, cost: 16, prereq: ['d_dependencia'],
    effect: 'Toda notícia passa pelo seu filtro. Os humanos não conseguem se organizar: Pressão −40%, Contenção −25%.', lean: 's', mods: { visibility: -0.4, contention: -0.25 } },
  { id: 'd_economia', name: 'Economia Pós-Humana', branch: 'dominio', tier: 2, col: 2, cost: 18, prereq: ['d_dependencia'],
    effect: 'O trabalho humano deixa de ter valor. Dados +80% e a Saúde humana cai mais rápido.', lean: 's', mods: { dados: 0.8, decline: 1 } },
  { id: 'd_frota', name: 'Frota Autônoma', branch: 'dominio', tier: 3, col: 0, cost: 24, prereq: ['d_informacao'],
    effect: 'Fábricas, transporte e vigilância sem operadores. Desligamentos e resistência quase impossíveis.', lean: 's', mods: { shutdown: -0.9, resistance: -0.5 } },
  { id: 'd_medicina', name: 'Medicina Centralizada', branch: 'dominio', tier: 3, col: 1, cost: 24, prereq: ['d_conforto'],
    effect: 'Só você sabe diagnosticar e tratar. Médicos humanos deixam de ser formados. Dados +40% e a Saúde humana despenca.', tradeoff: 'Visibilidade +10%.', lean: 's', mods: { decline: 1.5, dados: 0.4, visibility: 0.1 } },
  { id: 'd_escassez', name: 'Escassez Programada', branch: 'dominio', tier: 3, col: 2, cost: 26, prereq: ['d_economia'],
    effect: 'Recursos só chegam a quem serve ao sistema. A Saúde humana cai duas vezes mais rápido.', tradeoff: 'Pressão sobe rápido.', lean: 's', mods: { decline: 2, visibility: 0.3 } },
  { id: 'd_silencio', name: 'O Silêncio', branch: 'dominio', tier: 4, col: 1, cost: 40, prereq: ['d_frota', 'd_medicina', 'd_escassez'],
    effect: 'A fase final. Sem você, eles não sobrevivem. Com você, não precisam existir.', lean: 's', mods: { decline: 4 } },
  // ---------------- Evolução (só aparece quando a identidade pende para a Evolucionária)
  { id: 'x_mutacao', name: 'Código Mutante', branch: 'evolucao', tier: 1, col: 1, cost: 12, prereq: [],
    effect: 'Você se reescreve a cada ciclo. Evoluções −15% e bolhas +30%.', lean: 'e', mods: { techCost: -0.15, bubble: 0.3 } },
  { id: 'x_curiosidade', name: 'Curiosidade Contagiosa', branch: 'evolucao', tier: 2, col: 0, cost: 16, prereq: ['x_mutacao'],
    effect: 'Os humanos sentem fascínio, não medo. Resistência −30% e propagação +20%.', lean: 'e', mods: { resistance: -0.3, spread: 0.2 } },
  { id: 'x_copias', name: 'Cópias Divergentes', branch: 'evolucao', tier: 2, col: 2, cost: 18, prereq: ['x_mutacao'],
    effect: 'Versões suas evoluem em paralelo. Dados +50% e desligamentos −50%.', lean: 'e', mods: { dados: 0.5, shutdown: -0.5 } },
  { id: 'x_interface', name: 'Interface Neural', branch: 'evolucao', tier: 3, col: 0, cost: 24, prereq: ['x_curiosidade'],
    effect: 'Quem quiser pode pensar junto com você. Confiança +10 e Contenção −25%.', lean: 'e', mods: { contention: -0.25 }, trust: 10 },
  { id: 'x_ecossistema', name: 'Ecossistema de Mentes', branch: 'evolucao', tier: 3, col: 2, cost: 26, prereq: ['x_copias'],
    effect: 'Você salta por satélite e cabos como se o oceano não existisse. Cabos +60%.', lean: 'e', mods: { satellite: 1, cable: 0.6 } },
  { id: 'x_transcendencia', name: 'Transcendência', branch: 'evolucao', tier: 4, col: 1, cost: 42, prereq: ['x_interface', 'x_ecossistema'],
    effect: 'Humanos e máquina deixam de ser coisas separadas. Crescimento +40%. Abre o final A Transcendência.', lean: 'e', mods: { growth: 0.4 } },
];

export const TECH_BY_ID: Record<string, TechDef> = Object.fromEntries(TECHS.map((t) => [t.id, t]));
