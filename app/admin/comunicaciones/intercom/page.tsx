// app/admin/comunicaciones/intercom/page.tsx
import { AdminHeader } from '@/components/admin/admin-header';
import { IntercomContent } from '@/components/admin/comunicacion/IntercomContent';

export const dynamic = 'force-dynamic';

export default function IntercomPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Intercom' },
        ]}
      />

      <div className="flex flex-1 flex-col container mx-auto">
        <div className="flex-1 p-8">
          <IntercomContent />
        </div>
      </div>
    </>
  );
}
