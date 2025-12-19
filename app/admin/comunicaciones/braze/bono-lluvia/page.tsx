// app/admin/comunicaciones/braze/bono-lluvia/page.tsx
'use client'

import { useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { BonoPorLluviaExecute } from '@/components/admin/comunicacion/braze/BonoPorLluviaExecute'
import { BonoPorLluviaPreview } from '@/components/admin/comunicacion/braze/BonoPorLluviaPreview'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

export default function BonoPorLluviaPage() {
  // State para la preview
  const [previewValues, setPreviewValues] = useState({
    horaInicio: '',
    horaFinal: '',
    monto: ''
  })

  // TODO: Obtener estos valores de la base de datos o variables de entorno
  // Por ahora hardcodeados, pero deberías tener un trigger configurado en tu DB
  const BONO_LLUVIA_TRIGGER_ID = process.env.NEXT_PUBLIC_BRAZE_BONO_LLUVIA_TRIGGER_ID || 'trigger-bono-lluvia'
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna Izquierda - Formulario */}
          <div className="space-y-6">
            {/* Información importante */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Configuración requerida:</strong> Esta función envía bonos usando la campaña de Braze
                pre-configurada. Asegúrate de tener configurado el trigger en la base de datos con el
                Campaign ID correcto antes de usar esta función.
              </AlertDescription>
            </Alert>

            {/* Componente de ejecución */}
            <BonoPorLluviaExecute
              triggerId={BONO_LLUVIA_TRIGGER_ID}
              campaignId={BONO_LLUVIA_CAMPAIGN_ID}
              onValuesChange={setPreviewValues}
            />
          </div>

          {/* Columna Derecha - Preview permanente */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <BonoPorLluviaPreview
              horaInicio={previewValues.horaInicio}
              horaFinal={previewValues.horaFinal}
              monto={previewValues.monto}
            />
          </div>
        </div>

        {/* Instrucciones para configurar en Braze */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Configuración en Braze</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Para usar esta función, necesitás tener configurado en Braze:</p>

              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>
                  <strong>Campaña API-Triggered</strong>: Crea una campaña con delivery type &quot;API-Triggered&quot;
                </li>
                <li>
                  <strong>Audiencia</strong>: Define los criterios de elegibilidad (ej: drivers activos en zona específica)
                </li>
                <li>
                  <strong>Mensaje personalizado</strong>: Usa las variables Liquid en tu mensaje:
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li><code className="bg-muted px-1 py-0.5 rounded">{'{{trigger_properties.${hora_inicio}}}'}</code> - Formato: &quot;19hs&quot;</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">{'{{trigger_properties.${hora_final}}}'}</code> - Formato: &quot;23hs&quot;</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">{'{{trigger_properties.${monto}}}'}</code> - Número sin formato: 50000</li>
                  </ul>
                </li>
                <li>
                  <strong>Ejemplo de mensaje en Braze</strong>:
                  <div className="bg-muted p-3 rounded-lg mt-2 font-mono text-xs leading-relaxed">
                    PROMO IMPERDIBLE SOLO POR HOY<br />
                    🔥 *ACTIVÁ TU DÍA DE GANANCIAS EXTRA*<br />
                    <br />
                    💰 De {'{{trigger_properties.${hora_inicio}}}'} a {'{{trigger_properties.${hora_final}}}'} ¡TODOS tus pedidos suman un BONO EXTRA de ₲{'{{trigger_properties.${monto}}}'} por cada entrega!<br />
                    <br />
                    👍 ¡No dejes pasar esta oportunidad única para multiplicar tus ingresos y cerrar el día a lo grande! 💸<br />
                    <br />
                    El bono será computado en el transcurso de la semana.<br />
                    <br />
                    💥 *SALÍ A REPARTIR Y HACÉ LA DIFERENCIA* 💥<br />
                    <br />
                    Equipo Monchis
                  </div>
                </li>
                <li>
                  <strong>Variables de entorno</strong>: Configura en tu archivo <code className="bg-muted px-1 py-0.5 rounded">.env</code>:
                  <div className="bg-muted p-3 rounded-lg mt-2 font-mono text-xs">
                    NEXT_PUBLIC_BRAZE_BONO_LLUVIA_TRIGGER_ID=cly...<br />
                    NEXT_PUBLIC_BRAZE_BONO_LLUVIA_CAMPAIGN_ID=c6801563-d398-4cf5-95cd-1104e5ed5282
                  </div>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
