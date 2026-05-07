'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { ChevronUp, Eye, X } from 'lucide-react'

type PreviewState = 'anonymous' | 'eligible' | 'pending'

const STATE_LABELS: Record<PreviewState, { label: string; description: string }> = {
  anonymous: {
    label: 'Anónimo',
    description: 'Postulante sin cookie ni identificación',
  },
  eligible: {
    label: 'Postulación aprobada',
    description: 'Driver elegible para agendar',
  },
  pending: {
    label: 'Postulación pendiente',
    description: 'Identificado pero todavía no elegible',
  },
}

/**
 * Widget flotante para QA — solo visible si Clerk reconoce sesión activa.
 * Dispara el modo preview pasando ?preview=<state> al server, que devuelve
 * identidades mockeadas. Para postulantes reales (no autenticados con Clerk)
 * el componente no se monta y el query param es ignorado.
 */
export function PreviewModeToggle() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  const currentPreview = searchParams.get('preview') as PreviewState | null

  if (!isLoaded || !isSignedIn) return null

  function setPreview(state: PreviewState | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (state) {
      params.set('preview', state)
    } else {
      params.delete('preview')
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
    setOpen(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {open ? (
        <div className="w-72 rounded-xl border-2 border-dashed border-amber-400 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-amber-200 bg-amber-50 rounded-t-[10px]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Eye className="h-3.5 w-3.5" />
              Vista de prueba (DEV)
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-amber-700 hover:text-amber-900"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-2 space-y-1">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                !currentPreview
                  ? 'bg-amber-100 text-amber-900 font-semibold'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">Vista real (cookie)</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Identidad resuelta por la cookie del navegador
              </div>
            </button>
            {(['anonymous', 'eligible', 'pending'] as const).map((state) => {
              const { label, description } = STATE_LABELS[state]
              const active = currentPreview === state
              return (
                <button
                  key={state}
                  type="button"
                  onClick={() => setPreview(state)}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                    active
                      ? 'bg-amber-100 text-amber-900 font-semibold'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{description}</div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-amber-400 bg-white shadow-lg px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          {currentPreview ? STATE_LABELS[currentPreview].label : 'Vista real'}
          <ChevronUp className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
