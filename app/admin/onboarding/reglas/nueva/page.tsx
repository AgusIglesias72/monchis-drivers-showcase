// app/admin/onboarding/reglas/nueva/page.tsx

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { RuleForm } from '@/components/admin/onboarding/rules/rule-form'

export const dynamic = 'force-dynamic'

export default async function NuevaReglaPage() {
  const admins = await prisma.adminUser.findMany({
    where: { isActive: true },
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      profileImageUrl: true,
      email: true,
    },
    orderBy: { fullName: 'asc' },
  })

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/admin/onboarding?tab=capacitaciones">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Capacitaciones
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo evento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurá modalidad, horario y reglas de reserva. Al guardar se generan los slots automáticamente.
        </p>
      </div>

      <RuleForm mode="create" admins={admins} />
    </div>
  )
}
