/*
 * Modelo 3D animado (.glb) exportado desde Blender o generado con Higgsfield.
 * Si el archivo no existe todavía, no se muestra nada.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AnimationMixer, Box3, Euler, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { depthState, MAX_DEPTH_M, MOTION } from '../lib/depth.js';
import { mToY } from './palette.js';

const loader = new GLTFLoader();
/** Margen (unidades) para el vaivén de la cámara y el aleteo, que mueven el modelo hacia los bordes. */
const EDGE_MARGIN = 0.6;
/** Diferencia mínima (fracción del descenso) entre el scroll y la cámara para decidir si se sube o se baja. */
const TURN_THRESHOLD = 0.0015;
const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);

/**
 * Medio ancho (x) y media profundidad (z) del modelo respecto de su posición,
 * tomando el máximo en varias poses de la animación (el aleteo lo ensancha).
 */
function medirExtension(group, mixer, duration, z0) {
  const total = new Box3();
  const pose = new Box3();
  const muestras = mixer && duration > 0 ? 8 : 1;
  for (let i = 0; i < muestras; i++) {
    if (muestras > 1) mixer.setTime((duration * i) / muestras);
    group.updateMatrixWorld(true);
    total.union(pose.setFromObject(group, true));
  }
  if (muestras > 1) mixer.setTime(0);
  if (!Number.isFinite(total.min.x)) return { x: 0, z: 0 };
  return {
    x: Math.max(total.max.x, -total.min.x),
    z: Math.max(total.max.z - z0, z0 - total.min.z),
  };
}

export function ModelSlot({
  src, depthM = 20, follow, followOffsetM = 0.5, position = [0, -20], height = 2,
  rotation, rotationY = 0, animation = 'auto', turnOnAscent = false,
}) {
  const group = useRef();
  const mixer = useRef(null);
  const [model, setModel] = useState(null);
  const ext = useRef(null);
  const clipDuration = useRef(0);
  // orientación base (descendiendo) y estado del giro al subir
  const baseQ = useMemo(
    () => new Quaternion().setFromEuler(new Euler(...(rotation || [0, rotationY, 0]))),
    [rotation, rotationY],
  );
  const turn = useMemo(() => ({ theta: 0, target: 0, qx: new Quaternion(), qy: new Quaternion() }), []);

  useEffect(() => {
    let alive = true;
    ext.current = null;
    clipDuration.current = 0;
    loader.loadAsync(src).then((gltf) => {
      if (!alive) return;
      const root = gltf.scene;
      // normaliza el tamaño y centra el modelo
      const box = new Box3().setFromObject(root);
      const size = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());
      const s = height / Math.max(size.x, size.y, size.z, 1e-6);
      root.position.sub(center.multiplyScalar(s));
      root.scale.setScalar(s);
      root.traverse((o) => {
        if (o.isMesh) { o.frustumCulled = false; }
      });
      if (gltf.animations?.length) {
        mixer.current = new AnimationMixer(root);
        const clip = animation === 'auto'
          ? gltf.animations[0]
          : gltf.animations.find((c) => c.name === animation) || gltf.animations[0];
        mixer.current.clipAction(clip).play();
        clipDuration.current = clip.duration;
      }
      setModel(root);
    }).catch(() => {
      if (import.meta.env.DEV) console.info(`[kinchika] Modelo no disponible todavía: ${src}`);
    });
    return () => { alive = false; mixer.current?.stopAllAction(); };
  }, [src, height, animation]);

  useFrame((state, dt) => {
    if (!group.current || !model) return;
    mixer.current?.update(dt * MOTION);
    let m = depthM;
    if (follow) {
      const cur = depthState.smooth * MAX_DEPTH_M + followOffsetM;
      m = Math.min(follow[1], Math.max(follow[0], cur));
    }
    const t = state.clock.elapsedTime * MOTION;
    const y = mToY(m) + Math.sin(t * 0.6) * 0.25;

    // al hacer scroll hacia arriba el buzo da una voltereta y queda de cabeza hacia la superficie;
    // al volver a bajar, gira de nuevo. Sin scroll, conserva la última dirección.
    if (turnOnAscent) {
      const gap = depthState.progress - depthState.smooth;
      if (gap < -TURN_THRESHOLD) turn.target = Math.PI;
      else if (gap > TURN_THRESHOLD) turn.target = 0;
      turn.theta += (turn.target - turn.theta) * (1 - Math.exp(-dt * 2.4));
    }
    // giro compuesto (cabeceo + vuelta sobre sí mismo): a 180° equivale a quedar al revés
    // pero sigue mostrando la espalda y el tanque, y el camino intermedio parece una voltereta
    turn.qx.setFromAxisAngle(AXIS_X, turn.theta);
    turn.qy.setFromAxisAngle(AXIS_Y, turn.theta);
    group.current.quaternion.copy(turn.qx).multiply(turn.qy).multiply(baseQ);

    // tamaño del modelo ya girado, considerando toda la animación (se mide una vez por modelo)
    if (ext.current === null) {
      group.current.position.set(0, y, position[1]);
      ext.current = medirExtension(group.current, mixer.current, clipDuration.current, position[1]);
    }

    // en pantallas angostas (celular) acerca el modelo al centro para que entre completo en el cuadro
    let x = position[0];
    const cam = state.camera;
    const dist = cam.position.z - position[1] - ext.current.z; // la parte más cercana a la cámara
    if (cam.isPerspectiveCamera && dist > cam.near) {
      const halfW = Math.tan((cam.fov * Math.PI) / 360) * dist * cam.aspect;
      const maxX = halfW * 0.92 - ext.current.x - EDGE_MARGIN;
      if (Number.isFinite(maxX)) x = Math.sign(x) * Math.min(Math.abs(x), Math.max(0, maxX));
    }
    group.current.position.set(x, y, position[1]);
  });

  if (!model) return null;
  return (
    <group ref={group}>
      <primitive object={model}/>
    </group>
  );
}
