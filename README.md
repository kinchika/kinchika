# Kinchika · Club de Buceo y Apnea

Sitio web inmersivo del Club de Buceo Kinchika (Lo Prado, Chile). Mientras haces scroll, desciendes desde
la superficie hasta −100 m: la luz, el color del agua, la fauna y el sonido cambian con la profundidad.

## Tecnología

- **Vite + React 19**: contenido en componentes (`src/sections`) y datos en `src/data/kinchika.js`.
- **Three.js + React Three Fiber** (`src/scene`): escena 3D de fondo que se carga aparte para no frenar el primer render.
  - portada con el video del atardecer y la línea de flotación; bajo ella, el mar 3D;
  - barco de apoyo en la superficie y, desde su popa, el cabo de descenso con marcas cada 10 m;
  - buzo que acompaña el descenso, exhala burbujas y da la vuelta al subir;
  - paredón rocoso con huirales, cáusticas de luz y rayos que se apagan al bajar;
  - el agua absorbe primero el rojo y luego el verde, según profundidad y distancia;
  - cardúmenes de anchoveta, jurel y reineta, nieve marina y medusas en el abismo;
  - calidad adaptable: si el equipo no da abasto, baja la resolución y los efectos.
  - En celular (≤ 900 px) se muestran la información, los peces y el fondo, sin barco, cabo ni buzo.
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
| Tamaño, posición y giros del barco de la portada | `src/lib/boatTuning.js` |
| Estilos: base y portada · secciones y paneles · escena y videos | `src/styles/base.css` · `sections.css` · `scene.css` |
| Créditos de modelos y texturas de terceros (se muestran en el pie) | `CREDITS` en `src/assets.config.js` |
| Imágenes, video y audio | `public/` |

## Generar videos, fotos y modelos 3D

Ver **[pipeline/README.md](pipeline/README.md)**: se generan con la CLI de Higgsfield y los modelos se procesan con Blender.
