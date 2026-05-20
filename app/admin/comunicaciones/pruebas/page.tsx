// app/admin/comunicaciones/pruebas/page.tsx

import { AdminHeader } from '@/components/admin/admin-header'
import { MessageTestPanel } from '@/components/admin/comunicacion/MessageTestPanel'
import { getActiveTemplates } from '@/lib/services/whatsapp-templates.service'

export const dynamic = 'force-dynamic'

export default async function PruebasMensajesPage() {
  let templates: { id: string; key: string; name: string; content: string }[] = []
  try {
    const all = await getActiveTemplates()
    templates = all.map(t => ({ id: t.id, key: t.key, name: t.name, content: t.content }))
  } catch {
    // DB caída: el panel funciona igual con mensaje libre, solo sin precargar plantillas.
    templates = []
  }

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Pruebas' },
        ]}
      />

      <div className="container mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Probar mensajes</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Mandá un mensaje de prueba a un número real para validar el bot, el
            formato y cómo se renderizan las variables. Podés escribir libre o
            precargar una plantilla.
          </p>
        </div>

        <MessageTestPanel templates={templates} />
      </div>
    </>
  )
}
