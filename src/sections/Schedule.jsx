/* Horarios y simuladores de tablas de apnea (O₂ / CO₂) */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { SCHEDULE } from '../data/kinchika.js';
import { useIsMobile } from '../lib/useIsMobile.js';

// === SIMULATOR HELPERS ===
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function genTable(type, pbSecs, reps) {
  if (type === 'O2') {
    // Apnea constante ~80% PB · Descanso decrece desde hold hasta ~35% hold
    const hold = Math.max(30, Math.round(pbSecs * 0.8));
    const restMin = Math.max(30, Math.round(hold * 0.35));
    const step = Math.round((hold - restMin) / Math.max(1, reps - 1));
    return Array.from({ length: reps }, (_, i) => ({
      hold,
      rest: i < reps - 1 ? Math.max(restMin, hold - i * step) : 0
    }));
  }
  // CO2: Descanso fijo 2 min · Apnea crece de 50% a 90% PB
  const holdStart = Math.max(20, Math.round(pbSecs * 0.5));
  const holdEnd   = Math.round(pbSecs * 0.9);
  const step      = reps > 1 ? Math.round((holdEnd - holdStart) / (reps - 1)) : 0;
  return Array.from({ length: reps }, (_, i) => ({
    hold: holdStart + i * step,
    rest: i < reps - 1 ? 120 : 0
  }));
}

// === APNEA TABLE SIMULATOR ===
function ApneaTable({ type }) {
  const [pbMin, setPbMin] = useState(2);
  const [pbSec, setPbSec] = useState(0);
  const [reps,  setReps]  = useState(8);
  // s = { phase: 'idle'|'hold'|'rest'|'done', rep, secs }
  const [s, setS] = useState({ phase: 'idle', rep: 0, secs: 0 });

  const pbSecs = pbMin * 60 + Math.min(59, pbSec);
  const table  = useMemo(() => genTable(type, pbSecs, reps), [type, pbSecs, reps]);

  // Reset cuando cambia la configuración
  useEffect(() => {
    setS({ phase: 'idle', rep: 0, secs: 0 });
  }, [table]);

  // Un tick por segundo mientras está corriendo.
  // useEffect([s, table]) garantiza que cada closure ve la tabla y el estado actuales.
  // setS con función updater evita closures obsoletos.
  useEffect(() => {
    if (s.phase === 'idle' || s.phase === 'done') return;
    const id = setTimeout(() => {
      setS(c => {
        if (c.secs > 1) return { ...c, secs: c.secs - 1 };
        if (c.phase === 'hold') {
          if (c.rep < table.length - 1 && table[c.rep].rest > 0)
            return { phase: 'rest', rep: c.rep, secs: table[c.rep].rest };
          return { phase: 'done', rep: c.rep, secs: 0 };
        }
        const next = c.rep + 1;
        return { phase: 'hold', rep: next, secs: table[next].hold };
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [s, table]);

  const { phase, rep, secs } = s;
  const isIdle  = phase === 'idle';
  const isDone  = phase === 'done';
  const active  = phase === 'hold' || phase === 'rest';

  const doStart = () => setS({ phase: 'hold', rep: 0, secs: table[0].hold });
  const doStop  = () => setS({ phase: 'idle', rep: 0, secs: 0 });

  const isO2 = type === 'O2';
  const holdPreview = isO2
    ? fmt(Math.max(30, Math.round(pbSecs * 0.8)))
    : fmt(Math.max(20, Math.round(pbSecs * 0.5)));

  return (
    <div className="sim">
      {/* Header */}
      <div className="sim__head">
        <span className={'sim__badge' + (isO2 ? ' o2' : ' co2')}>{isO2 ? 'O₂' : 'CO₂'}</span>
        <div>
          <div className="sim__title">{isO2 ? 'Tabla de Oxígeno' : 'Tabla de CO₂'}</div>
          <div className="sim__desc">
            {isO2
              ? 'Apnea constante · descanso decreciente — tolerancia a la hipoxia progresiva'
              : 'Apnea creciente · descanso constante — tolerancia a la hipercapnia'}
          </div>
        </div>
      </div>

      {/* Config — only when idle */}
      {isIdle && (
        <div className="sim__config">
          <div className="sim__config-field">
            <label>Marca personal</label>
            <div className="sim__time-input">
              <input type="number" min="0" max="10" value={pbMin}
                onChange={e => setPbMin(Math.max(0, Math.min(10, +e.target.value || 0)))} />
              <span>:</span>
              <input type="number" min="0" max="59" value={String(pbSec).padStart(2,'0')}
                onChange={e => setPbSec(Math.max(0, Math.min(59, +e.target.value || 0)))} />
            </div>
          </div>
          <div className="sim__config-field">
            <label>Series</label>
            <select value={reps} onChange={e => setReps(+e.target.value)}>
              {[4,6,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="sim__config-field">
            <label>{isO2 ? 'Apnea objetivo' : 'Descanso fijo'}</label>
            <span className="sim__config-preview">{isO2 ? holdPreview : '02:00'}</span>
          </div>
        </div>
      )}

      {/* Timer — when running or done */}
      {(active || isDone) && (
        <div className={'sim__timer' + (phase === 'hold' ? ' hold' : phase === 'rest' ? ' rest' : ' done')}>
          <div className="sim__timer-label">
            {isDone ? 'Sesión completada' : phase === 'hold' ? `Serie ${rep + 1} · Apnea` : `Serie ${rep + 1} · Descanso`}
          </div>
          <div className="sim__timer-count">{isDone ? '✓' : fmt(secs)}</div>
          {!isDone && (
            <div className="sim__timer-next">
              {phase === 'hold' && rep < table.length - 1 && table[rep].rest > 0
                && `próx. descanso · ${fmt(table[rep].rest)}`}
              {phase === 'rest' && rep < table.length - 1
                && `próx. apnea serie ${rep + 2} · ${fmt(table[rep + 1].hold)}`}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="sim__table">
        <div className="sim__row sim__row--head">
          <span>#</span><span>Apnea</span><span>Descanso</span>
        </div>
        {table.map((row, i) => (
          <div key={i} className={
            'sim__row'
            + (active && phase === 'hold' && rep === i ? ' is-hold' : '')
            + (active && phase === 'rest' && rep === i ? ' is-rest' : '')
            + (isDone ? ' is-done-row' : '')
            + (active && rep > i ? ' is-past' : '')
          }>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <span>{fmt(row.hold)}</span>
            <span>{row.rest ? fmt(row.rest) : '—'}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="sim__controls">
        {isIdle  && <button className="sim__btn sim__btn--start" onClick={doStart}>▶ Iniciar sesión</button>}
        {active  && <button className="sim__btn sim__btn--stop"  onClick={doStop}>◼ Detener</button>}
        {isDone  && <button className="sim__btn sim__btn--reset" onClick={doStop}>↺ Nueva sesión</button>}
      </div>
    </div>
  );
}

// === SCHEDULE + TABLES ===
export function Schedule() {
  const [activeSim, setActiveSim] = useState(null);
  const isMobile = useIsMobile();
  const toggle = (type) => setActiveSim(v => v === type ? null : type);

  useEffect(() => {
    if (!activeSim) return;
    const onKey = (e) => { if (e.key === 'Escape') setActiveSim(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeSim]);

  return (
    <section id="horarios" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">Entrenamientos</div>
          <h2 className="heading">Horarios</h2>
          <p className="lead">Piscina municipal de Lo Prado · 21:00 a 22:00 hrs. Tres sesiones semanales bajo supervisión profesional.</p>
        </div>
        <div className="schedule-grid">
          {SCHEDULE.map(s => (
            <div key={s.day} className="schedule-card">
              <div className="card-tag">{s.tag}</div>
              <div className="day">{s.day}</div>
              <div className="hour">{s.hour}</div>
              <div className="title">{s.title}</div>
              <div className="desc">{s.desc}</div>
            </div>
          ))}
        </div>

        <div className="section__head section__head--sub">
          <div className="eyebrow">Tablas de entrenamiento</div>
          <h2 className="heading" style={{fontSize: 'clamp(26px, 2.8vw, 40px)'}}>Hipoxia & Hipercapnia</h2>
        </div>

        <div className="tables-grid">
          {/* O2 */}
          <div className="table-card-wrap">
            <div className={'table-card' + (activeSim === 'O2' ? ' is-open' : '')} onClick={() => toggle('O2')} role="button" tabIndex={0} aria-expanded={activeSim === 'O2'} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('O2'); } }}>
              <div className="formula">O<sub>2</sub></div>
              <h3>Tabla de Oxígeno</h3>
              <p className="text--desktop">Se enfocan en la resistencia a la falta de oxígeno. Para funcionar con <strong>hipoxia</strong> (bajo nivel de oxígeno), mejorar la capacidad pulmonar, la tolerancia y aumentar la duración de las apneas.</p>
              <p className="text--mobile">Mejoran la resistencia a la <strong>hipoxia</strong> y aumentan la duración de las apneas.</p>
              <div className="open-sim">
                {activeSim === 'O2' ? 'Cerrar simulador ✕' : 'Abrir simulador →'}
              </div>
            </div>
            {isMobile && activeSim === 'O2' && (
              <div className="sim-inline"><ApneaTable type="O2" /></div>
            )}
          </div>

          {/* CO2 */}
          <div className="table-card-wrap">
            <div className={'table-card' + (activeSim === 'CO2' ? ' is-open' : '')} onClick={() => toggle('CO2')} role="button" tabIndex={0} aria-expanded={activeSim === 'CO2'} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('CO2'); } }}>
              <div className="formula">CO<sub>2</sub></div>
              <h3>Tabla de CO₂</h3>
              <p className="text--desktop">Se centran en la tolerancia a la <strong>hipercapnia</strong> (exceso de dióxido de carbono), entrenando al cuerpo para resistir la acidosis sin llegar a niveles críticos de hipoxia.</p>
              <p className="text--mobile">Entrenan la tolerancia al CO₂ (<strong>hipercapnia</strong>) para resistir la acidosis.</p>
              <div className="open-sim">
                {activeSim === 'CO2' ? 'Cerrar simulador ✕' : 'Abrir simulador →'}
              </div>
            </div>
            {isMobile && activeSim === 'CO2' && (
              <div className="sim-inline"><ApneaTable type="CO2" /></div>
            )}
          </div>
        </div>
      </div>

      {/* Modal — desktop only, rendered via portal to escape stacking contexts */}
      {!isMobile && activeSim && createPortal(
        <div className="sim-backdrop" onClick={() => setActiveSim(null)}>
          <div className="sim-modal" role="dialog" aria-modal="true" aria-label="Simulador de tabla de apnea" onClick={e => e.stopPropagation()}>
            <button className="sim-close" aria-label="Cerrar simulador" onClick={() => setActiveSim(null)}>✕</button>
            <ApneaTable key={activeSim} type={activeSim} />
          </div>
        </div>,
        document.getElementById('overlay-root')
      )}
    </section>
  );
}

