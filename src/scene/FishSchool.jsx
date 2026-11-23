/*
 * Cardumen con InstancedMesh: cada pez sigue la trayectoria del grupo con un
 * pequeño retraso y desplazamiento propio; la cola ondula en el vertex shader.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color, DoubleSide, InstancedBufferAttribute, MeshStandardMaterial, Object3D, Quaternion, Vector3,
} from 'three';
import { MOTION } from '../lib/depth.js';
import { loadFishGeometry, makeFishGeometry } from './fishGeometry.js';
import { mToY } from './palette.js';

const X_AXIS = new Vector3(1, 0, 0);

function makeMaterial({ color, emissive, metalness, roughness, map }) {
  const mat = new MeshStandardMaterial({
    color: new Color(color),
    emissive: new Color(emissive),
    emissiveIntensity: 1,
    metalness,
    roughness,
    side: DoubleSide,
    map: map || null,
  });
  const uniforms = { uTime: { value: 0 } };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        attribute float aPhase;
        attribute float aFreq;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float tailW = smoothstep(0.3, -0.55, transformed.x);
        float wave = sin(uTime * aFreq + aPhase - transformed.x * 6.0);
        transformed.z += wave * 0.085 * (0.2 + tailW);`);
  };
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
 * @param {string} [props.modelUrl] .glb opcional para la geometría
 */
export function FishSchool({
  count = 60, depthM = 20, radius = 50, speed = 0.05, size = 1.2,
  spread = [3, 1.6, 3], lag = 0.5, phase = 0, dir = 1, zCenter = -32,
  color = '#b9c7d3', emissive = '#0a1a26', metalness = 0.55, roughness = 0.32,
  modelUrl,
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

  const { mat, uniforms } = useMemo(
    () => makeMaterial({ color, emissive, metalness, roughness, map: custom?.map }),
    [color, emissive, metalness, roughness, custom],
  );

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
    o: new Object3D(), a: new Vector3(), b: new Vector3(), d: new Vector3(), q: new Quaternion(),
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
    const { o, a, b, d, q } = tmp;
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      const t = phase + dir * (T * speed - f.lag);
      path(t, a);
      path(t + dir * 0.01, b);
      d.subVectors(b, a).normalize();
      a.add(f.off);
      a.y += Math.sin(T * 0.8 + f.wob) * 0.25;
      q.setFromUnitVectors(X_AXIS, d);
      o.position.copy(a);
      o.quaternion.copy(q);
      o.scale.setScalar(f.scale);
      o.updateMatrix();
      mesh.current.setMatrixAt(i, o.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, mat, count]} frustumCulled={false}/>;
}
