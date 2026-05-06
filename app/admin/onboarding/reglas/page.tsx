// app/admin/onboarding/reglas/page.tsx

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RuleListTable } from '@/components/admin/onboarding/rules/rule-list-table'

export const dynamic = 'force-dynamic'

export default async function ReglasCapacitacionPage() {
  const rules = await prisma.onboardingScheduleRule.findMany({
    include: {
      _count: { select: { events: true, exceptions: true } },
      organizerUser: { select: { fullName: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Eventos de capacitación</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Creá eventos únicos o recurrentes y dejá que el sistema genere los slots automáticamente.
          </p>
        </div>
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
          <Link href="/admin/onboarding/reglas/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo evento
          </Link>
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Aún no creaste eventos de capacitación. Crea el primero para empezar a generar slots.
          </p>
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
            <Link href="/admin/onboarding/reglas/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Crear primer evento
            </Link>
          </Button>
        </div>
      ) : (
        <RuleListTable rules={rules} />
      )}
    </div>
  )
}
