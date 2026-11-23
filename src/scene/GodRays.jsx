/* Rayos de luz que bajan desde la superficie y se apagan con la profundidad */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide } from 'three';
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
  uniform float uOpacity;
  uniform float uSeed;
  varying vec2 vUv;
  void main() {
    float across = pow(sin(3.14159 * vUv.x), 2.5);
    float down = pow(vUv.y, 1.6);                       // brillante arriba, se pierde abajo
    float shimmer = 0.55 + 0.45 * sin(uTime * 0.7 + uSeed * 6.283 + vUv.y * 4.0);
    float a = across * down * shimmer * uOpacity;
    gl_FragColor = vec4(vec3(0.72, 0.9, 1.0) * a, a);
  }
`;

const RAY_H = 150;

export function GodRays({ count = 9 }) {
  const group = useRef();
  const rays = useMemo(() => Array.from({ length: count }, (_, i) => {
    const seed = Math.random();
    return {
      seed,
      x: -50 + (100 * (i + Math.random() * 0.6)) / count,
      z: -18 - Math.random() * 55,
      w: 3 + Math.random() * 7,
      tilt: (Math.random() - 0.5) * 0.35,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.3 }, uSeed: { value: seed } },
    };
  }), [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * MOTION;
    const fade = 1 - smoothstep(0.04, 0.42, depthState.smooth);
    if (group.current) group.current.visible = fade > 0.001;
    rays.forEach((r, i) => {
      r.uniforms.uTime.value = t;
      r.uniforms.uOpacity.value = 0.22 * fade;
      const m = group.current?.children[i];
      if (m) m.position.x = r.x + Math.sin(t * 0.08 + r.seed * 10) * 3;
    });
  });

  return (
    <group ref={group}>
      {rays.map((r, i) => (
        <mesh key={i} position={[r.x, SURFACE_Y - RAY_H / 2, r.z]} rotation={[0, 0, r.tilt]}>
          <planeGeometry args={[r.w, RAY_H]}/>
          <shaderMaterial
            vertexShader={vertex}
            fragmentShader={fragment}
            uniforms={r.uniforms}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
