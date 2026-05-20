// components/admin/comunicacion/BotPanel.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Loader2, QrCode, RotateCcw, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface QrStatus {
  status: 'connected' | 'qr_available' | 'initializing' | 'error'
  connected: boolean
  qr?: string | null
  generatedAt?: string
  message?: string
}

interface ConnectionInfo {
  connected: boolean
  phoneNumber?: string | null
  displayName?: string | null
  platform?: string | null
}

const REFRESH_MS = 5000

async function callBotProxy<T>(path: string, method: 'GET' | 'POST' = 'GET'): Promise<T | null> {
  // No pasamos `botUrl` desde el cliente — el server-side bot-proxy usa su default
  // (WHATSAPP_BOT_URL) y lo whitelista. Mantiene la API key fuera del cliente.
  try {
    const res = await fetch('/api/whatsapp/bot-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, method }),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('595') && digits.length >= 11) {
    return `+595 ${digits.slice(3, 6)} ${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  if (digits.startsWith('54') && digits.length >= 12) {
    return `+54 9 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return `+${digits}`
}

export function BotPanel({ botId: _botId }: { botId: string }) {
  const [status, setStatus] = useState<QrStatus | null>(null)
  const [info, setInfo] = useState<ConnectionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [restarting, setRestarting] = useState(false)

  const refresh = useCallback(async () => {
    const [qr, conn] = await Promise.all([
      callBotProxy<QrStatus>('/qr-status'),
      callBotProxy<ConnectionInfo>('/connection-info'),
    ])
    setStatus(qr)
    setInfo(conn)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(interval)
  }, [refresh])

  const handleLogout = async () => {
    setRestarting(true)
    const result = await callBotProxy<{ success: boolean }>('/logout', 'POST')
    if (result?.success) {
      toast.success('Sesión cerrada. Esperá el nuevo QR.')
      setTimeout(refresh, 1500)
    } else {
      toast.error('No se pudo cerrar la sesión')
    }
    setRestarting(false)
  }

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold">Bot</h2>
      <div className="rounded-md border p-4">
        {loading ? (
          <BotPanelSkeleton />
        ) : status?.status === 'connected' ? (
          <BotPanelConnected
            info={info}
            generatedAt={status.generatedAt}
            onLogout={handleLogout}
            restarting={restarting}
          />
        ) : status?.status === 'qr_available' && status.qr ? (
          <BotPanelQrReady qr={status.qr} generatedAt={status.generatedAt} />
        ) : status?.status === 'initializing' ? (
          <BotPanelInitializing />
        ) : (
          <BotPanelOffline message={status?.message} onRetry={refresh} />
        )}
      </div>
    </div>
  )
}

function BotPanelSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-3 w-24 bg-muted rounded" />
      <div className="h-5 w-40 bg-muted rounded" />
      <div className="h-3 w-32 bg-muted rounded" />
    </div>
  )
}

function BotPanelConnected({
  info,
  generatedAt: _generatedAt,
  onLogout,
  restarting,
}: {
  info: ConnectionInfo | null
  generatedAt?: string
  onLogout: () => void
  restarting: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Conectado
        </span>
      </div>

      <div>
        <div className="text-sm font-medium truncate">
          {info?.displayName || 'Sin nombre de cuenta'}
        </div>
        <div className="text-xs tabular-nums text-muted-foreground">
          {formatPhone(info?.phoneNumber)}
        </div>
      </div>

      <div className="pt-3 border-t -mx-4 px-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8" disabled={restarting}>
              {restarting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Reiniciando...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reiniciar sesión
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                ¿Reiniciar sesión del bot?
              </AlertDialogTitle>
              <AlertDialogDescription>
                El bot se desconecta y vas a tener que escanear un nuevo QR
                desde la app de WhatsApp. Los mensajes automáticos no salen
                durante ese rato.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onLogout}>
                Reiniciar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function BotPanelQrReady({
  qr,
  generatedAt,
}: {
  qr: string
  generatedAt?: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Esperando escaneo
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        El bot generó un QR. Escanealo desde WhatsApp para conectarlo.
      </p>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" className="w-full">
            <QrCode className="mr-2 h-4 w-4" />
            Mostrar QR
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar bot WhatsApp</DialogTitle>
            <DialogDescription>
              WhatsApp → Configuración → Dispositivos vinculados → Vincular
              un dispositivo. Escaneá este QR.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="rounded-md bg-white p-4 border">
              <QRCodeSVG value={qr} size={256} level="H" includeMargin />
            </div>
          </div>
          {generatedAt && (
            <p className="text-center text-xs text-muted-foreground">
              QR generado {formatDistanceToNow(new Date(generatedAt), { addSuffix: true, locale: es })}.
              Se renueva automáticamente si caduca.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BotPanelInitializing() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-sm font-medium">Inicializando</span>
      </div>
      <p className="text-xs text-muted-foreground">
        El bot arranca el cliente y se conecta. Puede tomar 30-60s.
      </p>
    </div>
  )
}

function BotPanelOffline({
  message,
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-sm font-medium text-red-700 dark:text-red-400">
          Sin conexión
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {message
          ? message
          : 'No respondió el bot. Puede estar reiniciando, sin sesión, o el service de Railway está caído.'}
      </p>

      <Button variant="outline" size="sm" className="w-full" onClick={onRetry}>
        <RotateCcw className="mr-2 h-3.5 w-3.5" />
        Reintentar
      </Button>
    </div>
  )
}
