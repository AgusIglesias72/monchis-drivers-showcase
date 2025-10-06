// app/admin/configuracion/page.tsx

import { ComingSoonPage } from "@/components/admin/coming-soon-page"

export default function ConfiguracionPage() {
  return (
    <ComingSoonPage
      title="Configuración"
      description="Ajustes del sistema, usuarios y preferencias"
      breadcrumbs={[
        { label: "Configuración" }
      ]}
    />
  )
}