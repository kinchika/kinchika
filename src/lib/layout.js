/*
 * "Carril" libre a la derecha del contenido.
 * En pantallas anchas los paneles de lectura se corren a la izquierda
 * (ver "PANELES DE LECTURA" en styles/sections.css) y la escena 3D ubica el
 * barco, el cabo y el buzo en el espacio que queda a la derecha, para que no
 * pasen por detrás del texto.
 */

/** Ancho mínimo (px) para considerar que hay carril. */
const MIN_LANE = 180;

const layoutState = {
  /** Borde izquierdo del carril en px desde la izquierda de la ventana, o null si no hay carril. */
  laneLeft: null,
  laneWidth: 0,
  measured: false,
};

function measure() {
  const panel = document.querySelector('main > .section > .container');
  const vw = window.innerWidth;
  layoutState.measured = true;
  if (!panel) { layoutState.laneLeft = null; layoutState.laneWidth = 0; return; }
  const right = panel.getBoundingClientRect().right;
  const width = vw - right;
  layoutState.laneWidth = width;
  layoutState.laneLeft = width >= MIN_LANE ? right : null;
}

let started = false;
/** Mide ahora y cada vez que cambia el tamaño de la ventana. */
function startLayoutTracking() {
  if (started) return;
  started = true;
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; measure(); });
  };
  window.addEventListener('resize', schedule);
  // las fuentes y el contenido pueden cambiar el ancho después de la carga
  window.addEventListener('load', schedule);
  measure();
}

/**
 * Un punto del carril en coordenadas de pantalla normalizadas (−1 a 1), o null si no hay carril.
 * @param {number} f  0 = borde izquierdo del carril (junto al texto), 1 = borde derecho de la pantalla
 */
export function laneNdcX(f = 0.5) {
  if (!layoutState.measured) startLayoutTracking();
  if (layoutState.laneLeft == null) return null;
  const px = layoutState.laneLeft + layoutState.laneWidth * f;
  return (px / window.innerWidth) * 2 - 1;
}

/**
 * Posición x del mundo que, a la altura y y profundidad z dadas, cae en la columna
 * de pantalla ndcX con la cámara actual. Así un objeto queda fijo en pantalla aunque
 * la cámara se mezca, y una línea vertical se ve recta aunque la cámara mire hacia arriba.
 * Devuelve null si el punto queda detrás de la cámara.
 */
export function worldXForScreen(cam, y, z, ndcX, a, b) {
  a.set(0, y, z).project(cam);
  b.set(1, y, z).project(cam);
  // detrás de la cámara la proyección se invierte
  if (a.z > 1 || b.z > 1 || a.z < -1) return null;
  const d = b.x - a.x;
  if (Math.abs(d) < 1e-6) return null;
  return (ndcX - a.x) / d;
}
