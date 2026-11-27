/*
 * Barco de apoyo en la superficie: de su popa cuelga el cabo de descenso.
 * Modelo: "Motor Yacht" de gogiart (Sketchfab, CC BY 4.0), con el casco
 * pintado oscuro y simplificado en pipeline/blender/preparar_barco.py.
 *
 * El modelo viene en metros, con la proa hacia −X, la popa en x = 0 y la
 * línea de flotación en y = 0. DescentLine decide dónde va (la popa sobre la
 * columna del cabo) y su escala en pantalla.
 */
import { forwardRef, useEffect, useMemo, useState } from 'react';
import { CanvasTexture, Color, DoubleSide, SRGBColorSpace } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BOAT_URL = 'models/barco.glb';
/** Eslora del modelo (m). */
export const BOAT_LENGTH = 9.43;
/**
 * Punto de amarre del cabo (m, coordenadas del modelo): en la popa, a la altura
 * de la línea de flotación y por fuera del costado que mira a la cámara, así el
 * cabo sale del agua junto al casco y cae recto por delante de la obra viva.
 */
export const BOAT_ATTACH = [-1.0, 0, 1.36];   // el espejo de popa está ~0,5 m antes de la escalera (x = 0)

/** Uniforms compartidos: altura del agua (mundo) y color del agua bajo la superficie. */
export const boatUniforms = {
  uWaterY: { value: 0 },
  uWaterTint: { value: new Color('#2a8296') },   // turquesa del agua bajo la superficie (portada)
};

/**
 * Lo que queda bajo la línea de flotación se ve a través del agua (azulado y
 * apagado); lo de arriba no lleva la niebla submarina de la escena.
 */
function underwaterTint(material) {
  if (material.userData.kinchikaBoat) return;
  material.userData.kinchikaBoat = true;
  material.fog = false;
  const base = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    base.call(material, shader, renderer);
    Object.assign(shader.uniforms, boatUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vBoatY;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vBoatY = (modelMatrix * vec4(transformed, 1.0)).y;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWaterY;\nuniform vec3 uWaterTint;\nvarying float vBoatY;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        // bajo el agua el casco casi se funde con el turquesa: solo queda su silueta
        float under = smoothstep(uWaterY + 0.02, uWaterY - 0.45, vBoatY);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uWaterTint * 0.6 + gl_FragColor.rgb * 0.08, under * 0.9);`);
  };
  material.customProgramCacheKey = () => 'kinchika-boat';
  material.needsUpdate = true;
}

/**
 * Bandera de Chile, con las proporciones oficiales: rectángulo 3:2, franja blanca arriba
 * y roja abajo, cuadro azul del alto de la franja blanca junto al mástil, y estrella
 * blanca de cinco puntas cuyo diámetro es la mitad del lado del cuadro.
 */
function makeFlag() {
  const W = 300, H = 200, side = H / 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, side);
  g.fillStyle = '#d52b1e';
  g.fillRect(0, side, W, side);
  g.fillStyle = '#0039a6';
  g.fillRect(0, 0, side, side);
  // estrella: 10 vértices alternando radio exterior e interior, con una punta hacia arriba
  const cx = side / 2, cy = side / 2, rOut = side / 4, rIn = rOut * 0.382;
  g.fillStyle = '#ffffff';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? rIn : rOut;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  g.closePath();
  g.fill();
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

const loader = new GLTFLoader();

/** Grupo del barco (en metros). El padre lo ubica y escala cada cuadro. */
export const Boat = forwardRef(function Boat({ flagRef, onReady }, ref) {
  const [scene, setScene] = useState(null);
  const flagTex = useMemo(makeFlag, []);

  useEffect(() => {
    let alive = true;
    loader.loadAsync(BOAT_URL).then((gltf) => {
      if (!alive) return;
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          underwaterTint(m);
          // filtrado anisotrópico: la cubierta de madera y las ventanas se ven en ángulo
          // y sin esto la textura se emborrona o parpadea
          ['map', 'normalMap', 'roughnessMap'].forEach((k) => {
            if (m[k]) { m[k].anisotropy = 8; m[k].needsUpdate = true; }
          });
        });
      });
      setScene(gltf.scene);
      onReady?.(true);
    }).catch((err) => {
      console.warn('[kinchika] No se pudo cargar el barco:', err);
      onReady?.(false);
    });
    return () => { alive = false; };
  }, [onReady]);

  useEffect(() => () => flagTex.dispose(), [flagTex]);

  return (
    <group ref={ref} visible={!!scene}>
      {scene && <primitive object={scene}/>}
      {/* mástil apoyado en la cubierta de popa (cubierta a ~0,91 m sobre el agua),
          con base y la bandera de Chile arriba */}
      <mesh position={[-1.6, 0.95, 0.8]}>
        <cylinderGeometry args={[0.07, 0.09, 0.08, 10]}/>
        <meshStandardMaterial color="#c9ccd0" metalness={0.6} roughness={0.35} fog={false}/>
      </mesh>
      <mesh position={[-1.6, 1.75, 0.8]}>
        <cylinderGeometry args={[0.025, 0.03, 1.6, 8]}/>
        <meshStandardMaterial color="#e8e8e8" metalness={0.4} roughness={0.4} fog={false}/>
      </mesh>
      <group ref={flagRef} position={[-1.6, 2.32, 0.8]}>
        <mesh position={[0.3, 0, 0]}>
          <planeGeometry args={[0.6, 0.4]}/>
          <meshStandardMaterial map={flagTex} side={DoubleSide} roughness={0.8}
            emissive="#ffffff" emissiveMap={flagTex} emissiveIntensity={0.12} fog={false}/>
        </mesh>
      </group>
    </group>
  );
});
