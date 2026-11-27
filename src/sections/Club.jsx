/* Resultados, directiva, lugar, contacto y pie de página */
import { useState } from 'react';
import { ALLIES, CONTACT, DIRECTIVAS, NAV, RESULTS, SECTIONS, isVisible } from '../lib/content.js';
import { Rich } from '../components/Rich.jsx';
import { IconCamera, IconPin, IconWhatsApp } from '../components/Icons.jsx';
import { CREDITS, LICENSE_URLS } from '../assets.config.js';

// === RESULTS ===
export function Results() {
  const [sel, setSel] = useState(0);
  const r = RESULTS[sel];
  const podiumClass = (pos) => pos === 1 ? 'gold' : pos === 2 ? 'silver' : pos === 3 ? 'bronze' : '';

  if (!isVisible('resultados') || !r) return null;
  const head = SECTIONS.resultados;
  return (
    <section id="resultados" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">{head.etiqueta}</div>
          <h2 className="heading">{head.titulo}</h2>
          <Rich className="lead" text={head.bajada}/>
        </div>

        <div className="results-selector">
          <select value={sel} onChange={e => setSel(+e.target.value)} aria-label="Elegir competencia">
            {RESULTS.map((x, i) => <option key={i} value={i}>{x.name}</option>)}
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
            {r.rows.map((row, i) => (
              <div key={i} className={'result-row ' + podiumClass(Number(row.pos))}>
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
  const years = DIRECTIVAS.map((x) => x.anio);
  const [year, setYear] = useState(years[0]);
  const d = DIRECTIVAS.find((x) => x.anio === year);

  if (!isVisible('directiva') || !d) return null;
  const head = SECTIONS.directiva;
  return (
    <section id="directiva" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">{head.etiqueta}</div>
          <h2 className="heading">{head.titulo}</h2>
          <Rich className="lead text--desktop" text={head.bajada}/>
          <Rich className="lead text--mobile" text={head.bajadaMovil || head.bajada}/>
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
  if (!isVisible('lugar')) return null;
  const head = SECTIONS.lugar;
  const l = CONTACT.lugar;
  return (
    <section id="lugar" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">{head.etiqueta}</div>
          <h2 className="heading">{head.titulo}</h2>
          <Rich className="lead" text={head.bajada}/>
        </div>
        <div className="location-card">
          <div className="location-info">
            <h3>{l.nombre}</h3>
            <div className="address">{l.direccion}</div>
            <div className="city">{[l.comuna, l.region, l.pais].filter(Boolean).join(' · ')}</div>
            <Rich className="text--desktop" text={l.texto}/>
            <Rich className="text--mobile" text={l.textoMovil}/>
            <a href={l.mapsUrl} target="_blank" rel="noopener" className="btn btn--outline">Ver en Google Maps →</a>
          </div>
          <div className="location-map">
            <iframe
              src={l.mapaEmbedUrl}
              width="100%"
              height="100%"
              style={{border: 0, display: 'block'}}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Ubicación Kinchika — ${l.direccion}, ${l.comuna}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// === CONTACT ===
const waLink = () => `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}`;
const igLink = () => `https://www.instagram.com/${CONTACT.instagramUsuario.replace(/^@/, '')}/`;

export function Contact() {
  if (!isVisible('contacto')) return null;
  const head = SECTIONS.contacto;
  const c = CONTACT;
  return (
    <section id="contacto" className="section section--wide">
      <div className="container">
        <div className="section__head">
          <div className="eyebrow">{head.etiqueta}</div>
          <h2 className="heading">{head.titulo}</h2>
          <Rich className="lead" text={head.bajada}/>
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-icon"><IconWhatsApp/></div>
            <div className="label">WhatsApp</div>
            <div className="value"><a href={waLink()} target="_blank" rel="noopener">{c.whatsapp}</a></div>
            <div className="sub">{c.whatsappNombre}</div>
          </div>
          <div className="contact-card">
            <div className="contact-icon"><IconPin/></div>
            <div className="label">Ubicación</div>
            <div className="value">{c.lugar.direccion}</div>
            <div className="sub">{[c.lugar.comuna, c.lugar.region].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="contact-card">
            <div className="contact-icon"><IconCamera/></div>
            <div className="label">Instagram</div>
            <div className="value"><a href={igLink()} target="_blank" rel="noopener">@{c.instagramUsuario.replace(/^@/, '')}</a></div>
            <div className="sub">{c.instagramTexto}</div>
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
  if (!isVisible('aliados') || ALLIES.length === 0) return null;
  const head = SECTIONS.aliados;
  return (
    <section className="allies-band" aria-label="Aliados">
      <div className="footer-inner allies-band__head">
        <div className="eyebrow">{head.etiqueta}</div>
        <h2 className="allies-band__title">{head.titulo}</h2>
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
const FOOTER_NAV = ['#mision', '#historia', '#eventos', '#contacto'];

export function Footer() {
  return (
    <footer>
      <Allies/>
      <div className="footer-inner">
        <div className="footer-brand-row">
          <div className="footer-brand">KINCHIKA</div>
          <Rich as="div" className="footer-tagline" text={CONTACT.pie.lema}/>
        </div>
        <div className="footer-grid">
          <div className="footer-col">
            <h4>Sobre el club</h4>
            {CONTACT.pie.sobreElClub.map((t, i, all) => (
              <Rich key={i} text={t} style={i < all.length - 1 ? {marginBottom: 16} : undefined}/>
            ))}
          </div>
          <div className="footer-col">
            <h4>Navegación</h4>
            {NAV.filter(([href]) => FOOTER_NAV.includes(href)).map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          </div>
          <div className="footer-col">
            <h4>Contacto</h4>
            <a href={waLink()}>{CONTACT.whatsapp}</a>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            <a href={igLink()}>Instagram</a>
          </div>
          <div className="footer-col">
            <h4>Sede</h4>
            <Rich text={CONTACT.pie.sede}/>
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

