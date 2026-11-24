/*
 * Calidad adaptable: mide los cuadros por segundo y, si el equipo no da abasto,
 * baja la calidad en escalones para que el descenso siga fluido.
 *   nivel 0: calidad completa
 *   nivel 1: resolución 1x (sin pantalla retina)
 *   nivel 2: resolución 1x, sin brillo (bloom) y suavizado de bordes más liviano (SMAA)
 * Nunca baja de 1x: bajo eso los bordes finos (barandas del barco) se ven pixelados.
 * Si después el equipo va sobrado, sube un escalón (una sola vez, para no oscilar).
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

const WINDOW = 2;        // segundos por medición
const LOW_FPS = 45;      // bajo esto, baja la calidad
const HIGH_FPS = 57;     // sobre esto (varias mediciones seguidas), puede subir

const DPR = [null, 1, 1];

export function AdaptiveQuality({ level, onChange, maxDpr }) {
  const setDpr = useThree((s) => s.setDpr);
  const st = useMemo(() => ({ frames: 0, time: 0, good: 0, upgraded: false, cooldown: 1.5 }), []);

  useEffect(() => {
    setDpr(DPR[level] ?? Math.min(window.devicePixelRatio || 1, maxDpr));
    document.documentElement.dataset.quality = String(level);
  }, [level, setDpr, maxDpr]);

  useFrame((_, dt) => {
    // pestaña oculta o pausa larga: no cuenta
    if (dt > 0.25) { st.frames = 0; st.time = 0; return; }
    if (st.cooldown > 0) { st.cooldown -= dt; return; }
    st.frames += 1;
    st.time += dt;
    if (st.time < WINDOW) return;
    const fps = st.frames / st.time;
    st.frames = 0;
    st.time = 0;
    if (fps < LOW_FPS && level < 2) {
      st.good = 0;
      st.cooldown = 1.5;
      onChange(level + 1);
    } else if (fps > HIGH_FPS && level > 0 && !st.upgraded) {
      st.good += 1;
      if (st.good >= 3) { st.upgraded = true; st.cooldown = 1.5; onChange(level - 1); }
    } else {
      st.good = 0;
    }
  });
  return null;
}
