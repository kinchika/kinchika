/* Calendario de eventos con filtros */
import { useEffect, useRef, useState } from 'react';
import { EVENTS } from '../data/kinchika.js';

/**
 * Usa la foto generada (img/eventos/<nombre>.jpg) si existe;
 * si no, vuelve a la ilustración .svg original.
 */
function EventImage({ src, alt }) {
  const photo = src.replace(/\.svg$/, '.jpg');
  const [cur, setCur] = useState(photo);
  return <img src={cur} alt={alt} loading="lazy" onError={() => { if (cur !== src) setCur(src); }}/>;
}

// === FILTER SELECT (custom dropdown) ===
function FilterSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const label = (options.find(([k]) => k === value) || [])[1] || placeholder;

  return (
    <div className={'filter-select' + (open ? ' is-open' : '')} ref={ref}>
      <button className="filter-select__btn" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{label}</span>
        <svg className="filter-select__arrow" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="filter-select__panel">
          {options.map(([k, l]) => (
            <button
              key={k}
              className={'filter-select__option' + (value === k ? ' is-active' : '')}
              onClick={() => { onChange(k); setOpen(false); }}
            >
              {value === k && <span className="filter-select__dot"/>}
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// === EVENTS ===
export function Events() {
  const [disc, setDisc] = useState('ALL');
  const [level, setLevel] = useState('ALL');
  const [onlyAvail, setOnlyAvail] = useState(false);

  const filtered = EVENTS.filter(e =>
    (disc === 'ALL' || e.disc === disc) &&
    (level === 'ALL' || e.level === level) &&
    (!onlyAvail || e.cupos > 0)
  );

  const discOpts = [['ALL','Todas'],['ECO','Eco'],['STA','Estática'],['DYN','Dinámica'],['DEPTH','Profundidad'],['EDU','Charlas']];
  const levelOpts = [['ALL','Todos los niveles'],['Principiante','Principiante'],['Intermedio','Intermedio'],['Competitivo','Competitivo']];

  return (
    <section id="eventos" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">Calendario</div>
          <h2 className="heading">Próximos eventos</h2>
          <p className="lead">Limpiezas de playa, clínicas, salidas grupales y encuentros del club. Inscripciones abiertas y próximas actividades.</p>
        </div>

        <div className="filter-bar">
          <FilterSelect value={disc} onChange={setDisc} options={discOpts} placeholder="Disciplina"/>
          <FilterSelect value={level} onChange={setLevel} options={levelOpts} placeholder="Nivel"/>
          <button
            className={'filter-toggle' + (onlyAvail ? ' is-on' : '')}
            onClick={() => setOnlyAvail(v => !v)}
            aria-pressed={onlyAvail}
          >
            <span className="filter-toggle__track"><span className="filter-toggle__thumb"/></span>
            Solo disponibles
          </button>
          <span className="filter-count">{filtered.length} evento{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="events-grid">
          {filtered.map(e => (
            <div key={e.id} className="event-card">
              <div className="event-image">
                <EventImage src={e.img} alt={e.title}/>
                <span className="event-disc-tag">{e.discLabel}</span>
                <div className="event-date">
                  <div className="day">{e.day}</div>
                  <div className="month">{e.month}</div>
                </div>
              </div>
              <div className="event-body">
                <h3>{e.title}</h3>
                <div className="place">◇ {e.place}</div>
                <div className="desc">{e.desc}</div>
                <div className="event-meta">
                  <span className="level">{e.level}</span>
                  <span className={'cupos' + (e.cupos === 0 ? ' full' : '')}>
                    <span className="dot"/>
                    {e.cupos === 0 ? 'Sin cupos' : `${e.cupos}/${e.cuposMax} cupos`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

