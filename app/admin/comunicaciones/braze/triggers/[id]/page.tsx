// app/admin/comunicaciones/braze/triggers/[id]/page.tsx

import { AdminHeader } from '@/components/admin/admin-header'
import { BrazeTriggerExecuteContent } from '@/components/admin/comunicacion/braze/BrazeTriggerExecuteContent'

export default async function BrazeTriggerExecutePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Braze', href: '/admin/comunicaciones/braze' },
          { label: 'Ejecutar', href: `/admin/comunicaciones/braze/triggers/${id}` },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 container mx-auto py-6">
        <BrazeTriggerExecuteContent triggerId={id} />
      </div>
    </>
  )
}
