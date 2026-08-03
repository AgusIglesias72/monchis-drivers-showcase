import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser()
  if (!admin) return NextResponse.json({}, { status: 401 })

  const { id } = await params

  const driver = await prisma.formDriver.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      fullName: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      city: true,
      cedula: true,
      status: true,
      onboardingStatus: true,
      onboardingScheduledAt: true,
      onboardingCompletedAt: true,
      rucStatus: true,
      createdAt: true,
      currentStep: true,
      workZone: true,
      documents: {
        select: { id: true, documentType: true, status: true },
        orderBy: { createdAt: 'desc' },
      },
      agentRuns: {
        select: { id: true, decision: true, summary: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      equipmentPayments: {
        select: { id: true, status: true, paymentProofUrl: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      driverContacts: {
        select: { id: true },
      },
      onboardingAttendances: {
        select: { id: true, status: true, event: { select: { scheduledDate: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!driver) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const name =
    driver.fullName ||
    `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.trim() ||
    'Sin nombre'

  return NextResponse.json({
    id: driver.id,
    slug: driver.slug,
    fullName: name,
    initials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    phoneNumber: driver.phoneNumber,
    email: driver.email,
    city: driver.city,
    cedula: driver.cedula,
    workZone: driver.workZone,
    status: driver.status,
    onboardingStatus: driver.onboardingStatus,
    onboardingScheduledAt: driver.onboardingScheduledAt?.toISOString() ?? null,
    onboardingCompletedAt: driver.onboardingCompletedAt?.toISOString() ?? null,
    rucStatus: driver.rucStatus,
    createdAt: driver.createdAt.toISOString(),
    currentStep: driver.currentStep,
    documents: driver.documents,
    latestAgentRun: driver.agentRuns[0] ?? null,
    latestPayment: driver.equipmentPayments[0] ?? null,
    contactCount: driver.driverContacts.length,
    latestAttendance: driver.onboardingAttendances[0] ?? null,
  })
}
