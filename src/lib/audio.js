/*
 * Motor de audio. El sonido ambiente se "hunde" con la profundidad:
 * un filtro pasa-bajos cierra los agudos a medida que desciendes,
 * como cuando la superficie queda atrás.
 */
import { depthState } from './depth.js';

const SRC = 'sonido/profundidad.mp3';

let audio = null;
let ctx = null;
let filter = null;
let gain = null;
let raf = 0;
const subs = new Set();

function emit() { subs.forEach((fn) => fn(isPlaying())); }

function tick() {
  if (filter && ctx) {
    const p = depthState.progress;
    // 16 kHz en superficie → ~700 Hz en el fondo (curva exponencial)
    const freq = 16000 * Math.pow(700 / 16000, p);
    filter.frequency.setTargetAtTime(freq, ctx.currentTime, 0.25);
    gain.gain.setTargetAtTime(0.5 - p * 0.15, ctx.currentTime, 0.4);
  }
  raf = requestAnimationFrame(tick);
}

function setupGraph() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC();
    const source = ctx.createMediaElementSource(audio);
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    gain = ctx.createGain();
    source.connect(filter).connect(gain).connect(ctx.destination);
    tick();
  } catch {
    ctx = null; // sin Web Audio: se reproduce tal cual
  }
}

export function startAudio() {
  if (!audio) {
    audio = new Audio(SRC);
    audio.loop = true;
    audio.addEventListener('play', emit);
    audio.addEventListener('pause', emit);
    setupGraph();
    // con Web Audio el volumen lo controla el nodo de ganancia
    audio.volume = ctx ? 1 : 0.45;
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  audio.play().catch(() => {});
}

export function toggleAudio() {
  if (!audio) { startAudio(); return; }
  if (audio.paused) startAudio(); else audio.pause();
}

export function isPlaying() { return !!audio && !audio.paused; }

export function onAudioChange(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function stopAudioLoop() { cancelAnimationFrame(raf); }
