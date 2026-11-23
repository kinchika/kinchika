# Pipeline de assets: Higgsfield + Blender

Este proceso genera los videos, fotos y modelos 3D del sitio. **Se corre en tu PC con Windows.**
Si un archivo todavía no existe, el sitio funciona igual: simplemente no lo muestra.

```
Higgsfield (nube)                    Blender (tu PC)                 Sitio
─────────────────                    ───────────────                 ─────
videos  ───────────────────────────────────────────────────────────▶ public/video/higgsfield/*.mp4
fotos   ───────────────────────────────────────────────────────────▶ public/img/eventos/*.jpg
3D crudo ──▶ pipeline/out/*.glb ──▶ preparar_modelo.py ──────────▶ public/models/*.glb
```

## 1. Requisitos (una sola vez)

1. **Node.js 20 o superior**: <https://nodejs.org>
2. Dependencias del sitio, desde la carpeta del repositorio:
   ```powershell
   npm install
   ```
3. **CLI oficial de Higgsfield** (gratuita; lo que se genera consume créditos de tu cuenta):
   ```powershell
   npm install -g @higgsfield/cli
   higgsfield auth login      # abre el navegador para iniciar sesión
   higgsfield account         # muestra tus créditos
   ```
4. **Blender 4.2 o superior**: el script lo encuentra solo en `C:\Program Files\Blender Foundation\`.

## 2. Generar con Higgsfield

Primero revisa cuánto costaría, sin gastar créditos:

```powershell
powershell -ExecutionPolicy Bypass -File pipeline\higgsfield\generar-assets.ps1 -Cotizar
```

Luego genera. Antes de cada archivo te muestra el costo y te pide confirmación:

```powershell
# todo
powershell -ExecutionPolicy Bypass -File pipeline\higgsfield\generar-assets.ps1
# o por partes
powershell -ExecutionPolicy Bypass -File pipeline\higgsfield\generar-assets.ps1 -Solo videos
powershell -ExecutionPolicy Bypass -File pipeline\higgsfield\generar-assets.ps1 -Solo fotos
powershell -ExecutionPolicy Bypass -File pipeline\higgsfield\generar-assets.ps1 -Solo 3d
```

| Qué | Modelo | Destino |
|---|---|---|
| Cardumen de jurel, descenso por la boya, abismo bioluminiscente | `seedance_2_0` · 1080p · 16:9 | `public/video/higgsfield/` |
| Fotos de los 5 tipos de evento | `nano_banana_2` · 2K · 16:9 | `public/img/eventos/*.jpg` |
| Buzo (+ esqueleto y animación de nado) | `tripo_3d` → `3d_rigging` | `pipeline/out/` |
| Jurel, reineta, anchoveta | `tripo_3d` | `pipeline/out/` |

Opciones útiles:
- `-Forzar` vuelve a generar aunque el archivo ya exista.
- `-Si` no pide confirmación.
- `-AnimacionId 123` elige la animación del buzo. Para ver las disponibles:
  `higgsfield preset list animation-action --query swim`

Los prompts están en el mismo script (`$VIDEOS`, `$FOTOS`, `$MODELOS_3D`) para que los ajustes.
Los videos usan **fondo negro puro**: en el sitio se mezclan con el agua (`mix-blend-mode: screen`).

> No generes fotos de personas reales del club (directiva, profesores): para eso usa fotos reales.

## 3. Procesar los modelos con Blender

```powershell
powershell -ExecutionPolicy Bypass -File pipeline\blender\procesar-modelos.ps1
```

Por cada modelo crudo en `pipeline/out`, `preparar_modelo.py`:
- reduce la cantidad de caras (buzo ≤ 12.000, peces ≤ 1.500) y las texturas a 1024 px;
- **buzo**: lo escala a 1,8 m, conserva esqueleto y animaciones, y guarda además `buzo.blend`
  para que puedas retocar la animación en Blender y volver a exportar;
- **peces**: los une en una sola malla, los orienta mirando a +X y los deja de largo 1
  (la cola la anima el sitio). Si un pez quedó al revés: `-Invertir jurel`.

¿Quieres probar el proceso sin gastar créditos? `procesar-modelos.ps1 -Demo` crea modelos de prueba
(bórralos de `public/models` después).

Para un modelo hecho a mano en Blender, expórtalo y procésalo igual:

```powershell
& "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe" -b -P pipeline\blender\preparar_modelo.py -- `
  --tipo pez --entrada C:\ruta\mi-pez.glb --salida public\models\jurel.glb
```

## 4. Ver y ajustar

```powershell
npm run dev
```

Abre <http://localhost:5173>. En `src/assets.config.js` se ajusta todo sin tocar la escena:
- `INTERLUDES`: textos y rutas de los videos.
- `MODELS`: posición, tamaño, giro, animación y tramo de profundidad en que el buzo acompaña la cámara.
- `FISH_MODELS`: qué `.glb` usa cada cardumen.

Cuando esté listo: `npm run build` genera la carpeta `dist/` para publicar.
