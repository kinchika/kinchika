/*
 * Entrada al agua: cuando la línea de flotación del video sube al empezar el scroll,
 * la cámara "se sumerge" como en un documental:
 *   1. ráfaga de burbujas grandes cerca del lente que suben rápido,
 *   2. un golpe de luz verde-azulada con el borde del agua barriendo el lente hacia arriba,
 *   3. un pequeño sacudón de la cámara (lo aplica CameraRig con immersionFx.kick),
 *   4. un chapuzón sintetizado si el sonido está activado.
 * Se vuelve a armar al volver a la superficie.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color, MathUtils, PlaneGeometry, ShaderMaterial } from 'three';
import { MOTION } from '../lib/depth.js';
import { playSplash } from '../lib/audio.js';
import { waterlineRestY, waterlineScreenY } from './SkyVideo.jsx';

/** Sacudón pendiente de la cámara (0..1); CameraRig lo consume y lo amortigua. */
export const immersionFx = { kick: 0 };

const DURATION = 2.0;
/** La línea de flotación debe subir esta fracción del alto de pantalla para sumergirse. */
const DOWN = 0.12;
/** ...y volver hasta aquí para que el efecto pueda repetirse. */
const REARM = 0.04;

const bubbleVertex = /* glsl */`
  uniform float uT;
  uniform float uPixelRatio;
  attribute vec3 aLocal;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    float life = 1.1 + aSeed * 0.8;
    // en coordenadas de la cámara: las burbujas suben por delante del lente aunque la
    // cámara siga bajando con el scroll
    vec4 mv = vec4(aLocal, 1.0);
    mv.y += (1.1 + aSeed * 2.2) * uT + 0.5 * uT * uT;
    mv.x += sin(uT * 7.0 + aSeed * 31.0) * 0.12 * (0.4 + aSeed);
    gl_PointSize = (14.0 + aSeed * aSeed * 90.0) * uPixelRatio * (6.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
    vAlpha = smoothstep(0.0, 0.06, uT) * (1.0 - smoothstep(0.55, 1.0, uT / life));
  }
`;

const bubbleFragment = /* glsl */`
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    // borde plateado nítido, interior casi transparente y un brillo arriba a la izquierda
    float rim = smoothstep(0.5, 0.44, d) * smoothstep(0.3, 0.45, d);
    float body = smoothstep(0.5, 0.3, d) * 0.12;
    float spec = smoothstep(0.12, 0.0, length(gl_PointCoord - vec2(0.36, 0.32)));
    float a = clamp(rim * 0.75 + body + spec, 0.0, 1.0) * vAlpha;
    vec3 col = mix(uColor * 0.85, vec3(1.0), spec + rim * 0.3);
    gl_FragColor = vec4(col, a);
  }
`;

const flashVertex = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const flashFragment = /* glsl */`
  uniform float uT;
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    // golpe de luz: sube de golpe y se apaga en ~1 s
    float flash = smoothstep(0.0, 0.05, uT) * exp(-uT * 3.2);
    vec3 top = vec3(0.55, 0.92, 1.0);
    vec3 bottom = vec3(0.05, 0.30, 0.42);
    vec3 col = mix(bottom, top, vUv.y);
    // el borde del agua (menisco) barre el lente de abajo hacia arriba
    float bandY = -0.15 + uT * 2.4;
    float wave = 0.025 * sin(vUv.x * uAspect * 9.0 + uT * 10.0) + 0.012 * sin(vUv.x * uAspect * 23.0 - uT * 14.0);
    float band = exp(-abs(vUv.y - bandY + wave) * 38.0) * smoothstep(1.2, 0.6, bandY);
    // bajo el menisco el agua tiñe la imagen; sobre él, todavía no
    float below = smoothstep(bandY + 0.02, bandY - 0.08, vUv.y + wave);
    float a = flash * (0.18 + 0.22 * below) + band * 0.55 * smoothstep(0.0, 0.08, uT);
    gl_FragColor = vec4(col + band * 0.6, clamp(a, 0.0, 0.8));
  }
`;

export function Immersion({ mobile = false }) {
  const count = mobile ? 60 : 120;
  const dpr = useThree((s) => s.viewport.dpr);
  const state = useRef({ armed: null, t0: -1 });
  const points = useRef();
  const flash = useRef();

  const { geometry, bubbleMat, flashMat, flashGeo } = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aLocal', new BufferAttribute(new Float32Array(count * 3), 3));
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) seed[i] = Math.random();
    g.setAttribute('aSeed', new BufferAttribute(seed, 1));
    const bm = new ShaderMaterial({
      vertexShader: bubbleVertex,
      fragmentShader: bubbleFragment,
      uniforms: {
        uT: { value: 0 },
        uPixelRatio: { value: dpr }, uColor: { value: new Color('#d8f6ff') },
      },
      transparent: true,
      depthWrite: false,
    });
    const fm = new ShaderMaterial({
      vertexShader: flashVertex,
      fragmentShader: flashFragment,
      uniforms: { uT: { value: 0 }, uAspect: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    return { geometry: g, bubbleMat: bm, flashMat: fm, flashGeo: new PlaneGeometry(2, 2) };
  }, [count, dpr]);

  /** Reparte las burbujas dentro de lo que ve la cámara, sobre todo en la mitad de abajo. */
  function fire(camera, now) {
    const local = geometry.attributes.aLocal;
    const tanY = Math.tan(MathUtils.degToRad(camera.fov) / 2);
    for (let i = 0; i < count; i++) {
      const z = 2.5 + Math.random() * 9;
      local.setXYZ(i,
        (Math.random() - 0.5) * 2.2 * z * tanY * camera.aspect,
        (-1.2 + Math.random() * 1.4) * z * tanY,
        -z);
    }
    local.needsUpdate = true;
    state.current.t0 = now;
    if (MOTION === 1) immersionFx.kick = 1;
    playSplash();
  }

  useFrame((frame) => {
    const { camera, size, clock } = frame;
    const s = state.current;
    const wl = waterlineScreenY(size.width, size.height);
    const rest = waterlineRestY(size.width, size.height);
    const under = wl < rest - DOWN * size.height;
    const over = wl > rest - REARM * size.height;
    if (s.armed === null) s.armed = !under;            // si la página abre ya abajo, no dispara
    if (s.armed && under) { s.armed = false; fire(camera, clock.elapsedTime); }
    else if (!s.armed && over) s.armed = true;

    const t = s.t0 < 0 ? DURATION : clock.elapsedTime - s.t0;
    const active = t < DURATION;
    if (points.current) points.current.visible = active && MOTION === 1;
    if (flash.current) flash.current.visible = active;
    if (!active) return;
    bubbleMat.uniforms.uT.value = t;
    flashMat.uniforms.uT.value = t;
    flashMat.uniforms.uAspect.value = size.width / size.height;
  });

  return (
    <>
      <points ref={points} geometry={geometry} material={bubbleMat} frustumCulled={false} visible={false} renderOrder={1001}/>
      <mesh ref={flash} geometry={flashGeo} material={flashMat} frustumCulled={false} visible={false} renderOrder={1002}/>
    </>
  );
}
