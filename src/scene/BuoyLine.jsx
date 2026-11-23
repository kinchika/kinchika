/*
 * La boya grupal del club y su cabo con marcas cada 10 m: la referencia del descenso.
 * La boya flota sobre la línea de flotación de la portada (ver SkyVideo) y el cabo
 * cuelga de ella hasta el lastre del fondo.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, DoubleSide, SRGBColorSpace, Vector3 } from 'three';
import { MAX_DEPTH_M, MOTION } from '../lib/depth.js';
import { mToY, SURFACE_Y } from './palette.js';
import { waterlineScreenY } from './SkyVideo.jsx';

// a la derecha del contenido, para no quedar detrás de las tarjetas
const X = 16;
const Z = -22;

function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.font = '500 44px "JetBrains Mono", ui-monospace, monospace';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(201,168,76,0.9)';
  g.fillText(text, 12, 48);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Bandera de buceo (roja con franja blanca diagonal): avisa que hay buzos abajo. */
function makeFlag() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#d42020';
  g.fillRect(0, 0, 128, 96);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 18;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 96); g.stroke();
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export function BuoyLine() {
  const bottomY = mToY(MAX_DEPTH_M) - 6;
  const root = useRef();
  const buoy = useRef();
  const rope = useRef();
  const flag = useRef();
  const tmp = useMemo(() => ({ p: new Vector3(), v: new Vector3(), y: SURFACE_Y }), []);
  const marks = useMemo(() => Array.from({ length: MAX_DEPTH_M / 10 }, (_, i) => {
    const m = (i + 1) * 10;
    return { m, y: mToY(m), tex: makeLabel(`−${m} M`) };
  }), []);
  const flagTex = useMemo(makeFlag, []);
  useEffect(() => () => { marks.forEach((mk) => mk.tex.dispose()); flagTex.dispose(); }, [marks, flagTex]);

  useFrame((state) => {
    const cam = state.camera;
    const { width, height } = state.size;
    cam.updateMatrixWorld();
    // en pantallas angostas (celular) la boya se acerca al centro para que se vea
    const halfW = Math.tan((cam.fov * Math.PI) / 360) * -Z * cam.aspect;
    const x = Math.min(X, halfW * 0.72);
    if (root.current) root.current.position.x = x;
    // altura del mundo (en el plano de la boya) que cae justo sobre la línea de flotación
    const ndcY = 1 - (2 * waterlineScreenY(width, height)) / height;
    tmp.p.set(x, tmp.y, Z).project(cam);
    tmp.v.set(tmp.p.x, ndcY, 0.5).unproject(cam).sub(cam.position);
    if (Math.abs(tmp.v.z) > 1e-6) {
      const k = (Z - cam.position.z) / tmp.v.z;
      if (k > 0 && Number.isFinite(k)) tmp.y = cam.position.y + tmp.v.y * k;
    }
    const t = state.clock.elapsedTime * MOTION;
    const bob = Math.sin(t * 1.3) * 0.12;
    if (buoy.current) {
      buoy.current.position.y = tmp.y + bob;
      buoy.current.rotation.set(Math.sin(t * 0.9) * 0.06, 0, Math.sin(t * 1.1 + 1) * 0.07);
    }
    if (flag.current) flag.current.rotation.y = -0.5 + Math.sin(t * 2.1) * 0.15;
    if (rope.current) {
      const top = tmp.y + bob - 0.3;
      rope.current.position.y = (top + bottomY) / 2;
      rope.current.scale.y = Math.max(0.01, top - bottomY);
    }
  });

  return (
    <group ref={root} position={[X, 0, Z]}>
      {/* boya en superficie: flotador anaranjado medio sumergido, con bandera de buceo */}
      <group ref={buoy} scale={0.72}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.55, 16, 40]}/>
          <meshStandardMaterial color="#ff6a1a" roughness={0.5} emissive="#4a1604"/>
        </mesh>
        {/* red central */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.2, 24]}/>
          <meshStandardMaterial color="#1b2a33" roughness={0.9} side={DoubleSide} transparent opacity={0.6}/>
        </mesh>
        {/* mástil y bandera */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 3, 6]}/>
          <meshStandardMaterial color="#e8e8e8" roughness={0.6}/>
        </mesh>
        <group ref={flag} position={[0, 2.55, 0]}>
          <mesh position={[0.55, 0, 0]}>
            <planeGeometry args={[1.1, 0.8]}/>
            <meshStandardMaterial map={flagTex} side={DoubleSide} roughness={0.8} emissive="#2a0606"/>
          </mesh>
        </group>
      </group>
      {/* cabo: nace bajo la boya y baja hasta el lastre */}
      <mesh ref={rope}>
        <cylinderGeometry args={[0.05, 0.05, 1, 6, 1, true]}/>
        <meshStandardMaterial color="#d8c69a" emissive="#2c2412" roughness={0.9}/>
      </mesh>
      {/* marcas de profundidad */}
      {marks.map((mk) => (
        <group key={mk.m} position={[0, mk.y, 0]}>
          <mesh>
            <cylinderGeometry args={[0.14, 0.14, 0.5, 10]}/>
            <meshStandardMaterial color="#c9a84c" emissive="#5a4313" metalness={0.4} roughness={0.4}/>
          </mesh>
          <sprite position={[1.5, 0, 0]} scale={[2.4, 0.9, 1]}>
            <spriteMaterial map={mk.tex} transparent depthWrite={false} fog={false}/>
          </sprite>
        </group>
      ))}
      {/* lastre al final del cabo */}
      <mesh position={[0, bottomY, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.7, 16]}/>
        <meshStandardMaterial color="#20262c" metalness={0.7} roughness={0.4} emissive="#05080a"/>
      </mesh>
    </group>
  );
}
