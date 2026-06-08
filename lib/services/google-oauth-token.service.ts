// lib/services/google-oauth-token.service.ts
//
// Resolver del refresh_token de Google OAuth. Prefiere DB
// (`google_oauth_credential` singleton id = "default"); si la DB no responde
// o no hay fila, cae a `process.env.GOOGLE_OAUTH_REFRESH_TOKEN` para no
// romper despliegues existentes. Usado por:
//   - lib/services/google-sheets-drive.service.ts (subida a Drive)
//   - app/api/cron/refresh-google-token/route.ts (heartbeat)
//   - app/api/admin/google-oauth/refresh-token/route.ts (rotación)

// Nota: este module NO usa `import 'server-only'` para que también pueda
// invocarse desde scripts/ (tsx) en testing. Sólo se referencia desde server
// (API routes, services y scripts), nunca desde Client Components.
import { prisma } from '@/lib/prisma'

const CREDENTIAL_ID = 'default'

// Cache en memoria del proceso para evitar pegarle a la DB en cada llamada
// a Drive. Se invalida cuando se sube un token nuevo vía
// `setRefreshToken()`. TTL corto para que entornos serverless tomen
// rotaciones razonablemente rápido sin atacar la DB.
let cached: { token: string; fetchedAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

export function invalidateRefreshTokenCache(): void {
  cached = null
}

/**
 * Devuelve el refresh_token vigente. Primero DB, luego env.
 * Nunca lanza por DB caída: si falla, intenta env y devuelve null si no hay.
 */
export async function getRefreshToken(): Promise<string | null> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.token
  }

  try {
    const row = await prisma.googleOAuthCredential.findUnique({
      where: { id: CREDENTIAL_ID },
      select: { refreshToken: true },
    })
    if (row?.refreshToken) {
      cached = { token: row.refreshToken, fetchedAt: Date.now() }
      return row.refreshToken
    }
  } catch (err) {
    // DB caída o tabla aún no migrada: seguir con env.
    console.warn(
      '[google-oauth-token] no se pudo leer DB, cayendo a env:',
      err instanceof Error ? err.message : err,
    )
  }

  const fromEnv = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (fromEnv) {
    cached = { token: fromEnv, fetchedAt: Date.now() }
    return fromEnv
  }

  return null
}

/**
 * Guarda un refresh_token nuevo (upsert sobre el singleton) e invalida el
 * cache local. Llamado desde el endpoint de rotación.
 */
export async function setRefreshToken(params: {
  refreshToken: string
  rotatedBy?: string
}): Promise<void> {
  await prisma.googleOAuthCredential.upsert({
    where: { id: CREDENTIAL_ID },
    create: {
      id: CREDENTIAL_ID,
      refreshToken: params.refreshToken,
      rotatedBy: params.rotatedBy ?? null,
    },
    update: {
      refreshToken: params.refreshToken,
      rotatedAt: new Date(),
      rotatedBy: params.rotatedBy ?? null,
      // Limpiamos errores previos: el token nuevo arranca con slate limpia.
      lastError: null,
      lastErrorAt: null,
    },
  })
  invalidateRefreshTokenCache()
}

/**
 * Marca un uso exitoso (llamado por el cron heartbeat al completar OK).
 * Best-effort: si la DB falla, sólo logueamos.
 */
export async function markRefreshTokenUsed(): Promise<void> {
  try {
    await prisma.googleOAuthCredential.update({
      where: { id: CREDENTIAL_ID },
      data: { lastUsedAt: new Date(), lastError: null, lastErrorAt: null },
    })
  } catch (err) {
    // Si no existe la fila aún (aún usando env), no hay nada que actualizar.
    if (
      err instanceof Error &&
      !err.message.includes('Record to update not found')
    ) {
      console.warn('[google-oauth-token] markUsed fallo:', err.message)
    }
  }
}

/**
 * Registra el último error al usar el refresh token. Llamado por el cron
 * cuando Google rechaza el refresh (token caducado/revocado).
 */
export async function markRefreshTokenError(message: string): Promise<void> {
  try {
    await prisma.googleOAuthCredential.update({
      where: { id: CREDENTIAL_ID },
      data: { lastError: message.slice(0, 1000), lastErrorAt: new Date() },
    })
  } catch (err) {
    if (
      err instanceof Error &&
      !err.message.includes('Record to update not found')
    ) {
      console.warn('[google-oauth-token] markError fallo:', err.message)
    }
  }
}
