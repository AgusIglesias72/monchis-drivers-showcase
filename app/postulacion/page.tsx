// app/postulacion/page.tsx
//
// Landing del portal del postulante: si el browser tiene guardado el portalToken
// del driver (porque ya pasó alguna vez por /postulacion/[token]), lo redirige
// a su portal directamente. Si no, lo manda a la landing pública del form.
//
// Existe para evitar el 404 en /postulacion sin token, que era una mala UX
// cuando alguien copiaba la URL base.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, FileEdit, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PostulacionLandingPage() {
  const router = useRouter()
  const [resolved, setResolved] = useState<'redirecting' | 'no-token'>('redirecting')

  useEffect(() => {
    let token: string | null = null
    try {
      token = localStorage.getItem('monchis.driver.portalToken')
    } catch {}

    if (token) {
      router.replace(`/postulacion/${token}`)
    } else {
      setResolved('no-token')
    }
  }, [router])

  if (resolved === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Buscando tu postulación…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">
        <div className="rounded-2xl border bg-card p-6 lg:p-8 text-center shadow-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-brand-soft text-brand flex items-center justify-center mb-4">
            <FileEdit className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight mb-2">¿Querés ser driver?</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Para acceder a tu portal necesitamos el link que te enviamos por WhatsApp cuando
            empezaste tu postulación. Si nunca te postulaste, podés hacerlo ahora.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
              <Link href="/">Empezar mi postulación</Link>
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://wa.me/15754194027?text=Hola%2C%20perd%C3%AD%20mi%20link%20de%20postulaci%C3%B3n"
                target="_blank"
                rel="noopener noreferrer"
              >
                ¿Perdiste el link? Pedinos por WhatsApp
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="mt-1">
              <Link href="/capacitaciones">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Volver a capacitaciones
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
