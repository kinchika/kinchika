/* Línea de tiempo: historia del buceo en apnea.
   Cada época es una fila: tarjeta con la información a la izquierda y tarjeta
   con su imagen a la derecha (antes la imagen flotaba abajo a la derecha y
   tapaba al buzo de la escena 3D). */
import { SECTIONS, TIMELINE, isVisible } from '../lib/content.js';
import { Rich } from '../components/Rich.jsx';

function TimelineEntry({ t }) {
  return (
    <article className="timeline-node">
      <div className="timeline-card">
        <span className="era">{t.era}</span>
        <h3><span className="icon" aria-hidden="true">{t.icon}</span>{t.title}</h3>
        <Rich className="text--desktop" text={t.text}/>
        <Rich className="text--mobile" text={t.textMobile}/>
      </div>
      <figure className="timeline-photo">
        <img src={t.img} alt={t.title} loading="lazy" decoding="async"/>
        <figcaption>{t.title.split(' · ')[0]}</figcaption>
      </figure>
    </article>
  );
}

export function Timeline() {
  if (!isVisible('apnea')) return null;
  const head = SECTIONS.apnea;
  return (
    <section id="apnea-historia" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">{head.etiqueta}</div>
          <h2 className="heading">{head.titulo}</h2>
          <Rich className="lead" text={head.bajada}/>
        </div>
        <div className="timeline">
          <div className="timeline-track">
            {TIMELINE.map((t, i) => <TimelineEntry key={i} t={t}/>)}
          </div>
        </div>
      </div>
    </section>
  );
}
