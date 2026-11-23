/*
 * Modelo 3D animado (.glb) exportado desde Blender o generado con Higgsfield.
 * Si el archivo no existe todavía, no se muestra nada.
 */
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AnimationMixer, Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { depthState, MAX_DEPTH_M, MOTION } from '../lib/depth.js';
import { mToY } from './palette.js';

const loader = new GLTFLoader();

export function ModelSlot({ src, depthM = 20, follow, position = [0, -20], height = 2, rotation, rotationY = 0, animation = 'auto' }) {
  const group = useRef();
  const mixer = useRef(null);
  const [model, setModel] = useState(null);

  useEffect(() => {
    let alive = true;
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
      const cur = depthState.smooth * MAX_DEPTH_M + 1.2;
      m = Math.min(follow[1], Math.max(follow[0], cur));
    }
    const t = state.clock.elapsedTime * MOTION;
    group.current.position.set(position[0], mToY(m) + Math.sin(t * 0.6) * 0.25, position[1]);
  });

  if (!model) return null;
  return (
    <group ref={group} rotation={rotation || [0, rotationY, 0]}>
      <primitive object={model}/>
    </group>
  );
}
