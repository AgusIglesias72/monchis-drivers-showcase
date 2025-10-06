// app/admin/comunicaciones/page.tsx

import { ComingSoonPage } from "@/components/admin/coming-soon-page"

export default function ComunicacionesPage() {
  return (
    <ComingSoonPage
      title="Comunicaciones"
      description="Sistema de mensajería y notificaciones para drivers"
      breadcrumbs={[
        { label: "Comunicaciones" }
      ]}
    />
  )
}