# Panel de contenido del sitio (Pages CMS)

El contenido de www.kinchika.cl se edita desde un panel web, sin tocar código:
**https://app.pagescms.org**

Es gratuito. Cada vez que alguien guarda un cambio, el panel hace un commit en `main`
y GitHub Actions publica el sitio de nuevo. El cambio se ve en línea en unos 2 minutos.

## Quién puede editar

- **Con cuenta de GitHub:** cualquier miembro de la organización
  [kinchika](https://github.com/kinchika) con permiso de escritura en el repo.
- **Sin cuenta de GitHub:** quien administra el panel puede invitar personas por correo
  (Pages CMS → el repo → Settings → Collaborators). Los invitados pueden editar contenido y
  fotos, pero no la configuración del panel.

## Qué se puede editar

| En el panel | Qué cambia en el sitio |
|---|---|
| Eventos | Calendario de próximos eventos (se ordenan solos por fecha) |
| Resultados | Tablas de resultados de competencias |
| Directiva | Directivas por año, con cargos y fotos |
| Horarios | Tarjetas de entrenamientos |
| Historia del apnea | Línea de tiempo |
| Aliados | Logos de la franja "Nos apoyan" |
| Textos del sitio → Portada, misión e historia | Portada, presentación, misión, disciplinas, historia y profesores |
| Textos del sitio → Contacto, lugar y pie | WhatsApp, correo, Instagram, dirección, mapa y pie de página |
| Textos del sitio → Secciones | **Mostrar u ocultar** cada sección, sus títulos y su nombre en el menú |

La escena 3D, los colores, el diseño y los simuladores de tablas de apnea se cambian en el
código, no en el panel.

## Formato de los textos

- `**texto**` → **negrita**
- `*texto*` → *cursiva*
- Un salto de línea en el texto es un salto de línea en el sitio.

Varios textos tienen dos versiones: una para **computador** y otra **corta para celular**.
Si cambias una, revisa también la otra.

## Fotos

- Súbelas **livianas**: idealmente menos de 500 KB, en `.jpg` o `.webp`. Una foto de celular
  sin reducir pesa 3 a 5 MB y hace lento el sitio con datos móviles.
- Para reducirlas gratis: https://squoosh.app (ancho de 1200 px, calidad 75).
- Los logos de aliados se ven mejor en PNG blanco con fondo transparente.

## Buenas prácticas

- Para sacar un evento del sitio sin borrarlo, desmarca **Mostrar en el sitio**.
- Para ocultar una sección completa (por ejemplo Resultados), usa
  **Textos del sitio → Secciones**. También desaparece del menú.
- Todo cambio queda en el historial del repo (quién, cuándo y qué). Si algo sale mal, se
  puede volver atrás desde GitHub (pestaña *Commits*) o pidiéndoselo a quien administra el sitio.
- La configuración de los formularios está en `.pages.yml`, en la raíz del repo, y los datos
  en `src/content/*.json`. Si se agrega un campo nuevo a un archivo de datos, hay que agregarlo
  también en `.pages.yml`; si no, el panel lo borra al guardar.
