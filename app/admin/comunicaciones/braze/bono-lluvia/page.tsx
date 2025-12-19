// app/admin/comunicaciones/braze/bono-lluvia/page.tsx
'use client'

import { useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { BonoPorLluviaExecute } from '@/components/admin/comunicacion/braze/BonoPorLluviaExecute'
import { BonoPorLluviaPreview } from '@/components/admin/comunicacion/braze/BonoPorLluviaPreview'
import { BonoPorLluviaConsideraciones } from '@/components/admin/comunicacion/braze/BonoPorLluviaConsideraciones'
import { BonoPorLluviaHistorial } from '@/components/admin/comunicacion/braze/BonoPorLluviaHistorial'

export default function BonoPorLluviaPage() {
  // State para la preview
  const [previewValues, setPreviewValues] = useState({
    horaInicio: '',
    horaFinal: '',
    monto: ''
  })

  // Key para refrescar el historial después de un envío exitoso
  const [historialRefreshKey, setHistorialRefreshKey] = useState(0)

  // TODO: Obtener estos valores de la base de datos o variables de entorno
  // Por ahora hardcodeados, pero deberías tener un trigger configurado en tu DB
  const BONO_LLUVIA_TRIGGER_ID = process.env.NEXT_PUBLIC_BRAZE_BONO_LLUVIA_TRIGGER_ID
  const BONO_LLUVIA_CAMPAIGN_ID = process.env.NEXT_PUBLIC_BRAZE_BONO_LLUVIA_CAMPAIGN_ID || ''

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        breadcrumbs={[
          { label: 'Comunicaciones', href: '/admin/comunicaciones' },
          { label: 'Braze', href: '/admin/comunicaciones/braze' },
          { label: 'Bono por Lluvia' },
        ]}
      />

      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Bono por Lluvia</h1>
          <p className="text-muted-foreground mt-2">
            Compensación por condiciones climáticas adversas
          </p>
        </div>

        {/* Layout de dos columnas */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Columna Izquierda - Formulario */}
            <div className="flex flex-col space-y-6">
              <BonoPorLluviaExecute
                triggerId={BONO_LLUVIA_TRIGGER_ID || ''}
                campaignId={BONO_LLUVIA_CAMPAIGN_ID || ''}
                onValuesChange={setPreviewValues}
                onExecuted={() => setHistorialRefreshKey(prev => prev + 1)}
              />

              <BonoPorLluviaConsideraciones />
            </div>

            {/* Columna Derecha - Preview permanente */}
            <div className="lg:sticky lg:top-6">
              <BonoPorLluviaPreview
                horaInicio={previewValues.horaInicio}
                horaFinal={previewValues.horaFinal}
                monto={previewValues.monto}
              />
            </div>
          </div>

          {/* Historial - ancho completo */}
          <BonoPorLluviaHistorial
            triggerId={BONO_LLUVIA_TRIGGER_ID || ''}
            refreshKey={historialRefreshKey}
          />
        </div>
      </div>
    </div>
  )
}
