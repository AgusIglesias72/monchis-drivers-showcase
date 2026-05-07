// app/postulacion/page.tsx
//
// Entry único del portal del postulante. Resuelve identidad server-side via
// cookie monchis_portal_token; si no la hay, muestra un form para identificarse
// con cédula + 4 últimos del teléfono. El form llama al endpoint de identify
// que setea la cookie, después un router.refresh() vuelve a hidratar este SSR
// y ya renderiza el portal.
//
// /postulacion/<token> sigue funcionando como deep-link (links viejos de
// WhatsApp): valida el token, setea la cookie y redirige acá.

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { PortalDashboard } from '@/components/postulacion/portal-dashboard'
import { PortalIdentifyForm } from '@/components/postulacion/portal-identify-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi Postulación - Monchis Drivers',
  description: 'Gestiona tu postulación, documentos y capacitación',
}

export const dynamic = 'force-dynamic'

const PORTAL_TOKEN_COOKIE = 'monchis_portal_token'

export default async function PostulacionPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(PORTAL_TOKEN_COOKIE)?.value

  if (token) {
    // Validamos que la cookie corresponda a un FormDriver real antes de
    // renderizar — protege contra cookies stale (driver borrado, token rotado).
    const driver = await prisma.formDriver.findUnique({
      where: { accessToken: token },
      select: { id: true },
    })
    if (driver) {
      return <PortalDashboard token={token} />
    }
  }

  return <PortalIdentifyForm />
}
