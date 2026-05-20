// lib/utils/whatsapp-format.ts
//
// Helpers para render del formato de WhatsApp (negrita/cursiva/tachado/mono) y
// para interpolar variables de plantilla. Usado por el editor de plantillas y el
// panel de pruebas.

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  )
}

/**
 * Convierte la sintaxis de formato de WhatsApp a HTML simple para preview.
 * Soporta: *negrita*, _cursiva_, ~tachado~, `mono`. Las marcas tienen que abrir
 * y cerrar en la misma línea. SIEMPRE escapa el HTML primero (seguro contra XSS
 * porque el contenido lo edita el admin, pero conviene de todas formas).
 */
export function whatsappToHtml(content: string): string {
  let html = escapeHtml(content)
  html = html.replace(/\*([^*\n]+?)\*/g, '<strong>$1</strong>')
  html = html.replace(/_([^_\n]+?)_/g, '<em>$1</em>')
  html = html.replace(/~([^~\n]+?)~/g, '<s>$1</s>')
  html = html.replace(
    /`([^`\n]+?)`/g,
    '<code class="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5 text-[12px]">$1</code>',
  )
  return html
}

/**
 * Reemplaza {var} en el template con los valores del map (case-insensitive).
 * Variables ausentes quedan vacías para no enviar "{xxx}".
 */
export function interpolateVariables(
  content: string,
  variables: Record<string, string>,
): string {
  return content.replace(/\{([^}]+)\}/g, (_, raw) => {
    const key = String(raw).trim().toLowerCase()
    return variables[key] ?? ''
  })
}
