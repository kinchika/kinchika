/* Geometría de pez procedural (mirando a +X, largo 1) y carga opcional desde .glb */
import { Box3, Shape, ShapeGeometry, SphereGeometry, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function finGeometry(points) {
  const s = new Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();
  return new ShapeGeometry(s);
}

/**
 * Pez fusiforme tipo jurel: cuerpo comprimido, pedúnculo delgado, cola en horquilla,
 * dos dorsales y anal. Mira a +X, largo ≈ 1, alto en Y, ancho en Z.
 */
export function makeFishGeometry({ height = 0.3, width = 0.12 } = {}) {
  const body = new SphereGeometry(0.5, 28, 16);
  body.scale(0.86, height, width);
  body.translate(0.04, 0, 0);
  const p = body.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // pedúnculo caudal delgado y hocico algo más puntiagudo
    const tail = 1 - 0.78 * smooth(0.0, -0.4, x);
    const nose = 1 - 0.25 * smooth(0.3, 0.47, x);
    // lomo más alto que el vientre
    const k = tail * nose * (y > 0 ? 1.06 : 0.94);
    p.setY(i, y * k);
    p.setZ(i, p.getZ(i) * tail * nose);
  }
  body.computeVertexNormals();

  const h = height;
  const parts = [
    body,
    // cola en horquilla
    finGeometry([[-0.36, 0.035], [-0.6, h * 0.95], [-0.53, h * 0.12], [-0.47, 0], [-0.53, -h * 0.12], [-0.6, -h * 0.95], [-0.36, -0.035]]),
    // primera dorsal (espinosa) y segunda dorsal (larga y baja)
    finGeometry([[0.16, h * 0.44], [0.08, h * 0.95], [0.0, h * 0.5]]),
    finGeometry([[-0.02, h * 0.46], [-0.08, h * 0.72], [-0.3, h * 0.2], [-0.3, h * 0.12]]),
    // anal
    finGeometry([[-0.04, -h * 0.4], [-0.1, -h * 0.62], [-0.3, -h * 0.16], [-0.3, -h * 0.1]]),
  ];
  // aletas pectorales, levemente abiertas
  const pect = finGeometry([[0.2, -0.01], [0.06, -h * 0.35], [0.12, -0.02]]);
  const pectL = pect.clone().rotateX(0.5).translate(0, 0, width * 0.42);
  const pectR = pect.clone().rotateX(-0.5).translate(0, 0, -width * 0.42);
  parts.push(pectL, pectR);
  pect.dispose();

  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  parts.forEach((g) => g.dispose());
  return merged;
}

const loader = new GLTFLoader();
const cache = new Map();

/**
 * Carga la primera malla de un .glb y la normaliza: centrada, largo 1 sobre el eje X.
 * Resuelve `null` si el archivo no existe o no es válido.
 */
export function loadFishGeometry(url) {
  if (!cache.has(url)) {
    cache.set(url, loader.loadAsync(url).then((gltf) => {
      let found = null;
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o) => { if (!found && o.isMesh) found = o; });
      if (!found) return null;
      const g = found.geometry.clone();
      g.applyMatrix4(found.matrixWorld);
      const box = new Box3().setFromBufferAttribute(g.attributes.position);
      const size = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());
      g.translate(-center.x, -center.y, -center.z);
      const len = Math.max(size.x, 1e-6);
      g.scale(1 / len, 1 / len, 1 / len);
      if (!g.attributes.normal) g.computeVertexNormals();
      const map = found.material?.map || null;
      return { geometry: g, map };
    }).catch(() => null));
  }
  return cache.get(url);
}

