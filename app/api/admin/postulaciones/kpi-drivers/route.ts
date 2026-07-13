import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

const SELECT = {
  id: true,
  fullName: true,
  firstName: true,
  lastName: true,
  city: true,
  cedula: true,
  createdAt: true,
  status: true,
  onboardingStatus: true,
  onboardingScheduledAt: true,
  onboardingCompletedAt: true,
} as const

type Row = Awaited<ReturnType<typeof prisma.formDriver.findMany<{ select: typeof SELECT }>>>[number]

function toDriver(r: Row) {
  const name = r.fullName || `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Sin nombre'
  return {
    id: r.id,
    fullName: name,
    initials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    city: r.city ?? null,
    cedula: r.cedula ?? null,
    createdAt: r.createdAt.toISOString(),
    date: (r.onboardingCompletedAt ?? r.onboardingScheduledAt ?? r.createdAt).toISOString(),
    status: r.status,
    onboardingStatus: r.onboardingStatus,
  }
}

export async function GET(req: Request) {
  const admin = await getCurrentUser()
  if (!admin) return NextResponse.json({}, { status: 401 })

  const { searchParams } = new URL(req.url)
  const kpi = searchParams.get('kpi')
  const d7ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  let rows: Row[] = []

  if (kpi === 'iniciadas') {
    rows = await prisma.formDriver.findMany({
      where: { createdAt: { gte: d7ago } },
      select: SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  } else if (kpi === 'completadas') {
    rows = await prisma.formDriver.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: d7ago } },
      select: SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  } else if (kpi === 'agendados') {
    rows = await prisma.formDriver.findMany({
      where: {
        onboardingStatus: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        onboardingScheduledAt: { gte: d7ago },
      },
      select: SELECT,
      orderBy: { onboardingScheduledAt: 'desc' },
      take: 100,
    })
  } else if (kpi === 'capacitados') {
    rows = await prisma.formDriver.findMany({
      where: { onboardingStatus: 'COMPLETED', onboardingCompletedAt: { gte: d7ago } },
      select: SELECT,
      orderBy: { onboardingCompletedAt: 'desc' },
      take: 100,
    })
  } else {
    return NextResponse.json({ error: 'kpi inválido' }, { status: 400 })
  }

  return NextResponse.json({ drivers: rows.map(toDriver) })
}
