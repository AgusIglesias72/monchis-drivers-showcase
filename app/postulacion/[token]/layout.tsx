// app/postulacion/[token]/layout.tsx
// Layout del portal de autogestión - Estilo Monchis (fondo rojo)

import type { Metadata } from 'next'
import Image from 'next/image'
import { Toaster } from 'sonner'

const MONCHIS_RED = '#e7243f'

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
    <div className="min-h-screen relative overflow-hidden pb-20" style={{ backgroundColor: MONCHIS_RED }}>
      {/* Blur gradient circles (same as FormularioMonchis) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -right-40 w-[500px] h-[500px] bg-white/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header translúcido */}
      <div className="relative bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Image
              src="/monchis-logo-white.png"
              alt="Monchis"
              width={140}
              height={35}
              className="h-9 w-auto"
              priority
            />
            <p className="text-sm text-white/80 font-medium hidden sm:block">
              Portal de Postulantes
            </p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="relative">
        {children}
      </main>

      {/* Toast notifications */}
      <Toaster position="top-center" richColors />
    </div>
  )
}
