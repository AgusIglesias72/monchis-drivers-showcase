"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  UserPlus, CheckCircle2, CalendarClock, GraduationCap, TrendingUp,
  ChevronRight, Phone, Mail, MapPin, CreditCard, FileText, ArrowUpRight,
  Clock, BadgeCheck, AlertCircle,
} from "lucide-react"
import { KpiCard, StatDelta, Drawer } from "@/components/ds"
import { Spinner } from "@/components/ds/spinner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type KpiKey = 'iniciadas' | 'completadas' | 'agendados' | 'capacitados'

interface Kpi7d { current: number; prior: number }

interface PostulacionesStats {
  kpis7d: {
    iniciadas: Kpi7d
    completadas: Kpi7d
    agendados: Kpi7d
    capacitados: Kpi7d
  }
  [key: string]: unknown
}

interface KpiDriver {
  id: string
  fullName: string
  initials: string
  city: string | null
  cedula: string | null
  createdAt: string
  date: string
  status: string
  onboardingStatus: string | null
}

interface DriverDetail {
  id: string
  slug: string | null
  fullName: string
  initials: string
  phoneNumber: string | null
  email: string | null
  city: string | null
  cedula: string | null
  workZone: string | null
  status: string
  onboardingStatus: string | null
  onboardingScheduledAt: string | null
  onboardingCompletedAt: string | null
  rucStatus: string | null
  createdAt: string
  currentStep: number | null
  documents: { id: string; documentType: string; status: string }[]
  latestAgentRun: { id: string; decision: string | null; summary: string | null } | null
  latestPayment: { id: string; status: string; paymentProofUrl: string | null } | null
  contactCount: number
  latestAttendance: { id: string; status: string; event: { scheduledDate: string } | null } | null
}

function pct(current: number, prior: number) {
  if (prior === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prior) / prior) * 100)
}
function dir(p: number): "up" | "down" | "flat" {
  return p > 0 ? "up" : p < 0 ? "down" : "flat"
}
function Sub({ kpi }: { kpi: Kpi7d }) {
  const p = pct(kpi.current, kpi.prior)
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatDelta value={`${Math.abs(p)}%`} dir={dir(p)} />
      <span>vs sem. ant.</span>
    </span>
  )
}

const KPI_META: Record<KpiKey, { label: string; subtitle: string }> = {
  iniciadas:   { label: 'Postulaciones iniciadas',    subtitle: 'Drivers que comenzaron el formulario en los últimos 30 días' },
  completadas: { label: 'Postulaciones completadas',  subtitle: 'Drivers que completaron el formulario en los últimos 30 días' },
  agendados:   { label: 'Agendados',                  subtitle: 'Drivers con capacitación agendada en los últimos 30 días' },
  capacitados: { label: 'Capacitados (asistentes)',   subtitle: 'Drivers que asistieron a su capacitación en los últimos 30 días' },
}

const ONBOARDING_LABELS: Record<string, string> = {
  NOT_READY: 'No listo', READY: 'Listo para agendar', SCHEDULED: 'Agendado',
  IN_PROGRESS: 'En proceso', COMPLETED: 'Capacitado', CANCELLED: 'Cancelado', NO_SHOW: 'No asistió',
}
const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'En progreso', COMPLETED: 'Form. completado', REJECTED: 'Rechazado', ABANDONED: 'Abandonado',
}
const AGENT_LABELS: Record<string, string> = {
  APPROVED: 'IA: Aprobado', REJECTED: 'IA: Rechazado', NEEDS_REVIEW: 'IA: Revisión',
}

function docSummary(docs: DriverDetail['documents']) {
  const cedulas = docs.filter(d => d.documentType === 'CEDULA')
  const criminal = docs.filter(d => d.documentType === 'CRIMINAL_RECORD')
  const approved = (arr: typeof docs) => arr.some(d => d.status === 'APPROVED')
  const pending  = (arr: typeof docs) => arr.some(d => ['PENDING', 'IN_REVIEW'].includes(d.status))
  if (!cedulas.length || !criminal.length) return { label: 'Sin documentos', ok: false as const }
  if (approved(cedulas) && approved(criminal)) return { label: 'Docs aprobados', ok: true as const }
  if (pending(cedulas) || pending(criminal)) return { label: 'En revisión', ok: null }
  return { label: 'Pendientes', ok: false as const }
}

function InfoRow({ icon: Icon, label, value, mono }: {
  icon: React.ElementType; label: string; value: string; mono?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-3.5 text-[var(--c-ink-subtle)] shrink-0" />
      <span className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)] w-[84px] shrink-0">{label}</span>
      <span className={`text-[length:var(--t-small)] text-[var(--c-ink)] font-medium truncate ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h4 className="text-[length:var(--t-label)] font-bold uppercase tracking-[var(--ls-label)] text-[var(--c-ink-subtle)]">
        {title}
      </h4>
      {children}
    </section>
  )
}

export function PostulacionesKPIs({ stats }: { stats: PostulacionesStats }) {
  const { kpis7d } = stats
  const [listOpen, setListOpen] = useState(false)
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null)
  const [drivers, setDrivers] = useState<KpiDriver[]>([])
  const [listLoading, setListLoading] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<DriverDetail | null>(null)

  const convLast7 = kpis7d.iniciadas.current > 0
    ? Math.round((kpis7d.completadas.current / kpis7d.iniciadas.current) * 100) : 0
  const convPrior7 = kpis7d.iniciadas.prior > 0
    ? Math.round((kpis7d.completadas.prior / kpis7d.iniciadas.prior) * 100) : 0
  const convDelta = pct(convLast7, convPrior7)

  async function openList(kpi: KpiKey) {
    setActiveKpi(kpi)
    setListOpen(true)
    setListLoading(true)
    setDrivers([])
    const res = await fetch(`/api/admin/postulaciones/kpi-drivers?kpi=${kpi}`)
    const data = await res.json()
    setDrivers(data.drivers ?? [])
    setListLoading(false)
  }

  async function openDetail(id: string) {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    const res = await fetch(`/api/admin/postulaciones/${id}`)
    const data = await res.json()
    setDetail(data)
    setDetailLoading(false)
  }

  const meta = activeKpi ? KPI_META[activeKpi] : null

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {([
          { kpi: 'iniciadas'   as KpiKey, label: 'Iniciadas (30d)',   icon: UserPlus,     kpiData: kpis7d.iniciadas },
          { kpi: 'completadas' as KpiKey, label: 'Completadas (30d)', icon: CheckCircle2, kpiData: kpis7d.completadas },
          { kpi: 'agendados'   as KpiKey, label: 'Agendados (30d)',   icon: CalendarClock,kpiData: kpis7d.agendados },
          { kpi: 'capacitados' as KpiKey, label: 'Capacitados (30d)', icon: GraduationCap,kpiData: kpis7d.capacitados },
        ] as const).map(({ kpi, label, icon, kpiData }) => (
          <button key={kpi} className="text-left" onClick={() => openList(kpi)}>
            <KpiCard
              label={label}
              value={kpiData.current}
              icon={icon}
              sub={<Sub kpi={kpiData} />}
              className="hover:ring-1 hover:ring-border transition-shadow cursor-pointer h-full"
            />
          </button>
        ))}
        <KpiCard
          label="Conversión (30d)"
          value={`${convLast7}%`}
          icon={TrendingUp}
          sub={
            <span className="inline-flex items-center gap-1.5">
              <StatDelta value={`${Math.abs(convDelta)}pp`} dir={dir(convDelta)} />
              <span>vs sem. ant.</span>
            </span>
          }
        />
      </div>

      {/* Drawer: lista de drivers del KPI */}
      <Drawer
        open={listOpen}
        onClose={() => setListOpen(false)}
        title={meta?.label}
        subtitle={meta?.subtitle}
      >
        {listLoading && (
          <div className="flex justify-center py-10">
            <Spinner size="md" className="text-[var(--c-ink-subtle)]" />
          </div>
        )}
        {!listLoading && drivers.length === 0 && (
          <p className="py-8 text-center text-[length:var(--t-small)] text-[var(--c-ink-subtle)]">
            Sin resultados en el período.
          </p>
        )}
        {!listLoading && drivers.length > 0 && (
          <ul className="space-y-0.5 -mx-5">
            {drivers.map(d => (
              <li key={d.id}>
                <button
                  className="w-full text-left flex items-center gap-3 h-[62px] px-5 group hover:bg-[var(--c-surface-2)] transition-colors cursor-pointer"
                  onClick={() => openDetail(d.id)}
                >
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="bg-[var(--c-brand-50)] text-[var(--c-brand)] text-xs font-semibold">
                      {d.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[length:var(--t-body)] font-medium text-[var(--c-ink)]">
                      {d.fullName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                      {d.city && (
                        <span className="text-[length:var(--t-small)] text-[var(--c-ink-subtle)] truncate shrink-0 max-w-[80px]">{d.city}</span>
                      )}
                      {d.cedula && (
                        <span className="inline-flex items-center gap-0.5 text-[length:var(--t-small)] text-[var(--c-ink-subtle)] font-mono shrink-0">
                          <FileText className="size-3 shrink-0" />
                          {d.cedula}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-[length:var(--t-small)] text-[var(--c-ink-subtle)] font-mono shrink-0">
                        <Clock className="size-3 shrink-0" />
                        {format(new Date(d.createdAt), "d MMM", { locale: es })}
                      </span>
                      {d.onboardingStatus && (
                        <span className="inline-flex items-center rounded-full border border-[var(--c-border)] px-1.5 py-px text-[10px] font-medium text-[var(--c-ink-subtle)] shrink-0">
                          {ONBOARDING_LABELS[d.onboardingStatus] ?? d.onboardingStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-3.5 text-[var(--c-ink-subtle)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>

      {/* Drawer: detalle de un driver */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail?.fullName ?? ''}
        subtitle={detail ? [STATUS_LABELS[detail.status], detail.onboardingStatus ? ONBOARDING_LABELS[detail.onboardingStatus] : null].filter(Boolean).join(' · ') : ''}
        avatar={
          detail ? (
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-[var(--c-brand-50)] text-[var(--c-brand)] text-sm font-bold">
                {detail.initials}
              </AvatarFallback>
            </Avatar>
          ) : undefined
        }
        footer={
          detail ? (
            <Button asChild className="w-full rounded-full" size="sm">
              <Link href={`/admin/postulaciones/${detail.slug ?? detail.id}`} onClick={() => { setDetailOpen(false); setListOpen(false) }}>
                <ArrowUpRight className="size-3.5 mr-1.5" />
                Ver perfil completo
              </Link>
            </Button>
          ) : undefined
        }
      >
        {detailLoading && (
          <div className="flex justify-center py-10">
            <Spinner size="md" className="text-[var(--c-ink-subtle)]" />
          </div>
        )}

        {!detailLoading && detail && (
          <>
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 -mt-2">
              {detail.latestAgentRun?.decision && (
                <Badge variant="outline" className="text-[10px] h-5 font-normal">
                  {AGENT_LABELS[detail.latestAgentRun.decision] ?? detail.latestAgentRun.decision}
                </Badge>
              )}
              {detail.currentStep != null && (
                <Badge variant="outline" className="text-[10px] h-5 font-normal font-mono">
                  Paso {detail.currentStep}/5
                </Badge>
              )}
            </div>

            <Section title="Contacto">
              {detail.cedula && <InfoRow icon={CreditCard} label="CI" value={detail.cedula} mono />}
              {detail.phoneNumber && <InfoRow icon={Phone} label="Teléfono" value={detail.phoneNumber} mono />}
              {detail.email && <InfoRow icon={Mail} label="Email" value={detail.email} />}
              {detail.city && (
                <InfoRow icon={MapPin} label="Ciudad" value={`${detail.city}${detail.workZone ? ` · ${detail.workZone}` : ''}`} />
              )}
            </Section>

            <Section title="Postulación">
              <InfoRow icon={Clock} label="Iniciada" value={format(new Date(detail.createdAt), "d MMM yyyy", { locale: es })} />
              {(() => {
                const ds = docSummary(detail.documents)
                return <InfoRow icon={ds.ok === true ? BadgeCheck : ds.ok === false ? AlertCircle : Clock} label="Documentos" value={ds.label} />
              })()}
              {detail.contactCount > 0 && (
                <InfoRow icon={Phone} label="Contactos" value={`${detail.contactCount} registro${detail.contactCount !== 1 ? 's' : ''}`} />
              )}
            </Section>

            {(detail.onboardingScheduledAt || detail.onboardingCompletedAt) && (
              <Section title="Capacitación">
                {detail.onboardingScheduledAt && (
                  <InfoRow icon={CalendarClock} label="Agendada" value={format(new Date(detail.onboardingScheduledAt), "d MMM yyyy HH:mm", { locale: es })} />
                )}
                {detail.onboardingCompletedAt && (
                  <InfoRow icon={GraduationCap} label="Completada" value={format(new Date(detail.onboardingCompletedAt), "d MMM yyyy", { locale: es })} />
                )}
                {detail.latestAttendance && (
                  <InfoRow icon={CheckCircle2} label="Asistencia" value={detail.latestAttendance.status} />
                )}
              </Section>
            )}

            {detail.latestPayment && (
              <Section title="Pago de equipo">
                <InfoRow icon={CreditCard} label="Estado" value={detail.latestPayment.status} />
                {detail.latestPayment.paymentProofUrl && (
                  <InfoRow icon={CheckCircle2} label="Comprobante" value="Subido" />
                )}
              </Section>
            )}
          </>
        )}
      </Drawer>
    </>
  )
}
