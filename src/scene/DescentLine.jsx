/*
 * El barco de apoyo y su cabo con marcas cada 10 m: la referencia del descenso.
 * El barco flota sobre la línea de flotación de la portada (ver SkyVideo) y el cabo
 * cuelga de su popa hasta el lastre del fondo.
 *
 * El cabo se dibuja en una columna fija de la pantalla (el carril libre a la
 * derecha del texto): se ve recto aunque la cámara mire hacia arriba y no se
 * mueve con el vaivén de la cámara.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute, BufferGeometry, CanvasTexture, DoubleSide, Euler, Quaternion, SRGBColorSpace, Vector3,
} from 'three';
import { Boat, BOAT_ATTACH, BOAT_LENGTH, boatUniforms } from './Boat.jsx';
import { boatLengthPx, boatTuning } from '../lib/boatTuning.js';
import { MAX_DEPTH_M, MOTION } from '../lib/depth.js';
import { mToY, SURFACE_Y } from './palette.js';
import { waterlineScreenY } from './SkyVideo.jsx';
import { laneNdcX, worldXForScreen } from '../lib/layout.js';

/** Posición del cabo dentro del carril (0 = junto al texto, 1 = borde de la pantalla). */
const LANE_POS = 0.8;
// sin carril (celular): x del mundo deseada, limitada para que se vea
const X = 16;
const Z = -22;
const ROPE_SAMPLES = 48;
const ROPE_HALF_W = 0.05;

function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.font = '500 44px "JetBrains Mono", ui-monospace, monospace';
  g.textBaseline = 'middle';
  g.textAlign = 'right';
  g.fillStyle = 'rgba(201,168,76,0.9)';
  g.fillText(text, 244, 48);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Cinta delgada (2 vértices por muestra) que se reescribe cada cuadro. */
function makeRopeGeometry() {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(ROPE_SAMPLES * 2 * 3), 3));
  const nor = new Float32Array(ROPE_SAMPLES * 2 * 3);
  for (let i = 0; i < ROPE_SAMPLES * 2; i++) nor[i * 3 + 2] = 1;
  g.setAttribute('normal', new BufferAttribute(nor, 3));
  const idx = [];
  for (let i = 0; i < ROPE_SAMPLES - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  g.setIndex(idx);
  return g;
}

export function DescentLine() {
  const bottomY = mToY(MAX_DEPTH_M) - 6;
  const boat = useRef();
  const rope = useRef();
  const flag = useRef();
  const markRefs = useRef([]);
  const weight = useRef();
  const tmp = useMemo(() => ({
    a: new Vector3(), b: new Vector3(), v: new Vector3(), y: SURFACE_Y,
    attach: new Vector3(), q: new Quaternion(), e: new Euler(),
  }), []);
  const marks = useMemo(() => Array.from({ length: MAX_DEPTH_M / 10 }, (_, i) => {
    const m = (i + 1) * 10;
    return { m, y: mToY(m), tex: makeLabel(`−${m} M`) };
  }), []);
  const ropeGeo = useMemo(makeRopeGeometry, []);
  useEffect(() => () => {
    marks.forEach((mk) => mk.tex.dispose()); ropeGeo.dispose();
  }, [marks, ropeGeo]);

  useFrame((state) => {
    const cam = state.camera;
    const { width, height } = state.size;
    cam.updateMatrixWorld();
    const { a, b, v } = tmp;

    // columna de pantalla del cabo: en el carril libre, o (celular) cerca del borde derecho
    const halfW = Math.tan((cam.fov * Math.PI) / 360) * (cam.position.z - Z) * cam.aspect;
    const lane = laneNdcX(LANE_POS);
    const ndcX = lane != null ? lane : Math.min(X / halfW, 0.72);
    const xAt = (y) => worldXForScreen(cam, y, Z, ndcX, a, b);

    // el barco flota sobre la línea de flotación de la portada
    const ndcY = 1 - (2 * waterlineScreenY(width, height)) / height;
    v.set(ndcX, ndcY, 0.5).unproject(cam).sub(cam.position);
    if (Math.abs(v.z) > 1e-6) {
      const k = (Z - cam.position.z) / v.z;
      if (k > 0 && Number.isFinite(k)) tmp.y = cam.position.y + v.y * k;
    }
    const t = state.clock.elapsedTime * MOTION;
    const tune = boatTuning;
    const bob = Math.sin(t * 1.1) * 0.06;            // vaivén suave
    const waterY = tmp.y + bob;
    boatUniforms.uWaterY.value = tmp.y;

    // tamaño en pantalla: proporcional al buzo (ver boatTuning)
    const unitsPerPx = (2 * halfW) / width;
    const lengthPx = boatLengthPx(cam, width, height);
    const s = (lengthPx * unitsPerPx) / BOAT_LENGTH;

    // la popa (punto de amarre) queda justo sobre la columna del cabo
    let topY = waterY;
    if (boat.current) {
      const g = boat.current;
      const { attach, q, e } = tmp;
      // de costado y derecho: si se gira, la perspectiva (cámara mirando hacia arriba)
      // lo hace ver inclinado. La borda del modelo sube ~2,4° hacia la proa: el
      // cabeceo (pitch) la compensa en parte para que la cubierta se lea horizontal.
      const DEG = Math.PI / 180;
      e.set(
        tune.roll * DEG + Math.sin(t * 0.8) * 0.004,
        tune.yaw * DEG,
        tune.pitch * DEG + Math.sin(t * 0.95 + 1) * 0.003,
      );
      q.setFromEuler(e);
      attach.set(BOAT_ATTACH[0], BOAT_ATTACH[1], BOAT_ATTACH[2]).multiplyScalar(s).applyQuaternion(q);
      const lift = tune.offsetY * unitsPerPx;
      topY = waterY + lift + attach.y;
      const ax = xAt(topY) ?? 0;
      g.quaternion.copy(q);
      g.scale.setScalar(s);
      g.position.set(ax - attach.x + tune.offsetX * unitsPerPx, waterY + lift, Z - attach.z);
      g.visible = cam.position.y > SURFACE_Y - 90;   // en lo profundo no se ve: no se dibuja
    }
    if (flag.current) flag.current.rotation.y = -0.5 + Math.sin(t * 2.1) * 0.15;

    // cabo: solo el tramo cercano a la cámara (el resto no se ve)
    const y0 = Math.min(topY, cam.position.y + 60);
    const y1 = Math.max(bottomY, cam.position.y - 45);
    const pos = ropeGeo.attributes.position.array;
    let ok = y0 > y1;
    if (ok) {
      for (let i = 0; i < ROPE_SAMPLES; i++) {
        const y = y0 + ((y1 - y0) * i) / (ROPE_SAMPLES - 1);
        const x = xAt(y);
        if (x == null) { ok = false; break; }
        const j = i * 6;
        pos[j] = x - ROPE_HALF_W; pos[j + 1] = y; pos[j + 2] = Z;
        pos[j + 3] = x + ROPE_HALF_W; pos[j + 4] = y; pos[j + 5] = Z;
      }
    }
    if (rope.current) rope.current.visible = ok;
    if (ok) {
      ropeGeo.attributes.position.needsUpdate = true;
      ropeGeo.computeBoundingSphere();
    }

    // marcas de profundidad y lastre sobre la misma columna
    marks.forEach((mk, i) => {
      const g = markRefs.current[i];
      if (!g) return;
      const x = Math.abs(mk.y - cam.position.y) < 60 ? xAt(mk.y) : null;
      g.visible = x != null && mk.y < topY;
      if (x != null) g.position.x = x;
    });
    if (weight.current) {
      const x = Math.abs(bottomY - cam.position.y) < 60 ? xAt(bottomY) : null;
      weight.current.visible = x != null;
      if (x != null) weight.current.position.x = x;
    }
  });

  return (
    <group>
      {/* barco de apoyo en superficie, con bandera de buceo */}
      <Boat ref={boat} flagRef={flag}/>
      {/* cabo: una cinta delgada que se ve recta en pantalla */}
      <mesh ref={rope} geometry={ropeGeo} frustumCulled={false}>
        <meshStandardMaterial color="#d8c69a" emissive="#2c2412" roughness={0.9} side={DoubleSide}/>
      </mesh>
      {/* marcas de profundidad */}
      {marks.map((mk, i) => (
        <group key={mk.m} ref={(el) => { markRefs.current[i] = el; }} position={[0, mk.y, Z]}>
          <mesh>
            <cylinderGeometry args={[0.14, 0.14, 0.5, 10]}/>
            <meshStandardMaterial color="#c9a84c" emissive="#5a4313" metalness={0.4} roughness={0.4}/>
          </mesh>
          {/* etiqueta a la izquierda: el cabo va cerca del borde derecho de la pantalla */}
          <sprite position={[-1.5, 0, 0]} scale={[2.4, 0.9, 1]}>
            <spriteMaterial map={mk.tex} transparent depthWrite={false} fog={false}/>
          </sprite>
        </group>
      ))}
      {/* lastre al final del cabo */}
      <mesh ref={weight} position={[0, bottomY, Z]}>
        <cylinderGeometry args={[0.6, 0.6, 0.7, 16]}/>
        <meshStandardMaterial color="#20262c" metalness={0.7} roughness={0.4} emissive="#05080a"/>
      </mesh>
    </group>
  );
}
