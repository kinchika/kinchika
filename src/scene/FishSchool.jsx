/*
 * Cardumen con InstancedMesh: cada pez sigue la trayectoria del grupo con un
 * pequeño retraso y desplazamiento propio; la cola ondula en el vertex shader.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color, DoubleSide, InstancedBufferAttribute, Matrix4, MeshStandardMaterial, Object3D, Vector3,
} from 'three';
import { MOTION } from '../lib/depth.js';
import { loadFishGeometry, makeFishGeometry } from './fishGeometry.js';
import { withCaustics } from './caustics.js';
import { mToY } from './palette.js';

const UP = new Vector3(0, 1, 0);

function makeMaterial({ color, back, emissive, metalness, roughness, map }) {
  const mat = new MeshStandardMaterial({
    color: new Color(color),
    emissive: new Color(emissive),
    emissiveIntensity: 1,
    metalness,
    roughness,
    side: DoubleSide,
    map: map || null,
  });
  // con textura real el pez ya trae su lomo oscuro: la contrasombra procedural se desactiva
  const uniforms = { uTime: { value: 0 }, uBack: { value: new Color(back) }, uBackMix: { value: map ? 0 : 0.9 } };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uBack = uniforms.uBack;
    shader.uniforms.uBackMix = uniforms.uBackMix;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        attribute float aPhase;
        attribute float aFreq;
        varying float vLy;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLy = position.y;
        float tailW = smoothstep(0.3, -0.55, transformed.x);
        float wave = sin(uTime * aFreq + aPhase - transformed.x * 6.0);
        transformed.z += wave * 0.085 * (0.2 + tailW);`);
    // contrasombra: lomo oscuro azul verdoso, flancos y vientre plateados
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uBack;\nuniform float uBackMix;\nvarying float vLy;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float backMask = smoothstep(0.0, 0.1, vLy) * uBackMix / 0.9;
        diffuseColor.rgb = mix(diffuseColor.rgb, uBack, backMask * 0.9);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor *= mix(1.0, 0.35, backMask);`);
  };
  // la red de luz de la superficie también pasa por el cuerpo de los peces
  withCaustics(mat, { strength: 0.8 });
  return { mat, uniforms };
}

/**
 * @param {object} props
 * @param {number} props.count      cantidad de peces
 * @param {number} props.depthM     profundidad del centro del cardumen (m)
 * @param {number} props.radius     radio de la trayectoria
 * @param {number} props.speed      velocidad angular de la trayectoria
 * @param {number} props.size       largo de cada pez (unidades)
 * @param {number[]} props.spread   dispersión [x, y, z] del cardumen
 * @param {number} props.lag        dispersión a lo largo de la trayectoria
 * @param {number} props.phase      fase inicial de la trayectoria
 * @param {number} props.dir        1 o −1 (sentido de giro)
 * @param {string} [props.tint]     tinte que multiplica la textura del .glb (si lo hay)
 * @param {string} [props.modelUrl] .glb opcional para la geometría
 */
export function FishSchool({
  count = 60, depthM = 20, radius = 50, speed = 0.05, size = 1.2,
  spread = [3, 1.6, 3], lag = 0.5, phase = 0, dir = 1, zCenter = -32,
  color = '#b9c7d3', back = '#24404e', emissive = '#0a1a26', metalness = 0.55, roughness = 0.32,
  tint = '#ffffff', modelUrl,
}) {
  const mesh = useRef();
  const [custom, setCustom] = useState(null);

  useEffect(() => {
    let alive = true;
    if (modelUrl) loadFishGeometry(modelUrl).then((r) => { if (alive && r) setCustom(r); });
    return () => { alive = false; };
  }, [modelUrl]);

  const geometry = useMemo(() => {
    const g = custom ? custom.geometry.clone() : makeFishGeometry();
    const phases = new Float32Array(count);
    const freqs = new Float32Array(count);
    for (let i = 0; i < count; i++) { phases[i] = Math.random() * 6.283; freqs[i] = 7 + Math.random() * 4; }
    g.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1));
    g.setAttribute('aFreq', new InstancedBufferAttribute(freqs, 1));
    return g;
  }, [count, custom]);

  const { mat, uniforms } = useMemo(() => {
    const map = custom?.map;
    // con textura: solo un tinte suave (no el color procedural) y menos metal (si no, la textura se oscurece)
    return makeMaterial({
      color: map ? tint : color,
      back, emissive,
      metalness: map ? Math.min(metalness, 0.3) : metalness,
      roughness: map ? Math.max(roughness, 0.38) : roughness,
      map,
    });
  }, [color, back, emissive, metalness, roughness, tint, custom]);

  useEffect(() => () => { geometry.dispose(); mat.dispose(); }, [geometry, mat]);

  const fish = useMemo(() => Array.from({ length: count }, () => ({
    lag: Math.random() * lag,
    off: new Vector3(
      (Math.random() - 0.5) * 2 * spread[0],
      (Math.random() - 0.5) * 2 * spread[1],
      (Math.random() - 0.5) * 2 * spread[2],
    ),
    wob: Math.random() * 6.283,
    scale: size * (0.8 + Math.random() * 0.4),
  })), [count, lag, spread, size]);

  const baseY = mToY(depthM);
  const tmp = useMemo(() => ({
    o: new Object3D(), a: new Vector3(), b: new Vector3(), d: new Vector3(),
    side: new Vector3(), up: new Vector3(), m: new Matrix4(),
  }), []);

  const path = (t, out) => out.set(
    Math.sin(t) * radius,
    baseY + Math.sin(t * 2) * radius * 0.06,
    zCenter + Math.cos(t) * radius * 0.42,
  );

  useFrame((state) => {
    if (!mesh.current) return;
    const camY = state.camera.position.y;
    // fuera de rango: no gastar CPU
    const visible = Math.abs(camY - baseY) < 90;
    mesh.current.visible = visible;
    if (!visible) return;

    const T = state.clock.elapsedTime * MOTION;
    uniforms.uTime.value = T;
    const { o, a, b, d, side, up, m } = tmp;
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      const t = phase + dir * (T * speed - f.lag);
      path(t, a);
      path(t + dir * 0.01, b);
      d.subVectors(b, a).normalize();
      a.add(f.off);
      a.y += Math.sin(T * 0.8 + f.wob) * 0.25;
      // orientación con el lomo siempre hacia arriba: el pez mira a +X local.
      // (setFromUnitVectors toma el giro más corto y, al nadar hacia −X, a veces
      // lo hacía girando sobre Z: el pez quedaba panza arriba)
      side.crossVectors(d, UP).normalize();
      up.crossVectors(side, d);
      m.makeBasis(d, up, side);
      o.position.copy(a);
      o.quaternion.setFromRotationMatrix(m);
      o.scale.setScalar(f.scale);
      o.updateMatrix();
      mesh.current.setMatrixAt(i, o.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, mat, count]} frustumCulled={false}/>;
}
