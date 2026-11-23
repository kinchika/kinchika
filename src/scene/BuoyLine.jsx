/* La boya grupal del club y su cabo con marcas cada 10 m: la referencia del descenso */
import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { MAX_DEPTH_M } from '../lib/depth.js';
import { mToY, SURFACE_Y } from './palette.js';

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

export function BuoyLine() {
  const bottomY = mToY(MAX_DEPTH_M) - 6;
  const length = SURFACE_Y - bottomY;
  const marks = useMemo(() => Array.from({ length: MAX_DEPTH_M / 10 }, (_, i) => {
    const m = (i + 1) * 10;
    return { m, y: mToY(m), tex: makeLabel(`−${m} M`) };
  }), []);
  useEffect(() => () => marks.forEach((mk) => mk.tex.dispose()), [marks]);

  return (
    <group position={[X, 0, Z]}>
      {/* boya en superficie */}
      <mesh position={[0, SURFACE_Y - 0.6, 0]}>
        <torusGeometry args={[2.2, 0.55, 14, 40]}/>
        <meshStandardMaterial color="#e2622b" roughness={0.55} emissive="#3a1206"/>
      </mesh>
      {/* cabo */}
      <mesh position={[0, SURFACE_Y - length / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, length, 6, 1, true]}/>
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
