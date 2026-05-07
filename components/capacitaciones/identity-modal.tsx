'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onValidated?: (token: string) => void
}

type State =
  | { kind: 'idle' }
  | { kind: 'not-found' }
  | {
      kind: 'not-eligible'
      firstName: string | null
      reason: string | null
      portalToken: string | null
    }

export function IdentityModal({ open, onOpenChange, onValidated }: Props) {
  const router = useRouter()
  const [cedula, setCedula] = useState('')
  const [phoneLast4, setPhoneLast4] = useState('')
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState<State>({ kind: 'idle' })

  function reset() {
    setCedula('')
    setPhoneLast4('')
    setState({ kind: 'idle' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cedula.trim() || phoneLast4.replace(/\D/g, '').length !== 4) return

    setBusy(true)
    try {
      const res = await fetch('/api/public/auth/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim(), phoneLast4: phoneLast4.trim() }),
      })
      if (res.status === 429) {
        toast.error('Demasiados intentos. Intentá en una hora.')
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'No pudimos validar')
        return
      }
      const data = await res.json()

      if (!data.found) {
        setState({ kind: 'not-found' })
        return
      }
      // Guardamos el portalToken para que /capacitaciones lo use en futuros AutoIdentify
      if (data.portalToken) {
        try {
          localStorage.setItem('monchis.driver.portalToken', data.portalToken)
        } catch {}
      }
      if (!data.formDriver?.isEligible || !data.shareToken) {
        setState({
          kind: 'not-eligible',
          firstName: data.formDriver?.firstName ?? null,
          reason: data.formDriver?.notEligibleReason ?? null,
          portalToken: data.portalToken ?? null,
        })
        return
      }

      // Match exitoso y elegible: persistimos el token y notificamos.
      // La cookie ya quedó seteada por la respuesta del endpoint, así que no
      // hace falta polucionar la URL con ?session= — un router.refresh()
      // alcanza para que el SSR vuelva a hidratar con la nueva identidad.
      const token = data.shareToken as string
      try {
        localStorage.setItem('monchis.bookingShareToken', token)
      } catch {}
      toast.success(
        data.formDriver.firstName
          ? `Hola ${data.formDriver.firstName}, ya podés reservar`
          : 'Validamos tu postulación',
      )
      onValidated?.(token)
      onOpenChange(false)
      router.refresh()
      // Reset para próxima apertura
      setTimeout(reset, 300)
    } catch {
      toast.error('No pudimos conectar')
    } finally {
      setBusy(false)
    }
  }

  function handleOpenChange(v: boolean) {
    onOpenChange(v)
    if (!v) setTimeout(reset, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {state.kind === 'idle' && (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand" />
                Identificate
              </DialogTitle>
              <DialogDescription>
                Para reservar, ingresá tu cédula y los últimos 4 dígitos del teléfono que usaste al
                postularte.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="cedula" className="text-xs font-medium">
                  Cédula <span className="text-brand">*</span>
                </Label>
                <Input
                  id="cedula"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="1234567"
                  className="h-11"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone4" className="text-xs font-medium">
                  Últimos 4 dígitos del teléfono <span className="text-brand">*</span>
                </Label>
                <Input
                  id="phone4"
                  inputMode="numeric"
                  autoComplete="off"
                  value={phoneLast4}
                  onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="9876"
                  maxLength={4}
                  className="h-11 tracking-[0.3em] text-center font-semibold"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Por ejemplo, si tu número es +595 981 119876, ingresá 9876.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={busy || !cedula.trim() || phoneLast4.length !== 4}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuar
              </Button>
            </DialogFooter>
          </form>
        )}

        {state.kind === 'not-found' && (
          <>
            <DialogHeader>
              <DialogTitle>No te encontramos</DialogTitle>
              <DialogDescription>
                No tenemos un registro con esa cédula y los últimos 4 dígitos de teléfono que
                ingresaste.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">Puede ser que:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                <li>Todavía no completaste la postulación.</li>
                <li>Tipeaste mal la cédula o el teléfono.</li>
                <li>Cambiaste de número desde que te postulaste.</li>
              </ul>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setState({ kind: 'idle' })}>
                Volver a intentar
              </Button>
              <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
                <Link href="/">Empezar mi postulación</Link>
              </Button>
            </DialogFooter>
            <a
              href="https://wa.me/15754194027?text=Hola%2C%20no%20puedo%20identificarme%20para%20reservar%20capacitaci%C3%B3n"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
            >
              ¿Cambiaste de número? Pedinos ayuda por WhatsApp
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        )}

        {state.kind === 'not-eligible' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Tu postulación todavía no está lista
              </DialogTitle>
              <DialogDescription>
                {state.firstName
                  ? `Hola ${state.firstName}, te encontramos en el sistema pero no podés reservar todavía.`
                  : 'Te encontramos en el sistema pero no podés reservar todavía.'}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm">
              <div className="font-medium mb-1">¿Qué falta?</div>
              <p className="text-muted-foreground">
                {state.reason ||
                  'Tenemos pasos de tu postulación que aún están en revisión.'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Te avisamos por WhatsApp apenas esté todo aprobado.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setState({ kind: 'idle' })}>
                Probar con otros datos
              </Button>
              <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
                <Link
                  href={state.portalToken ? `/postulacion/${state.portalToken}` : '/postulacion'}
                >
                  Ir a mi portal
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
