/*
 * Paredón rocoso de la costa central con huirales (bosque de algas pardas).
 * Da referencia de profundidad: la roca se pierde en la turbidez a medida que
 * bajas, con cáusticas de luz cerca de la superficie y algas que se mecen.
 */
import { useEffect, useMemo } from 'react';
import {
  BufferAttribute, Color, DoubleSide, InstancedBufferAttribute, Matrix4, MeshStandardMaterial,
  NoColorSpace, Object3D, PlaneGeometry, Quaternion, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm, ridged } from './noise.js';
import { mToY } from './palette.js';
import { withCaustics } from './caustics.js';

const TOP_Y = 14;          // borde superior del paredón (bajo la superficie)
const BOTTOM_Y = -470;     // bajo los 100 m

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Escalones de estratos: repisas horizontales con cara casi vertical, como roca sedimentaria. */
function strata(y, x) {
  const h = 15 + fbm(x * 0.02, 1.7, 2) * 8;              // alto de cada estrato (varía a lo largo)
  const v = (y + fbm(x * 0.025, y * 0.01 + 4.2, 3) * 14) / h;  // estratos inclinados y quebrados
  const f = v - Math.floor(v);
  // diente de sierra centrado en 0: cara inclinada y luego un salto (repisa)
  return smooth(0.55, 0.95, f) - f;
}

/**
 * Posición z de la superficie de la roca en (x, y).
 * A la izquierda el paredón se acerca; a la derecha se aleja y se pierde en el
 * azul, dejando agua abierta donde están el barco, el cabo y el buzo.
 */
function wallZ(x, y) {
  const depth = Math.max(0, -y);
  const near = x < 0 ? (x / 100) ** 2 * 34 : 0;  // la costa se acerca por la izquierda
  const recede = smooth(-20, 90, x) * 110 + Math.max(0, x - 90) * 0.55; // y se abre a mar abierto
  const slope = depth * 0.06;                    // más lejos a medida que baja
  const big = fbm(x * 0.011 + 3.1, y * 0.011, 3) * 16;
  // contrafuertes verticales y estratos: el paredón no es una pared lisa
  const ribs = ridged(x * 0.035 + 7.7, y * 0.008, 3) * 8;
  // repisas solo en algunas zonas (no un patrón parejo en todo el paredón)
  const ledges = strata(y, x) * 9 * smooth(-0.05, 0.35, fbm(x * 0.012 + 5.5, y * 0.008, 3));
  const rock = ridged(x * 0.045, y * 0.045, 4) * 9;
  const grit = ridged(x * 0.16 + 2.3, y * 0.16, 3) * 2.6;  // fracturas pequeñas
  return -78 + near - recede - slope + big + ribs + ledges + rock + grit;
}

// las cáusticas (luz de la superficie sobre la roca y las algas) están en caustics.js

// ─────────────── roca ───────────────

const ROCK_DARK = new Color('#171615');
const ROCK = new Color('#38322d');
const ROCK_LIGHT = new Color('#544a41');
const CORALLINE = new Color('#5c3c44');   // algas calcáreas rosadas de la roca chilena
const ALGAE = new Color('#323b1c');

/**
 * Borde superior del paredón (bajo la superficie): lomas redondeadas, como roca
 * gastada por el mar (sin agujas ni picos). Hacia la derecha la roca baja en una
 * ladera hasta el fondo, en vez de terminar en un corte vertical.
 */
const topAt = (x) => {
  const crest = fbm(x * 0.014, 9.1, 3) * 0.5 + 0.5;
  const mounds = fbm(x * 0.04 + 1.3, 3.3, 2);              // lomas suaves (−1..1)
  const wobble = fbm(x * 0.15, 6.6, 2) * 0.8;              // borde algo irregular, sin puntas
  const descend = smooth(35, 330, x) ** 1.4 * 230;         // ladera hacia el mar abierto
  return TOP_Y - 30 * crest + 7 * (mounds - 0.6) + wobble - descend;  // no asoma del agua
};

const X_MIN = -170;
const X_MAX = 380;   // más allá de lo que alcanza a ver la cámara: sin borde visible

function makeRockGeometry(mobile) {
  const width = X_MAX - X_MIN;
  const g = new PlaneGeometry(width, 1, mobile ? 150 : 320, mobile ? 170 : 300);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (X_MIN + X_MAX) / 2;
    // cada columna se estira desde el fondo hasta su propio borde superior:
    // así el borde queda definido por vértices, sin escalones de la malla
    const v = pos.getY(i) + 0.5;                     // 0 abajo, 1 arriba
    const top = topAt(x);
    const y = BOTTOM_Y + (top - BOTTOM_Y) * v ** 0.85;  // más filas cerca del borde
    pos.setXYZ(i, x, y, wallZ(x, y));
  }
  g.computeVertexNormals();

  const nor = g.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const depthM = -y / 4;
    // grietas oscuras y caras expuestas más claras
    const crack = ridged(x * 0.09 + 11, y * 0.09, 3);
    const tone = fbm(x * 0.03, y * 0.03 + 5, 3) * 0.5 + 0.5;
    c.copy(ROCK_DARK).lerp(ROCK, Math.min(1, crack * 1.6)).lerp(ROCK_LIGHT, tone * 0.45);
    // repisas (cara hacia arriba) con sedimento y algas
    const up = Math.max(0, nor.getY(i));
    if (depthM < 30) c.lerp(ALGAE, up * 0.7 * (1 - depthM / 30));
    // manchas de alga calcárea rosada entre 3 y 25 m
    const patch = fbm(x * 0.06 + 40, y * 0.06, 3);
    if (depthM > 3 && depthM < 25 && patch > 0.12) c.lerp(CORALLINE, Math.min(0.5, (patch - 0.12) * 2.5));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new BufferAttribute(colors, 3));
  return g;
}

// ─────────────── textura fotográfica de roca (Poly Haven, CC0) ───────────────
// Proyección triplanar en coordenadas de mundo: la roca no tiene UVs útiles
// (es un plano deformado), así que se muestrea la textura desde los tres ejes.

const ROCK_TEX = {
  diff: 'textures/rock_face/rock_face_diff_1k.jpg',
  nor: 'textures/rock_face/rock_face_nor_gl_1k.jpg',
};
// color promedio (lineal) de la textura: se divide por él para usarla solo como
// detalle, sin cambiar el tono de la roca que ya define el color de vértice
const ROCK_TEX_MEAN = '0.1213, 0.0616, 0.0318';

const rockTexGLSL = /* glsl */`
  uniform sampler2D uRockDiff;
  uniform sampler2D uRockNor;
  uniform float uRockOn;
  varying vec3 vWNorm;
  vec3 triSample(sampler2D t, vec3 p, vec3 bw) {
    return texture2D(t, p.zy).rgb * bw.x + texture2D(t, p.xz).rgb * bw.y + texture2D(t, p.xy).rgb * bw.z;
  }
`;

function withRockTexture(material, uniforms, mobile) {
  const base = material.onBeforeCompile;
  material.onBeforeCompile = (shader) => {
    base(shader);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWNorm;')
      .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
        vWNorm = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${rockTexGLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 rockWN = normalize(vWNorm);
        vec3 rockBW = pow(abs(rockWN), vec3(4.0));
        rockBW /= (rockBW.x + rockBW.y + rockBW.z);
        if (uRockOn > 0.5) {
          vec3 mean = vec3(${ROCK_TEX_MEAN});
          vec3 detail = triSample(uRockDiff, vWPos / 9.0, rockBW) / mean;
          ${mobile ? '' : 'detail *= mix(vec3(1.0), triSample(uRockDiff, vWPos / 37.0 + 0.37, rockBW) / mean, 0.5);'}
          diffuseColor.rgb *= clamp(mix(vec3(1.0), detail, 0.85), 0.0, 3.0);
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uRockOn > 0.5) {
          // mezcla "whiteout" de los tres mapas de normales, en espacio de mundo
          vec3 p = vWPos / 9.0;
          vec3 tx = texture2D(uRockNor, p.zy).xyz * 2.0 - 1.0;
          vec3 ty = texture2D(uRockNor, p.xz).xyz * 2.0 - 1.0;
          vec3 tz = texture2D(uRockNor, p.xy).xyz * 2.0 - 1.0;
          tx = vec3(tx.xy + rockWN.zy, abs(tx.z) * rockWN.x);
          ty = vec3(ty.xy + rockWN.xz, abs(ty.z) * rockWN.y);
          tz = vec3(tz.xy + rockWN.xy, abs(tz.z) * rockWN.z);
          vec3 nW = tx.zyx * rockBW.x + ty.xzy * rockBW.y + tz.xyz * rockBW.z;
          float len = length(nW);
          if (len > 1e-4) normal = normalize((viewMatrix * vec4(nW / len, 0.0)).xyz);
        }`);
  };
  // el shader cambia entre celular y escritorio: que three no reutilice el programa
  material.customProgramCacheKey = () => `kinchika-rock-${mobile ? 'm' : 'd'}`;
  return material;
}

function loadRockTextures(uniforms) {
  const loader = new TextureLoader();
  let pending = 2;
  const done = () => { if (--pending === 0) uniforms.uRockOn.value = 1; };
  const fail = (err) => console.warn('[kinchika] No se pudo cargar la textura de roca:', err);
  const setup = (t, colorSpace) => {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = colorSpace;
    t.anisotropy = 4;
    return t;
  };
  uniforms.uRockDiff.value = setup(loader.load(ROCK_TEX.diff, done, undefined, fail), SRGBColorSpace);
  uniforms.uRockNor.value = setup(loader.load(ROCK_TEX.nor, done, undefined, fail), NoColorSpace);
  return () => { uniforms.uRockDiff.value?.dispose(); uniforms.uRockNor.value?.dispose(); };
}

// ─────────────── huiro (Macrocystis / Lessonia) ───────────────

/** Estipe delgado con láminas alternadas a lo largo; base en y = 0. */
function makeKelpGeometry(H) {
  const parts = [];
  const stipe = new PlaneGeometry(0.22, H, 1, Math.round(H / 2));
  stipe.translate(0, H / 2, 0);
  parts.push(stipe);

  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Object3D();
  let side = 1;
  for (let y = 2.5; y < H - 1; y += 1.15 + Math.random() * 0.5) {
    const len = 1.6 + Math.random() * 1.4;
    const blade = new PlaneGeometry(0.5, len, 1, 4);
    // lámina angosta en las puntas
    const p = blade.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = p.getY(i) / len + 0.5;
      p.setX(i, p.getX(i) * (0.25 + Math.sin(Math.PI * v) * 0.9));
    }
    blade.translate(0, len / 2, 0);
    e.rotation.set(0, Math.random() * Math.PI, side * (0.35 + Math.random() * 0.4));
    e.updateMatrix();
    q.copy(e.quaternion);
    m.compose(new Vector3(0, y, 0), q, new Vector3(1, 1, 1));
    blade.applyMatrix4(m);
    parts.push(blade);
    side = -side;
  }
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  parts.forEach((g) => g.dispose());
  return merged;
}

function kelpMaterial(H) {
  const mat = new MeshStandardMaterial({
    color: new Color('#5a4a1e'),
    emissive: new Color('#140f04'),
    roughness: 0.75,
    metalness: 0,
    side: DoubleSide,
  });
  const base = withCaustics(mat).onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    base(shader, renderer);
    shader.uniforms.uKelpH = { value: H };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPhase;\nuniform float uKelpH;\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float h = clamp(transformed.y / uKelpH, 0.0, 1.0);
        float sway = h * h;
        transformed.x += sin(uTime * 0.55 + aPhase + transformed.y * 0.12) * sway * 2.4;
        transformed.z += cos(uTime * 0.42 + aPhase * 1.7 + transformed.y * 0.09) * sway * 1.3;`);
  };
  mat.customProgramCacheKey = () => `kinchika-kelp-${H}`;
  return mat;
}

function KelpGroup({ items, H }) {
  const geometry = useMemo(() => {
    const g = makeKelpGeometry(H);
    const phases = new Float32Array(items.length);
    items.forEach((it, i) => { phases[i] = it.phase; });
    g.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1));
    return g;
  }, [H, items]);
  const material = useMemo(() => kelpMaterial(H), [H]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const ref = (mesh) => {
    if (!mesh) return;
    const o = new Object3D();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.rotation.set(it.lean, it.rotY, 0);
      o.scale.setScalar(it.scale);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} frustumCulled={false}/>;
}

export function Reef({ mobile }) {
  const rockGeo = useMemo(() => makeRockGeometry(mobile), [mobile]);
  const rockUniforms = useMemo(() => ({
    uRockDiff: { value: null }, uRockNor: { value: null }, uRockOn: { value: 0 },
  }), []);
  useEffect(() => loadRockTextures(rockUniforms), [rockUniforms]);
  const rockMat = useMemo(() => withRockTexture(withCaustics(new MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0,
  })), rockUniforms, mobile), [rockUniforms, mobile]);
  useEffect(() => () => { rockGeo.dispose(); rockMat.dispose(); }, [rockGeo, rockMat]);

  // huirales: anclados a la roca entre 8 y 22 m, con la punta cerca de la superficie
  const kelp = useMemo(() => {
    const groups = { 40: [], 70: [] };
    const n = mobile ? 34 : 80;
    for (let i = 0; i < n; i++) {
      const x = -130 + Math.random() * 155;        // donde la roca está cerca
      const baseM = 8 + Math.random() * 14;
      const y = mToY(baseM);
      const tipM = 0.5 + Math.random() * 3;
      const length = (baseM - tipM) * 4;
      const H = length > 52 ? 70 : 40;
      groups[H].push({
        x, y, z: wallZ(x, y) + 0.6,
        lean: 0.12 + Math.random() * 0.2,          // se inclina hacia el agua abierta
        rotY: Math.random() * Math.PI,
        scale: length / H,
        phase: Math.random() * 6.283,
      });
    }
    return groups;
  }, [mobile]);

  return (
    <group>
      <mesh geometry={rockGeo} material={rockMat}/>
      <KelpGroup items={kelp[40]} H={40}/>
      <KelpGroup items={kelp[70]} H={70}/>
    </group>
  );
}
