/* Línea de tiempo: historia del buceo en apnea.
   Cada época es una fila: tarjeta con la información a la izquierda y tarjeta
   con su imagen a la derecha (antes la imagen flotaba abajo a la derecha y
   tapaba al buzo de la escena 3D). */
import { TIMELINE } from '../data/kinchika.js';

function TimelineEntry({ t }) {
  return (
    <article className="timeline-node">
      <div className="timeline-card">
        <span className="era">{t.era}</span>
        <h3><span className="icon" aria-hidden="true">{t.icon}</span>{t.title}</h3>
        <p className="text--desktop" dangerouslySetInnerHTML={{ __html: t.text }}/>
        <p className="text--mobile" dangerouslySetInnerHTML={{ __html: t.textMobile }}/>
      </div>
      <figure className="timeline-photo">
        <img src={t.img} alt={t.title} loading="lazy" decoding="async"/>
        <figcaption>{t.title.split(' · ')[0]}</figcaption>
      </figure>
    </article>
  );
}

export function Timeline() {
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
            {TIMELINE.map((t) => <TimelineEntry key={t.id} t={t}/>)}
          </div>
        </div>
      </div>
    </section>
  );
}
