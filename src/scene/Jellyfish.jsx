/*
 * Medusas bioluminiscentes en la zona profunda.
 * Campana translúcida (más luminosa en los bordes, como un domo de gelatina),
 * con canales radiales, gónadas, borde festoneado y un pulso de luz que baja;
 * brazos orales fruncidos y tentáculos ondulantes que se apagan hacia la punta.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, LatheGeometry, PlaneGeometry,
  ShaderMaterial, Vector2,
} from 'three';
import { depthState, MOTION } from '../lib/depth.js';
import { mToY, smoothstep } from './palette.js';

const PULSE_SPEED = 1.6;

const bellVertex = /* glsl */`
  uniform float uTime;
  uniform float uSeed;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  varying float vProf;
  void main() {
    vec3 p = position;
    float prof = uv.y;                                  // 0 en el ápice, 1 en el borde
    float pulse = sin(uTime * ${PULSE_SPEED.toFixed(2)} + uSeed * 6.283);
    float k = smoothstep(0.2, 1.0, prof);
    float ang = atan(p.z, p.x);
    float lappets = 1.0 + 0.04 * cos(ang * 16.0) * smoothstep(0.8, 1.0, prof);
    p.xz *= (1.0 - 0.15 * pulse * k) * lappets;        // la campana se contrae desde el borde
    p.y *= 1.0 + 0.1 * pulse;
    vP = position;
    vProf = prof;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const bellFragment = /* glsl */`
  uniform vec3 uColor;
  uniform vec3 uRim;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uSeed;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  varying float vProf;
  void main() {
    float prof = clamp(vProf, 0.0, 1.0);
    float ndv = abs(dot(normalize(vN), normalize(vV)));
    float fres = pow(clamp(1.0 - ndv, 0.0, 1.0), 2.5);   // bordes de la gelatina
    float ang = atan(vP.z, vP.x);
    float canals = pow(abs(cos(ang * 8.0)), 40.0) * smoothstep(0.25, 0.9, prof);
    float rimBand = smoothstep(0.85, 0.98, prof);
    float lappet = 0.5 + 0.5 * cos(ang * 16.0);
    float gonad = smoothstep(0.12, 0.0, abs(prof - 0.42)) * pow(abs(sin(ang * 2.0)), 4.0);
    float apex = smoothstep(0.25, 0.0, prof) * 0.3;
    // onda de luz que recorre la campana hacia el borde con cada pulso
    float wave = 0.5 + 0.5 * sin(uTime * ${PULSE_SPEED.toFixed(2)} + uSeed * 6.283 - prof * 3.5);
    float glow = 0.025 + 0.85 * fres + 0.35 * canals * (0.6 + 0.4 * wave)
      + (0.55 + 0.45 * lappet) * rimBand * (0.5 + 0.5 * wave) + 0.45 * gonad + apex;
    vec3 col = mix(uColor, uRim, clamp(rimBand * 0.8 + gonad * 0.6, 0.0, 1.0));
    gl_FragColor = vec4(col * glow * 1.5, uOpacity);
  }
`;

// brazos orales: cintas fruncidas y retorcidas que cuelgan del centro
const ARM_LEN = 3.6;
const armVertex = /* glsl */`
  uniform float uTime;
  uniform float uSeed;
  varying float vV;
  varying float vU;
  void main() {
    vec3 p = position;
    float v = clamp(-p.y / ${ARM_LEN.toFixed(1)}, 0.0, 1.0);   // 0 arriba, 1 en la punta
    float frill = sin(v * 26.0 + uTime * 1.4 + uSeed * 7.0);
    p.x *= 1.0 + 0.9 * frill * v;                              // borde fruncido
    float tw = v * 3.2 + sin(uTime * 0.5 + uSeed * 3.0) * 0.6;   // se retuerce a lo largo
    p.xz = mat2(cos(tw), -sin(tw), sin(tw), cos(tw)) * p.xz;
    p.x += sin(uTime * 1.1 + v * 4.5 + uSeed * 9.0) * 0.35 * v;
    p.z += cos(uTime * 0.8 + v * 3.5 + uSeed * 5.0) * 0.3 * v;
    vV = v;
    vU = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const armFragment = /* glsl */`
  uniform vec3 uColor;
  uniform vec3 uRim;
  uniform float uOpacity;
  varying float vV;
  varying float vU;
  void main() {
    float edge = clamp(abs(vU - 0.5) * 2.0, 0.0, 1.0);
    edge = edge * edge * edge;
    float a = (0.12 + 0.75 * edge) * (1.0 - vV * 0.8);
    vec3 col = mix(uColor, uRim, edge * 0.7);
    gl_FragColor = vec4(col * 1.4 * a, uOpacity);
  }
`;

const TENTACLES = 24;
const SEGMENTS = 26;
const ARMS = 4;
// [campana, borde/gónadas]
const PALETTE = [
  ['#5ff6ff', '#c48bff'],
  ['#7d9bff', '#ff9ad5'],
  ['#e0b45a', '#ffe2b0'],
  ['#9ffcd9', '#6fd0ff'],
];

/** Perfil de la campana: domo achatado con el borde levemente acampanado. */
function makeBellGeometry() {
  const pts = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * Math.PI * 0.5;
    const r = Math.sin(a) * (1 + 0.08 * Math.pow(t, 6));
    const y = Math.cos(a) * 0.78 - 0.08 * Math.pow(t, 8);
    pts.push(new Vector2(Math.max(r, 0.001), y));
  }
  return new LatheGeometry(pts, 56);
}

function Jelly({ seed, x, z, depthM, scale, color, rim, tilt }) {
  const group = useRef();
  const lineMat = useRef();
  const bellGeo = useMemo(makeBellGeometry, []);
  const armGeo = useMemo(() => new PlaneGeometry(0.38, ARM_LEN, 2, 40).translate(0, -ARM_LEN / 2, 0), []);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uSeed: { value: seed },
    uColor: { value: new Color(color) }, uRim: { value: new Color(rim) }, uOpacity: { value: 0 },
  }), [seed, color, rim]);
  // materiales creados aquí (no como JSX) para que compartan el MISMO objeto de uniforms:
  // así basta con actualizar `uniforms` en cada cuadro
  const mats = useMemo(() => {
    const common = { uniforms, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide };
    return {
      bell: new ShaderMaterial({ ...common, vertexShader: bellVertex, fragmentShader: bellFragment }),
      arm: new ShaderMaterial({ ...common, vertexShader: armVertex, fragmentShader: armFragment }),
    };
  }, [uniforms]);
  useEffect(() => () => { mats.bell.dispose(); mats.arm.dispose(); }, [mats]);

  // tentáculos: largo, punto de anclaje en el borde y brillo que se apaga hacia la punta
  const tent = useMemo(() => {
    const items = Array.from({ length: TENTACLES }, (_, i) => ({
      ang: (i / TENTACLES) * Math.PI * 2 + (Math.random() - 0.5) * 0.12,
      len: 3 + Math.random() * 6,
      ph: Math.random() * 6.283,
    }));
    const g = new BufferGeometry();
    const n = TENTACLES * (SEGMENTS - 1) * 2;
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    const col = new Float32Array(n * 3);
    const c = new Color(color).lerp(new Color(rim), 0.3);
    let k = 0;
    for (let i = 0; i < TENTACLES; i++) {
      for (let s = 1; s < SEGMENTS; s++) {
        for (const v of [(s - 1) / SEGMENTS, s / SEGMENTS]) {
          const f = Math.pow(1 - v, 1.3) * 0.9;
          col[k++] = c.r * f; col[k++] = c.g * f; col[k++] = c.b * f;
        }
      }
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    return { items, geometry: g };
  }, [color, rim]);

  const baseY = mToY(depthM);

  useFrame((state) => {
    const t = state.clock.elapsedTime * MOTION;
    const fade = smoothstep(0.55, 0.75, depthState.smooth);
    uniforms.uTime.value = t;
    uniforms.uOpacity.value = 0.9 * fade;
    if (lineMat.current) lineMat.current.opacity = 0.75 * fade;
    if (!group.current) return;
    group.current.visible = fade > 0.001;
    if (!group.current.visible) return;
    group.current.position.set(
      x + Math.sin(t * 0.09 + seed * 9) * 3,
      baseY + Math.sin(t * 0.35 + seed * 5) * 1.6,
      z,
    );
    group.current.rotation.set(tilt[0] + Math.sin(t * 0.3 + seed * 4) * 0.08, t * 0.05 + seed * 6, tilt[1]);

    // tentáculos: cuelgan del borde, siguen el pulso con retraso y ondulan
    const ph = t * PULSE_SPEED + seed * 6.283;
    const arr = tent.geometry.attributes.position.array;
    let k = 0;
    for (const it of tent.items) {
      const ca = Math.cos(it.ang), sa = Math.sin(it.ang);
      let px = 0, py = 0, pz = 0;
      for (let s = 0; s < SEGMENTS; s++) {
        const v = s / SEGMENTS;
        const pulse = Math.sin(ph - v * 2.5);
        const r = 0.98 * (1 - 0.15 * Math.sin(ph) * (1 - v)) * (1 - v * 0.3);
        const sway = Math.sin(t * 1.1 + v * 7 + it.ph) * 0.4 * v + Math.sin(t * 0.4 + it.ph) * 0.7 * v * v;
        const swayZ = Math.cos(t * 0.9 + v * 6 + it.ph * 1.3) * 0.4 * v;
        const nx = ca * r + sway * -sa + swayZ * ca * 0.3;
        const nz = sa * r + sway * ca + swayZ * sa * 0.3;
        const ny = -0.06 - v * it.len * (1 - 0.06 * pulse);
        if (s > 0) {
          arr[k++] = px; arr[k++] = py; arr[k++] = pz;
          arr[k++] = nx; arr[k++] = ny; arr[k++] = nz;
        }
        px = nx; py = ny; pz = nz;
      }
    }
    tent.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={group} scale={scale}>
      <mesh geometry={bellGeo} material={mats.bell}/>
      {Array.from({ length: ARMS }, (_, i) => (
        <mesh key={i} geometry={armGeo} material={mats.arm} position={[0, 0.15, 0]} rotation={[0, (i / ARMS) * Math.PI + 0.3, 0]}/>
      ))}
      <lineSegments geometry={tent.geometry} frustumCulled={false}>
        <lineBasicMaterial ref={lineMat} vertexColors transparent opacity={0} blending={AdditiveBlending} depthWrite={false}/>
      </lineSegments>
    </group>
  );
}

export function Jellyfish({ count = 9 }) {
  const jellies = useMemo(() => Array.from({ length: count }, (_, i) => {
    const [color, rim] = PALETTE[i % PALETTE.length];
    return {
      seed: Math.random(),
      x: (i % 2 ? 1 : -1) * (14 + Math.random() * 16),
      z: -14 - Math.random() * 40,
      depthM: 72 + (i / count) * 26 + Math.random() * 3,
      scale: 0.9 + Math.random() * 1.4,
      color, rim,
      tilt: [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5],
    };
  }), [count]);
  return jellies.map((j, i) => <Jelly key={i} {...j}/>);
}
