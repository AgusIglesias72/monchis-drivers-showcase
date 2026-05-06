// components/admin/link-manychat-subscriber-button.tsx
//
// Botón + Dialog para vincular manualmente un FormDriver con un subscriber
// existente en ManyChat. Útil cuando el subscriber ya existe (creado a mano o
// por código viejo) y la API no lo encuentra por teléfono.

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link2, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { linkManychatSubscriber } from '@/lib/actions/link-manychat-subscriber.actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface LinkManychatSubscriberButtonProps {
  driverId: string
  driverName: string
  driverPhone: string
  /** Si ya está vinculado, no se renderiza nada. */
  manychatSubscriberId?: string | null
  inDropdown?: boolean
  onSuccess?: () => void
}

export function LinkManychatSubscriberButton({
  driverId,
  driverName,
  driverPhone,
  manychatSubscriberId,
  inDropdown = false,
  onSuccess,
}: LinkManychatSubscriberButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')

  // Si ya está vinculado, no mostramos el botón.
  if (manychatSubscriberId) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) {
      toast.error('Pegá el subscriber ID o la URL del subscriber en ManyChat')
      return
    }

    setIsLoading(true)
    try {
      const result = await linkManychatSubscriber({
        driverId,
        subscriberId: input,
      })

      if (result.success) {
        toast.success(
          `Subscriber vinculado: ${result.subscriberName ?? result.subscriberId}`,
        )
        setIsOpen(false)
        setInput('')
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      console.error(err)
      toast.error('Error inesperado al vincular el subscriber')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {inDropdown ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-left gap-2 h-auto py-1.5 px-2 text-sm font-normal"
          >
            <Link2 className="h-4 w-4" />
            <span className="flex-1">Vincular subscriber ManyChat</span>
          </Button>
        ) : (
          <Button variant="outline" size="default">
            <Link2 className="h-4 w-4 mr-2" />
            Vincular subscriber ManyChat
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Vincular subscriber existente</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  El subscriber de <strong>{driverName}</strong> ({driverPhone}) ya existe
                  en ManyChat pero no podemos encontrarlo automáticamente por la API.
                  Pegá el ID o la URL para vincularlo manualmente.
                </p>
                <p className="text-muted-foreground">
                  Una vez vinculado, todos los envíos futuros van directo. No vas a
                  necesitar repetir esto.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="subscriber-id">Subscriber ID o URL de ManyChat</Label>
              <Input
                id="subscriber-id"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="123456789 o https://app.manychat.com/.../users/123456789"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Cómo encontrarlo:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>
                  Abrí{' '}
                  <a
                    href="https://app.manychat.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-0.5"
                  >
                    ManyChat
                    <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  → <strong>Audience</strong>.
                </li>
                <li>Buscá al postulante por nombre o teléfono.</li>
                <li>Click en el subscriber → copiá el número de la URL.</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vinculando...
                </>
              ) : (
                'Vincular'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
