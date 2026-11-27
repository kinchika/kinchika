import { textToHtml } from '../lib/content.js';

/**
 * Muestra un texto editado en el panel con formato simple
 * (**negrita**, *cursiva*, saltos de línea). El texto se escapa antes,
 * así que no se puede inyectar HTML desde el panel.
 */
export function Rich({ as: Tag = 'p', text, ...props }) {
  return <Tag {...props} dangerouslySetInnerHTML={{ __html: textToHtml(text) }}/>;
}
