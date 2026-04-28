// app/admin/gestion/drivers/[driverId]/page.tsx

import { notFound } from "next/navigation"

import { DriverDetailContent } from "@/components/admin/gestion/driver-detail-content"
import {
  getDriverProcessedDays,
  getDriverStats,
} from "@/lib/services/monchis-driver-attendance.service"
import { prisma } from "@/lib/prisma"

const REQUEST_ID_RE = /^[a-f0-9]{24}$/i
const DEFAULT_DAYS = 30

interface PageProps {
  params: Promise<{ driverId: string }>
  searchParams: Promise<{ days?: string; zone?: string; turn?: string }>
}

export const dynamic = "force-dynamic"

export default async function DriverDetailPage({ params, searchParams }: PageProps) {
  const { driverId } = await params
  const { days: daysStr, zone, turn } = await searchParams

  if (!REQUEST_ID_RE.test(driverId)) notFound()

  const days = Math.max(1, Math.min(Number(daysStr) || DEFAULT_DAYS, 90))
  const filters = {
    zone: zone?.trim() || undefined,
    turn: turn?.trim() || undefined,
  }

  const driver = await prisma.monchisDriverCache.findUnique({
    where: { driverId },
  })

  if (!driver) {
    return (
      <DriverDetailContent
        driverId={driverId}
        driver={null}
        days={days}
      />
    )
  }

  const [stats, processedInfo] = await Promise.all([
    getDriverStats(driverId, days, filters),
    getDriverProcessedDays(driverId, days),
  ])

  return (
    <DriverDetailContent
      driverId={driverId}
      driver={{
        driverId: driver.driverId,
        firstName: driver.firstName,
        lastName: driver.lastName,
        fullName: driver.fullName,
        documentNumber: driver.documentNumber,
        email: driver.email,
        phone: driver.phone,
        phoneValidatedAtIso: driver.phoneValidatedAt?.toISOString() ?? null,
        birthDateIso: driver.birthDate?.toISOString() ?? null,
        enabled: driver.enabled,
        createdAtRemoteIso: driver.createdAtRemote?.toISOString() ?? null,
        updatedAtRemoteIso: driver.updatedAtRemote?.toISOString() ?? null,
        syncedAtIso: driver.syncedAt.toISOString(),
      }}
      days={days}
      stats={stats}
      processed={{
        ...processedInfo,
        lastProcessedAtIso: processedInfo.lastProcessedAt?.toISOString() ?? null,
      }}
    />
  )
}
