import { createHash } from 'crypto'

// Usuario dedicado para E2E. Si E2E_CLERK_USER_EMAIL/PASSWORD están seteadas se
// usan esas credenciales (usuario existente); si no, auth.setup.ts aprovisiona
// este usuario en la instancia de desarrollo de Clerk y en la tabla AdminUser.
// La contraseña se deriva del CLERK_SECRET_KEY para no committear un secreto y
// que sea estable entre corridas.
export const E2E_USER_EMAIL =
  process.env.E2E_CLERK_USER_EMAIL || 'e2e-admin+clerk_test@monchis.com.py'

export function e2eUserPassword(): string {
  if (process.env.E2E_CLERK_USER_PASSWORD) return process.env.E2E_CLERK_USER_PASSWORD
  const secret = process.env.CLERK_SECRET_KEY
  if (!secret) throw new Error('CLERK_SECRET_KEY no está seteada; no puedo derivar la contraseña E2E')
  return `E2e!${createHash('sha256').update(`${secret}:e2e-user`).digest('hex').slice(0, 24)}`
}

export const E2E_TITLE_PREFIX = '[E2E]'
