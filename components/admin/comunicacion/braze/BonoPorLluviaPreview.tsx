// components/admin/comunicacion/braze/BonoPorLluviaPreview.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Smartphone } from 'lucide-react'

interface BonoPorLluviaPreviewProps {
  horaInicio: string
  horaFinal: string
  monto: string
}

// Convertir formato HH:MM a "HHhs"
const formatHoraParaBraze = (hora: string) => {
  if (!hora) return ''
  const [hh] = hora.split(':')
  return `${parseInt(hh)}hs`
}

export function BonoPorLluviaPreview({ horaInicio, horaFinal, monto }: BonoPorLluviaPreviewProps) {
  const hasData = horaInicio && horaFinal && monto

  if (!hasData) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5" />
            Vista Previa del Mensaje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Smartphone className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-sm">
              Completá los campos del formulario para ver una vista previa del mensaje
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5" />
          Vista Previa del Mensaje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* WhatsApp-style container */}
        <div className="bg-[#E3D5CA] p-6 rounded-lg">
          {/* Message bubble */}
          <div className="bg-white p-5 rounded-lg shadow-md space-y-3 text-sm">
            <p className="font-bold text-center text-base">
              PROMO IMPERDIBLE SOLO POR HOY
            </p>

            <p className="text-center font-semibold">
              🔥 *ACTIVÁ TU DÍA DE GANANCIAS EXTRA*
            </p>

            <p className="leading-relaxed">
              💰 De <span className="line-through">{formatHoraParaBraze(horaInicio)}</span> a <span className="line-through">{formatHoraParaBraze(horaFinal)}</span> ¡TODOS tus pedidos suman un BONO EXTRA de <span className="font-bold text-green-700">₲{parseFloat(monto).toLocaleString('es-PY')}</span> por cada entrega!
            </p>

            <p className="leading-relaxed">
              👍 ¡No dejes pasar esta oportunidad única para multiplicar tus ingresos y cerrar el día a lo grande! 💸
            </p>

            <p className="text-xs text-gray-600 leading-relaxed">
              El bono será computado en el transcurso de la semana.
            </p>

            <p className="text-xs leading-relaxed">
              ℹ️ Si tenés cualquier consulta, estamos en soporte en línea para ayudarte.
            </p>

            <p className="text-center font-semibold">
              💥 *SALÍ A REPARTIR Y HACÉ LA DIFERENCIA* 💥
            </p>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-right text-gray-500">
                Equipo Monchis
              </p>
              <p className="text-xs text-right text-gray-400">
                {new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Info sobre variables */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-900 font-medium mb-2">Variables enviadas a Braze:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li><code className="bg-blue-100 px-1.5 py-0.5 rounded">hora_inicio</code>: {formatHoraParaBraze(horaInicio)}</li>
            <li><code className="bg-blue-100 px-1.5 py-0.5 rounded">hora_final</code>: {formatHoraParaBraze(horaFinal)}</li>
            <li><code className="bg-blue-100 px-1.5 py-0.5 rounded">monto</code>: {parseFloat(monto).toLocaleString('es-PY')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
