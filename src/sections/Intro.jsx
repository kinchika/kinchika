/* Hero, editorial, misión e historia */
import { DISCIPLINAS } from '../data/kinchika.js';

export function Hero() {
  return (
    <section className="hero" id="home" aria-label="Inicio">
      <div className="water-shimmer" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="auto" src="video/mar-final.mp4"/>
      </div>
      <div className="video-overlay-gradient" aria-hidden="true"/>

      <div className="hero-content">
        <div>
          <div className="hero-tag">Establecido en 2023 · Lo Prado</div>
          <h1 className="hero-title" aria-label="Kinchika">
            {'KINCHIKA'.split('').map((c, i) => <span key={i} className="char" aria-hidden="true">{c}</span>)}
          </h1>
          <p className="hero-subtitle">Club de buceo y apnea sin fines de lucro de Lo Prado, dedicados a la formación de deportistas y la protección de nuestro ecosistema marino.</p>
          <div className="hero-buttons">
            <a href="#mision" className="btn btn--primary">Explorar disciplinas <span className="arrow">→</span></a>
            <a href="#contacto" className="btn btn--ghost">Unirse al club</a>
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
  return (
    <section className="editorial-divider section">
      <div className="container">
        <h2>Club de Buceo<br/>Kinchika</h2>
        <p className="lead text--desktop">Somos un club de buceo compuesto por vecinos de la comuna de Lo Prado. Funcionamos sin fines de lucro, comprometidos profundamente con la ecología marina, la cultura submarina y el desarrollo del deporte local.</p>
        <p className="lead text--mobile">Club sin fines de lucro de Lo Prado, comprometido con la ecología marina y el deporte subacuático.</p>
      </div>
    </section>
  );
}

export function Mission() {
  return (
    <section id="mision" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">Quiénes somos</div>
          <h2 className="heading">Nuestra misión</h2>
        </div>
        <div className="mission-card">
          <div className="quote text--desktop">Fomentar el desarrollo integral de la comunidad a través de la práctica de deportes subacuáticos y la educación ambiental. Como organización sin fines de lucro, nos dedicamos a la preservación del patrimonio marino y el rescate de la cultura submarina, promoviendo la equidad social y el acceso inclusivo al deporte bajo un modelo de gestión transparente y colaborativo.</div>
          <div className="quote text--mobile">Fomentar la comunidad a través del deporte subacuático y la educación ambiental, con acceso inclusivo y transparencia.</div>
        </div>
        <div className="disciplines-grid">
          {DISCIPLINAS.map((d) => <span key={d} className="badge">{d}</span>)}
        </div>
      </div>
    </section>
  );
}

export function History() {
  return (
    <section id="historia" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">Nuestra historia</div>
          <h2 className="heading">Kinchika, palabra de mar</h2>
        </div>
        <div className="history-grid">
          <div className="history-text">
            <p className="history-lead text--desktop">Somos un grupo de vecinos, pobladores de <strong>Barrancas</strong>, que movidos por la pasión por el mar nos hemos consolidado como un club deportivo, social y cultural dedicado a las actividades subacuáticas. Aunque nuestra identidad está arraigada en una zona interior, mantenemos un vínculo vital con el océano a través de campañas ecológicas de limpieza y el apoyo constante a proyectos de cultura marina.</p>
            <p className="text--desktop">Nuestra historia dio un paso decisivo con la apertura de la <strong>piscina municipal de Lo Prado</strong>, espacio que hemos transformado en nuestro centro de entrenamiento. Hemos hecho fuerza con compras al por mayor para adquirir equipamiento especializado y buscando convenios para la obtención de licencias de buceo inicial. Así también nos adjudicamos nuestra propia <strong>boya grupal para prácticas de profundidad</strong>.</p>
            <p className="history-lead text--mobile">Vecinos de <strong>Barrancas</strong> unidos por el mar. Entrenamos en la <strong>piscina de Lo Prado</strong> con equipamiento propio y boya grupal para profundidad.</p>
            <p>Somos una comunidad que derriba distancias geográficas para sumergirse en el deporte y el cuidado del medio ambiente marino.</p>
          </div>
          <div className="instructors">
            <h3>Nuestros profesores</h3>
            <div className="instructor-card">
              <div className="instructor-avatar"><img src="img/historia/neymar.svg" alt="Neymar Colmenares" loading="lazy"/></div>
              <div>
                <div className="instructor-name">Neymar Colmenares</div>
                <div className="instructor-role">Perfeccionamiento de nado</div>
              </div>
            </div>
            <div className="instructor-card">
              <div className="instructor-avatar"><img src="img/historia/valentino.svg" alt="Valentino Molina" loading="lazy"/></div>
              <div>
                <div className="instructor-name">Valentino Molina</div>
                <div className="instructor-role">Apnea y nado con aletas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
