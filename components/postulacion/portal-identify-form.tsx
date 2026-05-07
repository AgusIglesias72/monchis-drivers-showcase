'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type State =
  | { kind: 'idle' }
  | { kind: 'not-found' }

/**
 * Form de identificación inline para /postulacion. Es la versión "página completa"
 * del IdentityModal — usa el mismo endpoint /api/public/auth/identify, que setea
 * la cookie monchis_portal_token al hacer match. Después de eso, router.refresh()
 * dispara el SSR que ahora resuelve por cookie y renderiza el portal.
 */
export function PortalIdentifyForm() {
  const router = useRouter()
  const [cedula, setCedula] = useState('')
  const [phoneLast4, setPhoneLast4] = useState('')
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cedula.trim() || phoneLast4.length !== 4) return

    setBusy(true)
    try {
      const res = await fetch('/api/public/auth/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.trim(), phoneLast4 }),
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

      // Cookie ya seteada por el endpoint. También guardamos el portalToken en
      // localStorage para el fallback de AutoIdentify si alguna vez se pierde
      // la cookie.
      if (data.portalToken) {
        try {
          localStorage.setItem('monchis.driver.portalToken', data.portalToken)
        } catch {}
      }
      if (data.shareToken) {
        try {
          localStorage.setItem('monchis.bookingShareToken', data.shareToken)
        } catch {}
      }
      toast.success(
        data.formDriver?.firstName
          ? `Hola ${data.formDriver.firstName}`
          : 'Te identificamos',
      )
      router.refresh()
    } catch {
      toast.error('No pudimos conectar')
    } finally {
      setBusy(false)
    }
  }

  if (state.kind === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full">
          <div className="rounded-2xl border bg-card p-6 lg:p-8 shadow-sm">
            <div className="mx-auto h-14 w-14 rounded-full bg-warning-soft text-warning flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-center mb-2">
              No te encontramos
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed">
              No tenemos un registro con esa cédula y los últimos 4 dígitos del teléfono que
              ingresaste.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2 mb-5">
              <p className="font-medium">Puede ser que:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                <li>Todavía no completaste la postulación.</li>
                <li>Tipeaste mal la cédula o el teléfono.</li>
                <li>Cambiaste de número desde que te postulaste.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => setState({ kind: 'idle' })}
              >
                Volver a intentar
              </Button>
              <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
                <Link href="/">Empezar mi postulación</Link>
              </Button>
              <a
                href="https://wa.me/15754194027?text=Hola%2C%20no%20puedo%20identificarme%20en%20mi%20portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
              >
                ¿Cambiaste de número? Pedinos ayuda
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border bg-card p-6 lg:p-8 shadow-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-brand-soft text-brand flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-center mb-2">
            Accedé a tu portal
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
            Ingresá tu cédula y los últimos 4 dígitos del teléfono que usaste al postularte.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                Ej: si tu número es +595 981 119876, ingresá 9876.
              </p>
            </div>

            <Button
              type="submit"
              disabled={busy || !cedula.trim() || phoneLast4.length !== 4}
              className="w-full bg-brand text-brand-foreground hover:bg-brand-hover h-11"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Acceder
            </Button>
          </form>

          <div className="border-t mt-6 pt-4 flex flex-col gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Empezar nueva postulación
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/capacitaciones">Ir a capacitaciones</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
