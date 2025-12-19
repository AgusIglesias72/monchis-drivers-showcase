// components/admin/comunicacion/braze/BonoPorLluviaExecute.tsx
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CloudRain, Send, AlertCircle, CheckCircle, DollarSign, Clock } from 'lucide-react'

interface BonoPorLluviaProps {
  triggerId: string
  campaignId: string
  onExecuted?: () => void
  onValuesChange?: (values: { horaInicio: string; horaFinal: string; monto: string }) => void
}

interface ExecutionResult {
  success: boolean
  sendId?: string
  dispatchId?: string
  error?: string
  executedValues?: {
    horaInicio: string
    horaFinal: string
    monto: string
  }
}

export function BonoPorLluviaExecute({ triggerId, campaignId, onExecuted, onValuesChange }: BonoPorLluviaProps) {
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFinal, setHoraFinal] = useState('')
  const [monto, setMonto] = useState('')
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)

  // Notificar cambios al padre
  React.useEffect(() => {
    if (onValuesChange) {
      onValuesChange({ horaInicio, horaFinal, monto })
    }
  }, [horaInicio, horaFinal, monto, onValuesChange])

  // Validación de formulario
  const isFormValid = () => {
    if (!horaInicio || !horaFinal || !monto) return false

    // Validar formato de hora HH:MM
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(horaInicio) || !timeRegex.test(horaFinal)) return false

    // Validar que monto sea número positivo
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) return false

    // Validar que hora_final sea después de hora_inicio
    const [hInicio, mInicio] = horaInicio.split(':').map(Number)
    const [hFinal, mFinal] = horaFinal.split(':').map(Number)
    const minutosInicio = hInicio * 60 + mInicio
    const minutosFinal = hFinal * 60 + mFinal

    if (minutosFinal <= minutosInicio) return false

    return true
  }

  // Convertir formato HH:MM a "HHhs"
  const formatHoraParaBraze = (hora: string) => {
    const [hh] = hora.split(':')
    return `${parseInt(hh)}hs`
  }

  const handleExecute = async () => {
    if (!isFormValid()) return

    setExecuting(true)
    setExecutionResult(null)

    try {
      const response = await fetch('/api/braze/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          triggerId,
          triggerProperties: {
            hora_inicio: formatHoraParaBraze(horaInicio),
            hora_final: formatHoraParaBraze(horaFinal),
            monto: parseFloat(monto),
          },
        }),
      })

      const data = await response.json()

      // Guardar los valores ejecutados antes de limpiar
      const executedValues = {
        horaInicio,
        horaFinal,
        monto,
      }

      setExecutionResult({
        ...data,
        executedValues,
      })

      if (data.success) {
        // Limpiar formulario después de ejecución exitosa
        setHoraInicio('')
        setHoraFinal('')
        setMonto('')

        // Callback opcional
        if (onExecuted) {
          onExecuted()
        }
      }
    } catch (error) {
      console.error('Error executing bono por lluvia:', error)
      setExecutionResult({
        success: false,
        error: 'Error al ejecutar el bono por lluvia',
      })
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con ícono */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-lg">
          <CloudRain className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Bono por Lluvia</h3>
          <p className="text-sm text-muted-foreground">
            Envía bonos a drivers por condiciones climáticas adversas
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Parámetros del Bono</CardTitle>
          <CardDescription>
            Define el período de lluvia y el monto del bono a enviar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hora de Inicio */}
          <div className="space-y-2">
            <Label htmlFor="hora-inicio" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hora de Inicio
            </Label>
            <Input
              id="hora-inicio"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              placeholder="14:00"
              disabled={executing}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Hora en que comenzó la lluvia (formato 24h)
            </p>
          </div>

          {/* Hora Final */}
          <div className="space-y-2">
            <Label htmlFor="hora-final" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Hora Final
            </Label>
            <Input
              id="hora-final"
              type="time"
              value={horaFinal}
              onChange={(e) => setHoraFinal(e.target.value)}
              placeholder="18:00"
              disabled={executing}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Hora en que terminó la lluvia (formato 24h)
            </p>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="monto" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monto del Bono (Gs.)
            </Label>
            <Input
              id="monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="50000"
              min="0"
              step="1000"
              disabled={executing}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Monto en guaraníes que recibirá cada driver elegible
            </p>
          </div>

          {/* Botón de ejecución */}
          <Button
            onClick={handleExecute}
            disabled={!isFormValid() || executing}
            className="w-full"
            size="lg"
          >
            {executing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando Bono...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Bono por Lluvia
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado de ejecución */}
      {executionResult && (
        <Alert variant={executionResult.success ? 'default' : 'destructive'}>
          {executionResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {executionResult.success ? (
              <div className="space-y-1">
                <p className="font-medium">¡Bono enviado exitosamente!</p>
                {executionResult.sendId && (
                  <p className="text-sm">Send ID: {executionResult.sendId}</p>
                )}
                {executionResult.dispatchId && (
                  <p className="text-sm">Dispatch ID: {executionResult.dispatchId}</p>
                )}
                {executionResult.executedValues && (
                  <p className="text-sm mt-2">
                    Los drivers elegibles recibirán el bono de {parseFloat(executionResult.executedValues.monto).toLocaleString('es-PY')} Gs
                    {' '}por cada entrega realizada de {formatHoraParaBraze(executionResult.executedValues.horaInicio)} a {formatHoraParaBraze(executionResult.executedValues.horaFinal)}.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="font-medium">Error al enviar el bono</p>
                <p className="text-sm">{executionResult.error}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

    </div>
  )
}
