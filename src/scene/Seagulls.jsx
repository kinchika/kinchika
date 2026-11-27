/*
 * Gaviotas sobre el atardecer de la portada.
 *
 * Se dibujan directamente en la pantalla (no dependen de la cámara 3D, que sigue al
 * mouse) y se ubican en coordenadas del video del cielo (u: 0..1 a lo ancho,
 * v: 0..1 de arriba abajo): suben con el cielo al hacer scroll.
 *
 * Cada gaviota vuela desde cerca hacia el horizonte con perspectiva: su distancia z
 * crece a ritmo constante y en pantalla todo se divide por z, así que al principio
 * se ve grande y rápida, y al alejarse se achica y se frena hasta perderse. Cuando
 * desaparece, otra entra por un costado. Cada una sigue un patrón distinto:
 * recta, curva, círculos de planeo (térmica), ondulante, zigzag o ascenso,
 * y se ladea en los giros.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, ShaderMaterial } from 'three';
import { MOTION } from '../lib/depth.js';
import { skyRect, SKY_WATERLINE } from './SkyVideo.jsx';

/** Alto de referencia del video (px) para el que están pensados los tamaños. */
const REF_H = 735;
/** Distancia final: a esta distancia la gaviota mide 1/Z_END de su tamaño inicial. */
const Z_END = 16;
const PATTERNS = ['recta', 'curva', 'termica', 'ondulante', 'zigzag', 'ascenso'];

// ── silueta ─────────────────────────────────────────────────────────────────
// Envergadura 2 (x de −1 a 1). Cada vértice lleva a qué parte pertenece
// (0 cuerpo, 1 tramo interior del ala, 2 punta) y de qué lado (+1 / −1).
// El tramo interior se define desde el hombro y la punta desde el codo.
const BODY = [[0.0, -0.02], [0.07, 0.0], [0.05, 0.035], [0.0, 0.05], [-0.05, 0.035],
  [-0.07, 0.0], [-0.04, -0.1], [-0.07, -0.16], [0.07, -0.16], [0.04, -0.1]];
const INNER = [[0, 0.045], [0.4, 0.09], [0.42, -0.015], [0, -0.075]];
const OUTER = [[0, 0.09], [0.56, -0.01], [0.58, -0.05], [0.02, -0.02]];

function buildGeometry() {
  const pos = [];
  const part = [];
  const side = [];
  const fan = (pts, p, sd) => {
    for (let i = 1; i < pts.length - 1; i++) {
      for (const q of [pts[0], pts[i], pts[i + 1]]) {
        pos.push(q[0], q[1], 0);
        part.push(p);
        side.push(sd);
      }
    }
  };
  fan(BODY, 0, 1);
  for (const sd of [1, -1]) {
    fan(INNER, 1, sd);
    fan(OUTER, 2, sd);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aPart', new Float32BufferAttribute(part, 1));
  g.setAttribute('aSide', new Float32BufferAttribute(side, 1));
  return g;
}

const vertex = /* glsl */`
  uniform vec2 uScreen;   // px
  uniform vec2 uCenter;   // px, desde arriba a la izquierda
  uniform float uScale;   // px por unidad (media envergadura)
  uniform float uRoll;
  uniform float uInner;
  uniform float uOuter;
  attribute float aPart;
  attribute float aSide;
  vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
  void main() {
    vec2 p = position.xy;
    vec2 shoulder = vec2(0.05, 0.01);
    vec2 elbow = vec2(0.41, 0.035);        // desde el hombro
    if (aPart > 1.5) {
      p = rot(rot(p, uOuter) + elbow, uInner) + shoulder;
    } else if (aPart > 0.5) {
      p = rot(p, uInner) + shoulder;
    }
    p.x *= aSide;                          // ala izquierda: reflejo de la derecha
    p = rot(p, uRoll);
    vec2 px = uCenter + vec2(p.x, -p.y) * uScale;
    // justo delante del video del cielo: el barco y lo demás quedan por delante
    gl_Position = vec4(px.x / uScreen.x * 2.0 - 1.0, 1.0 - px.y / uScreen.y * 2.0, 0.9998, 1.0);
  }
`;

const fragment = /* glsl */`
  uniform vec3 uColor;
  uniform float uAlpha;
  void main() { gl_FragColor = vec4(uColor, uAlpha); }
`;

const rand = (a, b) => a + Math.random() * (b - a);

/** Nueva gaviota: entra por un costado, cerca, y elige el punto del horizonte al que se aleja. */
function spawn(b, patternIndex, startZ = 1) {
  const left = Math.random() < 0.5;
  b.pattern = PATTERNS[patternIndex % PATTERNS.length];
  b.u0 = left ? rand(-0.02, 0.22) : rand(0.78, 1.02);
  b.v0 = rand(0.1, 0.3);
  b.uv = rand(0.3, 0.7);              // punto de fuga en el horizonte
  b.vv = rand(0.44, 0.49);
  b.span = rand(80, 115);             // envergadura inicial (px, en el alto de referencia)
  b.zSpeed = (Z_END - 1) / rand(30, 46);
  b.z = startZ;
  b.t = (startZ - 1) / b.zSpeed;
  b.amp = rand(0.6, 1.2) * (left ? 1 : -1);
  b.freq = rand(0.6, 1.1);
  b.phase = rand(0, Math.PI * 2);
  b.flapLeft = rand(0.5, 3);
  b.flapping = false;
  b.flapT = 0;
  b.flaps = 0;
  b.flapAmp = 0;
  b.wait = 0;
  b.lastX = null;
  b.roll = 0;
}

/** Desvío lateral del patrón, en unidades del video, antes de dividir por la distancia. */
function lateral(b) {
  const s = (b.z - 1) / (Z_END - 1);
  const t = b.t;
  switch (b.pattern) {
    case 'curva': return [b.amp * 0.55 * s * s, -0.06 * s];
    case 'termica': return [0.22 * Math.cos(t * b.freq + b.phase) - 0.22 * Math.cos(b.phase),
      0.08 * Math.sin(t * b.freq + b.phase) - 0.08 * Math.sin(b.phase)];
    case 'ondulante': return [0.16 * Math.sin(t * b.freq * 0.8 + b.phase) - 0.16 * Math.sin(b.phase),
      0.025 * Math.sin(t * b.freq * 1.6)];
    case 'zigzag': {
      // onda triangular suavizada: tramos rectos con giros marcados
      const w = (2 / Math.PI) * Math.asin(Math.sin(t * b.freq * 0.9 + b.phase));
      return [0.13 * (w - (2 / Math.PI) * Math.asin(Math.sin(b.phase))), 0];
    }
    case 'ascenso': return [b.amp * 0.12 * s, -0.22 * s * (2 - s)];
    default: return [0.015 * Math.sin(t * 0.5 + b.phase), 0];
  }
}

export function Seagulls({ mobile = false }) {
  const count = mobile ? 3 : 6;
  const geometry = useMemo(buildGeometry, []);
  const birds = useMemo(() => Array.from({ length: count }, (_, i) => {
    const b = {};
    // al cargar ya hay gaviotas a distintas distancias
    spawn(b, i, 1 + (i / count) * 8);
    b.next = i + count;
    return b;
  }), [count]);
  const materials = useMemo(() => birds.map(() => new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uScreen: { value: [1, 1] }, uCenter: { value: [0, 0] }, uScale: { value: 1 },
      uRoll: { value: 0 }, uInner: { value: 0 }, uOuter: { value: 0 },
      uColor: { value: new Color('#1f1a22') }, uAlpha: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,               // el ala reflejada invierte el orden de los vértices
  })), [birds]);
  const meshes = useRef([]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1) * MOTION;
    const { width, height } = state.size;
    const r = skyRect(width, height);
    const waterY = r.top + r.h * SKY_WATERLINE;
    const k = r.h / REF_H;

    birds.forEach((b, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      if (b.wait > 0) {                       // pausa antes de que entre la siguiente
        b.wait -= dt;
        mesh.visible = false;
        if (b.wait <= 0) spawn(b, b.next++);
        return;
      }
      b.t += dt;
      b.z += b.zSpeed * dt;
      if (b.z >= Z_END) { b.wait = rand(1, 6); mesh.visible = false; return; }

      // posición: del punto de entrada al de fuga, todo dividido por la distancia
      const [lu, lv] = lateral(b);
      const u = b.uv + (b.u0 - b.uv + lu) / b.z;
      const v = b.vv + (b.v0 - b.vv + lv) / b.z;
      const px = r.x + u * r.w;
      const py = r.top + v * r.h;
      const size = (b.span * k) / b.z / 2;

      // ladeo según hacia dónde se desplaza en pantalla (en relación a su tamaño)
      if (b.lastX !== null && dt > 0) {
        const vx = (px - b.lastX) / dt / Math.max(size, 1);
        b.roll += (Math.max(-0.5, Math.min(0.5, -vx * 0.35)) - b.roll) * Math.min(1, dt * 2);
      }
      b.lastX = px;

      // planeo con alas en M y, de vez en cuando, 2 a 4 aletazos
      b.flapLeft -= dt;
      if (!b.flapping && b.flapLeft <= 0) {
        b.flapping = true;
        b.flaps = 2 + Math.floor(Math.random() * 3);
        b.flapT = 0;
      }
      if (b.flapping) {
        b.flapAmp += (1 - b.flapAmp) * Math.min(1, dt * 6);
        b.flapT += dt * 2.8;
        if (b.flapT >= b.flaps) { b.flapping = false; b.flapLeft = rand(2.5, 7); }
      } else {
        b.flapAmp += (0 - b.flapAmp) * Math.min(1, dt * 4);
      }
      const flap = Math.sin(b.flapT * Math.PI * 2) * 0.62 * b.flapAmp;
      const glide = 0.16 + Math.sin(b.t * 0.9 + b.phase) * 0.04;

      // se desvanece en la bruma del horizonte; también al entrar
      const alpha = Math.min(1, b.t / 1.5) * (1 - Math.max(0, (b.z - Z_END * 0.7) / (Z_END * 0.3)));
      const visible = py > -size * 2 && py < waterY - size && r.top + r.h > 0 && alpha > 0.01;
      mesh.visible = visible;
      if (!visible) return;
      const un = materials[i].uniforms;
      un.uScreen.value = [width, height];
      un.uCenter.value = [px, py];
      un.uScale.value = size;
      un.uRoll.value = b.roll;
      un.uInner.value = glide + flap;
      un.uOuter.value = -0.38 - flap * 0.55 + Math.sin(b.flapT * Math.PI * 2 - 0.9) * 0.25 * b.flapAmp;
      un.uAlpha.value = alpha;
    });
  });

  return (
    <group>
      {birds.map((b, i) => (
        <mesh
          key={i}
          ref={(m) => { meshes.current[i] = m; }}
          geometry={geometry}
          material={materials[i]}
          frustumCulled={false}
          renderOrder={1000}
          visible={false}
        />
      ))}
    </group>
  );
}
