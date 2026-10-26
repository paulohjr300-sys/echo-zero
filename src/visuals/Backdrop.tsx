import { useEffect, useRef } from 'react';
import { Rng } from '../engine/rng';

interface Props {
  mode: 'network' | 'rings';
  color?: string;
  enabled: boolean;
}

/** Fundo procedural em Canvas 2D: rede de nós (menu) ou anéis concêntricos e partículas (finais). */
export function Backdrop({ mode, color = '#3ee6f0', enabled }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const rng = new Rng(77);
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const N = mode === 'network' ? 70 : 140;
    const pts = Array.from({ length: N }, () => ({
      x: rng.next(), y: rng.next(), vx: (rng.next() - 0.5) * 0.0006, vy: (rng.next() - 0.5) * 0.0006,
      a: rng.next() * Math.PI * 2, r: rng.range(0.05, 0.5), s: rng.range(0.6, 2),
    }));
    let raf = 0;
    let t = 0;
    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      if (mode === 'network') {
        for (const p of pts) {
          if (enabled) {
            p.x = (p.x + p.vx + 1) % 1;
            p.y = (p.y + p.vy + 1) % 1;
          }
        }
        for (let i = 0; i < N; i++) {
          for (let j = i + 1; j < N; j++) {
            const dx = (pts[i].x - pts[j].x) * w;
            const dy = (pts[i].y - pts[j].y) * h;
            const d = Math.hypot(dx, dy);
            if (d < 140) {
              ctx.strokeStyle = `rgba(62,230,240,${(1 - d / 140) * 0.18})`;
              ctx.beginPath();
              ctx.moveTo(pts[i].x * w, pts[i].y * h);
              ctx.lineTo(pts[j].x * w, pts[j].y * h);
              ctx.stroke();
            }
          }
        }
        for (const p of pts) {
          ctx.fillStyle = 'rgba(120,240,255,.65)';
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, p.s, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const cx = w / 2;
        const cy = h * 0.32;
        ctx.strokeStyle = color;
        for (let i = 0; i < 7; i++) {
          const phase = ((t * (enabled ? 0.004 : 0) + i / 7) % 1);
          ctx.globalAlpha = (1 - phase) * 0.35;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cx, cy, 30 + phase * Math.max(w, h) * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        for (const p of pts) {
          if (enabled) p.a += 0.002 + p.r * 0.004;
          const rad = (0.1 + p.r) * Math.min(w, h) * 0.9;
          ctx.globalAlpha = 0.25 + p.r;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(p.a) * rad, cy + Math.sin(p.a) * rad * 0.5, p.s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (enabled) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mode, color, enabled]);
  return <canvas ref={ref} className="backdrop" aria-hidden="true" />;
}
