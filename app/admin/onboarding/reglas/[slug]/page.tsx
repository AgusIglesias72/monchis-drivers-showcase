// app/admin/onboarding/reglas/[slug]/page.tsx

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Users,
  MapPin,
  Video,
  Zap,
  PowerOff,
  Power,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RuleForm } from '@/components/admin/onboarding/rules/rule-form'
import { RuleEventsTable } from '@/components/admin/onboarding/rules/rule-events-table'
import { RuleExceptionsManager } from '@/components/admin/onboarding/rules/rule-exceptions-manager'
import { MODALITY_LABEL } from '@/lib/types/onboarding-rules.types'
import type { OnboardingModality } from '@prisma/client'

export const dynamic = 'force-dynamic'

const MODALITY_ICON = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Zap,
}

export default async function ReglaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const rule = await prisma.onboardingScheduleRule.findUnique({
    where: { slug },
    include: {
      exceptions: { orderBy: { date: 'asc' } },
      organizerUser: { select: { fullName: true, firstName: true, lastName: true } },
      savedLocation: true,
    },
  })

  if (!rule) return notFound()

  const [admins, events] = await Promise.all([
    prisma.adminUser.findMany({
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
    }),
    prisma.onboardingEvent.findMany({
      where: {
        scheduleRuleId: rule.id,
        scheduledDate: { gte: new Date() },
      },
      select: {
        id: true,
        scheduledDate: true,
        startTime: true,
        endTime: true,
        currentCapacity: true,
        maxCapacity: true,
        status: true,
      },
      orderBy: { scheduledDate: 'asc' },
      take: 50,
    }),
  ])

  const ruleSerialized = {
    ...rule,
    validFrom: rule.validFrom.toISOString(),
    validTo: rule.validTo?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    savedLocation: rule.savedLocation
      ? {
          ...rule.savedLocation,
          createdAt: rule.savedLocation.createdAt.toISOString(),
          updatedAt: rule.savedLocation.updatedAt.toISOString(),
        }
      : null,
  }

  const ModalityIcon = MODALITY_ICON[rule.modality as OnboardingModality]
  const organizerName =
    rule.organizerUser?.fullName ||
    [rule.organizerUser?.firstName, rule.organizerUser?.lastName].filter(Boolean).join(' ') ||
    'Sin organizador'

  const totalSeatsAhead = events.reduce((acc, e) => acc + (e.currentCapacity || 0), 0)
  const totalCapacityAhead = events.reduce((acc, e) => acc + (e.maxCapacity || 0), 0)

  return (
    <div className="px-4 lg:px-6 py-6 max-w-7xl mx-auto w-full">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link href="/admin/onboarding?tab=capacitaciones">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Capacitaciones
        </Link>
      </Button>

      {/* Header con cara visible del evento */}
      <div className="rounded-xl border bg-card overflow-hidden mb-6 shadow-sm">
        <div className="h-2 bg-gradient-to-r from-brand to-brand-hover" />
        <div className="p-5 lg:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <Badge
                  variant="secondary"
                  className={
                    rule.isActive
                      ? 'bg-success-soft text-success border-0'
                      : 'bg-muted text-muted-foreground border-0'
                  }
                >
                  {rule.isActive ? (
                    <>
                      <Power className="h-3 w-3 mr-1" />
                      Activo
                    </>
                  ) : (
                    <>
                      <PowerOff className="h-3 w-3 mr-1" />
                      Inactivo
                    </>
                  )}
                </Badge>
                <Badge variant="secondary" className="bg-muted">
                  <ModalityIcon className="h-3 w-3 mr-1" />
                  {MODALITY_LABEL[rule.modality as OnboardingModality]}
                </Badge>
                {rule.frequency === 'ONE_OFF' && (
                  <Badge variant="secondary" className="bg-muted">
                    Una sola vez
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{rule.title}</h1>
              <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground flex-wrap">
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/{rule.slug}</code>
                <span>·</span>
                <span>Organiza: {organizerName}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/capacitaciones/${rule.slug}`} target="_blank">
                  Ver pública
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats inline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Próximos</div>
              <div className="text-xl font-semibold mt-0.5 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {events.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Reservados</div>
              <div className="text-xl font-semibold mt-0.5 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                {totalSeatsAhead}/{totalCapacityAhead}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Excepciones
              </div>
              <div className="text-xl font-semibold mt-0.5 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                {rule.exceptions.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Cupo</div>
              <div className="text-xl font-semibold mt-0.5">{rule.maxCapacity}/evento</div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración + Preview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>
            Editá cualquier campo y guardá para aplicar a futuros slots. Las reservas existentes no se
            modifican.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RuleForm mode="edit" rule={ruleSerialized as any} admins={admins} />
        </CardContent>
      </Card>

      {/* Próximos cupos */}
      <Card className="mb-6" id="cupos">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próximos cupos
            <Badge variant="secondary" className="ml-1 bg-muted">
              {events.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Cada fila es un slot generado a partir de la regla. Mostramos cuánta gente reservó y el
            estado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RuleEventsTable ruleId={rule.id} events={events} />
        </CardContent>
      </Card>

      {/* Excepciones */}
      <Card id="excepciones">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Excepciones
            <Badge variant="secondary" className="ml-1 bg-muted">
              {rule.exceptions.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Cancelá una fecha puntual (feriado, ausencia) o cambiá el horario / cupo de un día sin
            tocar la regla recurrente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RuleExceptionsManager ruleId={rule.id} exceptions={rule.exceptions as any} />
        </CardContent>
      </Card>
    </div>
  )
}
