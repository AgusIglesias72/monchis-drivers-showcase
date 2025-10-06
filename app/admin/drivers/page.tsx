// app/admin/drivers/page.tsx

import { ComingSoonPage } from "@/components/admin/coming-soon-page"

export default function DriversPage() {
  return (
    <ComingSoonPage
      title="Drivers Activos"
      description="Gestión de drivers actualmente trabajando en la plataforma"
      breadcrumbs={[
        { label: "Drivers Activos" }
      ]}
    />
  )
}