// app/admin/gestion/turnos/page.tsx

import { TurnosDashboard } from "@/components/admin/gestion/turnos-dashboard"
import { getAvailableComparisonWeeks } from "@/lib/services/turnos-comparison.service"
import { fetchAllZoneShifts } from "@/lib/services/turnos.service"

export const revalidate = 600

export default async function TurnosPage() {
  const [{ shifts, fetchedAt, errors }, availableWeeks] = await Promise.all([
    fetchAllZoneShifts(),
    getAvailableComparisonWeeks(),
  ])

  return (
    <TurnosDashboard
      initialShifts={shifts}
      fetchedAtIso={fetchedAt.toISOString()}
      errors={errors}
      availableWeeks={availableWeeks}
    />
  )
}
