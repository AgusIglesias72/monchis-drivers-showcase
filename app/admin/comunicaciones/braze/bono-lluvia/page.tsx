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
        <Card className="mt-8 border-t-4 border-t-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">⚙️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Configuración en Braze</h3>
                <p className="text-sm text-gray-500">Guía paso a paso para configurar la campaña</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="relative pl-8 pb-6 border-l-2 border-purple-200">
                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-transparent p-4 rounded-xl border border-purple-100">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span>📱</span> Campaña API-Triggered
                  </h4>
                  <p className="text-sm text-gray-600">
                    Crea una campaña en Braze con delivery type <code className="bg-purple-100 text-purple-700 px-2 py-1 rounded font-mono text-xs">&quot;API-Triggered&quot;</code>
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative pl-8 pb-6 border-l-2 border-purple-200">
                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-transparent p-4 rounded-xl border border-blue-100">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span>👥</span> Audiencia
                  </h4>
                  <p className="text-sm text-gray-600">
                    Define los criterios de elegibilidad (ej: drivers activos en zona específica, drivers con X entregas en el día, etc.)
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative pl-8 pb-6 border-l-2 border-purple-200">
                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-transparent p-4 rounded-xl border border-green-100">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>✏️</span> Variables Liquid en el Mensaje
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                      <code className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded flex-1">
                        {'{{trigger_properties.${hora_inicio}}}'}
                      </code>
                      <span className="text-xs text-gray-500">→ Ej: &quot;19hs&quot;</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                      <code className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded flex-1">
                        {'{{trigger_properties.${hora_final}}}'}
                      </code>
                      <span className="text-xs text-gray-500">→ Ej: &quot;23hs&quot;</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
                      <code className="text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded flex-1">
                        {'{{trigger_properties.${monto}}}'}
                      </code>
                      <span className="text-xs text-gray-500">→ Ej: 50000</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative pl-8 pb-6 border-l-2 border-purple-200">
                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-xs font-bold">4</span>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-transparent p-4 rounded-xl border border-amber-100">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>💬</span> Ejemplo de Mensaje en Braze
                  </h4>
                  <div className="bg-white border-2 border-amber-200 rounded-lg p-4 font-mono text-xs leading-relaxed text-gray-700 shadow-sm">
                    PROMO IMPERDIBLE SOLO POR HOY<br />
                    🔥 *ACTIVÁ TU DÍA DE GANANCIAS EXTRA*<br />
                    <br />
                    💰 De <span className="bg-green-100 text-green-700 px-1">{'{{trigger_properties.${hora_inicio}}}'}</span> a <span className="bg-green-100 text-green-700 px-1">{'{{trigger_properties.${hora_final}}}'}</span> ¡TODOS tus pedidos suman un BONO EXTRA de ₲<span className="bg-green-100 text-green-700 px-1">{'{{trigger_properties.${monto}}}'}</span> por cada entrega!<br />
                    <br />
                    👍 ¡No dejes pasar esta oportunidad única para multiplicar tus ingresos y cerrar el día a lo grande! 💸<br />
                    <br />
                    El bono será computado en el transcurso de la semana.<br />
                    <br />
                    💥 *SALÍ A REPARTIR Y HACÉ LA DIFERENCIA* 💥<br />
                    <br />
                    Equipo Monchis
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="relative pl-8">
                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-xs font-bold">5</span>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-transparent p-4 rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🔐</span> Variables de Entorno
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Configura estas variables en tu archivo <code className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono text-xs">.env</code>:
                  </p>
                  <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs shadow-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 select-none">1</span>
                      <code>NEXT_PUBLIC_BRAZE_BONO_LLUVIA_TRIGGER_ID=<span className="text-yellow-300">cly...</span></code>
                    </div>
                    <div className="flex items-start gap-2 mt-1">
                      <span className="text-slate-500 select-none">2</span>
                      <code>NEXT_PUBLIC_BRAZE_BONO_LLUVIA_CAMPAIGN_ID=<span className="text-yellow-300">256172f0-20f7-43d2-80d8-3a29daf71be9</span></code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
