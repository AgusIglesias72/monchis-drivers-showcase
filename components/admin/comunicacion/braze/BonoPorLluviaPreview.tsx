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
  // Usar valores de ejemplo si no hay datos
  const displayHoraInicio = horaInicio || '19:00'
  const displayHoraFinal = horaFinal || '23:00'
  const displayMonto = monto || '50000'
  const hasData = horaInicio && horaFinal && monto

  return (
    <Card className={!hasData ? 'border-dashed border-2 border-blue-300 h-full' : 'h-full'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5" />
          Vista Previa del Mensaje
          {!hasData && <span className="text-xs font-normal text-muted-foreground ml-2">(Ejemplo)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        {/* Phone mockup */}
        <div className="relative mx-auto" style={{ width: '320px' }}>
          {/* Phone frame */}
          <div className="relative bg-black rounded-[3rem] p-3 shadow-2xl">
            {/* Phone notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-black rounded-b-3xl z-10"></div>

            {/* Phone screen */}
            <div className="relative bg-white rounded-[2.5rem] overflow-hidden" style={{ aspectRatio: '9/19.5' }}>
              {/* WhatsApp header */}
              <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-lg">🚗</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Monchis</p>
                  <p className="text-gray-200 text-xs">en línea</p>
                </div>
              </div>

              {/* WhatsApp chat background */}
              <div className="bg-[#E3D5CA] p-4 h-full overflow-y-auto" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h100v100H0z\' fill=\'%23E3D5CA\'/%3E%3Cpath d=\'M20 20l5 5M40 40l5 5M60 60l5 5M80 80l5 5\' stroke=\'%23D4C5B9\' stroke-width=\'.5\' opacity=\'.3\'/%3E%3C/svg%3E")' }}>
                {/* Message bubble */}
                <div className="bg-white p-3 rounded-lg shadow-md space-y-2.5 text-xs max-w-[260px] ml-auto">
                  <p className="font-bold text-center text-sm leading-tight">
                    PROMO IMPERDIBLE SOLO POR HOY
                  </p>

                  <p className="text-center font-semibold leading-tight">
                    🔥 ACTIVÁ TU DÍA DE GANANCIAS EXTRA
                  </p>

                  <p className="leading-relaxed">
                    💰 De {formatHoraParaBraze(displayHoraInicio)} a {formatHoraParaBraze(displayHoraFinal)} ¡TODOS tus pedidos suman un BONO EXTRA de <span className="font-bold text-green-700">{parseFloat(displayMonto).toLocaleString('es-PY')} Gs</span> por cada entrega!
                  </p>

                  <p className="leading-relaxed">
                    👍 ¡No dejes pasar esta oportunidad única para multiplicar tus ingresos y cerrar el día a lo grande! 💸
                  </p>

                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    El bono será computado en el transcurso de la semana.
                  </p>

                  <p className="text-[10px] leading-relaxed">
                    ℹ️ Si tenés cualquier consulta, estamos en soporte en línea para ayudarte.
                  </p>

                  <p className="text-center font-semibold leading-tight">
                    💥 SALÍ A REPARTIR Y HACÉ LA DIFERENCIA 💥
                  </p>

                  <div className="pt-2 border-t border-gray-100 flex justify-between items-end">
                    <p className="text-[9px] text-gray-500">
                      Equipo Monchis
                    </p>
                    <p className="text-[9px] text-gray-400">
                      {new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  )
}
