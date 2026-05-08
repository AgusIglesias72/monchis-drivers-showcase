'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Plus, Settings2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AdminHeader } from '@/components/admin/admin-header'
import { RuleListTable } from './rules/rule-list-table'
import { OnboardingPageContent } from './onboarding-page-content'
import type { OnboardingEventWithRelations } from '@/types/onboarding'
import type { OnboardingModality } from '@prisma/client'

type RuleRow = {
  id: string
  slug: string
  title: string
  modality: OnboardingModality
  frequency: 'WEEKLY' | 'ONE_OFF'
  daysOfWeek: number[]
  startTime: string
  durationMinutes: number
  maxCapacity: number
  isActive: boolean
  isPublic: boolean
  organizerUser: { fullName: string | null; firstName: string | null; lastName: string | null } | null
  _count: { events: number; exceptions: number }
}

interface Props {
  rules: RuleRow[]
  events: OnboardingEventWithRelations[]
  currentStatus?: string
}

type TabValue = 'capacitaciones' | 'eventos'

const VALID_TABS: ReadonlySet<TabValue> = new Set<TabValue>(['capacitaciones', 'eventos'])

function isTabValue(v: string | null): v is TabValue {
  return v != null && VALID_TABS.has(v as TabValue)
}

export function UnifiedOnboardingTabs({ rules, events, currentStatus }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: TabValue = isTabValue(tabParam) ? tabParam : 'capacitaciones'

  function setTab(next: TabValue) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-1 flex-col container mx-auto">
      <AdminHeader breadcrumbs={[{ label: 'Capacitaciones' }]} />

      <div className="flex-1 p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capacitaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestioná las reglas (templates) y los eventos generados desde un solo lugar.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="capacitaciones" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Capacitaciones
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {rules.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="eventos" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Eventos
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {events.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capacitaciones" className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Reglas que generan los slots automáticamente. Cada regla puede ser semanal o una sola vez.
              </p>
              <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
                <Link href="/admin/onboarding/reglas/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva capacitación
                </Link>
              </Button>
            </div>

            {rules.length === 0 ? (
              <div className="border border-dashed rounded-lg p-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Aún no creaste capacitaciones. Crea la primera para empezar a generar slots.
                </p>
                <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
                  <Link href="/admin/onboarding/reglas/nueva">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primera capacitación
                  </Link>
                </Button>
              </div>
            ) : (
              <RuleListTable rules={rules} />
            )}
          </TabsContent>

          <TabsContent value="eventos" className="mt-6">
            <OnboardingPageContent
              initialEvents={events}
              currentStatus={currentStatus}
              hideOuterChrome
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
