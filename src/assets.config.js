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
 *  position   [x, z] en unidades del mundo (la cámara está en x=0, mirando a −z)
 *  height     alto deseado en unidades del mundo (se normaliza el modelo)
 *  rotationY  giro en radianes
 *  animation  nombre del clip a reproducir, o 'auto' para el primero
 */
export const MODELS = [
  {
    id: 'buzo',
    src: 'models/buzo.glb',
    depthM: 20,
    follow: [6, 62],
    position: [4.2, -11],
    height: 3.2,
    rotationY: -Math.PI / 2,
    animation: 'auto',
  },
];

/**
 * Geometría opcional para los cardúmenes. Si existe el .glb, sus peces
 * reemplazan a los procedurales. Exportar el pez mirando a +X (ver pipeline/blender).
 */
export const FISH_MODELS = {
  jurel: 'models/jurel.glb',
  reineta: 'models/reineta.glb',
  anchoveta: 'models/anchoveta.glb',
};
