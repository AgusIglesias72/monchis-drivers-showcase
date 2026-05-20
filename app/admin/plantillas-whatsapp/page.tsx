// app/admin/plantillas-whatsapp/page.tsx

import { AdminHeader } from '@/components/admin/admin-header'
import { getAllTemplates } from '@/lib/actions/whatsapp-templates.actions'
import { TemplatesManagementContent } from '@/components/admin/templates-management-content'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DatabaseZap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PlantillasWhatsAppPage() {
  const result = await getAllTemplates()

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Plantillas' },
        ]}
      />

      {!result.success ? (
        <div className="container mx-auto px-6 py-8">
          <Alert variant="destructive">
            <DatabaseZap className="h-4 w-4" />
            <AlertTitle>No pudimos cargar las plantillas</AlertTitle>
            <AlertDescription>
              {result.error || 'Error desconocido al consultar la base de datos.'}
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <TemplatesManagementContent initialTemplates={result.templates} />
      )}
    </>
  )
}
