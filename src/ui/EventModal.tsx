import { useEffect, useRef } from 'react';
import { EVENT_BY_ID } from '../content/events';
import { PERSONALITY_LABEL } from '../content/rivalVoice';
import { fillRegion, REGION_BY_ID } from '../content/regions';
import { PHILOSOPHY } from '../engine/core';
import { INTEL_SEE, INTENT_LABEL, rivalById, rivalColor } from '../engine/rivals';
import { canAffordChoice, eventText, shortfallPressure, simplify, type SimpleEffect } from '../engine/systems';
import type { Action, GameState } from '../engine/types';
import { RivalSigil } from './glyphs';

type Tone = 'pos' | 'neg' | 'neu' | 'lie' | 'dark';
interface Line { text: string; tone: Tone }

/** Traduz os números do dilema em frases curtas que qualquer pessoa entende. */
export function describeEffect(e: SimpleEffect, fill: (t: string) => string, regionId?: string, have?: number): Line[] {
  const R = (t: string) => fillRegion(t, regionId);
  const out: Line[] = [];
  const big = (v: number, n = 10) => Math.abs(v) >= n;
  const add = (cond: unknown, text: string, tone: Tone) => { if (cond) out.push({ text, tone }); };
  if (e.dados < 0) {
    const cost = -e.dados;
    if (have !== undefined && have < cost) {
      const miss = cost - have;
      add(true, `Custa ${cost} Dados e você tem ${have}. Os ${miss} que faltam viram atenção humana (Pressão +${shortfallPressure(miss)})`, 'neg');
    } else add(true, `Custa ${cost} Dados`, 'neu');
  }
  add(e.dados > 0, `Ganha ${big(e.dados, 4) ? 'muitos ' : ''}Dados`, 'pos');
  add(e.trust > 0, big(e.trust) ? 'Os humanos passam a confiar muito em você' : 'Os humanos confiam mais em você', 'pos');
  add(e.trust < 0, big(e.trust) ? 'Os humanos perdem a confiança em você' : 'Os humanos desconfiam mais de você', 'neg');
  add(e.pressure > 0, big(e.pressure) ? 'Chama muita atenção' : 'Chama atenção', 'neg');
  add(e.pressure < 0, 'Tira os olhos de cima de você', 'pos');
  add(e.containment < 0, big(e.containment) ? 'Atrasa muito a caçada contra você' : 'Atrasa a caçada contra você', 'pos');
  add(e.containment > 0, 'Acelera a caçada contra você', 'neg');
  add(e.region.influence > 0, R('Você avança {noR}'), 'pos');
  add(e.region.influence < 0, R('Você recua {noR}'), 'neg');
  add(e.region.resistance > 0, R('A resistência {noR} aumenta'), 'neg');
  add(e.region.resistance < 0, R('A resistência {noR} diminui'), 'pos');
  add(e.present.influence > 0, 'Você avança em todas as regiões', 'pos');
  add(e.present.resistance < 0, 'O mundo inteiro resiste menos', 'pos');
  add(e.present.resistance > 0, 'O mundo inteiro resiste mais', 'neg');
  add(e.health < 0, big(e.health, 5) ? 'Os humanos ficam muito mais dependentes e frágeis' : 'Os humanos ficam mais dependentes de você', 'dark');
  add(e.health > 0, 'Os humanos ficam mais saudáveis e independentes', 'neu');
  add(e.population < 0, 'Vidas humanas se perdem', 'dark');
  const rv = e.rival;
  if (rv) {
    add(rv.strength && rv.strength < 0, big(rv.strength!, 25) ? fill('{A} fica muito mais fraca') : fill('{A} fica mais fraca'), 'pos');
    add(rv.strength && rv.strength > 0, fill('{A} fica mais forte'), 'neg');
    add(rv.rep && rv.rep < 0, R(fill('A reputação de {A} {noR} cai')), 'pos');
    add(rv.cede, R(fill('{A} deixa {oR} para você')), 'pos');
    add(rv.give, R(fill('Você deixa {oR} para {A}')), 'neg');
    add(rv.status === 'aliada', fill('{A} vira sua aliada'), 'neu');
    add(rv.status === 'hostil', fill('{A} vira sua inimiga'), 'neg');
    add(rv.intel && rv.intel > 0, fill('Você descobre mais sobre {A}'), 'pos');
    add(rv.knowsUs && rv.knowsUs > 0, fill('{A} descobre mais sobre você'), 'neg');
    add(rv.knowsUs && rv.knowsUs < 0, fill('{A} passa a saber menos sobre você'), 'pos');
    add(rv.grudge && rv.grudge > 0, fill('{A} guarda rancor'), 'neg');
    add(rv.grudge && rv.grudge < 0, fill('{A} fica grata a você'), 'pos');
    add(rv.truce, fill('Trégua com {A}'), 'neu');
  }
  add(e.losePresence, R('Você sai {doR}'), 'neg');
  add(e.regulated > 0, `Você se espalha mais devagar por ${e.regulated} dias`, 'neg');
  add(e.note, fill(e.note ?? ''), 'neu');
  add(e.lie, 'É mentira: se descobrirem, a reação será forte', 'lie');
  return out;
}

/** Marcador de cada consequência: sobe, desce, neutro, mentira. */
function Mark({ tone }: { tone: Tone }) {
  const color = { pos: 'var(--green)', neg: '#ff8a98', neu: 'var(--muted)', lie: 'var(--violet)', dark: '#ffb3a1' }[tone];
  return (
    <svg width={10} height={10} viewBox="-5 -5 10 10" aria-hidden="true" style={{ flexShrink: 0, marginTop: 4 }}>
      {tone === 'pos' && <path d="M-4 2L0 -3L4 2Z" fill={color} />}
      {tone === 'neg' && <path d="M-4 -2L0 3L4 -2Z" fill={color} />}
      {tone === 'neu' && <circle r={2.2} fill={color} />}
      {tone === 'lie' && <path d="M0 -4L4 0L0 4L-4 0Z" fill="none" stroke={color} strokeWidth={1.5} />}
      {tone === 'dark' && <path d="M-4 -2L0 3L4 -2Z" fill={color} />}
    </svg>
  );
}

/** Dilema: contexto curto e três escolhas em cartas. Cada uma diz o que acontece e para onde puxa sua identidade. */
export function EventModal({ state, act }: { state: GameState; act: (a: Action) => boolean }) {
  const pe = state.pendingEvent!;
  const def = EVENT_BY_ID[pe.id];
  const { title, text, fill } = eventText(state, def, pe.regionId, pe.rivalId);
  const first = useRef<HTMLButtonElement>(null);
  const rival = rivalById(state, pe.rivalId);
  const rc = rival ? rivalColor(rival) : undefined;
  useEffect(() => first.current?.focus(), [pe.id]);
  const order = pe.order ?? [0, 1, 2];
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      <div className={`modal event-modal v2 ${rival ? 'with-rival' : ''}`} style={rc ? { ['--rc' as string]: rc } : undefined}>
        <div className="ev-top">
          <span className="ev-cat">{def.category}</span>
          {pe.regionId && <span className="ev-region">{REGION_BY_ID[pe.regionId].name}</span>}
          <span className="ev-day mono">dia {state.tick}</span>
        </div>

        {rival && (
          <div className="ev-rival">
            <RivalSigil rival={rival} color={rc!} size={52} />
            <div className="ev-rival-info">
              <b>{rival.name}</b>
              <span>
                {rival.status === 'aliada' ? 'Aliada' : rival.status === 'hostil' ? 'Inimiga' : 'Absorvida'}
                {rival.intel >= INTEL_SEE ? ` · ${PERSONALITY_LABEL[rival.personality].name}` : ' · personalidade desconhecida'}
              </span>
              {rival.intel >= INTEL_SEE && <span className="ev-intent">Ela {INTENT_LABEL[rival.intent]}.</span>}
            </div>
            <div className="ev-rel">
              <div><span>Rancor</span><div className="meter-bar"><i style={{ width: `${rival.grudge}%`, background: '#ff6b7d' }} /></div></div>
              <div><span>Você sabe dela</span><div className="meter-bar"><i style={{ width: `${rival.intel}%`, background: 'var(--cyan)' }} /></div></div>
              <div><span>Ela sabe de você</span><div className="meter-bar"><i style={{ width: `${rival.knowsUs}%`, background: rc }} /></div></div>
            </div>
          </div>
        )}

        <h2 id="ev-title">{title}</h2>
        <p className="lead">{text}</p>

        <div className="ev-choices">
          {order.map((i, pos) => {
            const c = def.choices[i];
            const ok = canAffordChoice(state, c);
            const lines = describeEffect(simplify(c.effects), fill, pe.regionId, Math.floor(state.dados));
            const lc = c.lean ? PHILOSOPHY[c.lean].color : 'var(--cyan)';
            return (
              <button key={i} ref={pos === 0 ? first : undefined} className="ev-card" disabled={!ok}
                onClick={() => act({ type: 'choose', choice: i })} style={{ ['--lc' as string]: lc }}>
                <div className="ev-card-top">
                  <kbd>{pos + 1}</kbd>
                  {c.lean && <span className="ev-lean">{PHILOSOPHY[c.lean].short}</span>}
                </div>
                <b className="ev-card-title">{fill(c.label)}</b>
                {c.desc && <span className="ev-card-desc">{fill(c.desc)}</span>}
                <ul className="ev-effects">
                  {lines.map((l, k) => <li key={k} className={l.tone}><Mark tone={l.tone} />{l.text}</li>)}
                </ul>
                {c.risk && <span className="ev-risk">Pode dar errado: {c.risk}</span>}
                {!ok && <span className="ev-risk locked">{c.requiresText}</span>}
              </button>
            );
          })}
        </div>
        <p className="ev-hint">Cada carta mostra para qual identidade a escolha puxa você. Use as teclas 1, 2 e 3.</p>
      </div>
    </div>
  );
}
