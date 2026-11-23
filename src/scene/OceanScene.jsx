/*
 * Escena 3D de fondo: el scroll de la página es el descenso de la cámara
 * desde la superficie (0 m) hasta el abismo (−100 m).
 */
import { Component, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color } from 'three';
import { depthState, MOTION } from '../lib/depth.js';
import { FISH_MODELS, MODELS } from '../assets.config.js';
import { sunlight, smoothstep, waterColor, WORLD_DEPTH } from './palette.js';
import { Surface } from './Surface.jsx';
import { GodRays } from './GodRays.jsx';
import { Bubbles, MarineSnow } from './Particles.jsx';
import { FishSchool } from './FishSchool.jsx';
import { Jellyfish } from './Jellyfish.jsx';
import { BuoyLine } from './BuoyLine.jsx';
import { ModelSlot } from './ModelSlot.jsx';

function CameraRig() {
  const { camera, scene } = useThree();
  const hemi = useRef();
  const sun = useRef();
  const glow = useRef();
  const tmp = useMemo(() => ({ c: new Color(), px: 0, py: 0 }), []);

  useFrame((state, dt) => {
    const s = depthState;
    const k = 1 - Math.exp(-dt * 3.2);
    s.smooth += (s.progress - s.smooth) * k;
    const p = s.smooth;

    // paralaje suave con el puntero
    tmp.px += (s.pointerX - tmp.px) * k * 0.6 * MOTION;
    tmp.py += (s.pointerY - tmp.py) * k * 0.6 * MOTION;

    const t = state.clock.elapsedTime * MOTION;
    const sway = Math.sin(t * 0.25) * 0.35;
    camera.position.set(tmp.px * 1.6 + sway, -p * WORLD_DEPTH - tmp.py * 0.8, 0);
    const lookUp = 0.32 * (1 - smoothstep(0, 0.1, p));     // en superficie mira hacia la luz
    camera.rotation.set(lookUp - tmp.py * 0.04, -tmp.px * 0.06, Math.sin(t * 0.2) * 0.008);

    waterColor(p, tmp.c);
    if (scene.background?.isColor) scene.background.copy(tmp.c);
    if (scene.fog) {
      scene.fog.color.copy(tmp.c);
      scene.fog.density = 0.011 + p * 0.016;
    }

    const light = sunlight(p);
    if (hemi.current) hemi.current.intensity = 0.25 + light * 1.4;
    if (sun.current) sun.current.intensity = 0.15 + light * 2.6;
    if (glow.current) {
      glow.current.position.set(camera.position.x, camera.position.y + 2, -6);
      glow.current.intensity = 6 * smoothstep(0.55, 0.95, p); // linterna del buzo en el abismo
    }
  });

  return (
    <>
      <color attach="background" args={['#0f4c70']}/>
      <fogExp2 attach="fog" args={['#0f4c70', 0.011]}/>
      <hemisphereLight ref={hemi} args={['#bfe9ff', '#02070d', 1]}/>
      <directionalLight ref={sun} position={[12, 60, 8]} color="#dff6ff"/>
      <pointLight ref={glow} color="#7fe9ff" distance={40} decay={1.4} intensity={0}/>
    </>
  );
}

function World({ mobile }) {
  const f = mobile ? 0.45 : 1;
  return (
    <>
      <CameraRig/>
      <Surface/>
      <GodRays count={mobile ? 6 : 10}/>
      <MarineSnow count={Math.round(2400 * f)}/>
      <Bubbles count={Math.round(200 * f)}/>
      <BuoyLine/>

      {/* −6 m: anchovetas, rápidas y pequeñas */}
      <FishSchool count={Math.round(110 * f)} depthM={7} radius={46} speed={0.11} size={0.55}
        spread={[3.5, 1.4, 3]} lag={0.6} phase={1.2} dir={1}
        color="#c8d6e0" modelUrl={FISH_MODELS.anchoveta}/>
      {/* −18 m: jurel, el cardumen principal */}
      <FishSchool count={Math.round(80 * f)} depthM={19} radius={52} speed={0.06} size={1.25}
        spread={[4.5, 2, 4]} lag={0.9} phase={-0.6} dir={-1} zCenter={-30}
        color="#9fb4c4" emissive="#0b1d2a" modelUrl={FISH_MODELS.jurel}/>
      {/* −42 m: reinetas, pocas y grandes */}
      <FishSchool count={Math.round(16 * f) + 4} depthM={43} radius={40} speed={0.035} size={2.4}
        spread={[6, 2.5, 5]} lag={1.4} phase={2.4} dir={1} zCenter={-26}
        color="#c9cfd6" emissive="#141c22" metalness={0.75} roughness={0.25} modelUrl={FISH_MODELS.reineta}/>

      <Jellyfish count={mobile ? 6 : 10}/>

      {MODELS.map((m) => <ModelSlot key={m.id} {...m}/>)}
    </>
  );
}

class SceneBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn('[kinchika] La escena 3D no pudo iniciarse:', err); }
  render() { return this.state.failed ? null : this.props.children; }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl');
  } catch { return false; }
}

export default function OceanScene({ mobile }) {
  const ok = useMemo(hasWebGL, []);
  if (!ok) return null;
  return (
    <div id="ocean-scene" aria-hidden="true">
      <SceneBoundary>
        <Canvas
          dpr={[1, mobile ? 1.3 : 1.6]}
          camera={{ fov: mobile ? 62 : 55, near: 0.1, far: 220, position: [0, 0, 0] }}
          gl={{ antialias: !mobile, powerPreference: 'high-performance' }}
        >
          <World mobile={mobile}/>
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
