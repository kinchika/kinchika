/* Hero, editorial, misión e historia */
import { DISCIPLINAS, SECTIONS, SITE, isVisible } from '../lib/content.js';
import { Rich } from '../components/Rich.jsx';

export function Hero() {
  const h = SITE.portada;
  return (
    <section className="hero" id="home" aria-label="Inicio">
      <div className="water-shimmer" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="auto" src="video/mar-final.mp4"/>
      </div>
      <div className="video-overlay-gradient" aria-hidden="true"/>

      <div className="hero-content">
        <div>
          <div className="hero-tag">{h.etiqueta}</div>
          <h1 className="hero-title" aria-label="Kinchika">
            {'KINCHIKA'.split('').map((c, i) => <span key={i} className="char" aria-hidden="true">{c}</span>)}
          </h1>
          <Rich className="hero-subtitle" text={h.subtitulo}/>
          <div className="hero-buttons">
            <a href="#mision" className="btn btn--primary">{h.botonPrincipal} <span className="arrow">→</span></a>
            <a href="#contacto" className="btn btn--ghost">{h.botonSecundario}</a>
          </div>
        </div>
      </div>

      <div className="hero-meta">
        <div>SUP · 33°26′S 70°43′W</div>
        <div className="scroll-cue">SCROLL · DESCENDER</div>
        <div className="coords"><strong>00M / SUPERFICIE</strong><span>18°C · SpO₂ 98%</span></div>
      </div>
    </section>
  );
}

export function EditorialDivider() {
  if (!isVisible('presentacion')) return null;
  const p = SITE.presentacion;
  return (
    <section className="editorial-divider section">
      <div className="container">
        <Rich as="h2" text={p.titulo}/>
        <Rich className="lead text--desktop" text={p.texto}/>
        <Rich className="lead text--mobile" text={p.textoMovil}/>
      </div>
    </section>
  );
}

export function Mission() {
  if (!isVisible('mision')) return null;
  const head = SECTIONS.mision;
  const m = SITE.mision;
  return (
    <section id="mision" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">{head.etiqueta}</div>
          <h2 className="heading">{head.titulo}</h2>
        </div>
        <div className="mission-card">
          <Rich as="div" className="quote text--desktop" text={m.texto}/>
          <Rich as="div" className="quote text--mobile" text={m.textoMovil}/>
        </div>
        <div className="disciplines-grid">
          {DISCIPLINAS.map((d) => <span key={d} className="badge">{d}</span>)}
        </div>
      </div>
    </section>
  );
}

export function History() {
  if (!isVisible('historia')) return null;
  const head = SECTIONS.historia;
  const h = SITE.historia;
  return (
    <section id="historia" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">{head.etiqueta}</div>
          <h2 className="heading">{head.titulo}</h2>
        </div>
        <div className="history-grid">
          <div className="history-text">
            <Rich className="history-lead text--desktop" text={h.destacado}/>
            <Rich className="text--desktop" text={h.texto}/>
            <Rich className="history-lead text--mobile" text={h.textoMovil}/>
            <Rich text={h.cierre}/>
          </div>
          <div className="instructors">
            <h3>{h.tituloProfesores}</h3>
            {h.profesores.map((p) => (
              <div key={p.name} className="instructor-card">
                <div className="instructor-avatar"><img src={p.img} alt={p.name} loading="lazy"/></div>
                <div>
                  <div className="instructor-name">{p.name}</div>
                  <div className="instructor-role">{p.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
