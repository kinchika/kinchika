/*
 * Escena 3D de fondo: el scroll de la página es el descenso de la cámara
 * desde la superficie (0 m) hasta el abismo (−100 m).
 */
import { Component, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color } from 'three';
import { depthState, MAX_DEPTH_M, MOTION } from '../lib/depth.js';
import { lightFilter } from './underwaterLook.js';
import { causticUniforms } from './caustics.js';
import { AdaptiveQuality } from './AdaptiveQuality.jsx';
import { FISH_MODELS, MODELS } from '../assets.config.js';
import { sunlight, smoothstep, waterColor, WORLD_DEPTH } from './palette.js';
import { Surface } from './Surface.jsx';
import { GodRays } from './GodRays.jsx';
import { Bubbles, MarineSnow } from './Particles.jsx';
import { FishSchool } from './FishSchool.jsx';
import { Jellyfish } from './Jellyfish.jsx';
import { DescentLine } from './DescentLine.jsx';
import { ModelSlot } from './ModelSlot.jsx';
import { WaterVolume } from './WaterVolume.jsx';
import { Reef } from './Reef.jsx';
import { SkyVideo } from './SkyVideo.jsx';
import { Seagulls } from './Seagulls.jsx';
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

function CameraRig() {
  const { camera, scene } = useThree();
  const hemi = useRef();
  const sun = useRef();
  const glow = useRef();
  const tmp = useMemo(() => ({
    c: new Color(), filter: new Color(), px: 0, py: 0,
    sunBase: new Color('#dff6ff'), hemiBase: new Color('#bfe9ff'),
  }), []);

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
    // el leve giro de la cámara no se aplica en la superficie: el cielo del video no
    // gira con ella y el barco se vería torcido contra el horizonte
    const roll = Math.sin(t * 0.2) * 0.008 * smoothstep(0.02, 0.1, p);
    // orden YXZ (giro horizontal y luego cabeceo): así el horizonte no se ladea
    // cuando la cámara mira hacia arriba y sigue al puntero a la vez
    camera.rotation.order = 'YXZ';
    camera.rotation.set(lookUp - tmp.py * 0.04, -tmp.px * 0.06, roll);


    waterColor(p, tmp.c);
    if (scene.background?.isColor) scene.background.copy(tmp.c);
    if (scene.fog) {
      scene.fog.color.copy(tmp.c);
      scene.fog.density = 0.011 + p * 0.016;
    }

    const light = sunlight(p);
    // la luz que llega abajo ya perdió el rojo (luego el verde): tiñe las luces de la escena
    lightFilter(p * MAX_DEPTH_M, tmp.filter);
    if (hemi.current) {
      hemi.current.intensity = 0.25 + light * 1.4;
      hemi.current.color.copy(tmp.hemiBase).multiply(tmp.filter);
    }
    if (sun.current) {
      sun.current.intensity = 0.15 + light * 2.6;
      sun.current.color.copy(tmp.sunBase).multiply(tmp.filter);
    }
    // reloj e intensidad de las cáusticas (roca, algas, peces y buzo)
    causticUniforms.uTime.value = t;
    causticUniforms.uCaustic.value = 1.8 * light;
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
      <WaterVolume/>
      <Surface/>
      <Reef mobile={mobile}/>
      <GodRays count={mobile ? 6 : 10}/>
      <MarineSnow count={Math.round(2400 * f)}/>
      <Bubbles count={Math.round(200 * f)}/>
      <SkyVideo/>
      <Seagulls mobile={mobile}/>
      {/* en celular solo información, peces y fondo: sin barco, cuerda ni buzo */}
      {!mobile && <DescentLine/>}

      {/* −6 m: anchovetas, rápidas y pequeñas */}
      <FishSchool count={Math.round(110 * f)} depthM={7} radius={46} speed={0.11} size={0.55}
        spread={[3.5, 1.4, 3]} lag={0.6} phase={1.2} dir={1}
        color="#d4e0e8" back="#2e5566" modelUrl={FISH_MODELS.anchoveta}/>
      {/* −18 m: jurel, el cardumen principal */}
      <FishSchool count={Math.round(80 * f)} depthM={19} radius={44} speed={0.06} size={1.4}
        spread={[4.5, 2, 4]} lag={0.9} phase={-0.6} dir={-1} zCenter={-26}
        color="#b8c8d4" back="#223c4a" emissive="#06121a" metalness={0.8} roughness={0.28} modelUrl={FISH_MODELS.jurel}/>
      {/* −42 m: reinetas, pocas y grandes */}
      <FishSchool count={Math.round(16 * f) + 4} depthM={43} radius={40} speed={0.035} size={2.4}
        spread={[6, 2.5, 5]} lag={1.4} phase={2.4} dir={1} zCenter={-26}
        color="#d2d8de" back="#3a4652" emissive="#0c1218" metalness={0.85} roughness={0.22}
        tint="#a9b9cc" modelUrl={FISH_MODELS.reineta}/>

      <Jellyfish count={mobile ? 6 : 10}/>

      {!mobile && MODELS.map((m) => <ModelSlot key={m.id} {...m}/>)}
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
  // calidad adaptable: 0 completa, 1 sin retina, 2 sin brillo y con SMAA
  const [quality, setQuality] = useState(0);
  const maxDpr = mobile ? 1.3 : 1.6;
  if (!ok) return null;
  return (
    <div id="ocean-scene" aria-hidden="true">
      <SceneBoundary>
        <Canvas
          dpr={[1, maxDpr]}
          camera={{ fov: mobile ? 62 : 55, near: 0.1, far: 220, position: [0, 0, 0] }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
        >
          <AdaptiveQuality level={quality} onChange={setQuality} maxDpr={maxDpr}/>
          <World mobile={mobile}/>
          {/* suavizado de bordes siempre: MSAA en calidad alta, SMAA (más liviano) si no */}
          {mobile || quality >= 2 ? (
            <EffectComposer multisampling={0}>
              <Vignette offset={0.3} darkness={0.55}/>
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC}/>
              <SMAA/>
            </EffectComposer>
          ) : (
            <EffectComposer multisampling={4}>
              <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.6} luminanceSmoothing={0.25}/>
              <Vignette offset={0.25} darkness={0.65}/>
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC}/>
            </EffectComposer>
          )}
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
