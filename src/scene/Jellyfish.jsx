/* Medusas bioluminiscentes en la zona profunda */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, SphereGeometry } from 'three';
import { depthState, MOTION } from '../lib/depth.js';
import { mToY, smoothstep } from './palette.js';

const bellVertex = /* glsl */`
  uniform float uTime;
  uniform float uSeed;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 p = position;
    float pulse = sin(uTime * 1.7 + uSeed * 6.283);
    float rim = 1.0 - p.y;                          // 0 arriba, 1 en el borde
    p.xz *= 1.0 + 0.16 * pulse * rim;
    p.y *= 1.0 - 0.12 * pulse;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const bellFragment = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(vN, vV)), 1.4);
    float a = (0.18 + 0.82 * f) * uOpacity;
    gl_FragColor = vec4(uColor * (0.5 + 3.0 * f) * a, a);
  }
`;

const TENTACLES = 7;
const SEGMENTS = 14;
const PALETTE = ['#5ff6ff', '#7d9bff', '#c9a84c', '#9ffcd9'];

function Jelly({ seed, x, z, depthM, scale, color }) {
  const group = useRef();
  const bellGeo = useMemo(() => new SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), []);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uSeed: { value: seed }, uColor: { value: new Color(color) }, uOpacity: { value: 0 },
  }), [seed, color]);

  const lines = useMemo(() => {
    const g = new BufferGeometry();
    const arr = new Float32Array(TENTACLES * (SEGMENTS - 1) * 2 * 3);
    g.setAttribute('position', new BufferAttribute(arr, 3));
    return g;
  }, []);

  const baseY = mToY(depthM);

  useFrame((state) => {
    const t = state.clock.elapsedTime * MOTION;
    const fade = smoothstep(0.55, 0.75, depthState.smooth);
    uniforms.uTime.value = t;
    uniforms.uOpacity.value = 0.9 * fade;
    if (!group.current) return;
    group.current.visible = fade > 0.001;
    if (!group.current.visible) return;
    group.current.position.set(
      x + Math.sin(t * 0.09 + seed * 9) * 3,
      baseY + Math.sin(t * 0.35 + seed * 5) * 1.6,
      z,
    );
    // tentáculos: curvas que ondulan con el pulso
    const arr = lines.attributes.position.array;
    let k = 0;
    for (let i = 0; i < TENTACLES; i++) {
      const ang = (i / TENTACLES) * Math.PI * 2;
      const r = 0.75;
      let px = Math.cos(ang) * r, py = 0, pz = Math.sin(ang) * r;
      for (let s = 1; s < SEGMENTS; s++) {
        const v = s / SEGMENTS;
        const nx = Math.cos(ang) * r * (1 - v * 0.4) + Math.sin(t * 1.3 + s * 0.6 + i + seed * 4) * 0.25 * v;
        const ny = -v * 4.2;
        const nz = Math.sin(ang) * r * (1 - v * 0.4) + Math.cos(t * 1.1 + s * 0.5 + i) * 0.25 * v;
        arr[k++] = px; arr[k++] = py; arr[k++] = pz;
        arr[k++] = nx; arr[k++] = ny; arr[k++] = nz;
        px = nx; py = ny; pz = nz;
      }
    }
    lines.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={group} scale={scale}>
      <mesh geometry={bellGeo}>
        <shaderMaterial
          vertexShader={bellVertex}
          fragmentShader={bellFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.25, 0]} scale={[0.55, 0.4, 0.55]}>
        <sphereGeometry args={[1, 16, 10]}/>
        <meshBasicMaterial color={color} transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} fog={false}/>
      </mesh>
      <lineSegments geometry={lines} frustumCulled={false}>
        <lineBasicMaterial color={color} transparent opacity={0.5} blending={AdditiveBlending} depthWrite={false}/>
      </lineSegments>
    </group>
  );
}

export function Jellyfish({ count = 9 }) {
  const jellies = useMemo(() => Array.from({ length: count }, (_, i) => ({
    seed: Math.random(),
    x: (i % 2 ? 1 : -1) * (14 + Math.random() * 16),
    z: -14 - Math.random() * 40,
    depthM: 72 + (i / count) * 26 + Math.random() * 3,
    scale: 0.9 + Math.random() * 1.4,
    color: PALETTE[i % PALETTE.length],
  })), [count]);
  return jellies.map((j, i) => <Jelly key={i} {...j}/>);
}
