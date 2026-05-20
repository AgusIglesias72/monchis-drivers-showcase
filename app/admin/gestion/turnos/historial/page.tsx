// app/admin/gestion/turnos/historial/page.tsx
//
// Vista de consumo del registro histórico de turnos. Las fotos las toma el cron
// horario (`0 * * * *`); acá se navegan por día/hora de captura para ver la
// cobertura de ese momento y el diff (altas/bajas) vs la hora anterior.
// La vista en vivo (/admin/gestion/turnos) queda intacta.

import { TurnosHistorialContent } from "@/components/admin/gestion/turnos-historial-content"
import {
  getSnapshotDetail,
  getSnapshotList,
} from "@/lib/services/turnos-snapshot-read.service"

export const dynamic = "force-dynamic"

export default async function TurnosHistorialPage() {
  const [snapshots, latest] = await Promise.all([
    getSnapshotList(),
    getSnapshotDetail(),
  ])

  return (
    <TurnosHistorialContent snapshots={snapshots} initialDetail={latest} />
  )
}
