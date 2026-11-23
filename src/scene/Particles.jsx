/*
 * Nieve marina y burbujas. Las partículas "envuelven" la posición de la cámara
 * (módulo en el shader), así un número fijo de puntos cubre todo el descenso.
 */
import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Color } from 'three';
import { depthState, MOTION } from '../lib/depth.js';
import { smoothstep } from './palette.js';

const vertex = /* glsl */`
  uniform float uTime;
  uniform float uCamY;
  uniform float uH;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uRise;          // > 0 sube (burbujas), < 0 cae (nieve marina)
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float speed = 0.35 + aSeed * 0.65;
    p.y = mod(p.y + uTime * uRise * speed - uCamY, uH) + uCamY - uH * 0.5;
    p.x += sin(uTime * 0.25 + aSeed * 40.0) * (0.4 + aSeed);
    p.z += cos(uTime * 0.2 + aSeed * 23.0) * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.45 + aSeed) * uPixelRatio * (28.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
    float edgeY = 1.0 - smoothstep(uH * 0.32, uH * 0.5, abs(p.y - uCamY));
    vAlpha = edgeY * smoothstep(110.0, 6.0, -mv.z) * (0.3 + 0.7 * aSeed);
  }
`;

const snowFrag = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const bubbleFrag = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float ring = smoothstep(0.5, 0.4, d) * (0.25 + 0.75 * smoothstep(0.22, 0.42, d));
    float spec = smoothstep(0.12, 0.0, length(gl_PointCoord - vec2(0.36, 0.34)));
    float a = (ring + spec) * vAlpha * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

function useCloud(count, spreadX, height, zMin, zMax) {
  return useMemo(() => {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spreadX;
      pos[i * 3 + 1] = Math.random() * height;
      pos[i * 3 + 2] = zMin + Math.random() * (zMax - zMin);
      seed[i] = Math.random();
    }
    return { pos, seed };
  }, [count, spreadX, height, zMin, zMax]);
}

const SURFACE_TINT = new Color('#fff6e0');
const DEEP_TINT = new Color('#7ff3ff');

export function MarineSnow({ count = 2200 }) {
  const H = 110;
  const { pos, seed } = useCloud(count, 120, H, -95, 8);
  const dpr = useThree((s) => s.viewport.dpr);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uCamY: { value: 0 }, uH: { value: H }, uSize: { value: 2.2 },
    uPixelRatio: { value: dpr }, uRise: { value: -0.35 },
    uColor: { value: new Color() }, uOpacity: { value: 0.6 },
  }), [dpr]);

  useFrame((state) => {
    const p = depthState.smooth;
    uniforms.uTime.value = state.clock.elapsedTime * MOTION;
    uniforms.uCamY.value = state.camera.position.y;
    uniforms.uColor.value.copy(SURFACE_TINT).lerp(DEEP_TINT, smoothstep(0.45, 0.95, p));
    // más visible en aguas medias; en el abismo brilla como bioluminiscencia
    uniforms.uOpacity.value = 0.38 + 0.45 * smoothstep(0.05, 0.4, p);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]}/>
        <bufferAttribute attach="attributes-aSeed" args={[seed, 1]}/>
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={snowFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

export function Bubbles({ count = 180 }) {
  const H = 90;
  const { pos, seed } = useCloud(count, 70, H, -60, 4);
  const dpr = useThree((s) => s.viewport.dpr);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uCamY: { value: 0 }, uH: { value: H }, uSize: { value: 4.5 },
    uPixelRatio: { value: dpr }, uRise: { value: 2.6 },
    uColor: { value: new Color('#cfefff') }, uOpacity: { value: 0.7 },
  }), [dpr]);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime * MOTION;
    uniforms.uCamY.value = state.camera.position.y;
    uniforms.uOpacity.value = 0.12 + 0.6 * (1 - smoothstep(0.05, 0.5, depthState.smooth));
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]}/>
        <bufferAttribute attach="attributes-aSeed" args={[seed, 1]}/>
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={bubbleFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
