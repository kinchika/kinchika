/*
 * Gaviotas sobre el atardecer de la portada.
 *
 * El cielo es un video (SkyVideo) que sube con el scroll, así que cada gaviota se
 * ubica en coordenadas del video (u: 0..1 a lo ancho, v: 0..1 de arriba abajo) y
 * cada cuadro se proyecta a un punto frente a la cámara: sube con el cielo y se va
 * con él. Son siluetas a contraluz, como se ven contra un atardecer.
 *
 * Vuelo: planean casi todo el tiempo con las alas en "M" (codo arriba, punta abajo)
 * y de vez en cuando dan unos aletazos.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, MathUtils, MeshBasicMaterial, Vector3 } from 'three';
import { MOTION } from '../lib/depth.js';
import { skyRect, SKY_WATERLINE } from './SkyVideo.jsx';

/** Distancia (unidades) a la que se dibujan frente a la cámara: delante del video. */
const DIST = 18;
/** Alto de referencia del video (px) para el que están pensados los tamaños. */
const REF_H = 735;

// u, v: posición en el video · span: envergadura en px · speed: u por segundo
// (v desde 0,14: más arriba el cielo es oscuro y queda bajo el menú)
const FLOCK = [
  { u: 0.08, v: 0.19, span: 54, speed: 0.012, dir: 1, seed: 0.1 },
  { u: 0.17, v: 0.24, span: 40, speed: 0.011, dir: 1, seed: 0.7 },
  { u: 0.52, v: 0.15, span: 30, speed: 0.008, dir: -1, seed: 0.35 },
  { u: 0.63, v: 0.18, span: 24, speed: 0.007, dir: -1, seed: 0.9 },
  { u: 0.86, v: 0.26, span: 36, speed: 0.010, dir: -1, seed: 0.55 },
  { u: 0.33, v: 0.14, span: 20, speed: 0.006, dir: 1, seed: 0.2 },
  { u: 0.74, v: 0.32, span: 46, speed: 0.013, dir: 1, seed: 0.8 },
];

/** Polígono plano (x, y) a triángulos en abanico. */
function shape(points) {
  const pos = [];
  for (let i = 1; i < points.length - 1; i++) {
    pos.push(...points[0], 0, ...points[i], 0, ...points[i + 1], 0);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

// silueta con envergadura 2 (x de −1 a 1); el ala derecha y se refleja para la izquierda
const BODY = shape([[0.0, -0.02], [0.07, 0.0], [0.05, 0.035], [0.0, 0.05], [-0.05, 0.035],
  [-0.07, 0.0], [-0.04, -0.1], [-0.07, -0.16], [0.07, -0.16], [0.04, -0.1]]);
// tramo interior: del hombro (origen) al codo, con la cara de ataque arriba
const INNER = shape([[0, 0.045], [0.4, 0.09], [0.42, -0.015], [0, -0.075]]);
// tramo exterior: del codo (origen) a la punta, afilado
const OUTER = shape([[0, 0.09], [0.56, -0.01], [0.58, -0.05], [0.02, -0.02]]);

export function Seagulls({ mobile = false }) {
  const birds = useMemo(() => (mobile ? FLOCK.slice(0, 4) : FLOCK).map((b) => ({
    ...b,
    phase: b.seed * 10,
    // planeo/aleteo: tiempo restante del estado actual y cuántos aletazos quedan
    gliding: true,
    left: 1.5 + b.seed * 4,
    flaps: 0,
    flapT: 0,
    amp: 0,
  })), [mobile]);
  const refs = useRef([]);
  const material = useMemo(() => new MeshBasicMaterial({ color: '#1f1a22', side: DoubleSide, fog: false }), []);
  const tmp = useMemo(() => ({ v: new Vector3() }), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1) * MOTION;
    const { camera, size } = state;
    const r = skyRect(size.width, size.height);
    const skyVisible = r.top + r.h * SKY_WATERLINE > 0;
    const pxToWorld = (2 * DIST * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / size.height;
    const t = state.clock.elapsedTime * MOTION;

    birds.forEach((b, i) => {
      const g = refs.current[i];
      if (!g) return;
      // avance horizontal con vuelta por el otro lado
      b.u += b.dir * b.speed * dt;
      if (b.u > 1.1) b.u = -0.1;
      if (b.u < -0.1) b.u = 1.1;

      // máquina de estados: planear ↔ aletear
      b.left -= dt;
      if (b.gliding && b.left <= 0) {
        b.gliding = false;
        b.flaps = 2 + Math.floor(Math.random() * 3);
        b.flapT = 0;
      }
      let wing;
      if (b.gliding) {
        b.amp += (0 - b.amp) * Math.min(1, dt * 4);
        wing = 0.16 + Math.sin(t * 0.9 + b.phase) * 0.04;
      } else {
        b.amp += (1 - b.amp) * Math.min(1, dt * 6);
        b.flapT += dt * (2.6 + b.seed * 0.8);
        if (b.flapT >= b.flaps) {
          b.gliding = true;
          b.left = 2.5 + Math.random() * 4;
        }
        wing = 0.16;
      }
      const flap = Math.sin(b.flapT * Math.PI * 2) * 0.62 * b.amp;

      // posición: coordenadas del video → pantalla → punto frente a la cámara
      const bob = Math.sin(t * 0.35 + b.phase) * 0.012 + Math.sin(t * 0.13 + b.phase * 2) * 0.008;
      const px = r.x + b.u * r.w;
      const py = r.top + (b.v + bob) * r.h;
      const visible = skyVisible && py > -40 && py < r.top + r.h * SKY_WATERLINE - 10;
      g.visible = visible;
      if (!visible) return;
      tmp.v.set((px / size.width) * 2 - 1, -(py / size.height) * 2 + 1, 0.5).unproject(camera);
      tmp.v.sub(camera.position).normalize().multiplyScalar(DIST).add(camera.position);
      g.position.copy(tmp.v);
      g.quaternion.copy(camera.quaternion);
      // ladeo suave según la ondulación y un poco hacia donde vuela
      g.rotateZ(Math.cos(t * 0.35 + b.phase) * 0.08 * b.dir);
      const s = ((b.span * r.h) / REF_H) * pxToWorld * 0.5;
      g.scale.set(s * b.dir, s, s);

      // alas: el tramo interior sube y baja con el aletazo; la punta acompaña con retraso
      const [rIn, rOut, lIn, lOut] = g.userData.wings;
      const inner = wing + flap;
      const outer = -0.38 - flap * 0.55 + Math.sin(b.flapT * Math.PI * 2 - 0.9) * 0.25 * b.amp;
      rIn.rotation.z = inner;
      lIn.rotation.z = inner;
      rOut.rotation.z = outer;
      lOut.rotation.z = outer;
    });
  });

  return (
    <group>
      {birds.map((b, i) => (
        <group
          key={i}
          visible={false}
          ref={(g) => {
            refs.current[i] = g;
            if (g && !g.userData.wings) {
              const find = (n) => g.getObjectByName(n);
              g.userData.wings = [find('rIn'), find('rOut'), find('lIn'), find('lOut')];
            }
          }}
        >
          <mesh geometry={BODY} material={material}/>
          {/* ala derecha: hombro → codo → punta */}
          <group name="rIn" position={[0.05, 0.01, 0]}>
            <mesh geometry={INNER} material={material}/>
            <group name="rOut" position={[0.41, 0.035, 0]}>
              <mesh geometry={OUTER} material={material}/>
            </group>
          </group>
          {/* ala izquierda: reflejo de la derecha */}
          <group scale={[-1, 1, 1]}>
            <group name="lIn" position={[0.05, 0.01, 0]}>
              <mesh geometry={INNER} material={material}/>
              <group name="lOut" position={[0.41, 0.035, 0]}>
                <mesh geometry={OUTER} material={material}/>
              </group>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}
