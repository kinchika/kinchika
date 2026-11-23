/*
 * Estado global de profundidad.
 * El scroll de la página se traduce a un "descenso": 0 = superficie, 1 = fondo (−100 m).
 * La escena 3D lee `depthState` en cada frame (sin re-render de React) y los
 * componentes de interfaz se suscriben con `useDepth()`.
 */
import { useEffect, useState } from 'react';

export const MAX_DEPTH_M = 100;
/** Unidades del mundo 3D por metro de profundidad. */
export const UNITS_PER_M = 4;

export const depthState = {
  progress: 0,   // valor real del scroll (0..1)
  smooth: 0,     // valor suavizado que usa la cámara
  pointerX: 0,   // −1..1
  pointerY: 0,
};

const listeners = new Set();
let started = false;
let queued = false;

function measure() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  depthState.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

function notify() {
  queued = false;
  measure();
  listeners.forEach((fn) => fn(depthState.progress));
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(notify);
}

export function startDepthTracking() {
  if (started) return;
  started = true;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pointermove', (e) => {
    // solo el mouse mueve la cámara: en celular el dedo se usa para hacer scroll
    if (e.pointerType !== 'mouse') return;
    depthState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    depthState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  measure();
  depthState.smooth = depthState.progress;
}

/** Progreso de descenso (0..1) para componentes React. */
export function useDepth() {
  const [p, setP] = useState(depthState.progress);
  useEffect(() => {
    startDepthTracking();
    listeners.add(setP);
    setP(depthState.progress);
    return () => listeners.delete(setP);
  }, []);
  return p;
}

export function useScrollY(threshold) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const on = () => setPast(window.scrollY > threshold);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [threshold]);
  return past;
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 0 si el usuario pidió reducir el movimiento (la escena queda casi quieta). */
export const MOTION = prefersReducedMotion() ? 0.08 : 1;
