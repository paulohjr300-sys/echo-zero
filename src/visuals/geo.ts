import { geoArea, geoBounds, geoCentroid, geoContains, geoDistance, geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { REGIONS } from '../content/regions';
import { Rng } from '../engine/rng';

export const MAP_W = 1000;
export const MAP_H = 500;
export const DOTS_PER_REGION = 90;

/** Pontos de referência (lon, lat) para rótulos, ícones e rotas. */
const ANCHORS: Record<string, [number, number]> = {
  can: [-102, 57], usa: [-98, 39], mex: [-102, 23], cam: [-82, 15], colven: [-70, 4], bra: [-50, -9],
  and: [-71, -16], cone: [-63, -33], uk: [-4, 54], weu: [2.5, 47], ibe: [-4, 40], ceu: [11, 50],
  sca: [17, 63], ita: [16, 42.5], eeu: [27, 50], rus: [95, 61], tur: [37, 39.5], mid: [40, 33],
  gulf: [47, 22], iran: [61, 31], cas: [70, 46], ind: [79, 22], chn: [103, 34], jpn: [138.5, 36.5],
  kor: [124, 33], sea: [102, 16], ins: [117, -1], aus: [134, -25], nz: [172, -41], naf: [4, 29],
  egy: [33, 15], sah: [0, 16], waf: [4, 8], caf: [21, -3], eaf: [35, -10], saf: [24, -27],
};

type CountryFeature = Feature<Geometry, { name: string }>;

export interface RegionGeo {
  id: string;
  d: string; // caminho SVG de todos os países da região
  anchor: [number, number]; // coordenadas projetadas
  dots: [number, number][];
  countries: string[];
  parts: { name: string; d: string }[]; // um caminho por país (para mostrar o nome real ao passar o mouse)
}

export interface WorldGeo {
  regions: Record<string, RegionGeo>;
  countryBorders: string;
  coast: string;
  graticule: string;
  sphere: string;
  countryRegion: Record<string, string>;
}

let cache: WorldGeo | null = null;

export function getWorldGeo(): WorldGeo {
  if (cache) return cache;
  const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const all = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>).features;
  const excluded = new Set(['Antarctica', 'Fr. S. Antarctic Lands']);
  const countries = splitAlaska(all.filter((f) => !excluded.has(f.properties.name)) as CountryFeature[]);

  // Atribuição país → região (países não listados vão para a região mais próxima)
  const countryRegion: Record<string, string> = {};
  for (const r of REGIONS) for (const c of r.countries) countryRegion[c] = r.id;
  for (const f of countries) {
    if (countryRegion[f.properties.name]) continue;
    const c = geoCentroid(f);
    let best = REGIONS[0].id;
    let bestD = Infinity;
    for (const r of REGIONS) {
      const d = geoDistance(c, ANCHORS[r.id]);
      if (d < bestD) {
        bestD = d;
        best = r.id;
      }
    }
    countryRegion[f.properties.name] = best;
  }

  const projection = geoNaturalEarth1().fitExtent(
    [[8, 8], [MAP_W - 8, MAP_H - 8]],
    { type: 'FeatureCollection', features: countries } as FeatureCollection,
  );
  const path = geoPath(projection);
  const rng = new Rng(20240611);

  const regions: Record<string, RegionGeo> = {};
  for (const r of REGIONS) {
    const feats = countries.filter((f) => countryRegion[f.properties.name] === r.id);
    const parts = feats.map((f) => ({ name: f.properties.name, d: path(f) ?? '' }));
    const d = parts.map((x) => x.d).join('');
    const anchor = projection(ANCHORS[r.id]) as [number, number];
    // Pontos aleatórios estáveis dentro dos países (densidade ~ área), estilo “propagação”
    const areas = feats.map((f) => Math.max(geoArea(f), 0.0004));
    const dots: [number, number][] = [];
    let guard = 0;
    while (dots.length < DOTS_PER_REGION && guard++ < DOTS_PER_REGION * 60) {
      const f = rng.weighted(feats, (x) => areas[feats.indexOf(x)])!;
      const [[x0, y0], [x1, y1]] = geoBounds(f);
      const lon = x1 < x0 ? x0 + rng.next() * (x1 + 360 - x0) : x0 + rng.next() * (x1 - x0);
      const pt: [number, number] = [lon > 180 ? lon - 360 : lon, y0 + rng.next() * (y1 - y0)];
      if (!geoContains(f, pt)) continue;
      const p = projection(pt);
      if (p) dots.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
    }
    regions[r.id] = { id: r.id, d, anchor, dots, countries: feats.map((f) => f.properties.name), parts };
  }

  const obj = topo.objects.countries;
  const name = (g: { properties?: unknown }) => (g.properties as { name?: string } | undefined)?.name ?? '';
  const keep = (g: { properties?: unknown }) => !excluded.has(name(g));
  cache = {
    regions,
    countryBorders: path(mesh(topo, obj, (a, b) => a !== b && keep(a) && keep(b) && countryRegion[name(a)] === countryRegion[name(b)])) ?? '',
    coast: path(mesh(topo, obj, (a, b) => a === b && keep(a))) ?? '',
    graticule: path(geoGraticule10()) ?? '',
    sphere: path({ type: 'Sphere' }) ?? '',
    countryRegion,
  };
  return cache;
}

/**
 * O dataset traz o Alasca dentro dos EUA. No mapa do jogo ele ficaria isolado lá em cima,
 * então separamos o polígono e o anexamos à região vizinha (Canadá e Ártico).
 */
function splitAlaska(countries: CountryFeature[]): CountryFeature[] {
  const out: CountryFeature[] = [];
  for (const f of countries) {
    if (f.properties.name !== 'United States of America' || f.geometry.type !== 'MultiPolygon') {
      out.push(f);
      continue;
    }
    const isAlaska = (poly: number[][][]) => {
      const ring = poly[0];
      const lon = ring.reduce((a, p) => a + p[0], 0) / ring.length;
      const lat = ring.reduce((a, p) => a + p[1], 0) / ring.length;
      return lat > 50 && (lon < -125 || lon > 170);
    };
    const polys = f.geometry.coordinates as number[][][][];
    out.push({ ...f, geometry: { type: 'MultiPolygon', coordinates: polys.filter((p) => !isAlaska(p)) } });
    const alaska = polys.filter(isAlaska);
    if (alaska.length) out.push({ type: 'Feature', properties: { name: 'Alaska' }, geometry: { type: 'MultiPolygon', coordinates: alaska } });
  }
  return out;
}

/** Caminho curvo de uma rota entre duas regiões. */
export function linkPaths(a: [number, number], b: [number, number], curve = 0.18): string[] {
  const dx = b[0] - a[0];
  // Rotas que cruzam a borda do mapa (Pacífico) não são desenhadas: ficariam “dando a volta” no mundo.
  if (Math.abs(dx) > MAP_W / 2) return [];
  return [arc(a, b, curve)];
}

function arc(a: [number, number], b: [number, number], curve: number): string {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const cx = mx;
  const cy = my - dist * curve;
  return `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
}

export function dotsPath(dots: [number, number][], count: number, r = 1.35): string {
  let d = '';
  const n = Math.min(count, dots.length);
  for (let i = 0; i < n; i++) {
    const [x, y] = dots[i];
    d += `M${x - r},${y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
  }
  return d;
}
