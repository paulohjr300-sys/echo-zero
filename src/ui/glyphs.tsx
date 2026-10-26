import type { DuelMove, Rival } from '../engine/types';

/** Ícones de interface desenhados em SVG (sem emojis). */
type Act = 'duel' | 'attract' | 'ally' | 'request' | 'globe' | 'warning' | 'clock' | 'eye';

export function ActIcon({ kind, size = 16, color = 'currentColor' }: { kind: Act; size?: number; color?: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const shapes: Record<Act, JSX.Element> = {
    duel: <g {...p}><path d="M-8 -8L6 6M-8 -4V-8H-4M8 -8L-6 6M8 -4V-8H4M-8 8L-5 5M8 8L5 5" /></g>,
    attract: <g {...p}><path d="M8 -2A8 8 0 1 0 2 8" /><path d="M2 3V8H7" /><circle r={2} fill={color} /></g>,
    ally: <g {...p}><circle cx={-3.5} r={5.5} /><circle cx={3.5} r={5.5} /></g>,
    request: <g {...p}><path d="M-6 9V-9M-6 -8H7L4 -4L7 0H-6" /></g>,
    globe: <g {...p}><circle r={8.5} /><ellipse rx={3.6} ry={8.5} /><path d="M-8.5 0H8.5" /></g>,
    warning: <g {...p}><path d="M0 -9L9.5 8H-9.5Z" /><path d="M0 -3V2" /><circle cy={5} r={0.6} fill={color} /></g>,
    clock: <g {...p}><circle r={8.5} /><path d="M0 -5V0L4 3" /></g>,
    eye: <g {...p}><path d="M-10 0C-6 -6 6 -6 10 0C6 6 -6 6 -10 0Z" /><circle r={2.6} fill={color} /></g>,
  };
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      {shapes[kind]}
    </svg>
  );
}

/** Ícones das jogadas da guerra de narrativas. */
export function MoveIcon({ move, size = 22, color = 'currentColor' }: { move: DuelMove; size?: number; color?: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const shapes: Record<DuelMove, JSX.Element> = {
    vazar: <g {...p}><rect x={-8} y={-9} width={16} height={11} rx={2} /><path d="M0 -5V9M-4 5L0 9L4 5" /></g>,
    blindar: <g {...p}><path d="M0 -10L8 -6V0C8 5 4.5 8.5 0 10C-4.5 8.5 -8 5 -8 0V-6Z" /><path d="M-3.5 0L-1 2.5L4 -2.5" /></g>,
    campanha: <g {...p}><path d="M-8 -3H-4L6 -8V8L-4 3H-8Z" /><path d="M-5 3L-3 9" /></g>,
    isca: <g {...p}><circle r={8.5} /><circle r={4.5} /><circle r={1.4} fill={color} /></g>,
  };
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      {shapes[move]}
    </svg>
  );
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Emblema de cada IA rival, gerado a partir do nome e da personalidade.
 * Agressiva = estrela de pontas; traiçoeira = lua e fenda; diplomática = anéis; curiosa = íris.
 */
export function RivalSigil({ rival, color, size = 44 }: { rival: Rival; color: string; size?: number }) {
  const h = hash(rival.name);
  const rot = h % 360;
  const n = 5 + (h % 4);
  const id = `sg-${rival.id}`;
  const star = Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? 4.5 : 10.5;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');
  const shape = (() => {
    switch (rival.personality) {
      case 'agressiva':
        return <polygon points={star} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.4} strokeLinejoin="round" />;
      case 'traicoeira':
        return (
          <g>
            <path d="M3 -10A10 10 0 1 0 3 10A7.5 7.5 0 1 1 3 -10Z" fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.4} />
            <path d="M-1 -4L1 0L-1 4" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
          </g>
        );
      case 'diplomatica':
        return (
          <g fill="none" stroke={color}>
            <circle r={10} strokeWidth={1.2} strokeDasharray={`${1 + (h % 3)} 2`} />
            <circle r={6.5} strokeWidth={1.4} fill={color} fillOpacity={0.18} />
            <circle r={2.4} fill={color} />
          </g>
        );
      default:
        return (
          <g fill="none" stroke={color}>
            <path d="M-11 0C-6 -8 6 -8 11 0C6 8 -6 8 -11 0Z" strokeWidth={1.3} fill={color} fillOpacity={0.15} />
            <circle r={4.5} strokeWidth={1.4} />
            <circle r={1.8} fill={color} />
          </g>
        );
    }
  })();
  return (
    <svg width={size} height={size} viewBox="-16 -16 32 32" aria-hidden="true" className="rival-sigil" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={15.5} fill={`url(#${id})`} />
      <circle r={14.5} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={0.8} />
      <g transform={`rotate(${rot})`}>{shape}</g>
    </svg>
  );
}
