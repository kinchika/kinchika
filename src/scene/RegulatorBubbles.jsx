/*
 * Burbujas del regulador: el buzo exhala cada ~4,5 s y suelta un grupo de
 * burbujas que suben oscilando, crecen (baja la presión) y las grandes se
 * aplanan como un hongo. Suben en el mundo, aunque el buzo siga bajando.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Matrix4, Quaternion, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import { depthState, MOTION } from '../lib/depth.js';
import { sunlight } from './palette.js';

const POOL = 72;
const BREATH = 4.6;        // segundos entre exhalaciones
const EXHALE = 0.9;        // duración de la exhalación
const RATE = 24;           // burbujas por segundo mientras exhala
const RISE = 24;           // altura (unidades) que alcanzan antes de desaparecer

const vertex = /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const fragment = /* glsl */`
  uniform vec3 uTint;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 n = normalize(vN);
    float ndv = clamp(abs(dot(n, normalize(vV))), 0.0, 1.0);
    float rim = pow(1.0 - ndv, 2.2);                       // borde plateado de la burbuja
    float spec = pow(max(dot(n, normalize(vec3(-0.35, 0.7, 0.6))), 0.0), 28.0);
    vec3 col = mix(uTint, vec3(1.0), 0.55 * rim) + spec;
    float a = clamp(0.06 + 0.8 * rim + spec, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`;

/**
 * @param {object} props
 * @param {() => (import('three').Vector3|null)} props.getSource  posición del regulador (mundo)
 */
export function RegulatorBubbles({ getSource }) {
  const mesh = useRef();
  const { geometry, material, items } = useMemo(() => ({
    geometry: new SphereGeometry(1, 14, 10),
    material: new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTint: { value: new Color('#bfe8f5') }, uOpacity: { value: 1 } },
      transparent: true,
      depthWrite: false,
    }),
    items: Array.from({ length: POOL }, () => ({
      alive: false, pos: new Vector3(), y0: 0, speed: 0, size: 0, phase: 0, wob: 0, age: 0,
    })),
  }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const tmp = useMemo(() => ({
    m: new Matrix4(), q: new Quaternion(), s: new Vector3(), p: new Vector3(), emit: 0, next: 0,
  }), []);

  useFrame((state, rawDt) => {
    if (!mesh.current) return;
    const dt = Math.min(rawDt, 0.1) * MOTION;
    const t = state.clock.elapsedTime * MOTION;
    material.uniforms.uOpacity.value = 0.35 + 0.65 * sunlight(depthState.smooth);

    // exhalación: emite durante EXHALE segundos al inicio de cada ciclo
    const src = getSource();
    const phase = t % BREATH;
    if (src && phase < EXHALE) {
      tmp.emit += RATE * dt;
      while (tmp.emit >= 1) {
        tmp.emit -= 1;
        const b = items[tmp.next];
        tmp.next = (tmp.next + 1) % POOL;
        b.alive = true;
        b.pos.copy(src).add(tmp.p.set((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3));
        b.y0 = b.pos.y;
        b.speed = 1.6 + Math.random() * 1.2;
        // al comienzo de la exhalación salen las más grandes
        b.size = (phase < 0.2 ? 0.12 : 0.04) + Math.random() * (phase < 0.2 ? 0.1 : 0.07);
        b.phase = Math.random() * 6.283;
        b.wob = 0.06 + Math.random() * 0.12;
        b.age = 0;
      }
    } else {
      tmp.emit = 0;
    }

    for (let i = 0; i < POOL; i++) {
      const b = items[i];
      if (b.alive) {
        b.age += dt;
        b.pos.y += b.speed * dt * (1 + b.age * 0.25);       // aceleran un poco al subir
        b.pos.x += Math.sin(t * 6 + b.phase) * b.wob * dt;
        b.pos.z += Math.cos(t * 5 + b.phase) * b.wob * dt;
        if (b.pos.y - b.y0 > RISE || b.age > 10) b.alive = false;
      }
      if (b.alive) {
        const risen = b.pos.y - b.y0;
        const r = b.size * (1 + risen * 0.035);              // crecen al bajar la presión
        const flat = r > 0.18 ? 0.7 : 1;                    // las grandes se aplanan
        tmp.s.set(r, r * flat, r);
      } else {
        tmp.s.set(0, 0, 0);
      }
      tmp.m.compose(b.pos, tmp.q, tmp.s);
      mesh.current.setMatrixAt(i, tmp.m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, POOL]} frustumCulled={false} renderOrder={5}/>;
}
