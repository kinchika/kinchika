/* Línea de tiempo: historia del buceo en apnea */
import { useState } from 'react';
import { TIMELINE } from '../data/kinchika.js';

function TimelineCard({ t, onEnter, onLeave, onToggle, isSelected }) {
  return (
    <div
      className={'timeline-node' + (isSelected ? ' is-selected' : '')}
      onMouseEnter={() => onEnter(t)}
      onMouseLeave={onLeave}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      role="button"
      tabIndex={0}
      aria-expanded={isSelected}
    >
      <div className="timeline-card">
        <span className="era">{t.era}</span>
        <span className="icon" aria-hidden="true">{t.icon}</span>
        <h3>{t.title}</h3>
        <p className="text--desktop" dangerouslySetInnerHTML={{ __html: t.text }}/>
        <p className="text--mobile" dangerouslySetInnerHTML={{ __html: t.textMobile }}/>
      </div>
      {isSelected && (
        <div className="timeline-inline-img">
          <img src={t.img} alt={t.title}/>
        </div>
      )}
    </div>
  );
}

export function Timeline() {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  return (
    <section id="apnea-historia" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">Historia del buceo en apnea</div>
          <h2 className="heading">Freediving · Buceo libre</h2>
          <p className="lead">Una de las disciplinas más fascinantes y antiguas de la interacción humana con el mar.</p>
        </div>
        <div className="timeline">
          <div className="timeline-track">
            {TIMELINE.map((t) => (
              <TimelineCard
                key={t.id}
                t={t}
                onEnter={setHovered}
                onLeave={() => setHovered(null)}
                onToggle={() => setSelected((prev) => (prev?.id === t.id ? null : t))}
                isSelected={selected?.id === t.id}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={'timeline-image-panel' + (hovered ? ' is-active' : '')} aria-hidden="true">
        {hovered && <>
          <img src={hovered.img} alt=""/>
          <div className="panel-label">{hovered.id}</div>
        </>}
      </div>
    </section>
  );
}
