// lib/utils/blob-paths.ts
//
// Helpers para construir paths de Vercel Blob de forma segura.
// Bugs históricos que esto previene:
//   - Path traversal: `${cedula}/${file.name}` con file.name = "../admin/secret.pdf"
//   - Enumeración: usar cédula en el path → atacante con cédula válida lista
//     blobs del postulante
//   - Bypass de validación de tipo: file.type validado pero extensión derivada
//     del file.name del usuario (un .jpg validado se subía como ".php")

import { nanoid } from 'nanoid'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
}

/**
 * Extensión segura derivada exclusivamente del mime-type ya validado.
 * Nunca usar la extensión del filename del cliente: puede mentir.
 */
export function safeExtensionFromMime(mime: string): string {
  return MIME_TO_EXT[mime.toLowerCase()] ?? 'bin'
}

/**
 * Acepta solo caracteres seguros para un segmento de path. Bloquea ../, espacios,
 * separadores de path, etc. Si queda vacío, devuelve fallback.
 */
export function safePathSegment(input: string, fallback = 'unknown'): string {
  const cleaned = input.replace(/[^a-zA-Z0-9_-]/g, '')
  return cleaned.length > 0 ? cleaned.slice(0, 64) : fallback
}

/**
 * Genera un blob path opaco para documentos de drivers. No usa PII (cédula)
 * para que el path no sea enumerable conociendo el documento del postulante.
 */
export function buildDriverDocumentPath(opts: {
  formDriverId: string
  documentType: string
  mime: string
}): string {
  const id = safePathSegment(opts.formDriverId)
  const type = safePathSegment(opts.documentType)
  const random = nanoid(12)
  const ext = safeExtensionFromMime(opts.mime)
  return `drivers/${id}/${type}-${Date.now()}-${random}.${ext}`
}

/**
 * Variante para el formulario público (pre-registro). Usa sessionId en vez de
 * formDriverId porque el FormDriver podría no existir aún.
 */
export function buildFormDocumentPath(opts: {
  sessionId: string
  documentType: string
  mime: string
}): string {
  const sid = safePathSegment(opts.sessionId)
  const type = safePathSegment(opts.documentType)
  const random = nanoid(12)
  const ext = safeExtensionFromMime(opts.mime)
  return `form-documents/${sid}/${type}-${Date.now()}-${random}.${ext}`
}
