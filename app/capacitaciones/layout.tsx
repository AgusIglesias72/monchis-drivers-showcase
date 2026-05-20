// app/capacitaciones/layout.tsx

import Image from 'next/image'
import Link from 'next/link'
import { Toaster } from '@/components/ui/sonner'
import { WHATSAPP_ACQUISITION_URL } from '@/lib/constants/contact'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Capacitaciones — Monchis Drivers',
  description: 'Agendá tu capacitación y arrancá a entregar con Monchis.',
}

export default function CapacitacionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <Link href="/capacitaciones" className="flex items-center gap-2">
            <Image
              src="/monchis-logo-red.png"
              alt="Monchis Drivers"
              width={120}
              height={40}
              className="object-contain"
              style={{ height: 'auto' }}
              priority
            />
          </Link>
          <Link
            href={WHATSAPP_ACQUISITION_URL}
            target="_blank"
            rel="noopener"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ¿Necesitás ayuda?
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t mt-12 py-6">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 text-xs text-muted-foreground text-center">
          © Monchis · Capacitaciones para drivers
        </div>
      </footer>
      <Toaster richColors closeButton />
    </div>
  )
}
