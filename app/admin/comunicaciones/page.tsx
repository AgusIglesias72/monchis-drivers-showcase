// app/admin/comunicaciones/page.tsx
import { AdminHeader } from '@/components/admin/admin-header';
import { ComunicacionesContent } from '@/components/admin/comunicacion/ComunicacionesContent';

export default function ComunicacionesPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Comunicaciones" }
        ]}
      />
      
      <div className="flex flex-1 flex-col container mx-auto">
        <div className="flex-1 p-8">
          <ComunicacionesContent />
        </div>
      </div>
    </>
  );
}