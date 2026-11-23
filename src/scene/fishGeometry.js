/* Geometría de pez procedural (mirando a +X, largo 1) y carga opcional desde .glb */
import { Box3, Shape, ShapeGeometry, SphereGeometry, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function makeFishGeometry({ height = 0.3, width = 0.13 } = {}) {
  const body = new SphereGeometry(0.5, 20, 12);
  body.scale(1, height, width);
  // perfil más afilado hacia la cola
  const p = body.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    if (x < 0) {
      const k = 1 + x * 0.9; // x=-0.5 → 0.55
      p.setY(i, p.getY(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
  }
  body.computeVertexNormals();

  const tailShape = new Shape();
  tailShape.moveTo(-0.4, 0);
  tailShape.lineTo(-0.74, height * 0.78);
  tailShape.lineTo(-0.64, 0);
  tailShape.lineTo(-0.74, -height * 0.78);
  tailShape.closePath();
  const tail = new ShapeGeometry(tailShape);

  const finShape = new Shape();
  finShape.moveTo(0.05, height * 0.42);
  finShape.lineTo(-0.16, height * 0.85);
  finShape.lineTo(-0.2, height * 0.4);
  finShape.closePath();
  const fin = new ShapeGeometry(finShape);

  const merged = mergeGeometries([body.toNonIndexed(), tail.toNonIndexed(), fin.toNonIndexed()]);
  body.dispose(); tail.dispose(); fin.dispose();
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

