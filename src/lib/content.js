/*
 * Contenido del sitio.
 *
 * Los textos, fotos y listas viven en src/content/*.json y se editan desde el panel
 * de Pages CMS (configurado en .pages.yml, en la raíz del repo). Cada vez que alguien
 * guarda un cambio en el panel, se hace un commit en main y GitHub Actions publica
 * el sitio de nuevo.
 *
 * Este módulo lee esos archivos y los deja listos para las secciones: ordena,
 * oculta lo marcado como no visible y normaliza rutas de imágenes.
 */
import eventos from '../content/eventos.json';
import resultados from '../content/resultados.json';
import directivas from '../content/directivas.json';
import historiaApnea from '../content/historia-apnea.json';
import horarios from '../content/horarios.json';
import aliados from '../content/aliados.json';
import inicio from '../content/inicio.json';
import contacto from '../content/contacto.json';
import secciones from '../content/secciones.json';

/** Las imágenes se guardan como "img/..." (relativas). Se aceptan también "/img/...". */
const asset = (p) => (p || '').replace(/^\/+/, '');

/** Texto con formato simple escrito en el panel: **negrita**, *cursiva* y saltos de línea. */
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function textToHtml(text = '') {
  return escapeHtml(String(text))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\r?\n/g, '<br>');
}

export const SECTIONS = secciones;
/** true si la sección no fue ocultada desde el panel. */
export const isVisible = (id) => SECTIONS[id]?.visible !== false;

/** Menú superior y del pie: solo secciones visibles. */
const NAV_ORDER = ['mision', 'historia', 'horarios', 'eventos', 'directiva', 'contacto'];
export const NAV = NAV_ORDER
  .filter((id) => isVisible(id) && SECTIONS[id]?.menu)
  .map((id) => [`#${id}`, SECTIONS[id].menu]);

export const SITE = {
  ...inicio,
  historia: {
    ...inicio.historia,
    profesores: (inicio.historia?.profesores || []).map((p) => ({ ...p, img: asset(p.img) })),
  },
};
export const CONTACT = contacto;
export const DISCIPLINAS = inicio.mision?.disciplinas || [];

// --- Eventos ---
export const DISC_LABELS = { ECO: 'Eco', STA: 'Estática', DYN: 'Dinámica', DEPTH: 'Profundidad', EDU: 'Charla' };
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export const EVENTS = eventos
  .filter((e) => e.visible !== false)
  .map((e) => {
    const [, m, d] = String(e.fecha || '').slice(0, 10).split('-').map(Number);
    return {
      ...e,
      day: d || '',
      month: MESES[(m || 1) - 1],
      discLabel: DISC_LABELS[e.disc] || e.disc,
      cupos: Number(e.cupos) || 0,
      cuposMax: Number(e.cuposMax) || 0,
      img: asset(e.img),
    };
  })
  .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

// --- Resultados, directiva, línea de tiempo, horarios y aliados ---
export const RESULTS = resultados;

export const DIRECTIVAS = [...directivas]
  .map((d) => ({ ...d, anio: String(d.anio), cargos: (d.cargos || []).map((c) => ({ ...c, img: asset(c.img) })) }))
  .sort((a, b) => b.anio.localeCompare(a.anio));

export const TIMELINE = historiaApnea.map((t) => ({ ...t, img: asset(t.img) }));
export const SCHEDULE = horarios;
export const ALLIES = aliados.map((a) => ({ ...a, logo: asset(a.logo) }));
