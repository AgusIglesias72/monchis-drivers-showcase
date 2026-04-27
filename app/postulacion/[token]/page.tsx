// app/postulacion/[token]/page.tsx
// Página principal del portal de autogestión

import { PortalDashboard } from '@/components/postulacion/portal-dashboard'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi Postulación - Monchis Drivers',
  description: 'Gestiona tu postulación, documentos y capacitación',
}

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <PortalDashboard token={token} />
}
