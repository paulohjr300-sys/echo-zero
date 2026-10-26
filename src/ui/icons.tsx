import type { CSSProperties } from 'react';
import type { RegionStatus, RegionType } from '../engine/types';

/** Glifos geométricos por tipo de região — desenhados em SVG, sem imagens. */
export function TypeGlyph({ type, size = 14, color = 'currentColor' }: { type: RegionType; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="-8 -8 16 16" aria-hidden="true" style={{ flexShrink: 0 }}>
      <TypeShape type={type} color={color} />
    </svg>
  );
}

export function TypeShape({ type, color, scale = 1 }: { type: RegionType; color: string; scale?: number }) {
  const sw = 1.3 * scale;
  const p = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinejoin: 'round' as const };
  const s = (n: number) => n * scale;
  switch (type) {
    case 'pesquisa':
      return (
        <g>
          <circle r={s(1.6)} fill={color} />
          <ellipse rx={s(6)} ry={s(2.4)} {...p} />
          <ellipse rx={s(6)} ry={s(2.4)} {...p} transform="rotate(60)" />
          <ellipse rx={s(6)} ry={s(2.4)} {...p} transform="rotate(-60)" />
        </g>
      );
    case 'datacenter':
      return (
        <g>
          <rect x={s(-5)} y={s(-6)} width={s(10)} height={s(4)} {...p} />
          <rect x={s(-5)} y={s(-1)} width={s(10)} height={s(4)} {...p} />
          <circle cx={s(-3)} cy={s(-4)} r={s(0.8)} fill={color} />
          <circle cx={s(-3)} cy={s(1)} r={s(0.8)} fill={color} />
          <path d={`M${s(-5)},${s(5.5)}H${s(5)}`} {...p} />
        </g>
      );
    case 'rede':
      return (
        <g>
          <path d={`M${s(-5)},${s(4)}L0,${s(-5)}L${s(5)},${s(4)}Z`} {...p} />
          <circle cx={s(-5)} cy={s(4)} r={s(1.4)} fill={color} />
          <circle cx={0} cy={s(-5)} r={s(1.4)} fill={color} />
          <circle cx={s(5)} cy={s(4)} r={s(1.4)} fill={color} />
        </g>
      );
    case 'organizacao':
      return (
        <g>
          <path d={`M${s(-6)},${s(-2)}L0,${s(-6)}L${s(6)},${s(-2)}Z`} {...p} />
          <path d={`M${s(-4)},${s(-1)}V${s(4)}M0,${s(-1)}V${s(4)}M${s(4)},${s(-1)}V${s(4)}M${s(-6)},${s(5.5)}H${s(6)}`} {...p} />
        </g>
      );
    case 'cidade':
      return (
        <g fill={color}>
          {[[-4, 3], [-1, 1], [2, -2], [4, 2], [-3, -3], [1, 4], [5, -4], [-5, -1]].map(([x, y], i) => (
            <circle key={i} cx={s(x)} cy={s(y)} r={s(i % 3 === 0 ? 1.4 : 1)} />
          ))}
        </g>
      );
    case 'robotica':
      return (
        <g>
          <circle r={s(3)} {...p} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d={`M0,${s(-3.5)}V${s(-6)}`} {...p} transform={`rotate(${a})`} />
          ))}
          <circle r={s(1)} fill={color} />
        </g>
      );
    case 'energia':
      return <path d={`M${s(1)},${s(-7)}L${s(-4)},${s(1)}H${s(0)}L${s(-1)},${s(7)}L${s(4)},${s(-1)}H0Z`} {...p} fill={color} fillOpacity={0.25} />;
  }
}

/** Ícone da moeda única do jogo. */
export function DadosGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-8 -8 16 16" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M0,-7L6,0L0,7L-6,0Z" fill="rgba(62,230,240,.18)" stroke="var(--cyan)" strokeWidth={1.6} />
      <circle r={1.9} fill="var(--cyan)" />
    </svg>
  );
}

export const STATUS_META: Record<RegionStatus, { label: string; color: string; mark: string; desc: string }> = {
  neutra: { label: 'Fora de alcance', color: '#6b7d99', mark: '·', desc: 'Você ainda não chegou aqui.' },
  conectando: { label: 'Conectando', color: 'var(--cyan)', mark: '◌', desc: 'Sua presença está crescendo.' },
  conectada: { label: 'Conectada', color: '#8ff7ff', mark: '●', desc: 'Presença plena.' },
  resistindo: { label: 'Resistindo', color: 'var(--amber)', mark: '!', desc: 'A população resiste: crescimento lento.' },
  desligada: { label: 'Desligada', color: 'var(--red)', mark: '✕', desc: 'Autoridades derrubaram sua presença.' },
};

export function StatusMark({ status, style }: { status: RegionStatus; style?: CSSProperties }) {
  const m = STATUS_META[status];
  return (
    <span title={m.label} style={{ color: m.color, fontWeight: 700, width: 16, textAlign: 'center', display: 'inline-block', ...style }}>
      {m.mark}
    </span>
  );
}
