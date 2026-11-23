import { Color } from 'three';
import { MAX_DEPTH_M, UNITS_PER_M } from '../lib/depth.js';

/** Profundidad total del mundo en unidades 3D. */
export const WORLD_DEPTH = MAX_DEPTH_M * UNITS_PER_M; // 400
/** Nivel de la superficie del mar (sobre la cámara inicial). */
export const SURFACE_Y = 34;

export const mToY = (m) => -m * UNITS_PER_M;

// Color del agua según el progreso del descenso (0 = superficie, 1 = −100 m)
const STOPS = [
  [0.00, new Color('#0f4c70')],
  [0.12, new Color('#0a3656')],
  [0.35, new Color('#06203a')],
  [0.65, new Color('#020b17')],
  [1.00, new Color('#000306')],
];

export function waterColor(p, target) {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (p <= b) {
      const t = (p - a) / (b - a);
      return target.copy(ca).lerp(cb, Math.min(1, Math.max(0, t)));
    }
  }
  return target.copy(STOPS[STOPS.length - 1][1]);
}

/** Intensidad de la luz solar (cae rápido con la profundidad). */
export const sunlight = (p) => Math.pow(1 - p, 2.2);

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
