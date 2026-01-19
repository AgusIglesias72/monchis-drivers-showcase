// components/ClerkPageWrapper.tsx
'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export function ClerkPageWrapper({ children }: { children: ReactNode }) {
  const router = useRouter()
  const isClerkDisabled = process.env.NEXT_PUBLIC_DISABLE_CLERK === 'true'

  // Si Clerk está deshabilitado (Railway), redirigir al home o mostrar mensaje
  if (isClerkDisabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Autenticación no disponible
          </h1>
          <p className="text-gray-600 mb-6">
            Esta instancia está configurada para ejecutar tareas automatizadas sin autenticación.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // Si Clerk está habilitado, renderizar el contenido normal
  return <>{children}</>
}
