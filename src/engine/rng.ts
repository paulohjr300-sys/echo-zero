/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 * O estado do gerador vive no GameState, então salvar/carregar preserva a sequência.
 */
export function nextRandom(seedState: number): [number, number] {
  let t = (seedState + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

/** Wrapper mutável para usar dentro de um passo da simulação. */
export class Rng {
  constructor(public state: number) {}
  next(): number {
    const [v, s] = nextRandom(this.state);
    this.state = s;
    return v;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  weighted<T>(items: readonly T[], weight: (t: T) => number): T | null {
    const total = items.reduce((a, t) => a + Math.max(0, weight(t)), 0);
    if (total <= 0) return null;
    let roll = this.next() * total;
    for (const t of items) {
      roll -= Math.max(0, weight(t));
      if (roll <= 0) return t;
    }
    return items[items.length - 1];
  }
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
