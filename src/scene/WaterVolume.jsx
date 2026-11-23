/*
 * Volumen de agua: un domo que rodea la cámara con el degradado real del mar
 * (claro hacia la superficie, oscuro hacia el fondo) y un mapa de entorno que
 * da reflejos plateados a peces y buzo. Ambos se apagan con la profundidad.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BackSide, Color, Mesh, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry } from 'three';
import { depthState } from '../lib/depth.js';
import { sunlight, waterColor } from './palette.js';

const domeVertex = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragment = /* glsl */`
  uniform vec3 uHorizon;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uSun;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 col = mix(uBottom, uHorizon, smoothstep(-0.6, 0.02, d.y));
    col = mix(col, uTop, smoothstep(0.0, 0.85, d.y));
    // resplandor difuso del sol filtrado por el agua
    vec3 sunDir = normalize(vec3(0.25, 1.0, -0.4));
    col += vec3(0.45, 0.75, 0.85) * pow(max(dot(d, sunDir), 0.0), 7.0) * 0.45 * uSun;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

// Entorno para reflejos: luz intensa arriba, azul en el horizonte, casi negro abajo
const envFragment = /* glsl */`
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 top = vec3(1.7, 2.1, 2.2);
    vec3 horizon = vec3(0.05, 0.22, 0.34);
    vec3 bottom = vec3(0.004, 0.015, 0.03);
    vec3 col = mix(bottom, horizon, smoothstep(-0.5, 0.0, d.y));
    col = mix(col, top, pow(smoothstep(0.1, 1.0, d.y), 1.6));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const TOP_TINT = new Color('#8fd3e6');

export function WaterVolume() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const dome = useRef();
  const uniforms = useMemo(() => ({
    uHorizon: { value: new Color() },
    uTop: { value: new Color() },
    uBottom: { value: new Color() },
    uSun: { value: 1 },
  }), []);

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const envScene = new Scene();
    const sky = new Mesh(
      new SphereGeometry(10, 48, 24),
      new ShaderMaterial({ vertexShader: domeVertex, fragmentShader: envFragment, side: BackSide }),
    );
    envScene.add(sky);
    const rt = pmrem.fromScene(envScene, 0.03);
    scene.environment = rt.texture;
    return () => {
      if (scene.environment === rt.texture) scene.environment = null;
      rt.dispose();
      pmrem.dispose();
      sky.geometry.dispose();
      sky.material.dispose();
    };
  }, [gl, scene]);

  useFrame(({ camera }) => {
    const p = depthState.smooth;
    const light = sunlight(p);
    const u = uniforms;
    waterColor(p, u.uHorizon.value);
    u.uTop.value.copy(u.uHorizon.value).lerp(TOP_TINT, 0.6 * light);
    u.uBottom.value.copy(u.uHorizon.value).multiplyScalar(0.22);
    u.uSun.value = light;
    scene.environmentIntensity = 0.08 + 0.92 * light;
    if (dome.current) dome.current.position.copy(camera.position);
  });

  return (
    <mesh ref={dome} renderOrder={-2} frustumCulled={false}>
      <sphereGeometry args={[200, 48, 24]}/>
      <shaderMaterial
        vertexShader={domeVertex}
        fragmentShader={domeFragment}
        uniforms={uniforms}
        side={BackSide}
        depthWrite={false}
        depthTest={false}
        fog={false}
      />
    </mesh>
  );
}
