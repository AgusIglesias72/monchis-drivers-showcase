// app/admin/reportes/page.tsx

import { ComingSoonPage } from "@/components/admin/coming-soon-page"

export default function ReportesPage() {
  return (
    <ComingSoonPage
      title="Reportes"
      description="Generación y descarga de reportes del sistema"
      breadcrumbs={[
        { label: "Reportes" }
      ]}
    />
  )
}