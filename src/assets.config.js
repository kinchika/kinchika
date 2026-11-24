/*
 * ──────────────────────────────────────────────────────────────────────────
 *  ASSETS GENERADOS (Higgsfield + Blender)
 * ──────────────────────────────────────────────────────────────────────────
 *  Todos los archivos se buscan dentro de /public. Si un archivo todavía no
 *  existe, el sitio simplemente no lo muestra (no se rompe nada):
 *   • Los videos de interludio quedan ocultos.
 *   • Los modelos 3D no aparecen y los cardúmenes usan peces procedurales.
 *
 *  Para generarlos, ver pipeline/README.md.
 */

/** Videos entre secciones (generados con Higgsfield, fondo negro puro). */
export const INTERLUDES = {
  cardumen: {
    src: 'video/higgsfield/cardumen-jurel.mp4',
    depth: '−15 M',
    caption: 'Cardumen de jurel',
    note: 'Trachurus murphyi · costa central de Chile',
  },
  descenso: {
    src: 'video/higgsfield/descenso-boya.mp4',
    depth: '−40 M',
    caption: 'Descenso por la boya',
    note: 'Peso constante · una sola bocanada de aire',
  },
  abismo: {
    src: 'video/higgsfield/abismo-bioluminiscente.mp4',
    depth: '−90 M',
    caption: 'Donde la luz ya no llega',
    note: 'Bioluminiscencia en la zona mesopelágica',
  },
};

/**
 * Modelos 3D animados que aparecen en la escena.
 *  depthM     profundidad (m) donde vive el modelo
 *  follow     [desdeM, hastaM]: el modelo acompaña a la cámara en ese tramo
 *  followOffsetM  metros bajo la cámara mientras la acompaña (más = más abajo en pantalla)
 *  position   [x, z] en unidades del mundo (la cámara está en x=0, mirando a −z)
 *  height     alto deseado en unidades del mundo (se normaliza el modelo)
 *  rotationY  giro en radianes
 *  rotation   [x, y, z, orden] giro completo (reemplaza a rotationY)
 *  bubbles    si es true, suelta burbujas de regulador desde la cabeza (buzo con tanque)
 *  useLane    si es true, en pantallas anchas se ubica en el carril libre a la derecha del texto
 *  belowBoat  si es true, nunca sube por encima de una línea bajo el barco de la portada
 *  turnOnAscent  si es true, al hacer scroll hacia arriba el modelo da una voltereta
 *             y sube de cabeza hacia la superficie (y vuelve a girar al bajar)
 *  animation  nombre del clip a reproducir, o 'auto' para el primero
 */
export const MODELS = [
  {
    id: 'buzo',
    src: 'models/buzo.glb',
    depthM: 20,
    follow: [6, 99],
    followOffsetM: 0.5,
    position: [4.2, -11],
    height: 3.6,
    // el modelo nada hacia +Z con la espalda hacia +Y: se pone de cabeza (descenso)
    // y se gira en 3/4 para ver el tanque y las aletas
    rotation: [Math.PI / 2 + 0.35, 0.6, 0, 'YXZ'],
    turnOnAscent: true,
    // en pantallas anchas, nada por el carril libre a la derecha del texto
    useLane: true,
    // exhala burbujas por el regulador cada ~4,5 s
    bubbles: true,
    // no sube más allá de una línea bajo el casco del barco de la portada
    belowBoat: true,
    animation: 'auto',
  },
];

/**
 * Recursos de terceros que usa la escena. CC BY 4.0 exige nombrar al autor y
 * enlazar la obra y la licencia (el formato es libre: aquí, tarjetas en el pie).
 *   use      para qué se usa en la web
 */
export const CREDITS = [
  { use: 'Buzo', title: 'Diver', author: 'ucdavisterc', url: 'https://skfb.ly/oIOZJ', license: 'CC BY 4.0' },
  { use: 'Barco', title: 'Motor Yacht', author: 'gogiart', url: 'https://skfb.ly/pETVG', license: 'CC BY 4.0', note: 'casco repintado y simplificado' },
  { use: 'Jurel', title: 'Atlantic Mackerel (Animated and Game-ready)', author: 'Ishxxn', url: 'https://skfb.ly/pMyHY', license: 'CC BY 4.0' },
  { use: 'Anchoveta', title: 'Sardine', author: 'Drake', url: 'https://skfb.ly/6vYqN', license: 'CC BY 4.0' },
  { use: 'Reineta', title: 'Fish', author: 'VeeRuby Technologies Pvt Ltd', url: 'https://skfb.ly/oErFY', license: 'CC BY 4.0' },
  { use: 'Roca', title: 'Rock Face', author: 'Poly Haven', url: 'https://polyhaven.com/a/rock_face', license: 'CC0' },
];

export const LICENSE_URLS = {
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
};

/**
 * Geometría opcional para los cardúmenes. Si existe el .glb, sus peces
 * reemplazan a los procedurales. Exportar el pez mirando a +X (ver pipeline/blender).
 */
export const FISH_MODELS = {
  jurel: 'models/jurel.glb',
  reineta: 'models/reineta.glb',
  anchoveta: 'models/anchoveta.glb',
};
