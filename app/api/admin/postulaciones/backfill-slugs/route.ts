import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { driverSlugBase } from '@/lib/services/postulacion.service'

export const runtime = 'nodejs'
export const maxDuration = 300

const CHUNK = 50

// Regenera TODOS los slugs al formato limpio (nombre, con sufijo -2/-3 ante
// duplicados). Procesa por createdAt asc: el postulante más antiguo se queda
// con el slug sin sufijo. Dos fases para no chocar la unique constraint con
// slugs viejos que van a cambiar.
export async function POST() {
  const admin = await getCurrentUser()
  if (!admin) return NextResponse.json({}, { status: 401 })

  const drivers = await prisma.formDriver.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, fullName: true, firstName: true, lastName: true, slug: true },
  })

  const counters = new Map<string, number>()
  const changes: { id: string; slug: string }[] = []
  let unchanged = 0

  for (const d of drivers) {
    const name = d.fullName || [d.firstName, d.lastName].filter(Boolean).join(' ')
    const base = driverSlugBase(name, d.id)
    const seen = counters.get(base) ?? 0
    counters.set(base, seen + 1)
    const slug = seen === 0 ? base : `${base}-${seen + 1}`
    if (d.slug === slug) {
      unchanged++
    } else {
      changes.push({ id: d.id, slug })
    }
  }

  if (changes.length > 0) {
    const ids = changes.map((c) => c.id)
    for (let i = 0; i < ids.length; i += 500) {
      await prisma.formDriver.updateMany({
        where: { id: { in: ids.slice(i, i + 500) } },
        data: { slug: null },
      })
    }
    for (let i = 0; i < changes.length; i += CHUNK) {
      await prisma.$transaction(
        changes
          .slice(i, i + CHUNK)
          .map((c) =>
            prisma.formDriver.update({ where: { id: c.id }, data: { slug: c.slug } }),
          ),
      )
    }
  }

  return NextResponse.json({ total: drivers.length, updated: changes.length, unchanged })
}
