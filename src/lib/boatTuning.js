/*
 * Ajustes del barco de la portada (tamaño, posición y giros).
 * El tamaño va ligado al del buzo para que la proporción se mantenga en
 * cualquier pantalla. En celular (≤ 900 px) el barco, la cuerda y el buzo no se muestran.
 */
import { MODELS } from '../assets.config.js';

export const boatTuning = {
  diverRatio: 4.2,  // largo del barco = N veces lo que mide el buzo en pantalla
  maxWidthPct: 50,  // tope: % del ancho de la pantalla
  offsetX: 7,       // px: + mueve el barco a la derecha (la cuerda queda en su lugar)
  offsetY: -21,     // px: + sube el barco sobre el agua (la cuerda lo acompaña)
  pitch: -0.1,      // grados, cabeceo: + baja la proa
  yaw: -8.5,        // grados, giro horizontal: + acerca la proa a la cámara
  roll: 15,         // grados, escora: + inclina la cubierta hacia la cámara
};

const diver = MODELS.find((m) => m.id === 'buzo');

/** Largo del barco en pantalla (px), proporcional al buzo. */
export function boatLengthPx(cam, width, height) {
  const dist = cam.position.z - diver.position[1];
  const diverPx = (diver.height / (2 * Math.tan((cam.fov * Math.PI) / 360) * dist)) * height;
  return Math.min(diverPx * boatTuning.diverRatio, (width * boatTuning.maxWidthPct) / 100);
}
