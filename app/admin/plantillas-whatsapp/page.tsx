// app/admin/plantillas-whatsapp/page.tsx

import { getAllTemplates } from "@/lib/actions/whatsapp-templates.actions"
import { TemplatesManagementContent } from "@/components/admin/templates-management-content"

export const dynamic = 'force-dynamic'

export default async function PlantillasWhatsAppPage() {
  const result = await getAllTemplates()

  if (!result.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error al cargar las plantillas: {result.error}</p>
        </div>
      </div>
    )
  }

  return <TemplatesManagementContent initialTemplates={result.templates} />
}
