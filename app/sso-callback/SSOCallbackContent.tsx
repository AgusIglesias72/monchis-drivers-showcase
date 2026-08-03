// app/sso-callback/SSOCallbackContent.tsx
'use client'

import { useEffect } from 'react'
import { useClerk } from '@clerk/nextjs'
import Image from 'next/image'
import { Spinner } from '@/components/ds'

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
      className="flex min-h-screen items-center justify-center text-white"
      style={{
        backgroundImage:
          "linear-gradient(150deg, #B00E2C 0%, #E52050 50%, #7A0820 100%)",
      }}
    >
      <div className="flex flex-col items-center text-center">
        <Image
          src="/monchis-logo-white.png"
          alt="Monchis"
          width={160}
          height={48}
          className="mb-8 h-12 w-auto"
          priority
        />
        <Spinner size="lg" className="mb-6 text-white" />
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Completando el inicio de sesión…
        </h2>
        <p className="mt-1.5 text-sm text-white/70">Por favor esperá un momento</p>
      </div>
    </div>
  )
}