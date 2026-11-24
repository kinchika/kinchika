/*
 * Portada "mitad arriba, mitad abajo": el video del atardecer sobre el mar
 * (video/mar-final.mp4) se dibuja DENTRO de la escena 3D, opaco sobre la línea
 * de flotación y fundiéndose con el mar 3D bajo ella. Así el barco 3D puede
 * flotar justo en esa línea y el cabo nace de ella (no "del cielo").
 *
 * El video sube con el scroll igual que el resto de la portada.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PlaneGeometry, ShaderMaterial, SRGBColorSpace, VideoTexture } from 'three';

const SRC = 'video/mar-final.mp4';
const VIDEO_ASPECT = 1880 / 1080;
/** Altura de la línea de flotación dentro del video (fracción desde arriba), medida en el archivo. */
const VIDEO_WATERLINE = 0.555;
/** En pantallas altas (celular) el video ocupa al menos esta fracción del alto visible. */
const MIN_HEIGHT = 0.6;

let heroTop = 0;
function measureHero() {
  const el = document.querySelector('.hero');
  heroTop = el ? el.getBoundingClientRect().top + window.scrollY : 0;
}

/** Tamaño con que se dibuja el video (cubre el ancho; en celular, un mínimo de alto). */
function videoRect(width, height) {
  const h = Math.max(width / VIDEO_ASPECT, height * MIN_HEIGHT);
  const w = h * VIDEO_ASPECT;
  return { w, h, x: (width - w) / 2 };
}

/** Posición de la línea de flotación en pantalla (px desde arriba) para el scroll actual. */
export function waterlineScreenY(width, height) {
  const { h } = videoRect(width, height);
  return heroTop + h * VIDEO_WATERLINE - window.scrollY;
}

const vertex = /* glsl */`
  varying vec2 vNdc;
  void main() {
    vNdc = position.xy;
    // en el plano lejano: lo 3D opaco que esté delante (el barco) se dibuja encima
    gl_Position = vec4(position.xy, 0.99999, 1.0);
  }
`;
const fragment = /* glsl */`
  uniform sampler2D uVideo;
  uniform vec2 uScreen;     // ancho y alto visibles (px)
  uniform vec3 uRect;       // x, ancho y alto con que se dibuja el video (px)
  uniform float uTop;       // borde superior del video en pantalla (px)
  uniform float uReady;
  varying vec2 vNdc;
  void main() {
    vec2 px = vec2((vNdc.x * 0.5 + 0.5) * uScreen.x, (0.5 - vNdc.y * 0.5) * uScreen.y);
    vec2 uv = vec2((px.x - uRect.x) / uRect.y, (px.y - uTop) / uRect.z);
    if (uv.y < 0.0 || uv.y > 1.0) discard;
    vec3 col = texture2D(uVideo, vec2(uv.x, 1.0 - uv.y)).rgb;
    // opaco sobre la línea; bajo ella el agua del video se funde con el mar 3D
    float a = 1.0 - smoothstep(${VIDEO_WATERLINE.toFixed(3)} + 0.03, ${VIDEO_WATERLINE.toFixed(3)} + 0.3, uv.y);
    gl_FragColor = vec4(col, a * uReady);
    #include <colorspace_fragment>
  }
`;

export function SkyVideo() {
  const mesh = useRef();
  const { video, texture, material, geometry } = useMemo(() => {
    const v = document.createElement('video');
    v.src = SRC;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.crossOrigin = 'anonymous';
    v.preload = 'auto';
    const tex = new VideoTexture(v);
    tex.colorSpace = SRGBColorSpace;
    const mat = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uVideo: { value: tex },
        uScreen: { value: [1, 1] },
        uRect: { value: [0, 1, 1] },
        uTop: { value: 0 },
        uReady: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
    });
    return { video: v, texture: tex, material: mat, geometry: new PlaneGeometry(2, 2) };
  }, []);

  useEffect(() => {
    measureHero();
    const onResize = () => measureHero();
    window.addEventListener('resize', onResize);
    const ready = () => { material.uniforms.uReady.value = 1; };
    video.addEventListener('loadeddata', ready);
    video.play().catch(() => {});
    document.documentElement.classList.add('has-scene-sky');
    return () => {
      window.removeEventListener('resize', onResize);
      video.removeEventListener('loadeddata', ready);
      video.pause();
      video.removeAttribute('src');
      video.load();
      texture.dispose(); material.dispose(); geometry.dispose();
      document.documentElement.classList.remove('has-scene-sky');
    };
  }, [video, texture, material, geometry]);

  useFrame((state) => {
    const { width, height } = state.size;
    const r = videoRect(width, height);
    const top = heroTop - window.scrollY;
    const visible = top + r.h > 0;
    if (mesh.current) mesh.current.visible = visible;
    // pausar el video cuando la portada ya no se ve
    if (visible && video.paused) video.play().catch(() => {});
    else if (!visible && !video.paused) video.pause();
    if (!visible) return;
    const u = material.uniforms;
    u.uScreen.value = [width, height];
    u.uRect.value = [r.x, r.w, r.h];
    u.uTop.value = top;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={999}/>;
}
