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

/**
 * Chapuzón al entrar al agua, sintetizado (sin archivos): golpe grave, ruido de
 * agua que se cierra hacia los graves y unas burbujas. Solo suena si el sonido
 * ambiente está activado.
 */
export function playSplash() {
  if (!ctx || !isPlaying()) return;
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);
  const env = (g, peak, attack, release) => {
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
  };

  // ruido de agua: ráfaga que pasa de agudo a grave, como el agua cerrándose sobre la cabeza
  const len = 1.3;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 0.8;
  band.frequency.setValueAtTime(2600, now);
  band.frequency.exponentialRampToValueAtTime(260, now + 1.0);
  const ng = ctx.createGain();
  env(ng, 0.32, 0.025, 1.1);
  noise.connect(band).connect(ng).connect(out);
  noise.start(now);
  noise.stop(now + len);

  // golpe grave del cuerpo entrando al agua
  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(150, now);
  thump.frequency.exponentialRampToValueAtTime(45, now + 0.3);
  const tg = ctx.createGain();
  env(tg, 0.35, 0.01, 0.35);
  thump.connect(tg).connect(out);
  thump.start(now);
  thump.stop(now + 0.4);

  // burbujas: pequeños silbidos que suben de tono
  for (let i = 0; i < 9; i++) {
    const at = now + 0.12 + Math.random() * 0.8;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f0 = 350 + Math.random() * 500;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f0 * 2.2, at + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.05, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 0.08);
  }
}

export function onAudioChange(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

