/*
 * Cáusticas: la red de luz que proyecta la superficie del mar.
 * Un solo reloj y una sola intensidad para toda la escena (roca, algas,
 * peces y buzo), actualizados una vez por cuadro desde CameraRig.
 */

/** Uniforms compartidos por todos los materiales con cáusticas. */
export const causticUniforms = {
  uTime: { value: 0 },
  uCaustic: { value: 1 },
};

const causticsGLSL = /* glsl */`
  uniform float uTime;
  uniform float uCaustic;
  varying vec3 vWPos;
  float causLayer(vec2 p, float t) {
    float a = sin(p.x * 0.9 + t * 0.8 + sin(p.y * 0.7 - t * 0.6) * 1.8);
    float b = sin(p.y * 1.1 - t * 0.7 + sin(p.x * 0.8 + t * 0.5) * 1.6);
    float c = sin((p.x - p.y) * 0.6 + t * 0.9);
    float w = (a + b + 0.6 * c) / 2.6;
    return pow(1.0 - abs(w), 7.0);
  }
  float caustics(vec3 wp, float t) {
    vec2 p = vec2(wp.x, wp.z + wp.y * 0.45) * 0.24;
    return causLayer(p, t) + 0.6 * causLayer(p * 1.9 + 7.3, t * 1.3);
  }
`;

/**
 * Agrega cáusticas a un material estándar de three.js (conserva su onBeforeCompile).
 * @param {import('three').Material} material
 * @param {object} [opts]
 * @param {number} [opts.strength=1]  intensidad relativa (peces y buzo: menos que la roca)
 */
export function withCaustics(material, { strength = 1 } = {}) {
  // un mismo material puede estar en varias mallas (ej: el traje del buzo): solo una vez
  if (material.userData.kinchikaCaustics) return material;
  material.userData.kinchikaCaustics = true;
  const base = material.onBeforeCompile;
  const baseKey = Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey')
    ? material.customProgramCacheKey.bind(material)
    : () => String(base);
  material.onBeforeCompile = (shader, renderer) => {
    base.call(material, shader, renderer);
    Object.assign(shader.uniforms, causticUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${causticsGLSL}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float shallow = smoothstep(-130.0, -8.0, vWPos.y);
        // la cáustica es luz extra sobre la superficie: se modula por el color propio
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.75, 1.0, 1.05)
          * caustics(vWPos, uTime) * uCaustic * shallow * ${strength.toFixed(2)};`);
  };
  // three reutiliza programas por esta clave: debe distinguir la base y la intensidad
  material.customProgramCacheKey = () => `${baseKey()}|caustics:${strength}`;
  material.needsUpdate = true;
  return material;
}
