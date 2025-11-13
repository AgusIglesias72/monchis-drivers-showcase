// app/admin/comunicaciones/pruebas/page.tsx

import { AdminHeader } from '@/components/admin/admin-header';
import { MessageTestPanel } from '@/components/admin/comunicacion/MessageTestPanel';

export default function PruebasMensajesPage() {
  return (
    <>
      <AdminHeader
        breadcrumbs={[
          { label: "Comunicaciones", href: "/admin/comunicaciones" },
          { label: "Pruebas" }
        ]}
      />
      
      <div className="flex flex-1 flex-col container mx-auto">
        <div className="flex-1 p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Panel de Pruebas</h1>
            <p className="text-muted-foreground">
              Envía mensajes de prueba y visualiza el resultado en tiempo real
            </p>
          </div>

          {/* Panel de pruebas */}
          <MessageTestPanel />
        </div>
      </div>
    </>
  );
}