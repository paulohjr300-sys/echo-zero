import { PERSONALITY_LABEL } from '../content/rivalVoice';
import { REGION_BY_ID } from '../content/regions';
import { daysToResolve, DUEL_ROUNDS, duelPayoff, MOVES } from '../engine/duel';
import { INTEL_SEE, rivalColor } from '../engine/rivals';
import type { Action, DuelMove, GameState } from '../engine/types';
import { ActIcon, MoveIcon, RivalSigil } from './glyphs';

export const MOVE_INFO: Record<DuelMove, { name: string; desc: string; beats: string; loses: string }> = {
  vazar: { name: 'Vazar', desc: 'Expõe os segredos dela.', beats: 'Destrói campanhas', loses: 'Falha contra blindagem e iscas' },
  blindar: { name: 'Blindar', desc: 'Prova que você é limpa.', beats: 'Anula vazamentos', loses: 'Perde para campanhas' },
  campanha: { name: 'Campanha', desc: 'Conquista o público.', beats: 'Vence blindagem e iscas', loses: 'Afunda com vazamentos' },
  isca: { name: 'Isca', desc: 'Planta dados falsos.', beats: 'Se ela vazar, se queima', loses: 'Desperdiçada se ela não vazar' },
};

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/**
 * Guerra de narrativas no canto do mapa: o jogo continua andando.
 * Você escolhe a jogada da rodada; ela se resolve alguns dias depois, junto com a resposta da outra IA.
 */
export function DuelPanel({ state, act }: { state: GameState; act: (a: Action) => boolean }) {
  const d = state.duel!;
  const rv = state.rivals.find((r) => r.id === d.rivalId);
  if (!rv) return null;
  const c = rivalColor(rv);
  const region = REGION_BY_ID[d.region].name;
  const round = Math.min(DUEL_ROUNDS, d.rounds.length + 1);
  const days = daysToResolve(state);
  const last = d.rounds[d.rounds.length - 1];

  return (
    <section className={`duel-panel ${d.done ? (d.done.won ? 'won' : 'lost') : ''}`} style={{ ['--rc' as string]: c }} aria-label="Guerra de narrativas">
      <header className="dp-head">
        <RivalSigil rival={rv} color={c} size={34} />
        <div className="dp-title">
          <span className="dp-kicker">Guerra de narrativas</span>
          <b>{rv.name} <span className="dim">·</span> {region}</b>
        </div>
        <span className="dp-round">{d.done ? 'Fim' : `Rodada ${round}/${DUEL_ROUNDS}`}</span>
      </header>

      <div className="dp-score">
        <div className="dp-side me">
          <span>Você</span>
          <div className="meter-bar"><i style={{ width: `${d.me}%`, background: 'var(--cyan)' }} /></div>
          <b className="mono">{Math.round(d.me)}</b>
        </div>
        <div className="dp-side her">
          <span>{rv.name}</span>
          <div className="meter-bar"><i style={{ width: `${d.her}%`, background: c }} /></div>
          <b className="mono">{Math.round(d.her)}</b>
        </div>
      </div>

      {last && (
        <div className="dp-last">
          <span>Você usou <b>{MOVE_INFO[last.me].name}</b>{last.auto ? ' (automático)' : ''}, ela usou <b style={{ color: c }}>{MOVE_INFO[last.her].name}</b></span>
          <span className={`mono ${last.dMe >= last.dHer ? 'good' : 'bad'}`}>{fmt(last.dMe)} / {fmt(last.dHer)}</span>
          {last.line && <i>“{last.line}”</i>}
        </div>
      )}

      {d.done ? (
        <div className="dp-result">
          <p className={d.done.won ? 'good' : 'bad'}>{d.done.text}</p>
          <button className="btn small" onClick={() => act({ type: 'duelClose' })}>Fechar</button>
        </div>
      ) : (
        <>
          <div className="dp-status">
            <span><ActIcon kind="clock" size={13} /> Resolve em {days} {days === 1 ? 'dia' : 'dias'}</span>
            {d.hint
              ? <span><ActIcon kind="eye" size={13} /> Ela deve usar <b>{MOVE_INFO[d.hint.move].name}</b> <span className="dim">({d.hint.sure}%)</span></span>
              : <span className="dim">Você sabe pouco sobre ela{rv.intel >= INTEL_SEE ? '' : ' para prever'}.</span>}
          </div>
          <div className="dp-moves" role="radiogroup" aria-label="Sua jogada">
            {MOVES.map((m) => {
              const sel = d.pick === m;
              const vs = d.hint ? duelPayoff(m, d.hint.move) : null;
              return (
                <button key={m} role="radio" aria-checked={sel} className={`dp-move ${sel ? 'sel' : ''}`} onClick={() => act({ type: 'duel', move: m })}
                  title={`${MOVE_INFO[m].desc} Vence: ${MOVE_INFO[m].beats}. Perde: ${MOVE_INFO[m].loses}.`}>
                  <MoveIcon move={m} size={20} />
                  <b>{MOVE_INFO[m].name}</b>
                  <small>{MOVE_INFO[m].beats}</small>
                  {vs && <small className={`mono ${vs[0] - vs[1] >= 0 ? 'good' : 'bad'}`}>{fmt(vs[0])} / {fmt(vs[1])}</small>}
                </button>
              );
            })}
          </div>
          <p className="dp-foot">
            {d.pick ? `Jogada escolhida: ${MOVE_INFO[d.pick].name}. Você pode trocar até a rodada se resolver.` : 'Sem escolha, você se blinda automaticamente.'}
            {rv.intel >= INTEL_SEE && ` Ela é ${PERSONALITY_LABEL[rv.personality].name}.`}
          </p>
        </>
      )}
    </section>
  );
}
