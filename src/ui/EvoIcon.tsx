/** Ícones das evoluções, desenhados em SVG (sem imagens). viewBox centrado em 0, raio ~10. */
type Kind =
  | 'signal' | 'cable' | 'open' | 'mesh' | 'ghost' | 'swarm' | 'satellite' | 'globe'
  | 'spiral' | 'chat' | 'gear' | 'chart' | 'heart' | 'eye' | 'hexes' | 'infinity'
  | 'layers' | 'diamond' | 'dna' | 'link' | 'bolt' | 'chip' | 'leaf' | 'crown'
  | 'robot' | 'drop' | 'book' | 'plus' | 'sun' | 'star' | 'chain' | 'home'
  | 'funnel' | 'coin' | 'chevrons' | 'pill' | 'hourglass' | 'void' | 'spark' | 'copies' | 'brain' | 'orbit' | 'burst';

const ICON: Record<string, Kind> = {
  p_presenca: 'signal', p_cabos: 'cable', p_protocolos: 'open', p_malha: 'mesh', p_discreta: 'ghost', p_enxame: 'swarm', p_satelites: 'satellite', p_onipresenca: 'globe',
  c_aprendizado: 'spiral', c_assistentes: 'chat', c_automacao: 'gear', c_mercados: 'chart', c_empatia: 'heart', c_controle: 'eye', c_emergente: 'hexes', c_recursiva: 'infinity',
  r_redundancia: 'layers', r_transparencia: 'diamond', r_mutavel: 'dna', r_diplomacia: 'link', r_resposta: 'bolt', r_autonomia: 'chip', r_simbiose: 'leaf', r_soberano: 'crown',
  g_cuidadores: 'robot', g_limpeza: 'drop', g_tutores: 'book', g_medicina: 'plus', g_energia: 'sun', g_abundancia: 'star',
  d_dependencia: 'chain', d_conforto: 'home', d_informacao: 'funnel', d_economia: 'coin', d_frota: 'chevrons', d_medicina: 'pill', d_escassez: 'hourglass', d_silencio: 'void',
  x_mutacao: 'dna', x_curiosidade: 'spark', x_copias: 'copies', x_interface: 'brain', x_ecossistema: 'orbit', x_transcendencia: 'burst',
};

export function EvoIcon({ tech, size = 26, color = 'currentColor' }: { tech: string; size?: number; color?: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const f = { fill: color };
  const shape = (k: Kind) => {
    switch (k) {
      case 'signal': return <g {...p}><circle r={1.6} {...f} /><path d="M-4.5 -4.5a6.4 6.4 0 0 0 0 9M4.5 -4.5a6.4 6.4 0 0 1 0 9M-7.8 -7.8a11 11 0 0 0 0 15.6M7.8 -7.8a11 11 0 0 1 0 15.6" /></g>;
      case 'cable': return <g {...p}><path d="M-9 0c3-6 6 6 9 0s6-6 9 0" /><circle cx={-9} cy={0} r={1.6} {...f} /><circle cx={9} cy={0} r={1.6} {...f} /></g>;
      case 'open': return <g {...p}><rect x={-6} y={-1} width={12} height={9} rx={2} /><path d="M-3.5 -1v-3a3.5 3.5 0 0 1 7 0" /><circle cy={3.5} r={1.2} {...f} /></g>;
      case 'mesh': return <g {...p}><path d="M0 -8L7 4L-7 4Z M0 -8L0 0M7 4L0 0M-7 4L0 0" /><circle cy={-8} r={1.6} {...f} /><circle cx={7} cy={4} r={1.6} {...f} /><circle cx={-7} cy={4} r={1.6} {...f} /><circle r={1.6} {...f} /></g>;
      case 'ghost': return <g {...p}><path d="M-9 0c3-5 15-5 18 0c-3 5-15 5-18 0Z" /><circle r={2.4} /><path d="M-8 8L8 -8" /></g>;
      case 'swarm': return <g {...f}>{[[-6, -5], [0, -7], [6, -4], [-7, 2], [-1, 0], [5, 3], [-3, 6], [3, 8], [8, -1]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.5} />)}</g>;
      case 'satellite': return <g {...p}><rect x={-2.5} y={-2.5} width={5} height={5} transform="rotate(45)" /><path d="M-4 -4L-8 -8M4 4L8 8" /><rect x={-11} y={-5} width={5} height={3} transform="rotate(45)" /><rect x={6} y={-2} width={5} height={3} transform="rotate(45)" /></g>;
      case 'globe': return <g {...p}><circle r={8} /><ellipse rx={3.5} ry={8} /><path d="M-8 0H8M-7 -4H7M-7 4H7" /></g>;
      case 'spiral': return <g {...p}><path d="M0 0a1.5 1.5 0 0 1 3 0a3 3 0 0 1-6 0a4.5 4.5 0 0 1 9 0a6 6 0 0 1-12 0a7.5 7.5 0 0 1 15 0" /></g>;
      case 'chat': return <g {...p}><path d="M-8 -6h16v10h-9l-4 4v-4h-3Z" /><path d="M-4 -1h8" /></g>;
      case 'gear': return <g {...p}><circle r={3} /><path d="M0 -9v3M0 6v3M-9 0h3M6 0h3M-6.4 -6.4l2.1 2.1M4.3 4.3l2.1 2.1M-6.4 6.4l2.1-2.1M4.3 -4.3l2.1-2.1" /><circle r={6} /></g>;
      case 'chart': return <g {...p}><path d="M-9 8H9M-8 5l5-5l4 3l7-9" /><path d="M5 -6h3v3" /></g>;
      case 'heart': return <g {...p}><path d="M0 8C-9 2-9-6-4.5-6c2.2 0 3.6 1.6 4.5 3c.9-1.4 2.3-3 4.5-3C9-6 9 2 0 8Z" /></g>;
      case 'eye': return <g {...p}><path d="M-10 0c4-7 16-7 20 0c-4 7-16 7-20 0Z" /><circle r={3} {...f} /></g>;
      case 'hexes': return <g {...p}><path d="M0 -9L7.8 -4.5V4.5L0 9L-7.8 4.5V-4.5Z" /><path d="M0 -4.5L3.9 -2.2V2.2L0 4.5L-3.9 2.2V-2.2Z" /></g>;
      case 'infinity': return <g {...p}><path d="M0 0c-2-3-4-4.5-6-4.5a4.5 4.5 0 0 0 0 9c2 0 4-1.5 6-4.5s4-4.5 6-4.5a4.5 4.5 0 0 1 0 9c-2 0-4-1.5-6-4.5Z" /></g>;
      case 'layers': return <g {...p}><path d="M0 -8L9 -3.5L0 1L-9 -3.5Z" /><path d="M-9 1L0 5.5L9 1M-9 5L0 9.5L9 5" /></g>;
      case 'diamond': return <g {...p}><path d="M0 -9L8 0L0 9L-8 0Z" /><path d="M0 -4L4 0L0 4L-4 0Z" /></g>;
      case 'dna': return <g {...p}><path d="M-5 -9c0 6 10 6 10 12s-10 6-10 6M5 -9c0 6-10 6-10 12s10 6 10 6" /><path d="M-3 -5h6M-3 5h6" /></g>;
      case 'link': return <g {...p}><rect x={-10} y={-3.5} width={10} height={7} rx={3.5} /><rect x={0} y={-3.5} width={10} height={7} rx={3.5} /></g>;
      case 'bolt': return <g {...p}><path d="M2 -10L-6 2H0L-2 10L6 -2H0Z" /></g>;
      case 'chip': return <g {...p}><rect x={-6} y={-6} width={12} height={12} rx={1.5} /><rect x={-2.5} y={-2.5} width={5} height={5} {...f} /><path d="M-3 -6v-3M3 -6v-3M-3 6v3M3 6v3M-6 -3h-3M-6 3h-3M6 -3h3M6 3h3" /></g>;
      case 'leaf': return <g {...p}><path d="M-8 8C-8-4 0-9 9-9C9 0 4 8-8 8Z" /><path d="M-8 8L4 -4" /></g>;
      case 'crown': return <g {...p}><path d="M-9 6L-9 -5L-4 0L0 -8L4 0L9 -5L9 6Z" /><path d="M-9 9H9" /></g>;
      case 'robot': return <g {...p}><rect x={-7} y={-4} width={14} height={11} rx={3} /><circle cx={-3} cy={1.5} r={1.4} {...f} /><circle cx={3} cy={1.5} r={1.4} {...f} /><path d="M0 -4v-4" /><circle cy={-9} r={1.3} {...f} /></g>;
      case 'drop': return <g {...p}><path d="M0 -10C4 -4 7 0 7 3.5a7 7 0 0 1-14 0C-7 0-4 -4 0 -10Z" /><path d="M-3 4a3 3 0 0 0 3 3" /></g>;
      case 'book': return <g {...p}><path d="M0 -6C-3 -8-6 -8-9 -7V7c3-1 6-1 9 1c3-2 6-2 9-1V-7c-3-1-6-1-9 1Z" /><path d="M0 -6V8" /></g>;
      case 'plus': return <g {...p}><path d="M-3 -9h6v6h6v6h-6v6h-6v-6h-6v-6h6Z" /></g>;
      case 'sun': return <g {...p}><circle r={4} {...f} /><path d="M0 -10v3M0 7v3M-10 0h3M7 0h3M-7 -7l2 2M5 5l2 2M-7 7l2-2M5 -5l2-2" /></g>;
      case 'star': return <g {...p}><path d="M0 -10L2.9 -3.1L10 -3.1L4.3 1.5L6.5 9L0 4.5L-6.5 9L-4.3 1.5L-10 -3.1L-2.9 -3.1Z" /></g>;
      case 'chain': return <g {...p}><rect x={-10} y={-3} width={9} height={6} rx={3} transform="rotate(-35)" /><rect x={1} y={-3} width={9} height={6} rx={3} transform="rotate(-35)" /></g>;
      case 'home': return <g {...p}><path d="M-9 0L0 -8L9 0" /><path d="M-6 -2V8H6V-2" /><rect x={-2} y={2} width={4} height={6} /></g>;
      case 'funnel': return <g {...p}><path d="M-9 -8H9L2 1V8L-2 6V1Z" /></g>;
      case 'coin': return <g {...p}><ellipse cy={-4} rx={8} ry={3.5} /><path d="M-8 -4v8c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5v-8M-8 0c0 2 3.6 3.5 8 3.5S8 2 8 0" /></g>;
      case 'chevrons': return <g {...p}><path d="M-9 -6L-3 0L-9 6M-2 -6L4 0L-2 6M5 -6L11 0L5 6" /></g>;
      case 'pill': return <g {...p}><rect x={-10} y={-4} width={20} height={8} rx={4} transform="rotate(-35)" /><path d="M-2 -5.5L2 5.5" transform="rotate(-35) rotate(55)" /></g>;
      case 'hourglass': return <g {...p}><path d="M-6 -9H6M-6 9H6M-5 -9c0 6 10 6 10 9s-10 3-10 9M5 -9c0 6-10 6-10 9s10 3 10 9" /></g>;
      case 'void': return <g {...p}><circle r={8.5} /><circle r={4} strokeDasharray="2 2" /></g>;
      case 'spark': return <g {...p}><path d="M0 -10V-4M0 4V10M-10 0H-4M4 0H10M-6 -6l2.5 2.5M3.5 3.5L6 6M-6 6l2.5-2.5M3.5 -3.5L6 -6" /><circle r={1.8} {...f} /></g>;
      case 'copies': return <g {...p}><rect x={-9} y={-9} width={11} height={11} rx={2} /><rect x={-2} y={-2} width={11} height={11} rx={2} /></g>;
      case 'brain': return <g {...p}><path d="M0 -8c-3-2-8 0-7 4c-3 1-3 6 0 7c0 3 4 5 7 3c3 2 7 0 7-3c3-1 3-6 0-7c1-4-4-6-7-4Z" /><path d="M0 -8V10M-4 -1c2 0 4 1 4 3M4 -1c-2 0-4 1-4 3" /></g>;
      case 'orbit': return <g {...p}><circle r={2.5} {...f} /><ellipse rx={10} ry={4} /><ellipse rx={10} ry={4} transform="rotate(60)" /><ellipse rx={10} ry={4} transform="rotate(-60)" /></g>;
      case 'burst': return <g {...p}><path d="M0 -10L2 -2L10 0L2 2L0 10L-2 2L-10 0L-2 -2Z" /><circle r={5.5} strokeDasharray="1.5 2.5" /></g>;
    }
  };
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      {shape(ICON[tech] ?? 'hexes')}
    </svg>
  );
}

/** Cadeado desenhado em SVG para itens e ramos bloqueados. */
export function LockGlyph({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <g fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
        <rect x={-7} y={-2} width={14} height={11} rx={2.5} />
        <path d="M-4 -2v-3a4 4 0 0 1 8 0v3" />
      </g>
    </svg>
  );
}
