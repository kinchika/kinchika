/*
 * Cómo el agua cambia el color de las cosas.
 *
 * 1) Con la DISTANCIA: la niebla de three.js se reemplaza por una por canal.
 *    El rojo se absorbe primero, luego el verde; el azul llega más lejos.
 *    Se aplica a todos los materiales con niebla (roca, algas, peces y buzo; el barco no, está sobre el agua).
 *    Los shaders propios (medusas, rayos, partículas) no usan niebla: la
 *    bioluminiscencia conserva su color.
 *
 * 2) Con la PROFUNDIDAD: la luz del sol que llega abajo ya perdió el rojo.
 *    lightFilter() da el color de esa luz para la profundidad de la cámara;
 *    CameraRig lo aplica a las luces de la escena.
 *
 * Este módulo debe importarse antes de crear materiales (lo hace OceanScene).
 */
import { Color, ShaderChunk } from 'three';

// absorción relativa por canal (rojo, verde, azul) para la niebla
const FOG_RGB = 'vec3(2.6, 1.15, 0.85)';

ShaderChunk.fog_fragment = /* glsl */`
#ifdef USE_FOG
  #ifdef FOG_EXP2
    // el agua absorbe primero el rojo: cada canal se pierde a distinto ritmo
    vec3 fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth * ${FOG_RGB} );
  #else
    vec3 fogFactor = vec3( smoothstep( fogNear, fogFar, vFogDepth ) );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, clamp( fogFactor, 0.0, 1.0 ) );
#endif
`;

// coeficientes de atenuación aproximados del agua de mar costera (1/m)
const K = [0.16, 0.045, 0.028];

/**
 * Color de la luz solar que llega a `depthM` metros (el canal más fuerte queda en 1;
 * la intensidad total la maneja sunlight() aparte).
 */
export function lightFilter(depthM, target = new Color()) {
  const r = Math.exp(-K[0] * depthM);
  const g = Math.exp(-K[1] * depthM);
  const b = Math.exp(-K[2] * depthM);
  const m = Math.max(r, g, b);
  return target.setRGB(r / m, g / m, b / m);
}
