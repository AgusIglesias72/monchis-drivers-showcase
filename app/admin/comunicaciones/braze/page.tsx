// app/admin/comunicaciones/braze/page.tsx

import { AdminHeader } from '@/components/admin/admin-header'
import { BrazeMainContent } from '@/components/admin/comunicacion/braze/BrazeMainContent'

export default function BrazePage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Braze', href: '/admin/comunicaciones/braze' },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 container mx-auto py-6">
        <BrazeMainContent />
      </div>
    </>
  )
}
