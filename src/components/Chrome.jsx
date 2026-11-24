/* Elementos fijos de la interfaz: overlay de audio, navegación, computador de buceo, sonido y barra de profundidad */
import { useEffect, useRef, useState } from 'react';
import { IconHeadphones } from './Icons.jsx';
import { depthState, MAX_DEPTH_M, useDepth, useScrollY } from '../lib/depth.js';
import { isPlaying, onAudioChange, startAudio, toggleAudio } from '../lib/audio.js';

export function AudioOverlay({ onContinue }) {
  const [hidden, setHidden] = useState(false);
  const primary = useRef(null);
  useEffect(() => { primary.current?.focus(); }, []);

  const dismiss = (withSound) => {
    if (withSound) startAudio();
    setHidden(true);
    setTimeout(onContinue, 1200);
  };

  return (
    <div id="audio-overlay" className={hidden ? 'hidden' : ''} role="dialog" aria-modal="true" aria-labelledby="overlay-title">
      <div className="overlay-ticks" aria-hidden="true">
        {['0M', '10', '20', '30M', '40', '50', '60M', '70', '80', '90M', '100'].map((t) => (
          <div key={t} className={'tick' + (t.endsWith('M') ? ' major' : '')}>{t}</div>
        ))}
      </div>
      <div className="overlay-icon-wrap"><IconHeadphones/></div>
      <h2 id="overlay-title">Activa el sonido para vivir la experiencia completa</h2>
      <p className="overlay-desc">El sonido cambia con la profundidad: mientras desciendes, la superficie se apaga. Recomendamos usar auriculares.</p>
      <div className="modal__buttons">
        <button ref={primary} className="btn btn--primary" onClick={() => dismiss(true)}>Activar sonido y descender →</button>
        <button className="btn btn--ghost" onClick={() => dismiss(false)}>Continuar sin sonido</button>
      </div>
    </div>
  );
}

const NAV = [
  ['#mision', 'Misión'], ['#historia', 'Historia'], ['#horarios', 'Horarios'],
  ['#eventos', 'Eventos'], ['#directiva', 'Directiva'], ['#contacto', 'Contacto'],
];

export function TopNav() {
  const scrolled = useScrollY(80);
  return (
    <nav id="topnav" className={scrolled ? 'is-scrolled' : ''} aria-label="Principal">
      <a href="#home" className="nav__brand">Kinchika</a>
      <div className="nav__links">
        {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </div>
    </nav>
  );
}

export function ProgressBar() {
  const p = useDepth();
  return <div id="progress-bar" style={{ width: `${p * 100}%` }} aria-hidden="true"/>;
}

// ---------- Computador de buceo ----------
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Temperatura del agua en la costa central: termoclina entre los 12 y 28 m. */
const waterTemp = (d) => 12 + 6 * (1 - smoothstep(12, 28, d)) - d / 100;

/** Límite sin descompresión con aire (minutos), aproximado a las tablas recreativas. */
const NDL = [[10, 219], [12, 147], [14, 98], [16, 72], [18, 56], [20, 45], [22, 37], [25, 29], [30, 20], [35, 14], [40, 9]];
function ndlAt(d) {
  if (d <= 10) return null;              // sin límite práctico
  if (d > 40) return -1;                 // fuera del buceo recreativo
  const row = NDL.find(([m]) => d <= m);
  return row ? row[1] : -1;
}

/** Subida más rápida que esto (m/s de "scroll") enciende la alarma. */
const FAST_ASCENT = 3;

export function HUD() {
  const p = useDepth();
  const visible = useScrollY(200);
  const [time, setTime] = useState('00:00');
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(0);     // m/s: positivo baja, negativo sube
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setTime(`${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // velocidad vertical: cuánto cambia la profundidad por segundo (suavizado)
  useEffect(() => {
    let last = depthState.progress * MAX_DEPTH_M;
    let lastT = performance.now();
    let smooth = 0;
    const id = setInterval(() => {
      const now = performance.now();
      const d = depthState.progress * MAX_DEPTH_M;
      const inst = (d - last) / Math.max(0.05, (now - lastT) / 1000);
      smooth += (inst - smooth) * 0.45;
      last = d; lastT = now;
      setRate(Math.abs(smooth) < 0.05 ? 0 : smooth);
    }, 250);
    return () => clearInterval(id);
  }, []);

  const depthExact = p * MAX_DEPTH_M;
  const depth = Math.round(depthExact);
  const pressure = 1 + depthExact / 10;                 // bar absolutos: +1 cada 10 m
  const temp = Math.round(waterTemp(depthExact));
  const ndl = ndlAt(depthExact);
  const spo2 = Math.round(98 - p * 16);
  const lowSpo2 = spo2 < 90;
  const fastAscent = rate < -FAST_ASCENT;
  const isWarning = lowSpo2 || fastAscent;
  const cls = [visible && 'is-visible', depth > 50 && 'is-deep', isWarning && 'is-warning', open && 'is-open']
    .filter(Boolean).join(' ');

  return (
    <div id="hud" className={cls}>
      <button className="hud__title" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>Computador</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="hud__chevron">{open ? '▲' : '▼'}</span>
          <span className="led"/>
        </span>
      </button>
      {open && (
        <div className="hud__body">
          <div className="hud__row hud__row--main">
            <span className="hud__label">Prof.</span>
            <span className="hud__value">−{depthExact.toFixed(1)} m</span>
          </div>
          <div className={'hud__row' + (fastAscent ? ' warning' : '')}
            title="En buceo real se sube a 9 m por minuto como máximo">
            <span className="hud__label">{rate < 0 ? 'Subida' : rate > 0 ? 'Bajada' : 'Vel.'}</span>
            <span className="hud__value">
              {rate < 0 ? '▲' : rate > 0 ? '▼' : '·'} {Math.abs(rate).toFixed(1)} m/s
            </span>
          </div>
          {fastAscent && <div className="hud__alert" role="status">Subida rápida · sube lento</div>}
          <div className="hud__row"><span className="hud__label">Presión</span><span className="hud__value">{pressure.toFixed(1)} bar</span></div>
          <div className="hud__row"><span className="hud__label">Temp.</span><span className="hud__value">{temp}°C</span></div>
          <div className={'hud__row' + (ndl === -1 ? ' warning' : '')}
            title="Límite sin descompresión con aire (tablas recreativas)">
            <span className="hud__label">NDL</span>
            <span className="hud__value">{ndl === null ? '—' : ndl === -1 ? 'TÉCNICO' : `${ndl} min`}</span>
          </div>
          <div className="hud__row"><span className="hud__label">Tiempo</span><span className="hud__value">{time}</span></div>
          <div id="hud-spo2-row" className={'hud__row' + (lowSpo2 ? ' warning' : '')}>
            <span className="hud__label">SpO₂</span><span className="hud__value">{spo2}%</span>
          </div>
          <div className="hud__progress"><div className="hud__progress-fill" style={{ width: `${depth}%` }}/></div>
        </div>
      )}
    </div>
  );
}

export function SoundBtn() {
  const visible = useScrollY(200);
  const [playing, setPlaying] = useState(isPlaying());
  useEffect(() => onAudioChange(setPlaying), []);
  return (
    <button
      id="sound-btn"
      className={visible ? 'is-visible' : ''}
      onClick={toggleAudio}
      aria-label={playing ? 'Silenciar' : 'Activar sonido'}
      title={playing ? 'Silenciar' : 'Activar sonido'}
    >
      {playing ? '🔊' : '🔇'}
    </button>
  );
}
