/*
 * Motor de audio. El sonido ambiente se "hunde" con la profundidad:
 * un filtro pasa-bajos cierra los agudos a medida que desciendes,
 * como cuando la superficie queda atrás.
 *
 * En la superficie se escuchan, muy suaves y lejanas, gaviotas sintetizadas
 * (sin archivos de audio); al sumergirse dejan de oírse.
 */
import { depthState } from './depth.js';

const SRC = 'sonido/profundidad.mp3';

let audio = null;
let ctx = null;
let filter = null;
let gain = null;
let raf = 0;
let gullBus = null;
let nextGull = 0;
const subs = new Set();

function emit() { subs.forEach((fn) => fn(isPlaying())); }

function tick() {
  if (filter && ctx) {
    const p = depthState.progress;
    // 16 kHz en superficie → ~700 Hz en el fondo (curva exponencial)
    const freq = 16000 * Math.pow(700 / 16000, p);
    filter.frequency.setTargetAtTime(freq, ctx.currentTime, 0.25);
    gain.gain.setTargetAtTime(0.5 - p * 0.15, ctx.currentTime, 0.4);
    gullTick(p);
  }
  raf = requestAnimationFrame(tick);
}

/** El filtro solo se actualiza mientras suena (en pausa no gasta cuadros). */
function onPlay() { cancelAnimationFrame(raf); if (filter) tick(); emit(); }
function onPause() { cancelAnimationFrame(raf); emit(); }

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
    gullBus = ctx.createGain();
    gullBus.gain.value = 0;
    gullBus.connect(ctx.destination);
    nextGull = ctx.currentTime + 2;
  } catch {
    ctx = null; // sin Web Audio: se reproduce tal cual
  }
}

export function startAudio() {
  if (!audio) {
    audio = new Audio(SRC);
    audio.loop = true;
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
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

// ── gaviotas ────────────────────────────────────────────────────────────────
const rnd = (a, b) => a + Math.random() * (b - a);

/** Solo en la superficie: el volumen cae a cero en los primeros metros del descenso. */
function gullTick(p) {
  if (!gullBus) return;
  const surface = 1 - Math.min(1, Math.max(0, (p - 0.01) / 0.05));
  gullBus.gain.setTargetAtTime(surface, ctx.currentTime, 0.3);
  if (surface > 0.05 && ctx.currentTime >= nextGull) {
    gullCall(ctx.currentTime + 0.05);
    nextGull = ctx.currentTime + rnd(4, 11);
  }
}

/** Un llamado: el "kyow" (1 a 3 notas que caen de tono) o la "risa" (serie rápida). */
function gullCall(at) {
  const distance = rnd(0.35, 1);                 // 1 = la más cercana
  const pan = rnd(-0.7, 0.7);
  if (Math.random() < 0.7) {
    const n = 1 + Math.floor(Math.random() * 3);
    const f0 = rnd(900, 1250);
    for (let i = 0; i < n; i++) gullNote(at + i * rnd(0.32, 0.42), f0 * rnd(0.95, 1.05), rnd(0.26, 0.34), distance, pan);
  } else {
    const n = 4 + Math.floor(Math.random() * 4);
    const f0 = rnd(1150, 1450);
    for (let i = 0; i < n; i++) gullNote(at + i * 0.17, f0 * (1 - i * 0.02), 0.12, distance * 0.85, pan);
  }
}

/** Nota de gaviota: tono áspero que sube un instante y cae, filtrado como una voz lejana. */
function gullNote(at, f0, dur, distance, pan) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f0 * 0.85, at);
  osc.frequency.exponentialRampToValueAtTime(f0, at + 0.035);
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.6, at + dur);
  // aspereza de la voz
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rnd(24, 32);
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = f0 * 0.025;
  lfo.connect(lfoGain).connect(osc.frequency);
  // dos formantes en paralelo
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass'; f1.frequency.value = 1700; f1.Q.value = 2.5;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass'; f2.frequency.value = 3100; f2.Q.value = 3.5;
  // lejanía: menos agudos y menos volumen
  const far = ctx.createBiquadFilter();
  far.type = 'lowpass';
  far.frequency.value = 1800 + distance * 2400;
  const env = ctx.createGain();
  const peak = 0.035 * distance;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(peak, at + 0.02);
  env.gain.setValueAtTime(peak, at + dur - 0.06);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(f1).connect(far);
  osc.connect(f2).connect(far);
  let out = far.connect(env);
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    out = out.connect(p);
  }
  out.connect(gullBus);
  osc.start(at); lfo.start(at);
  osc.stop(at + dur + 0.02); lfo.stop(at + dur + 0.02);
}

export function onAudioChange(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

