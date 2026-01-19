// app/sso-callback/SSOCallbackContent.tsx
'use client'

import { useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

const MONCHIS_RED = '#e7243f'

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk()

  useEffect(() => {
    void (async () => {
      try {
        await handleRedirectCallback({})
      } catch (error) {
        console.error('Error en SSO callback:', error)
        // Redirigir al sign-in en caso de error
        window.location.href = '/sign-in'
      }
    })()
  }, [handleRedirectCallback])

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: MONCHIS_RED }}
    >
      {/* Efectos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="text-center relative z-10">
        <div className="mb-8">
          <Image 
            src="/monchis-logo-white.png" 
            alt="Monchis" 
            width={200} 
            height={60}
            className="h-16 w-auto mx-auto"
            priority
          />
        </div>
        <div className="relative w-16 h-16 mx-auto mb-6">
          <Loader2 className="w-16 h-16 text-white animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Completando el inicio de sesión...
        </h2>
        <p className="text-white/80">
          Por favor espera un momento
        </p>
      </div>
    </div>
  )
}