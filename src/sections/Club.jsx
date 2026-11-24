/* Resultados, directiva, lugar, contacto y pie de página */
import { useState } from 'react';
import { ALLIES, DIRECTIVAS, RESULTS } from '../data/kinchika.js';
import { IconCamera, IconPin, IconWhatsApp } from '../components/Icons.jsx';
import { CREDITS, LICENSE_URLS } from '../assets.config.js';

// === RESULTS ===
export function Results() {
  const keys = Object.keys(RESULTS);
  const [sel, setSel] = useState(keys[0]);
  const r = RESULTS[sel];
  const podiumClass = (pos) => pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';

  return (
    <section id="resultados" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">Marcador oficial</div>
          <h2 className="heading">Resultados de eventos</h2>
          <p className="lead">Registro histórico de competencias y encuentros del club Kinchika en colaboración con la federación FEDESUB.</p>
        </div>

        <div className="results-selector">
          <select value={sel} onChange={e => setSel(e.target.value)} aria-label="Elegir competencia">
            {keys.map(k => <option key={k} value={k}>{RESULTS[k].name}</option>)}
          </select>
        </div>

        <div className="results-table">
          <div className="results-header">
            <div>
              <h3>{r.name}</h3>
              <div className="meta">{r.discipline}</div>
            </div>
            <div className="stat-row">
              <span className="stat-label">Fecha</span>
              <span className="stat-val">{r.date}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Sede</span>
              <span className="stat-val">{r.location}</span>
            </div>
          </div>
          <div className="results-list">
            {r.rows.map(row => (
              <div key={row.pos} className={'result-row ' + podiumClass(row.pos)}>
                <div className="pos">{String(row.pos).padStart(2, '0')}</div>
                <div>
                  <div className="name">{row.name}</div>
                </div>
                <div className="club">{row.club}</div>
                <div className="perf">{row.perf}</div>
                <div className={'badge-record' + (!row.record ? ' empty' : '')}>{row.record || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// === DIRECTIVA ===
export function Directiva() {
  const years = Object.keys(DIRECTIVAS).sort().reverse();
  const [year, setYear] = useState(years[0]);
  const d = DIRECTIVAS[year];

  return (
    <section id="directiva" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">Historia institucional</div>
          <h2 className="heading">Directiva del club</h2>
          <p className="lead text--desktop">Registro permanente de quienes han liderado el Club Kinchika año a año, velando por el crecimiento y la transparencia de nuestra organización.</p>
          <p className="lead text--mobile">Registro histórico de directivas del Club Kinchika.</p>
        </div>

        <div className="year-tabs">
          {years.map(y => (
            <button key={y} className={year === y ? 'active' : ''} aria-pressed={year === y} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>

        <div className="directiva-info">
          <span><strong>Período</strong> · {d.inicio} → {d.fin}</span>
          <span><strong>Estado</strong> · {d.estado}</span>
          <span><strong>Cargos</strong> · {d.cargos.length}</span>
        </div>

        <div className="org-chart">
          {d.cargos.map((c, i) => (
            <div key={i} className={'directiva-card' + (c.main ? ' is-presidente' : '')}>
              <div className="directiva-avatar"><img src={c.img} alt={c.name} loading="lazy"/></div>
              <div className="directiva-cargo">{c.cargo}</div>
              <div className="directiva-name">{c.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// === LOCATION ===
export function Location() {
  return (
    <section id="lugar" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">Dónde entrenamos</div>
          <h2 className="heading">Nuestro lugar</h2>
          <p className="lead">Piscina municipal de Lo Prado — nuestro centro de entrenamiento.</p>
        </div>
        <div className="location-card">
          <div className="location-info">
            <h3>Piscina Municipal de Lo Prado</h3>
            <div className="address">Los Copihues 5797</div>
            <div className="city">Lo Prado · Región Metropolitana · Chile</div>
            <p className="text--desktop">Espacio que hemos transformado en nuestro centro de entrenamiento gracias al apoyo de la municipalidad. Aquí desarrollamos las sesiones de nado, acondicionamiento y técnica de apnea.</p>
            <p className="text--mobile">Nuestro centro de entrenamiento para nado, acondicionamiento y técnica de apnea.</p>
            <a href="https://maps.google.com/?q=Los+Copihues+5797,+Lo+Prado" target="_blank" rel="noopener" className="btn btn--outline">Ver en Google Maps →</a>
          </div>
          <div className="location-map">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3329.2921497651396!2d-70.72124791200032!3d-33.44169432844727!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9662c476226cdf89%3A0x35845e136ef8434c!2sLos%20Copihues%205797%2C%20Lo%20Prado%2C%20Regi%C3%B3n%20Metropolitana!5e0!3m2!1ses-419!2scl!4v1778029852080!5m2!1ses-419!2scl"
              width="100%"
              height="100%"
              style={{border: 0, display: 'block'}}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación Kinchika — Los Copihues 5797, Lo Prado"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// === CONTACT ===
export function Contact() {
  return (
    <section id="contacto" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">Contacto</div>
          <h2 className="heading">Sumérgete con nosotros</h2>
          <p className="lead">Nuevos integrantes son bienvenidos. Escríbenos o pásate por la piscina un martes, miércoles o jueves.</p>
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-icon"><IconWhatsApp/></div>
            <div className="label">WhatsApp</div>
            <div className="value"><a href="https://wa.me/56967508503" target="_blank" rel="noopener">+56 9 6750 8503</a></div>
            <div className="sub">Francisco Reyes · Presidente</div>
          </div>
          <div className="contact-card">
            <div className="contact-icon"><IconPin/></div>
            <div className="label">Ubicación</div>
            <div className="value">Los Copihues 5797</div>
            <div className="sub">Lo Prado · Región Metropolitana</div>
          </div>
          <div className="contact-card">
            <div className="contact-icon"><IconCamera/></div>
            <div className="label">Instagram</div>
            <div className="value"><a href="https://www.instagram.com/clubdebuceo.kinchika/" target="_blank" rel="noopener">@clubdebuceo.kinchika</a></div>
            <div className="sub">Síguenos para novedades</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// === ALIADOS: franja a todo el ancho, arriba del pie de página ===
// 3 vueltas de logos por grupo: ~3.900 px, más que cualquier pantalla de escritorio
const ALLY_GROUP = [...ALLIES, ...ALLIES, ...ALLIES];

function Allies() {
  return (
    <section className="allies-band" aria-label="Aliados">
      <div className="footer-inner allies-band__head">
        <div className="eyebrow">Aliados</div>
        <h2 className="allies-band__title">Nos apoyan</h2>
      </div>
      <div className="allies-carousel">
        {/* dos grupos idénticos que se desplazan medio ancho: el bucle no tiene costura.
            Cada grupo repite los logos hasta cubrir pantallas anchas (sin huecos al final). */}
        <div className="allies-track" style={{ '--allies-duration': `${ALLY_GROUP.length * 3.6}s` }}>
          {[0, 1].map((g) => (
            <div key={g} className="allies-group" aria-hidden={g === 1 ? true : undefined}>
              {ALLY_GROUP.map((a, i) => {
                const first = g === 0 && i < ALLIES.length;   // solo la primera aparición es accesible
                return (
                  <a key={i} href={a.url} target="_blank" rel="noopener" className="ally-item" title={a.name}
                    aria-hidden={first ? undefined : true} tabIndex={first ? undefined : -1}>
                    <img src={a.logo} alt={first ? a.name : ''} decoding="async"/>
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// === CRÉDITOS: modelos 3D y texturas de terceros, en tarjetas ===
function Credits() {
  return (
    <section className="credits-band" aria-labelledby="credits-title">
      <div className="credits-band__head">
        <div className="eyebrow">Créditos</div>
        <h3 id="credits-title" className="credits-band__title">Modelos 3D y texturas de la escena</h3>
      </div>
      <ul className="credits-grid">
        {CREDITS.map((c) => (
          <li key={c.url} className="credit-card">
            <span className="credit-card__use">{c.use}</span>
            <a className="credit-card__title" href={c.url} target="_blank" rel="noopener noreferrer">
              {c.title}<span aria-hidden="true"> ↗</span>
            </a>
            <span className="credit-card__author">por {c.author}</span>
            {c.note && <span className="credit-card__note">{c.note}</span>}
            <a className="credit-card__license" href={LICENSE_URLS[c.license]} target="_blank" rel="noopener noreferrer">
              {c.license}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// === FOOTER ===
export function Footer() {
  return (
    <footer>
      <Allies/>
      <div className="footer-inner">
        <div className="footer-brand-row">
          <div className="footer-brand">KINCHIKA</div>
          <div className="footer-tagline">Club de Buceo y Apnea<br/>Lo Prado · RM · Chile</div>
        </div>
        <div className="footer-grid">
          <div className="footer-col">
            <h4>Sobre el club</h4>
            <p style={{marginBottom: 16}}>Buceo · Apnea · Nado con aletas · Rescatismo · Educación ambiental.</p>
            <p>Esta web es una experiencia inmersiva. Practica apnea siempre acompañado y bajo supervisión profesional.</p>
          </div>
          <div className="footer-col">
            <h4>Navegación</h4>
            <a href="#mision">Misión</a>
            <a href="#historia">Historia</a>
            <a href="#eventos">Eventos</a>
            <a href="#contacto">Contacto</a>
          </div>
          <div className="footer-col">
            <h4>Contacto</h4>
            <a href="https://wa.me/56967508503">+56 9 6750 8503</a>
            <a href="mailto:hola@kinchika.cl">hola@kinchika.cl</a>
            <a href="https://www.instagram.com/clubdebuceo.kinchika/">Instagram</a>
          </div>
          <div className="footer-col">
            <h4>Sede</h4>
            <p>Piscina Municipal de Lo Prado<br/>Los Copihues 5797<br/>Lo Prado · RM</p>
          </div>
        </div>
        {CREDITS.length > 0 && <Credits/>}
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Club de Buceo Kinchika</span>
          <span>· — Todos los derechos reservados</span>
          <span>33°26′S · 70°43′W · −100M</span>
        </div>
      </div>
    </footer>
  );
}

