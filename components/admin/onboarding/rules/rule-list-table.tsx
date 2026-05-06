'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, MapPin, Video, Zap, Calendar, Clock, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { DAY_NAMES_ES, MODALITY_LABEL } from '@/lib/types/onboarding-rules.types'
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

const MODALITY_ICON = {
  IN_PERSON: MapPin,
  VIRTUAL: Video,
  HYBRID: Zap,
}

const MODALITY_BADGE_CLASS: Record<OnboardingModality, string> = {
  IN_PERSON: 'bg-muted text-foreground',
  VIRTUAL: 'bg-info-soft text-info',
  HYBRID: 'bg-violet-100 text-violet-700',
}

export function RuleListTable({ rules }: { rules: RuleRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function toggleActive(id: string, next: boolean) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/onboarding/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      })
      if (!res.ok) throw new Error()
      toast.success(next ? 'Regla activada' : 'Regla desactivada')
      router.refresh()
    } catch {
      toast.error('No se pudo cambiar el estado')
    } finally {
      setBusyId(null)
    }
  }

  async function materializeNow(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/onboarding/rules/${id}/materialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeksAhead: 8 }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      toast.success(`Materializadas ${json.totalCreated ?? 0} fechas (${json.totalSkipped ?? 0} ya existían)`)
      router.refresh()
    } catch {
      toast.error('No se pudo materializar')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Modalidad</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Hora</TableHead>
            <TableHead>Cupo</TableHead>
            <TableHead>Próximas</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((r) => {
            const Icon = MODALITY_ICON[r.modality]
            return (
              <TableRow key={r.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/admin/onboarding/reglas/${r.slug}`} className="hover:underline">
                    {r.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">/{r.slug}</div>
                </TableCell>
                <TableCell>
                  <Badge className={MODALITY_BADGE_CLASS[r.modality]} variant="secondary">
                    <Icon className="mr-1 h-3 w-3" />
                    {MODALITY_LABEL[r.modality]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.frequency === 'ONE_OFF' ? (
                    <Badge variant="secondary" className="bg-muted">
                      Una sola vez
                    </Badge>
                  ) : (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <span
                          key={d}
                          className={`h-6 w-6 rounded text-xs flex items-center justify-center ${
                            r.daysOfWeek.includes(d)
                              ? 'bg-brand text-brand-foreground'
                              : 'bg-muted text-muted-foreground/40'
                          }`}
                        >
                          {DAY_NAMES_ES[d][0]}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {r.startTime}
                    <span className="text-muted-foreground text-xs">({r.durationMinutes}min)</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    {r.maxCapacity}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {r._count.events}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={r.isActive}
                    onCheckedChange={(v) => toggleActive(r.id, v)}
                    disabled={busyId === r.id}
                  />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/onboarding/reglas/${r.slug}`}>Editar</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => materializeNow(r.id)}>
                        Materializar ahora
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
