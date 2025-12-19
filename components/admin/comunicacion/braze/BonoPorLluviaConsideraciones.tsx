// components/admin/comunicacion/braze/BonoPorLluviaConsideraciones.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export function BonoPorLluviaConsideraciones() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Consideraciones Importantes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="min-w-[6px] h-[6px] rounded-full bg-blue-600 mt-2" />
            <p className="text-sm text-muted-foreground">
              Los usuarios pueden recibir un nuevo mensaje <span className="font-semibold text-foreground">cada 3 horas</span> como máximo para evitar spam.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <div className="min-w-[6px] h-[6px] rounded-full bg-blue-600 mt-2" />
            <p className="text-sm text-muted-foreground">
              El bono se aplica <span className="font-semibold text-foreground">solo a drivers activos</span> con al menos una entrega en el período especificado.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <div className="min-w-[6px] h-[6px] rounded-full bg-blue-600 mt-2" />
            <p className="text-sm text-muted-foreground">
              La audiencia objetivo se gestiona directamente en <span className="font-semibold text-foreground">Braze Dashboard</span>.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <div className="min-w-[6px] h-[6px] rounded-full bg-blue-600 mt-2" />
            <p className="text-sm text-muted-foreground">
              El bono será computado <span className="font-semibold text-foreground">en el transcurso de la semana</span> siguiente al envío.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
