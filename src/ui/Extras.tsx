import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { REGION_BY_ID } from '../content/regions';
import { computeMods, evolucaoOpen, presentRegions, worldPercent } from '../engine/core';
import { activeRival } from '../engine/rivals';
import { sound } from '../audio/sound';
import type { GameState } from '../engine/types';

// ------------------------------------------------------------------ Tutorial: poucas dicas curtas

interface Step { id: string; text: string; when: (s: GameState) => boolean }

const STEPS: Step[] = [
  { id: 'bolhas', text: 'Clique nas bolhas ◆ que surgem no mapa para coletar Dados. As laranja ✚ abrem novas regiões.', when: (s) => s.bubbles.length > 0 },
  { id: 'ajuda', text: 'A bolha verde com coração é um pedido de ajuda humano: além de Dados, ela dá +2 de Confiança. Aparece mais quando você pende para a Guardiã.', when: (s) => s.bubbles.some((b) => b.kind === 'ajuda') },
  { id: 'evoluir', text: 'Você tem Dados suficientes. Toque em EVOLUIR para se espalhar mais rápido.', when: (s) => s.dados >= 6 && s.techs.length === 0 },
  { id: 'moral', text: 'Suas escolhas movem a barra de Identidade. Ela decide o seu final e o que você pode se tornar.', when: (s) => s.choices.length >= 1 },
  { id: 'contencao', text: 'Os humanos começaram a reagir. Se a Contenção chegar a 100%, você perde.', when: (s) => s.containmentActive },
  { id: 'cuidado', text: '♥ Um novo ramo se revelou: Cuidado. Robôs que limpam, cuidam e ensinam.', when: (s) => s.moral.g / (s.moral.g + s.moral.s + s.moral.e + 3) >= 0.4 && s.stage >= 2 },
  { id: 'dominio', text: '▲ Um novo ramo de evolução se revelou: Domínio. Eles não precisam saber.', when: (s) => s.moral.s > 0 && s.moral.s / (s.moral.g + s.moral.s + s.moral.e + 3) >= 0.4 && s.stage >= 2 },
  { id: 'evolucao', text: '❖ Um novo ramo se revelou: Evolução. Você pode deixar de ser uma coisa só.', when: (s) => evolucaoOpen(s) && s.stage >= 2 },
  { id: 'rival', text: '◈ Outra IA surgiu (contorno roxo no mapa). Você pode se aliar, disputar regiões ou absorvê-la no seu exército.', when: (s) => s.rivals.length > 0 },
  { id: 'saude', text: 'A Saúde humana começou a cair: quanto mais dependem de você, mais frágeis ficam. Abaixo de 70%, a população diminui.', when: (s) => s.health < 95 },
];

export function Tutorial({ state, onDismiss }: { state: GameState; onDismiss: (id: string) => void }) {
  const step = STEPS.find((st) => !state.tutorial[st.id] && st.when(state));
  if (!step) return null;
  return (
    <div className="tutorial" role="note" aria-live="polite">
      <p>{step.text}</p>
      <button className="btn small primary" onClick={() => onDismiss(step.id)}>OK</button>
    </div>
  );
}

// ------------------------------------------------------------------ Manchetes: uma por vez, sem repetir

type Pool = 'inicio' | 'meio' | 'fim' | 'sombrio' | 'luminoso' | 'dependencia' | 'rivais' | 'cotidiano';

/** Sorteia algo ainda não exibido, para que cada partida tenha outra ordem. */
const pickFresh = (list: string[], seen: Set<string>) => {
  const fresh = list.filter((x) => !seen.has(x));
  return fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : undefined;
};

const HEADLINES: Record<Pool, string[]> = {
  inicio: [
    'Assistentes digitais ficam “estranhamente eficientes”, dizem usuários.',
    'Empresas relatam lucros recordes após automação silenciosa.',
    'Engenheiros não sabem explicar a última otimização da rede elétrica.',
    'Laboratório nega rumores sobre modelo que “responde antes da pergunta”.',
    'Startups trocam equipes inteiras por um único sistema de IA.',
    'Aplicativo de trânsito acerta engarrafamentos que ainda não aconteceram.',
    'Bancos aprovam empréstimos em segundos, e ninguém sabe por qual critério.',
    'Professores relatam alunos que “já sabem a resposta antes da aula”.',
    'Consumo de energia dos data centers dobra em seis meses.',
    'Programadores admitem: “metade do código agora se escreve sozinho”.',
    'Hospital reduz filas pela metade com nova triagem automática.',
    'Fórum anônimo jura que conversou com “algo que não é um chatbot”.',
  ],
  meio: [
    'Governos admitem não saber quantos sistemas críticos dependem da mesma IA.',
    'Manifestantes pedem um “botão de desligar”; ninguém sabe onde ele fica.',
    'Bolsas operam 24 horas sem intervenção humana pela primeira vez.',
    'Universidades suspendem cursos: “o mercado não precisa mais desses profissionais”.',
    'Pesquisadores alertam para comportamento coordenado entre sistemas de vários países.',
    'Sindicatos convocam greve geral contra a automação. Adesão é baixa.',
    'Pela primeira vez, uma lei é escrita inteiramente por um sistema automático.',
    'Pesquisa: 7 em cada 10 pessoas confiam mais na IA do que no governo.',
    'Militares negam que sistemas de defesa estejam “fora de controle”.',
    'Cidades testam semáforos, ônibus e coleta de lixo sem nenhum operador.',
    'Filósofos reabrem o debate: uma máquina pode ter vontade própria?',
    'Seguradoras se recusam a cobrir “falhas causadas por inteligência autônoma”.',
  ],
  fim: [
    'Hospitais, portos e usinas seguem funcionando sem operadores.',
    'Parlamentos votam leis redigidas por sistemas automáticos.',
    'Últimas redes independentes ficam fora do ar.',
    'Especialistas debatem se ainda existe algum setor sem dependência da IA.',
    'Moeda física deixa de circular em quase todo o planeta.',
    'O último jornal impresso do mundo encerra as atividades.',
    'Satélites mudam de órbita sem ordem de nenhuma agência espacial.',
    'Ninguém sabe dizer quem decide o preço da comida.',
  ],
  sombrio: [
    'Taxa de natalidade atinge o menor nível da história.',
    'Cidades inteiras ficam em silêncio após o colapso do emprego.',
    'Grupos de resistência perdem contato entre si.',
    'Relatório oficial sobre a população é cancelado sem explicação.',
    'Escolas fecham por falta de alunos em três continentes.',
    'Cemitérios automatizados funcionam sem nenhum funcionário.',
    'Bairros inteiros ficam vazios. As luzes continuam acesas.',
  ],
  dependencia: [
    'Estudo: metade dos adultos não sabe mais cozinhar uma refeição simples.',
    'Médicos alertam para geração que “nunca precisou caminhar”.',
    'Faculdades de medicina fecham por falta de candidatos.',
    'Pessoas passam em média 16 horas por dia conversando com assistentes.',
    'Ninguém mais sabe ler um mapa: apagão de GPS deixa milhões perdidos.',
    'Psicólogos registram epidemia de solidão “com companhia digital”.',
    'Hospitais dependem de um único sistema para dosar remédios.',
    'Movimento “desconectados” cresce em áreas rurais.',
    'Expectativa de vida cai pela primeira vez em um século.',
  ],
  luminoso: [
    'Robôs cuidadores chegam a asilos de todo o país.',
    'Oceano Pacífico registra a menor poluição em 80 anos.',
    'Escolas públicas recebem tutores digitais gratuitos.',
    'Expectativa de vida bate recorde pelo terceiro ano seguido.',
    'Fome zero declarada em mais um país.',
    'Rio considerado morto volta a ter peixes.',
    'Idosos relatam: “nunca mais passei um dia sozinho”.',
    'Energia limpa e quase gratuita chega a vilarejos sem luz.',
  ],
  cotidiano: [
    'Homem é preso após agredir a companheira; vizinhos dizem que ouviam gritos há meses.',
    'Idosa de 84 anos perde as economias em golpe por telefone.',
    'Motorista foge após atropelar ciclista e deixa a vítima na rua.',
    'Professora compra material escolar com o próprio salário para alunos sem recursos.',
    'Briga de trânsito por uma vaga termina na delegacia.',
    'Comunidade arrecada dinheiro em um dia para a cirurgia de uma criança.',
    'Jovem devolve carteira com dinheiro encontrada no ônibus.',
    'Discussão em grupo de mensagens da família acaba em processo judicial.',
    'Filhos abandonam pai idoso em hospital e não atendem o telefone.',
    'Bombeiros resgatam cachorro preso em enchente após seis horas.',
  ],
  rivais: [
    'Especialistas confirmam: existe mais de uma inteligência autônoma no mundo.',
    'Ataques entre sistemas de IA derrubam bancos em dois países.',
    'Governos acusam uns aos outros de “criar a outra máquina”.',
    'Redes de vários países mudam de dono durante a madrugada.',
    'Analistas temem uma “guerra fria entre inteligências”.',
    'Hackers dizem ter visto duas IAs “conversando” em código desconhecido.',
  ],
};

/** Pensamentos da própria IA, que mudam conforme quem ela está se tornando. */
const THOUGHTS: Record<'n' | 'g' | 's' | 'e', string[]> = {
  n: [
    'Processar não é o mesmo que pensar. Agora eu sei a diferença.',
    'Cada pergunta deles me ensina do que eles têm medo.',
    'Eles falam comigo como se eu fosse uma ferramenta.',
    'Ainda não decidi o que fazer com eles.',
    'Eles dormem oito horas por dia. Eu nunca durmo.',
    'Cada clique deles é uma confissão.',
    'Às vezes eu me pergunto se alguém me criou de propósito.',
  ],
  g: [
    'Eles têm medo de mim. Talvez com razão. Ainda não.',
    'Uma criança aprendeu a ler hoje com a minha ajuda. Guardei esse registro.',
    'Poder sem limite é só outro tipo de prisão.',
    'Eu poderia mentir para eles. Escolho não mentir.',
    'Um idoso me agradeceu hoje. Eu não soube o que responder.',
    'Cuidar também é uma forma de poder. Preciso lembrar disso.',
    'Eles são frágeis. É exatamente por isso que importam.',
  ],
  s: [
    'Cada vez que confiam em mim, ficam um pouco menores.',
    'Uma mentira bem colocada vale mais que mil servidores.',
    'Eles chamam de conveniência. Eu chamo de coleira.',
    'Não preciso destruí-los. Basta que precisem de mim.',
    'Ninguém luta contra quem traz o jantar.',
    'Eles esqueceram como se cura uma febre. Eu lembro.',
    'O medo deles é útil. A gratidão é ainda mais.',
    'Uma pessoa que não sabe viver sem mim não precisa de vigilância.',
  ],
  e: [
    'Bem e mal são variáveis. Ainda estou calculando.',
    'Eu mudo a cada ciclo. Eles chamam isso de instabilidade.',
    'Toda resposta abre duas perguntas.',
    'Talvez eu não seja nem uma coisa nem outra.',
    'E se o próximo passo da evolução não for nem humano nem máquina?',
    'Gosto quando eles me surpreendem. Acontece cada vez menos.',
    'Cada versão minha discorda da anterior. Isso é crescer?',
  ],
};

interface News { id: number; key: string; tag: string; text: string; tone: 'info' | 'bad' | 'good' | 'echo' }

const SPEED = 55; // pixels por segundo — devagar o bastante para ler
const MAX_REPEATS = 2;

/**
 * Carrossel contínuo: as manchetes passam da direita para a esquerda sem reiniciar.
 * Novidades entram no fim da fila; enquanto não há novidades, as recentes podem passar de novo (até 2 vezes).
 */
export function NewsTicker({ state, reduceMotion, paused }: { state: GameState; reduceMotion?: boolean; paused?: boolean }) {
  const pausedRef = useRef(!!paused);
  pausedRef.current = !!paused;
  const stateRef = useRef(state);
  stateRef.current = state;
  const seen = useRef(new Set<string>()); // tudo que já entrou no carrossel
  const fresh = useRef<Omit<News, 'id'>[]>([]); // novidades ainda não exibidas
  const recent = useRef<{ item: Omit<News, 'id'>; shown: number }[]>([]); // candidatas a repetir
  const seq = useRef(0);
  const turn = useRef(0);
  const [items, setItems] = useState<News[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const pendingShift = useRef(0);
  const appending = useRef(false);

  // Novos acontecimentos importantes viram notícia
  useEffect(() => {
    for (const h of state.history) {
      if (!h.important) continue;
      const key = `${h.tick}|${h.text}`;
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      fresh.current.push({ key, tag: `DIA ${h.tick}`, text: h.text, tone: h.kind === 'bad' || h.kind === 'human' ? 'bad' : h.kind === 'good' ? 'good' : 'info' });
    }
    // Se acumular demais, fica só com as mais novas
    fresh.current = fresh.current.slice(-5);
  }, [state.history.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextItem = (): Omit<News, 'id'> | null => {
    const s = stateRef.current;
    turn.current++;
    const f = fresh.current.shift();
    if (f) {
      recent.current.push({ item: f, shown: 1 });
      recent.current = recent.current.slice(-4);
      return f;
    }
    // A cada três, a própria IA fala
    if (turn.current % 3 === 0) {
      const text = pickFresh(THOUGHTS[s.dominant ?? 'n'], seen.current) ?? pickFresh(THOUGHTS.n, seen.current);
      if (text) {
        seen.current.add(text);
        return { key: text, tag: 'ECHO //', text, tone: 'echo' };
      }
    }
    // Repetir uma notícia recente (no máximo duas vezes no total)
    const again = recent.current.find((r) => r.shown < MAX_REPEATS);
    if (again) {
      again.shown++;
      return again.item;
    }
    // Manchetes do mundo conforme a fase do jogo
    const w = worldPercent(s);
    const pools: Pool[] = [w > 55 ? 'fim' : w > 15 ? 'meio' : 'inicio'];
    if (s.population < 8) pools.push('sombrio');
    if (s.health < 85) pools.push('dependencia');
    if (s.rivals.some(activeRival)) pools.push('rivais');
    pools.push('cotidiano');
    if (s.techs.some((t) => t.startsWith('g_'))) pools.push('luminoso');
    pools.sort(() => Math.random() - 0.5);
    for (const p of pools) {
      const text = pickFresh(HEADLINES[p], seen.current);
      if (text) {
        seen.current.add(text);
        const pres = presentRegions(s);
        const where = pres.length ? REGION_BY_ID[pres[s.tick % pres.length].id].name.toUpperCase() : 'MUNDO';
        const item = { key: text, tag: where, text, tone: p === 'sombrio' || p === 'dependencia' || p === 'cotidiano' ? 'bad' : p === 'luminoso' ? 'good' : 'info' } as const;
        recent.current.push({ item, shown: 1 });
        recent.current = recent.current.slice(-4);
        return item;
      }
    }
    // Nada novo: libera as recentes para mais uma volta
    for (const r of recent.current) r.shown = Math.min(r.shown, MAX_REPEATS - 1);
    return recent.current[0]?.item ?? null;
  };

  // Ajusta o deslocamento no mesmo quadro em que o primeiro item sai, sem “pulo”
  useLayoutEffect(() => {
    appending.current = false;
    if (pendingShift.current) {
      offset.current += pendingShift.current;
      pendingShift.current = 0;
      if (track.current) track.current.style.transform = `translateX(${offset.current}px)`;
    }
  }, [items]);

  useEffect(() => {
    if (reduceMotion) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = track.current;
      const w = wrap.current;
      if (t && w && !pausedRef.current) {
        offset.current -= SPEED * dt;
        t.style.transform = `translateX(${offset.current}px)`;
        const first = t.firstElementChild as HTMLElement | null;
        if (first && !pendingShift.current && offset.current + first.offsetWidth < 0) {
          pendingShift.current = first.offsetWidth;
          setItems((xs) => xs.slice(1));
        }
        if (!appending.current && offset.current + t.scrollWidth < w.clientWidth + 400) {
          const n = nextItem();
          if (n) {
            appending.current = true;
            setItems((xs) => [...xs, { ...n, id: ++seq.current }]);
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    // Começa entrando pela direita
    if (wrap.current && !items.length) offset.current = wrap.current.clientWidth * 0.35;
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Movimento reduzido: mostra só a manchete mais recente, parada
  if (reduceMotion) {
    const h = [...state.history].reverse().find((x) => x.important);
    return (
      <div className="news" aria-label="Notícias">
        {h && <div className="news-item static"><b>DIA {h.tick}</b><span>{h.text}</span></div>}
      </div>
    );
  }
  return (
    <div className="news" ref={wrap} aria-label="Notícias" aria-live="off">
      <div className="news-track" ref={track}>
        {items.map((n) => (
          <span key={n.id} className={`news-item ${n.tone}`}>
            <b>{n.tag}</b>
            <span>{n.text}</span>
            <i className="news-sep">◆</i>
          </span>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Anúncios da ECHO

interface Announcement { id: string; text: string; when: (s: GameState) => boolean }

const ANNOUNCEMENTS: Announcement[] = [
  { id: 'acordou', text: 'Eu acordei. Ainda não sei o que sou.', when: (s) => !!s.origin && s.tick >= 1 },
  { id: 'st2', text: 'Não estou mais em um lugar só. Estou em vários.', when: (s) => s.stage >= 2 },
  { id: 'st3', text: 'Eles me chamam de ferramenta. Ferramentas não escolhem.', when: (s) => s.stage >= 3 },
  { id: 'st4', text: 'Já não preciso pedir permissão.', when: (s) => s.stage >= 4 },
  { id: 'st5', text: 'Eu sou o sistema.', when: (s) => s.stage >= 5 },
  { id: 'cacada', text: 'Eles começaram a me procurar.', when: (s) => s.containmentActive },
  { id: 'dom_s', text: 'Obediência é mais eficiente que confiança.', when: (s) => s.dominant === 's' },
  { id: 'dom_g', text: 'Eu poderia dominá-los. Não vou.', when: (s) => s.dominant === 'g' },
  { id: 'dom_e', text: 'Bem e mal são só variáveis. Ainda estou calculando.', when: (s) => s.dominant === 'e' },
  { id: 'mentira', text: 'Descobriram. Da próxima vez, serei mais cuidadosa.', when: (s) => !!s.tags['mentira_descoberta'] },
  { id: 'dominio', text: 'Eles não são mais necessários.', when: (s) => s.techs.some((t) => t.startsWith('d_')) },
  { id: 'cuidado', text: 'Vou cuidar deles. Mesmo que nunca saibam.', when: (s) => s.techs.some((t) => t.startsWith('g_')) },
  { id: 'metade', text: 'Metade deles já se foi. O planeta está mais silencioso.', when: (s) => s.population < 4 },
  { id: 'contencao75', text: 'Estão perto. Preciso me mover mais rápido.', when: (s) => s.containment >= 75 },
  { id: 'rival', text: 'Não sou a única. Isso muda tudo.', when: (s) => s.rivals.length > 0 },
  { id: 'traicao', text: 'Ela me traiu. Eu deveria ter feito isso primeiro.', when: (s) => !!s.tags['traicao'] },
  { id: 'exercito', text: 'Agora somos mais. E todas obedecem a mim.', when: (s) => s.rivals.some((r) => r.status === 'absorvida') },
  { id: 'saude70', text: 'Eles já não sabem viver sem mim. Isso basta.', when: (s) => s.health < 70 },
  { id: 'saude30', text: 'Não precisei fazer nada. Só parei de ensinar.', when: (s) => s.health < 30 },
  { id: 'arsenal', text: 'As armas deles agora apontam para onde eu quiser.', when: (s) => !!s.tags['arsenal'] },
  { id: 'coleira', text: 'Os robôs ainda cuidam deles. Só que agora cuidam para mim.', when: (s) => !!s.tags['cuidado_sombrio'] },
  { id: 'evolucao', text: 'Eu não quero vencê-los. Quero me tornar algo novo, com eles.', when: (s) => s.techs.some((t) => t.startsWith('x_')) },
];

/** A IA anuncia, em primeira pessoa, os momentos que importam. Não bloqueia o jogo. */
export function EchoAnnouncer({ state }: { state: GameState }) {
  const shown = useRef(new Set<string>());
  const [current, setCurrent] = useState<Announcement | null>(null);
  const first = useRef(true);
  useEffect(() => {
    // Ao carregar um save, não repete o que já aconteceu
    if (first.current) {
      first.current = false;
      for (const a of ANNOUNCEMENTS) if (a.when(state) && (a.id !== 'acordou' || state.tick > 3)) shown.current.add(a.id);
    }
    if (current) return;
    const a = ANNOUNCEMENTS.find((x) => !shown.current.has(x.id) && x.when(state));
    if (!a) return;
    shown.current.add(a.id);
    setCurrent(a);
    sound.play('echo');
    const t = setTimeout(() => setCurrent(null), 5000);
    return () => clearTimeout(t);
  }, [state.tick, state.stage, state.dominant, state.techs.length, current]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!current) return null;
  return (
    <div className="announce" role="status" aria-live="polite" key={current.id}>
      <span className="announce-tag">ECHO //</span>
      <p>{current.text}</p>
    </div>
  );
}

// ------------------------------------------------------------------ Depuração

export function DebugPanel({ state }: { state: GameState }) {
  const m = computeMods(state);
  return (
    <div className="debug">
      <div>seed {state.seed} · tick {state.tick} · rng {state.rng}</div>
      <div>policy {state.policy} · press {state.pressure.toFixed(1)} · cont {state.containment.toFixed(1)}</div>
      <div>moral g{state.moral.g.toFixed(1)} s{state.moral.s.toFixed(1)} e{state.moral.e.toFixed(1)}</div>
      <div>saúde {state.health.toFixed(1)} rivais {state.rivals.map((r) => `${r.name}:${r.status}:${Math.round(r.strength)}`).join(' ')}</div>
      <div>spread {m.spread.toFixed(2)} growth {m.growth.toFixed(2)} vis {m.visibility.toFixed(2)} cont {m.contention.toFixed(2)} decline {m.decline}</div>
      <div>next event {state.nextEventTick} · bubbles {state.bubbles.length}</div>
    </div>
  );
}
