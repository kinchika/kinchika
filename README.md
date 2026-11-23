# Kinchika · Club de Buceo y Apnea

Sitio web inmersivo del Club de Buceo Kinchika (Lo Prado, Chile). Mientras haces scroll, desciendes desde
la superficie hasta −100 m: la luz, el color del agua, la fauna y el sonido cambian con la profundidad.

## Tecnología

- **Vite + React 19**: contenido en componentes (`src/sections`) y datos en `src/data/kinchika.js`.
- **Three.js + React Three Fiber** (`src/scene`): escena 3D de fondo que se carga aparte para no frenar el primer render.
  - superficie con cáusticas y rayos de luz que se apagan al bajar;
  - nieve marina y burbujas;
  - cardúmenes de anchoveta, jurel y reineta, con nado animado por shader;
  - la boya del club con su cabo y marcas cada 10 m;
  - medusas bioluminiscentes en el abismo;
  - espacio para modelos `.glb` animados (buzo) hechos con Higgsfield + Blender.
- **Audio por profundidad**: un filtro pasa-bajos va apagando la superficie a medida que desciendes.
- Accesible: navegación por teclado y respeto a `prefers-reduced-motion`. Si el equipo no tiene WebGL, se muestra un degradado de respaldo.

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # genera dist/ para publicar
npm run preview   # sirve dist/ localmente
```

## Contenido

| Qué | Dónde |
|---|---|
| Eventos, resultados, directiva, línea de tiempo, horarios, aliados | `src/data/kinchika.js` |
| Textos de cada sección | `src/sections/*.jsx` |
| Videos, modelos 3D y su ubicación en la escena | `src/assets.config.js` |
| Imágenes, video y audio | `public/` |

## Generar videos, fotos y modelos 3D

Ver **[pipeline/README.md](pipeline/README.md)**: se generan con la CLI de Higgsfield y los modelos se procesan con Blender.
