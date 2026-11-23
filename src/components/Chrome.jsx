/* Elementos fijos de la interfaz: overlay de audio, navegación, computador de buceo, sonido y barra de profundidad */
import { useEffect, useRef, useState } from 'react';
import { IconHeadphones } from './Icons.jsx';
import { MAX_DEPTH_M, useDepth, useScrollY } from '../lib/depth.js';
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

export function HUD() {
  const p = useDepth();
  const visible = useScrollY(200);
  const [time, setTime] = useState('00:00');
  const [open, setOpen] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setTime(`${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const depth = Math.round(p * MAX_DEPTH_M);
  const temp = Math.round(18 - p * 10);
  const spo2 = Math.round(98 - p * 16);
  const isWarning = spo2 < 90;
  const cls = [visible && 'is-visible', depth > 50 && 'is-deep', isWarning && 'is-warning', open && 'is-open']
    .filter(Boolean).join(' ');

  return (
    <div id="hud" className={cls}>
      <button className="hud__title" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>Dive Computer</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="hud__chevron">{open ? '▲' : '▼'}</span>
          <span className="led"/>
        </span>
      </button>
      {open && (
        <div className="hud__body">
          <div className="hud__row"><span className="hud__label">Depth</span><span className="hud__value">−{depth}m</span></div>
          <div className="hud__row"><span className="hud__label">Time</span><span className="hud__value">{time}</span></div>
          <div className="hud__row"><span className="hud__label">Temp</span><span className="hud__value">{temp}°C</span></div>
          <div id="hud-spo2-row" className={'hud__row' + (isWarning ? ' warning' : '')}>
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
