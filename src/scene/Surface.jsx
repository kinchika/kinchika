/* Superficie del mar vista desde abajo: ondas de luz (cáusticas) y ventana de Snell */
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { depthState, MOTION } from '../lib/depth.js';
import { SURFACE_Y, smoothstep } from './palette.js';

const vertex = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */`
  uniform float uTime;
  uniform float uFade;
  varying vec2 vUv;

  float waves(vec2 p, float t) {
    float w = sin(p.x * 1.3 + t * 0.7 + sin(p.y * 0.9 + t * 0.5) * 1.4);
    w += sin(p.y * 1.1 - t * 0.6 + sin(p.x * 0.8 - t * 0.4) * 1.6);
    w += 0.5 * sin((p.x + p.y) * 2.1 + t * 1.1);
    return w;
  }

  void main() {
    vec2 p = vUv * 26.0;
    float w = waves(p, uTime);
    float lines = pow(clamp(0.5 + 0.22 * w, 0.0, 1.0), 4.0);
    float r = length(vUv - 0.5) * 2.0;
    float snell = 1.0 - smoothstep(0.0, 0.42, r);         // disco brillante sobre la cámara
    float edge = 1.0 - smoothstep(0.35, 1.0, r);
    vec3 deep = vec3(0.05, 0.28, 0.42);
    vec3 light = vec3(0.78, 0.95, 1.0);
    vec3 col = mix(deep, light, clamp(lines * 1.6 + snell * 0.55, 0.0, 1.0));
    float alpha = edge * uFade * (0.45 + 0.55 * max(lines, snell * 0.8));
    gl_FragColor = vec4(col, alpha);
  }
`;

export function Surface() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFade: { value: 1 } }), []);
  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime * MOTION;
    uniforms.uFade.value = 1 - smoothstep(0.02, 0.3, depthState.smooth);
  });
  return (
    <mesh position={[0, SURFACE_Y, -40]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={[420, 420, 1, 1]}/>
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
