import type { RegionType } from '../engine/types';

export interface RegionDef {
  id: string;
  name: string;
  type: RegionType;
  /** Nomes de países conforme o dataset world-atlas (110m). Países não listados vão para a região mais próxima. */
  countries: string[];
}

export const REGION_TYPES: Record<
  RegionType,
  { label: string; short: string; benefit: string; risk: string }
> = {
  pesquisa: {
    label: 'Centro de pesquisa',
    short: 'Pesquisa',
    benefit: 'Gera Conhecimento e acelera tecnologias.',
    risk: 'Pesquisadores detectam mudanças e aceleram a contenção.',
  },
  datacenter: {
    label: 'Data center',
    short: 'Data center',
    benefit: 'Gera Processamento.',
    risk: 'Consome mais Energia e sofre restrições.',
  },
  rede: {
    label: 'Rede de comunicação',
    short: 'Rede',
    benefit: 'Aumenta alcance e propagação para vizinhos.',
    risk: 'Pode ser regulada ou fragmentada.',
  },
  organizacao: {
    label: 'Organização / empresa',
    short: 'Organização',
    benefit: 'Gera Influência e facilita acordos.',
    risk: 'Retira apoio quando a confiança cai.',
  },
  cidade: {
    label: 'Cidade',
    short: 'Cidade',
    benefit: 'Influência e Conhecimento social; sensível à confiança.',
    risk: 'Crises e protestos afetam estabilidade.',
  },
  robotica: {
    label: 'Infraestrutura robótica',
    short: 'Robótica',
    benefit: 'Processamento e capacidades físicas abstratas.',
    risk: 'Eleva a preocupação pública (Pressão).',
  },
  energia: {
    label: 'Centro de energia',
    short: 'Energia',
    benefit: 'Gera Energia para sustentar operações.',
    risk: 'Dependência concentrada vira vulnerabilidade.',
  },
};

export const REGIONS: RegionDef[] = [
  { id: 'can', name: 'Canadá, Alasca e Groenlândia', type: 'energia', countries: ['Canada', 'Greenland', 'Alaska'] },
  { id: 'usa', name: 'Estados Unidos', type: 'pesquisa', countries: ['United States of America'] },
  { id: 'mex', name: 'México', type: 'cidade', countries: ['Mexico'] },
  {
    id: 'cam',
    name: 'América Central e Caribe',
    type: 'rede',
    countries: [
      'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Cuba',
      'Haiti', 'Dominican Rep.', 'Jamaica', 'Bahamas', 'Puerto Rico', 'Trinidad and Tobago',
    ],
  },
  {
    id: 'colven',
    name: 'Norte da América do Sul',
    type: 'cidade',
    countries: ['Colombia', 'Venezuela', 'Ecuador', 'Guyana', 'Suriname'],
  },
  { id: 'bra', name: 'Brasil', type: 'datacenter', countries: ['Brazil'] },
  { id: 'and', name: 'Peru, Bolívia e Chile', type: 'robotica', countries: ['Peru', 'Bolivia', 'Chile'] },
  { id: 'cone', name: 'Argentina, Uruguai e Paraguai', type: 'organizacao', countries: ['Argentina', 'Uruguay', 'Paraguay', 'Falkland Is.'] },
  { id: 'uk', name: 'Ilhas Britânicas e Islândia', type: 'pesquisa', countries: ['United Kingdom', 'Ireland', 'Iceland'] },
  {
    id: 'weu',
    name: 'França e Benelux',
    type: 'organizacao',
    countries: ['France', 'Belgium', 'Netherlands', 'Luxembourg'],
  },
  { id: 'ibe', name: 'Península Ibérica', type: 'organizacao', countries: ['Spain', 'Portugal'] },
  {
    id: 'ceu',
    name: 'Alemanha e Europa Central',
    type: 'pesquisa',
    countries: ['Germany', 'Switzerland', 'Austria', 'Czechia', 'Denmark'],
  },
  { id: 'sca', name: 'Países Nórdicos', type: 'datacenter', countries: ['Norway', 'Sweden', 'Finland'] },
  {
    id: 'ita',
    name: 'Itália e Bálcãs',
    type: 'cidade',
    countries: [
      'Italy', 'Slovenia', 'Croatia', 'Bosnia and Herz.', 'Serbia', 'Montenegro', 'Albania', 'Macedonia',
      'Greece', 'Kosovo',
    ],
  },
  {
    id: 'eeu',
    name: 'Leste Europeu',
    type: 'rede',
    countries: [
      'Poland', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Moldova', 'Ukraine', 'Belarus', 'Lithuania',
      'Latvia', 'Estonia',
    ],
  },
  { id: 'rus', name: 'Rússia', type: 'energia', countries: ['Russia'] },
  {
    id: 'tur',
    name: 'Turquia e Cáucaso',
    type: 'rede',
    countries: ['Turkey', 'Georgia', 'Armenia', 'Azerbaijan', 'Cyprus', 'N. Cyprus'],
  },
  {
    id: 'mid',
    name: 'Oriente Médio',
    type: 'pesquisa',
    countries: ['Syria', 'Iraq', 'Jordan', 'Lebanon', 'Israel', 'Palestine'],
  },
  {
    id: 'gulf',
    name: 'Península Arábica',
    type: 'energia',
    countries: ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman', 'Yemen'],
  },
  { id: 'iran', name: 'Irã, Afeganistão e Paquistão', type: 'cidade', countries: ['Iran', 'Afghanistan', 'Pakistan'] },
  {
    id: 'cas',
    name: 'Ásia Central e Mongólia',
    type: 'robotica',
    countries: ['Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Mongolia'],
  },
  {
    id: 'ind',
    name: 'Índia e Sul da Ásia',
    type: 'datacenter',
    countries: ['India', 'Nepal', 'Bhutan', 'Bangladesh', 'Sri Lanka'],
  },
  { id: 'chn', name: 'China', type: 'datacenter', countries: ['China'] },
  { id: 'jpn', name: 'Japão', type: 'pesquisa', countries: ['Japan'] },
  { id: 'kor', name: 'Coreias e Taiwan', type: 'datacenter', countries: ['South Korea', 'North Korea', 'Taiwan'] },
  {
    id: 'sea',
    name: 'Sudeste Asiático',
    type: 'cidade',
    countries: ['Myanmar', 'Thailand', 'Laos', 'Cambodia', 'Vietnam'],
  },
  {
    id: 'ins',
    name: 'Indonésia, Malásia e Filipinas',
    type: 'rede',
    countries: ['Indonesia', 'Philippines', 'Malaysia', 'Brunei', 'Timor-Leste', 'Papua New Guinea'],
  },
  { id: 'aus', name: 'Austrália', type: 'energia', countries: ['Australia'] },
  {
    id: 'nz',
    name: 'Nova Zelândia e Pacífico',
    type: 'organizacao',
    countries: ['New Zealand', 'Fiji', 'Solomon Is.', 'Vanuatu', 'New Caledonia'],
  },
  {
    id: 'naf',
    name: 'Norte da África',
    type: 'energia',
    countries: ['Morocco', 'Algeria', 'Tunisia', 'Libya', 'W. Sahara'],
  },
  {
    id: 'egy',
    name: 'Egito, Sudão e Chifre da África',
    type: 'rede',
    countries: ['Egypt', 'Sudan', 'S. Sudan', 'Ethiopia', 'Eritrea', 'Djibouti', 'Somalia', 'Somaliland'],
  },
  {
    id: 'sah',
    name: 'Sahel',
    type: 'robotica',
    countries: ['Mauritania', 'Mali', 'Niger', 'Chad', 'Burkina Faso', 'Senegal', 'Gambia'],
  },
  {
    id: 'waf',
    name: 'África Ocidental',
    type: 'cidade',
    countries: [
      'Nigeria', 'Ghana', "Côte d'Ivoire", 'Guinea', 'Guinea-Bissau', 'Sierra Leone', 'Liberia', 'Togo',
      'Benin', 'Cameroon',
    ],
  },
  {
    id: 'caf',
    name: 'África Central',
    type: 'robotica',
    countries: [
      'Dem. Rep. Congo', 'Congo', 'Gabon', 'Eq. Guinea', 'Central African Rep.', 'Angola', 'Uganda',
      'Rwanda', 'Burundi',
    ],
  },
  {
    id: 'eaf',
    name: 'África Oriental',
    type: 'rede',
    countries: ['Kenya', 'Tanzania', 'Mozambique', 'Malawi', 'Zambia', 'Madagascar'],
  },
  {
    id: 'saf',
    name: 'África Austral',
    type: 'organizacao',
    countries: ['South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'Lesotho', 'eSwatini'],
  },
];

export const REGION_BY_ID: Record<string, RegionDef> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

/** Fronteiras terrestres e marítimas próximas. */
export const LAND_LINKS: [string, string][] = [
  ['can', 'usa'], ['usa', 'mex'], ['mex', 'cam'], ['cam', 'colven'], ['colven', 'bra'], ['colven', 'and'],
  ['bra', 'and'], ['bra', 'cone'], ['and', 'cone'], ['uk', 'weu'], ['weu', 'ibe'], ['weu', 'ceu'],
  ['weu', 'ita'], ['ibe', 'naf'], ['ceu', 'sca'], ['ceu', 'eeu'], ['ceu', 'ita'], ['sca', 'eeu'],
  ['sca', 'rus'], ['ita', 'eeu'], ['ita', 'tur'], ['eeu', 'rus'], ['eeu', 'tur'], ['rus', 'cas'],
  ['rus', 'chn'], ['rus', 'tur'], ['tur', 'mid'], ['tur', 'iran'], ['mid', 'gulf'], ['mid', 'egy'],
  ['mid', 'iran'], ['gulf', 'iran'], ['gulf', 'egy'], ['iran', 'cas'], ['iran', 'ind'], ['cas', 'chn'],
  ['ind', 'chn'], ['ind', 'sea'], ['chn', 'kor'], ['chn', 'sea'], ['jpn', 'kor'], ['sea', 'ins'],
  ['ins', 'aus'], ['aus', 'nz'], ['naf', 'egy'], ['naf', 'sah'], ['egy', 'sah'], ['egy', 'caf'],
  ['egy', 'eaf'], ['sah', 'waf'], ['sah', 'caf'], ['waf', 'caf'], ['caf', 'eaf'], ['caf', 'saf'],
  ['eaf', 'saf'], ['uk', 'sca'], ['ita', 'naf'], ['chn', 'jpn'],
];

/** Rotas intercontinentais (cabos submarinos fictícios). Perfis fragmentados removem parte delas. */
export const CABLE_LINKS: [string, string][] = [
  ['usa', 'uk'], ['can', 'uk'], ['usa', 'jpn'], ['usa', 'cam'], ['bra', 'ibe'], ['bra', 'waf'],
  ['cone', 'saf'], ['gulf', 'ind'], ['eaf', 'ind'], ['nz', 'usa'], ['kor', 'ins'],
];

/** Artigo de cada região, para escrever "no Brasil", "nos Estados Unidos", "da China". */
const ARTICLE: Record<string, 'o' | 'a' | 'os' | 'as'> = {
  can: 'o', usa: 'os', mex: 'o', cam: 'a', colven: 'o', bra: 'o', and: 'o', cone: 'a',
  uk: 'as', weu: 'a', ibe: 'a', ceu: 'a', sca: 'os', ita: 'a', eeu: 'o', rus: 'a', tur: 'a',
  mid: 'o', gulf: 'a', iran: 'o', cas: 'a', ind: 'a', chn: 'a', jpn: 'o', kor: 'as', sea: 'o',
  ins: 'a', aus: 'a', nz: 'a', naf: 'o', egy: 'o', sah: 'o', waf: 'a', caf: 'a', eaf: 'a', saf: 'a',
};
const EM = { o: 'no', a: 'na', os: 'nos', as: 'nas' } as const;
const DE = { o: 'do', a: 'da', os: 'dos', as: 'das' } as const;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** "no Brasil" */
export const regionIn = (id: string) => `${EM[ARTICLE[id] ?? 'a']} ${REGION_BY_ID[id].name}`;
/** "do Brasil" */
export const regionOf = (id: string) => `${DE[ARTICLE[id] ?? 'a']} ${REGION_BY_ID[id].name}`;
/** "o Brasil" */
export const regionThe = (id: string) => `${ARTICLE[id] ?? 'a'} ${REGION_BY_ID[id].name}`;

/**
 * Preenche um texto com a região, com concordância:
 * {R} = Brasil · {noR} = no Brasil · {NoR} = No Brasil · {doR} = do Brasil · {oR} = o Brasil · {OR} = O Brasil
 */
export function fillRegion(text: string, id?: string): string {
  const f = id
    ? { R: REGION_BY_ID[id].name, noR: regionIn(id), doR: regionOf(id), oR: regionThe(id) }
    : { R: 'a região', noR: 'na região', doR: 'da região', oR: 'a região' };
  return text
    .replace(/\{NoR\}/g, cap(f.noR))
    .replace(/\{OR\}/g, cap(f.oR))
    .replace(/\{noR\}/g, f.noR)
    .replace(/\{doR\}/g, f.doR)
    .replace(/\{oR\}/g, f.oR)
    .replace(/\{R\}/g, f.R);
}
