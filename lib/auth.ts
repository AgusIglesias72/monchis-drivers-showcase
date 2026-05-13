// lib/auth.ts
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import type { AdminUser } from '@prisma/client'

export async function getCurrentUser() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const user = await prisma.adminUser.findUnique({
    where: { clerkId: userId },
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/sign-in')
  }

  if (!user.isActive) {
    throw new Error('Tu cuenta está desactivada. Contacta al administrador.')
  }

  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()

  if (!allowedRoles.includes(user.role)) {
    throw new Error('No tienes permisos para acceder a este recurso')
  }

  return user
}

/**
 * Para route handlers (app/api). Devuelve { ok, user } o { ok: false, response }.
 * Uso:
 *   const guard = await requireAdminApi()
 *   if (!guard.ok) return guard.response
 *   // guard.user disponible
 */
export type AdminApiGuard =
  | { ok: true; user: AdminUser }
  | { ok: false; response: NextResponse }

export async function requireAdminApi(opts?: { roles?: string[] }): Promise<AdminApiGuard> {
  const { userId } = await auth()
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const user = await prisma.adminUser.findUnique({ where: { clerkId: userId } })
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: admin access required' },
        { status: 403 },
      ),
    }
  }
  if (!user.isActive) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: account disabled' }, { status: 403 }),
    }
  }
  if (opts?.roles && !opts.roles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 }),
    }
  }

  return { ok: true, user }
}

/**
 * Para endpoints que pueden ser llamados desde la UI admin O desde un cron.
 * Acepta:
 *   - admin autenticado en Clerk (mismo gate que requireAdminApi)
 *   - O header `Authorization: Bearer <CRON_SECRET>` válido (timing-safe)
 */
export async function requireAdminOrCron(request: Request): Promise<AdminApiGuard | null> {
  // Si trae header Authorization, intentamos cron primero.
  const authHeader = request.headers.get('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const cronError = requireCronAuth(request)
    if (cronError) return { ok: false, response: cronError }
    return null
  }
  // Sin Bearer → debe ser admin Clerk.
  return await requireAdminApi()
}

/**
 * Para crons llamados por Vercel Cron. Verifica `Authorization: Bearer <CRON_SECRET>`
 * con comparación timing-safe. Devuelve null si OK o NextResponse 401/500.
 */
export function requireCronAuth(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }

  const header = request.headers.get('authorization') ?? ''
  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const provided = header.slice(prefix.length)
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}