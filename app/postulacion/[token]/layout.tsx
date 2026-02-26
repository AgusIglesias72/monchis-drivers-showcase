// app/postulacion/[token]/layout.tsx
// Layout del portal de autogestión (sin autenticación Clerk)

import type { Metadata } from 'next'
import Image from 'next/image'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Mi Postulación - Monchis Drivers',
  description: 'Gestiona tu postulación como driver de Monchis',
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simple */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/monchis-logo-red.png"
                alt="Monchis"
                width={120}
                height={40}
                priority
              />
              <span className="text-gray-600 text-sm hidden sm:inline">
                Portal de Postulantes
              </span>
            </div>

            {/* Info de ayuda */}
            <div className="text-sm text-gray-600 hidden md:block">
              ¿Necesitás ayuda? Escribinos al WhatsApp
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        {children}
      </main>

      {/* Footer simple */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Monchis. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Toast notifications */}
      <Toaster position="top-center" richColors />
    </div>
  )
}
