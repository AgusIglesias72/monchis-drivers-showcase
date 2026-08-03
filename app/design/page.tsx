"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Bike,
  CalendarClock,
  CalendarRange,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  History,
  IdCard,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  LogIn,
  MapPin,
  MessageSquare,
  Package,
  Pencil,
  Phone,
  Plus,
  Radio,
  Search,
  ServerCrash,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import LoginScreen from "@/app/design/screens/login/page"
import SignupScreen from "@/app/design/screens/signup/page"
import ResetScreen from "@/app/design/screens/reset/page"
import DashboardScreen from "@/app/design/screens/dashboard/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  ActionMenu,
  Avatar,
  AvatarGroup,
  Banner,
  Breadcrumbs,
  ButtonGroup,
  Callout,
  Chip,
  Combobox,
  ConfirmDialog,
  CopyButton,
  CopyField,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DatePicker,
  DateRangePicker,
  DescriptionItem,
  DescriptionList,
  DetailDrawer,
  DrawerField,
  DrawerSection,
  DrawerStat,
  EmptyState,
  EntityCard,
  Field,
  FilterBar,
  FilterLabel,
  Gauge,
  InfoTile,
  Kbd,
  KbdGroup,
  KpiCard,
  LineTabs,
  LoadingButton,
  Metric,
  Modal,
  Money,
  notify,
  NumberInput,
  Pagination,
  PasswordInput,
  PillTabs,
  ProgressBar,
  RadioCards,
  Rating,
  SearchInput,
  SegmentedControl,
  SelectField,
  SkeletonCard,
  SkeletonKpi,
  SkeletonList,
  Slider,
  Spinner,
  StatDelta,
  StatusPill,
  Stepper,
  Tag,
  TagInput,
  ThemeToggle,
  Timeline,
  TimelineItem,
  Toolbar,
  TooltipHint,
  AreaChartDS,
  BarChartDS,
  ChartCard,
  DonutChartDS,
  FunnelChartDS,
  LineChartDS,
  Sparkline,
  BottomSheet,
  CheckboxField,
  DateText,
  SwitchField,
  TimeAgo,
  AddonInput,
  AgendaPanel,
  ChatPanel,
  ImageUploadGrid,
  KanbanBoard,
  Markdown,
  MonthlyCalendar,
  MultiSelect,
  NotificationBell,
  PageState,
  Tour,
  WhatsAppIcon,
  type CalendarEvent,
  type ChatConversation,
  type KanbanColumnDef,
  type NotificationEntry,
  type TourStep,
} from "@/components/ds"

// ── Pantallas de diseño ──────────────────────────────────────────────────────
const DESIGN_SCREENS = [
  { href: "/design/screens/dashboard", title: "Dashboard",           desc: "KPIs, gráficos y top drivers",         icon: LayoutDashboard },
  { href: "/design/screens/list",      title: "Lista (Pedidos)",     desc: "Filtros + search + drawer de detalle", icon: ListOrdered },
  { href: "/design/screens/detail",    title: "Detalle de driver",   desc: "Header, tabs, timeline y KPIs",        icon: IdCard },
  { href: "/design/screens/settings",  title: "Configuración",       desc: "Paneles con campos y toggles",         icon: Settings },
  { href: "/design/screens/wizard",    title: "Wizard de onboarding",desc: "Stepper multi-paso con checklist",     icon: ListChecks },
  { href: "/design/screens/login",     title: "Iniciar sesión",      desc: "Login Google + email/contraseña",      icon: LogIn },
  { href: "/design/screens/signup",    title: "Crear cuenta",        desc: "Registro con confirmación",            icon: UserPlus },
  { href: "/design/screens/reset",     title: "Recuperar contraseña",desc: "Instrucciones por email",              icon: KeyRound },
  { href: "/design/screens/error",     title: "Error 404",           desc: "Pantalla de no encontrado",            icon: AlertTriangle },
]

// ── Datos de ejemplo para gráficos ──────────────────────────────────────────

const BAR_DATA = [
  { dia: "Lun", ordenes: 120 },
  { dia: "Mar", ordenes: 98 },
  { dia: "Mié", ordenes: 134 },
  { dia: "Jue", ordenes: 111 },
  { dia: "Vie", ordenes: 156 },
  { dia: "Sáb", ordenes: 182 },
  { dia: "Dom", ordenes: 143 },
]
const LINE_DATA = [
  { dia: "Lun", actual: 41, prev: 44 },
  { dia: "Mar", actual: 39, prev: 43 },
  { dia: "Mié", actual: 43, prev: 42 },
  { dia: "Jue", actual: 38, prev: 41 },
  { dia: "Vie", actual: 36, prev: 40 },
  { dia: "Sáb", actual: 40, prev: 45 },
  { dia: "Dom", actual: 42, prev: 46 },
]
const DONUT_DATA = [
  { name: "Centro", value: 40 },
  { name: "Carmelitas", value: 25 },
  { name: "San Lorenzo", value: 20 },
  { name: "Lambaré", value: 15 },
]
const FUNNEL_STAGES = [
  { label: "Iniciado", value: 8501 },
  { label: "Contacto", value: 8501 },
  { label: "Datos personales", value: 7876 },
  { label: "Documentos", value: 2692 },
  { label: "Completado", value: 1744 },
  { label: "Agendado", value: 314 },
]

// ── Datos de ejemplo: patrones ──────────────────────────────────────────────

const _hoy = new Date()
const diaMes = (d: number) => new Date(_hoy.getFullYear(), _hoy.getMonth(), d)

const CAL_EVENTS: CalendarEvent[] = [
  { id: "ev1", date: _hoy, time: "09:00", title: "Capacitación inicial", subtitle: "Oficina Centro", avatarName: "María Benítez", status: { label: "Confirmada", tone: "success" } },
  { id: "ev2", date: _hoy, time: "14:30", title: "Entrevista de onboarding", subtitle: "Google Meet", avatarName: "Carlos Rojas", status: { label: "Pendiente", tone: "warning" } },
  { id: "ev3", date: diaMes(4), time: "10:00", title: "Capacitación inicial", subtitle: "Oficina Centro", avatarName: "Lucía Ferreira" },
  { id: "ev4", date: diaMes(11), time: "16:00", title: "Entrega de kit", subtitle: "Depósito Lambaré", avatarName: "Pedro Aquino" },
  { id: "ev5", date: diaMes(11), time: "17:30", title: "Firma de contrato", subtitle: "Oficina Centro", avatarName: "Ana Vera" },
  { id: "ev6", date: diaMes(24), time: "09:30", title: "Re-capacitación", subtitle: "Oficina Centro", avatarName: "Jorge Cáceres" },
]

const CHAT_CONVS: ChatConversation[] = [
  {
    id: "c1",
    name: "María Benítez",
    lastMessage: "Dale, mañana paso por la oficina 👍",
    lastTime: "10:42",
    unread: 2,
    metaCode: "DRV-1042",
    meta: "Zona Centro · +595 981 123 456",
    dateSeparator: "Hoy",
    messages: [
      { id: "m1", dir: "in", text: "Hola! Quería consultar por el bono de esta semana", time: "10:38" },
      { id: "m2", dir: "out", text: "Hola María! Tu bono ya fue procesado, se acredita hoy a la tarde.", time: "10:40", read: true },
      { id: "m3", dir: "in", text: "Genial, gracias! Y para retirar el kit?", time: "10:41" },
      { id: "m4", dir: "in", text: "Dale, mañana paso por la oficina 👍", time: "10:42" },
    ],
  },
  {
    id: "c2",
    name: "Carlos Rojas",
    lastMessage: "Ya subí la cédula por la app",
    lastTime: "09:15",
    metaCode: "DRV-2317",
    meta: "Zona San Lorenzo",
    messages: [
      { id: "m1", dir: "out", text: "Carlos, te falta subir la cédula para completar el registro.", time: "09:10", read: true },
      { id: "m2", dir: "in", text: "Ya subí la cédula por la app", time: "09:15" },
    ],
  },
  {
    id: "c3",
    name: "Lucía Ferreira",
    lastMessage: "Perfecto, nos vemos el jueves",
    lastTime: "Ayer",
    meta: "Zona Lambaré",
    messages: [
      { id: "m1", dir: "out", text: "Te agendamos para la capacitación del jueves 09:00.", time: "16:20", read: true },
      { id: "m2", dir: "in", text: "Perfecto, nos vemos el jueves", time: "16:25" },
    ],
  },
]

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: "nuevo", label: "Nuevo", color: "var(--info)", softColor: "var(--info-soft)" },
  { id: "proceso", label: "En proceso", color: "var(--warning)", softColor: "var(--warning-soft)" },
  { id: "resuelto", label: "Resuelto", color: "var(--success)", softColor: "var(--success-soft)" },
]
const KANBAN_INIT = [
  { id: "k1", column: "nuevo", title: "Salida sin acción", driver: "María Benítez", zona: "Centro" },
  { id: "k2", column: "nuevo", title: "Documento vencido", driver: "Pedro Aquino", zona: "Lambaré" },
  { id: "k3", column: "proceso", title: "Reclamo de bono", driver: "Carlos Rojas", zona: "San Lorenzo" },
  { id: "k4", column: "resuelto", title: "Cambio de zona", driver: "Ana Vera", zona: "Carmelitas" },
]

const NOTIFS_INIT: NotificationEntry[] = [
  { id: "n1", icon: UserPlus, tone: "brand", title: "Nuevo driver registrado", body: "María Benítez completó el formulario de alta.", time: "10:42", group: "Hoy", actorName: "María Benítez" },
  { id: "n2", icon: AlertTriangle, tone: "warning", title: "Salida sin acción detectada", body: "DRV-2317 salió del local sin marcar retiro.", time: "09:18", group: "Hoy" },
  { id: "n3", icon: CalendarClock, tone: "info", title: "Capacitación agendada", body: "5 drivers confirmados para el jueves 09:00.", time: "Ayer", group: "Ayer", read: true },
  { id: "n4", icon: Check, tone: "success", title: "Bonos procesados", body: "El corte semanal se procesó sin errores.", time: "Ayer", group: "Ayer", read: true },
]

const ZONA_MULTI_OPTS = [
  { value: "centro", label: "Centro", icon: MapPin },
  { value: "carmelitas", label: "Carmelitas", icon: MapPin },
  { value: "sanlorenzo", label: "San Lorenzo", icon: MapPin },
  { value: "lambare", label: "Lambaré", icon: MapPin },
  { value: "fdomora", label: "Fdo. de la Mora", icon: MapPin },
]

const MD_SAMPLE = `# Resumen semanal

Los **bonos** de la semana ya fueron *procesados*. El corte se hizo con el script \`process-daily\`.

- 214 drivers activos
- 32 nuevos registros
- 5 reclamos pendientes

> Recordá revisar los documentos vencidos antes del viernes.

Más detalle en [el panel de reportes](/admin/reportes).`

const TOUR_STEPS: TourStep[] = [
  { title: "Tour de la vista", body: "Este recorrido resalta los elementos clave de la pantalla. Usá las flechas del teclado para navegar." },
  { target: "demo-kpi", title: "KPIs del día", body: "Acá ves el resumen de drivers activos y pedidos en curso." },
  { target: "demo-accion", title: "Acción principal", body: "Desde este botón registrás un nuevo driver." },
]

// ── Sidebar nav config ───────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    title: "FUNDAMENTOS",
    items: [
      { label: "Tokens & paleta", id: "tokens" },
      { label: "Tipografía", id: "tipografia" },
    ],
  },
  {
    title: "ACCIONES",
    items: [{ label: "Acciones", id: "acciones" }],
  },
  {
    title: "FORMULARIOS",
    items: [
      { label: "Formularios", id: "formularios" },
      { label: "Selección", id: "seleccion" },
    ],
  },
  {
    title: "DATOS & FEEDBACK",
    items: [
      { label: "Feedback", id: "feedback" },
      { label: "Datos", id: "datos" },
      { label: "Tablas", id: "tablas" },
    ],
  },
  {
    title: "MÉTRICAS",
    items: [
      { label: "Métricas", id: "metricas" },
      { label: "Gráficos", id: "graficos" },
    ],
  },
  {
    title: "NAVEGACIÓN",
    items: [{ label: "Navegación", id: "navegacion" }],
  },
  {
    title: "OVERLAYS",
    items: [{ label: "Overlays", id: "overlays" }],
  },
  {
    title: "ÁTOMOS",
    items: [{ label: "Átomos", id: "atomos" }],
  },
  {
    title: "SHELL",
    items: [{ label: "Shell de admin", id: "shell" }],
  },
  {
    title: "PATRONES",
    items: [{ label: "Patrones", id: "patrones" }],
  },
  {
    title: "PANTALLAS",
    items: [{ label: "Pantallas", id: "pantallas" }],
  },
]

const ALL_IDS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id))

// ── Primitivas de layout ─────────────────────────────────────────────────────

function Family({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-16 space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          FAMILIA {number}
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
    </section>
  )
}

function ComponentCard({
  name,
  meta,
  children,
  wide,
  noPad,
}: {
  name: string
  meta?: string
  children: React.ReactNode
  wide?: boolean
  noPad?: boolean
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--shadow-1)]",
        wide && "lg:col-span-2",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <span className="text-sm font-semibold">{name}</span>
        {meta && (
          <span className="text-right text-[11px] text-muted-foreground">{meta}</span>
        )}
      </div>
      <div className={cn(noPad ? "" : "p-5")}>{children}</div>
    </div>
  )
}

function ScreenPreview({
  title,
  route,
  children,
  wide,
  height = 470,
}: {
  title: string
  route: string
  children: React.ReactNode
  wide?: boolean
  height?: number
}) {
  return (
    <div className={wide ? "lg:col-span-2" : ""}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">{title}</span>
        <a
          href={route}
          target="_blank"
          rel="noopener"
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          Abrir ↗
        </a>
      </div>
      <div className="overflow-hidden rounded-[var(--r-lg)] border border-border shadow-[var(--shadow-1)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-[var(--surface-2)] px-3 py-2">
          <span className="size-2.5 rounded-full bg-[#e0626c]" />
          <span className="size-2.5 rounded-full bg-[#e8b341]" />
          <span className="size-2.5 rounded-full bg-[#3fa06a]" />
          <span className="ml-2 rounded-[var(--r-pill)] bg-card px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">
            monchis-drivers.app{route}
          </span>
        </div>
        {/* Component rendered inline, clipped to height */}
        <div className="overflow-hidden" style={{ height }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Swatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div className="space-y-1.5">
      <div
        className="h-12 rounded-[var(--radius-md)] border border-border/40 shadow-[var(--shadow-soft)]"
        style={{ background: `var(${varName})` }}
      />
      <div className="px-0.5">
        <div className="text-[11px] font-medium">{name}</div>
        <div className="font-[family-name:var(--font-mono)] text-[9px] text-ink-subtle">
          {varName}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function DesignPage() {
  const [activeId, setActiveId] = useState(ALL_IDS[0])
  const [search, setSearch] = useState("")

  // ── state para demos interactivos ────────────────────────────────────────
  const [seg, setSeg] = useState("todas")
  const [pill, setPill] = useState("dia")
  const [line, setLine] = useState("resumen")
  const [date, setDate] = useState<Date | undefined>()
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({})
  const [combo, setCombo] = useState<string>()
  const [radio, setRadio] = useState("moto")
  const [sliderVal, setSliderVal] = useState(60)
  const [numVal, setNumVal] = useState(3)
  const [ratingVal, setRatingVal] = useState(4)
  const [tags, setTags] = useState(["Centro", "Turno mañana"])
  const [selVal, setSelVal] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [bottomOpen, setBottomOpen] = useState(false)
  const [sw, setSw] = useState(true)
  const [page, setPage] = useState(3)
  const [calDate, setCalDate] = useState<Date>(_hoy)
  const [multiZonas, setMultiZonas] = useState<string[]>(["centro"])
  const [montoBono, setMontoBono] = useState("150000")
  const [telefono, setTelefono] = useState("981123456")
  const [imgs, setImgs] = useState<File[]>([])
  const [kanban, setKanban] = useState(KANBAN_INIT)
  const [notifs, setNotifs] = useState(NOTIFS_INIT)
  const [tourOpen, setTourOpen] = useState(false)

  // ── scroll-spy ───────────────────────────────────────────────────────────
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveId(visible.target.id)
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    )
    for (const id of ALL_IDS) {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [])

  const filteredGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) =>
      i.label.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="flex w-[218px] shrink-0 flex-col overflow-y-auto border-r border-border bg-[var(--sidebar)]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-display)] text-sm font-bold text-primary-foreground">
            M
          </div>
          <div>
            <div className="text-sm font-bold leading-none">Monchis Drivers</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Design System
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar componente…"
              className="h-8 rounded-full bg-muted/60 pl-8 text-xs shadow-none focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pb-6">
          {filteredGroups.map((group) => (
            <div key={group.title} className="mb-3">
              <p className="px-2 py-1 text-[9px] font-semibold tracking-[0.1em] text-muted-foreground">
                {group.title}
              </p>
              {group.items.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "flex items-center rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                    activeId === item.id
                      ? "bg-brand-soft font-medium text-primary"
                      : "text-foreground/70 hover:bg-accent hover:text-foreground",
                  )}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Tema</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-14 px-8 py-10">

          {/* ── TOKENS ───────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-[var(--shadow-1)]">
            {/* Header card tokens */}
            <div className="flex items-center gap-4 border-b border-border bg-[var(--surface-inverse)] px-6 py-5">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary font-[family-name:var(--font-display)] text-base font-bold text-primary-foreground">
                M
              </div>
              <div>
                <div className="font-[family-name:var(--font-display)] text-base font-bold text-white">
                  Monchis Drivers · STUDIO
                </div>
                <div className="text-[11px] text-white/60">
                  Rojo marca · acento cálido · superficies tibias · redondeado
                </div>
              </div>
              <div className="ml-auto font-[family-name:var(--font-mono)] text-[11px] text-white/50">
                Editá{" "}
                <code className="rounded bg-white/10 px-1">globals.css</code>{" "}
                para cambiar la estética.
              </div>
            </div>

            <div
              id="tokens"
              className="scroll-mt-0 grid gap-10 px-6 py-6 lg:grid-cols-[1fr_auto_auto]"
            >
              {/* Paleta */}
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  PALETA
                </p>
                <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
                  <Swatch name="brand" varName="--brand" />
                  <Swatch name="brand-500" varName="--brand-500" />
                  <Swatch name="accent-warm" varName="--accent-warm" />
                  <Swatch name="success" varName="--success" />
                  <Swatch name="warning" varName="--warning" />
                  <Swatch name="info" varName="--info" />
                  <Swatch name="danger" varName="--danger" />
                  <Swatch name="surface-2" varName="--surface-2" />
                  <Swatch name="inverse" varName="--surface-inverse" />
                  <Swatch name="foreground" varName="--foreground" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["--grad-brand", "--grad-warm"].map((g) => (
                    <div key={g} className="space-y-1">
                      <div
                        className="h-8 rounded-[var(--radius-md)]"
                        style={{ backgroundImage: `var(${g})` }}
                      />
                      <div className="font-[family-name:var(--font-mono)] text-[9px] text-ink-subtle">
                        {g}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tipografía */}
              <div
                id="tipografia"
                className="scroll-mt-8 min-w-[200px] max-w-[240px]"
              >
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  TIPOGRAFÍA
                </p>
                <div className="font-[family-name:var(--font-display)] text-[2rem] font-bold leading-none tracking-tight">
                  Bricolage
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">
                  Display · Plus Jakarta Sans · Space Mono
                </div>
                <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Display</span> ·{" "}
                    <span className="font-[family-name:var(--font-mono)]">--font-display</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Body</span> ·{" "}
                    <span className="font-[family-name:var(--font-mono)]">--font-sans</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Mono</span> ·{" "}
                    <span className="font-[family-name:var(--font-mono)]">--font-mono</span>
                  </div>
                </div>
                <div className="mt-3 font-[family-name:var(--font-mono)] text-[11px] text-ink-subtle">
                  Gs 145.000 · #10355024 · 07:41
                </div>
              </div>

              {/* Radios & Sombras */}
              <div className="min-w-[160px]">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  RADIOS & SOMBRA
                </p>
                <div className="flex items-end gap-2">
                  {(
                    [
                      { label: "sm", r: "6px" },
                      { label: "md", r: "10px" },
                      { label: "lg", r: "14px" },
                      { label: "xl", r: "20px" },
                    ] as const
                  ).map(({ label, r }) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <div
                        className="border border-border bg-surface-2 shadow-[var(--shadow-soft)]"
                        style={{
                          width: `${(["sm", "md", "lg", "xl"].indexOf(label) + 1) * 14 + 20}px`,
                          height: `${(["sm", "md", "lg", "xl"].indexOf(label) + 1) * 14 + 20}px`,
                          borderRadius: r,
                        }}
                      />
                      <span className="text-[9px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <div
                    className="rounded-[var(--radius-lg)] border border-border bg-card px-4 py-2.5 text-[11px] text-muted-foreground shadow-[var(--shadow-1)]"
                  >
                    shadow-1
                  </div>
                  <div
                    className="rounded-[var(--radius-lg)] border border-border bg-card px-4 py-2.5 text-[11px] text-muted-foreground shadow-[var(--shadow-2)]"
                  >
                    shadow-2
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── FAMILIA 1: ACCIONES ───────────────────────────────── */}
          <Family id="acciones" number={1} title="Acciones">
            <ComponentCard name="Button" meta="4 variantes × 2 tamaños">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button>Primario</Button>
                  <Button variant="critical">Crítico</Button>
                  <Button variant="secondary">Secundario</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button disabled>Deshabilitado</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon" aria-label="add"><Plus className="size-4" /></Button>
                  <Button>
                    Con ícono <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard name="ActionMenu & ButtonGroup" meta="acciones por fila">
              <div className="space-y-4">
                <ActionMenu
                  trigger={<Button variant="outline">Acciones</Button>}
                  items={[
                    { label: "Ver detalle", icon: Eye, onSelect: () => {} },
                    { label: "Editar", icon: Pencil, onSelect: () => {} },
                    { label: "Exportar CSV", icon: Download, onSelect: () => {} },
                    { label: "Eliminar", icon: Trash2, tone: "danger" as const, separatorBefore: true, onSelect: () => {} },
                  ]}
                />
                <div className="space-y-2">
                  <ButtonGroup>
                    <Button variant="outline" size="sm">Exportar</Button>
                    <Button variant="outline" size="sm">Imprimir</Button>
                    <Button variant="outline" size="sm">Compartir</Button>
                  </ButtonGroup>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard name="LoadingButton" meta="feedback async">
              <div className="flex flex-wrap items-center gap-3">
                <LoadingButton
                  loading={loading}
                  onClick={async () => {
                    setLoading(true)
                    await new Promise((r) => setTimeout(r, 2000))
                    setLoading(false)
                  }}
                >
                  Guardar cambios
                </LoadingButton>
                <LoadingButton loading={true} variant="outline">
                  Cargando…
                </LoadingButton>
              </div>
            </ComponentCard>

            <ComponentCard name="TooltipHint" meta="acción secundaria explicada">
              <div className="flex flex-wrap items-center gap-4">
                <TooltipHint label="Descargá el CSV con todos los pedidos del período seleccionado.">
                  <Button variant="outline" size="sm">Exportar CSV</Button>
                </TooltipHint>
                <TooltipHint label="Procesá el cálculo de bonos del día.">
                  <Button size="sm">Calcular bonos</Button>
                </TooltipHint>
              </div>
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 2: FORMULARIOS ────────────────────────────── */}
          <Family id="formularios" number={2} title="Formularios">
            <ComponentCard name="Input & Field" meta="todos los estados">
              <div className="space-y-3">
                <Field label="Nombre" hint="Como figura en la cédula.">
                  <Input placeholder="Juan Pérez" />
                </Field>
                <Field label="Email" required error="Email inválido.">
                  <Input placeholder="juan@mail.com" defaultValue="juan@" />
                </Field>
                <PasswordInput placeholder="Contraseña" />
              </div>
            </ComponentCard>

            <ComponentCard name="SelectField & Combobox" meta="dropdown propio">
              <div className="space-y-3">
                <SelectField
                  label="Zona"
                  value={selVal}
                  onChange={setSelVal}
                  placeholder="Elegí una zona…"
                  options={[
                    { value: "centro", label: "Centro", icon: MapPin },
                    { value: "carmelitas", label: "Carmelitas", icon: MapPin },
                    { value: "sanlorenzo", label: "San Lorenzo", icon: MapPin },
                    { value: "lambare", label: "Lambaré", icon: MapPin },
                  ]}
                />
                <Combobox
                  value={combo}
                  onChange={setCombo}
                  placeholder="Buscar zona…"
                  options={[
                    { value: "centro", label: "Centro", icon: MapPin },
                    { value: "carmelitas", label: "Carmelitas", icon: MapPin },
                    { value: "sanlorenzo", label: "San Lorenzo", icon: MapPin },
                    { value: "lambare", label: "Lambaré", icon: MapPin },
                  ]}
                />
              </div>
            </ComponentCard>

            <ComponentCard name="DatePicker & DateRangePicker" meta="calendario propio">
              <div className="space-y-3">
                <DatePicker value={date} onChange={setDate} placeholder="Elegí una fecha" />
                <DateRangePicker value={range} onChange={(r) => setRange(r ?? {})} />
              </div>
            </ComponentCard>

            <ComponentCard name="RadioCards" meta="selección visual">
              <RadioCards
                value={radio}
                onChange={setRadio}
                options={[
                  { value: "moto", label: "Moto", description: "Más ágil" },
                  { value: "bici", label: "Bicicleta", description: "Eco" },
                  { value: "auto", label: "Auto", description: "Más carga" },
                ]}
              />
            </ComponentCard>

            <ComponentCard name="SwitchField & CheckboxField" meta="toggle semántico">
              <div className="space-y-3">
                <SwitchField
                  label="Habilitado para recibir pedidos"
                  checked={sw}
                  onCheckedChange={setSw}
                />
                <CheckboxField
                  label="Acepto los términos y condiciones"
                  checked={sw}
                  onCheckedChange={(c) => setSw(c === true)}
                />
              </div>
            </ComponentCard>

            <ComponentCard name="Slider & NumberInput" meta="controles numéricos">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Radio de cobertura</span>
                    <span className="font-[family-name:var(--font-mono)] font-medium text-foreground">{sliderVal} km</span>
                  </div>
                  <Slider value={sliderVal} onChange={setSliderVal} min={1} max={100} />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Pedidos simultáneos</span>
                  <NumberInput value={numVal} onChange={setNumVal} min={1} max={10} />
                </div>
              </div>
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 3: SELECCIÓN ──────────────────────────────── */}
          <Family id="seleccion" number={3} title="Selección">
            <ComponentCard name="SegmentedControl" meta="filtros rápidos, sin JS extra">
              <div className="space-y-4">
                <SegmentedControl
                  value={seg}
                  onValueChange={setSeg}
                  options={[
                    { value: "todas", label: "Todas" },
                    { value: "hab", label: "Habilitados" },
                    { value: "baja", label: "De baja" },
                  ]}
                />
                <SegmentedControl
                  value={seg}
                  onValueChange={setSeg}
                  size="sm"
                  options={[
                    { value: "todas", label: "Todas" },
                    { value: "hab", label: "Habilitados" },
                    { value: "baja", label: "De baja" },
                    { value: "pend", label: "Pendientes" },
                  ]}
                />
              </div>
            </ComponentCard>

            <ComponentCard name="PillTabs & LineTabs" meta="navegación por pestañas">
              <div className="space-y-4">
                <PillTabs
                  value={pill}
                  onChange={setPill}
                  tabs={[
                    { value: "dia", label: "Día" },
                    { value: "semana", label: "Semana", count: 3 },
                    { value: "mes", label: "Mes" },
                  ]}
                />
                <LineTabs
                  value={line}
                  onChange={setLine}
                  tabs={[
                    { value: "resumen", label: "Resumen" },
                    { value: "detalle", label: "Detalle" },
                    { value: "mapa", label: "Mapa" },
                  ]}
                />
              </div>
            </ComponentCard>

            <ComponentCard name="Chip" meta="filtros y selección múltiple">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip mono icon={Package}>#10355024</Chip>
                <Chip mono icon={Clock}>7m</Chip>
                <Chip mono icon={Check} tone="success">54% acept</Chip>
                <Chip icon={Bike}>Centro</Chip>
                <Chip tone="warning">Prioridad</Chip>
                <Chip tone="info">En revisión</Chip>
                <Chip tone="danger">Cancelado</Chip>
              </div>
            </ComponentCard>

            <ComponentCard name="TagInput" meta="etiquetas editables">
              <TagInput
                value={tags}
                onChange={setTags}
                placeholder="Agregar etiqueta…"
              />
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 4: FEEDBACK ───────────────────────────────── */}
          <Family id="feedback" number={4} title="Feedback">
            <ComponentCard name="StatusPill" meta="mismo color en toda la app">
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="success" dot>Entregado</StatusPill>
                <StatusPill tone="info" dot>En camino</StatusPill>
                <StatusPill tone="warning" dot>En espera</StatusPill>
                <StatusPill tone="danger" dot>Cancelado</StatusPill>
                <StatusPill tone="neutral" dot>Borrador</StatusPill>
                <StatusPill tone="success">APPROVED</StatusPill>
                <StatusPill tone="info">IN_REVIEW</StatusPill>
                <StatusPill tone="warning">DOCS_PENDING</StatusPill>
                <StatusPill tone="danger">REJECTED</StatusPill>
              </div>
            </ComponentCard>

            <ComponentCard name="Callout" meta="avisos semánticos">
              <div className="space-y-2">
                <Callout tone="info" title="Dato">Los datos se actualizan cada minuto.</Callout>
                <Callout tone="success" title="Listo">Exportación completada correctamente.</Callout>
                <Callout tone="warning" title="Atención" icon={AlertTriangle}>
                  Hay 3 documentos pendientes de revisión.
                </Callout>
                <Callout tone="danger" title="Error">No se pudo conectar con la API.</Callout>
              </div>
            </ComponentCard>

            <ComponentCard name="Banner" meta="anuncios full-width, dismissible">
              <div className="space-y-2">
                <Banner tone="brand" title="Nuevo" dismissible>
                  Activá las notificaciones push para alertas en tiempo real.
                </Banner>
                <Banner tone="warning" title="Actualización pendiente" dismissible>
                  Hay una nueva versión disponible del sistema.
                </Banner>
              </div>
            </ComponentCard>

            <ComponentCard name="ProgressBar & Gauge" meta="completitud y cobertura">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Onboarding completado</span>
                    <span className="font-[family-name:var(--font-mono)] font-medium">68%</span>
                  </div>
                  <ProgressBar value={68} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Documentos aprobados</span>
                    <span className="font-[family-name:var(--font-mono)] font-medium text-success">92%</span>
                  </div>
                  <ProgressBar value={92} tone="success" />
                </div>
                <div className="mt-2 flex items-center gap-6">
                  <Gauge value={68} label="Cobertura" />
                  <Gauge value={92} label="Aprobación" tone="success" />
                  <Gauge value={34} label="Riesgo" tone="danger" />
                </div>
              </div>
            </ComponentCard>

            <ComponentCard name="EmptyState" meta="estado vacío contextual" wide>
              <EmptyState
                icon={Inbox}
                title="Sin resultados"
                description="No hay eventos con los filtros aplicados. Probá ampliar el rango de fechas."
                action={
                  <Button size="sm" variant="outline">Limpiar filtros</Button>
                }
              />
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 5: DATOS ──────────────────────────────────── */}
          <Family id="datos" number={5} title="Datos">
            <ComponentCard name="EntityCard" meta="fila clickeable → detalle">
              <div className="space-y-2">
                <EntityCard
                  icon="CR"
                  title="Cristian Ramón Aquino"
                  badge={<StatusPill tone="success">Habilitado</StatusPill>}
                  meta={
                    <>
                      <span className="font-[family-name:var(--font-mono)] text-xs font-medium">30 jun</span>
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">19:51</span>
                    </>
                  }
                  onClick={() => setDrawerOpen(true)}
                >
                  <Chip mono icon={Package}>1060 ped</Chip>
                  <Chip mono icon={Check} tone="warning">23% acept</Chip>
                  <Chip mono icon={Clock}>329h</Chip>
                  <Chip icon={Bike}>Centro</Chip>
                </EntityCard>
                <EntityCard
                  icon="PA"
                  title="Pablo Alejandro Cabral"
                  badge={<StatusPill tone="neutral">De baja</StatusPill>}
                  onClick={() => setDrawerOpen(true)}
                >
                  <Chip mono icon={Package}>1023 ped</Chip>
                  <Chip mono icon={Clock}>309h</Chip>
                  <Chip icon={Phone}>+595 992 301645</Chip>
                </EntityCard>
              </div>
            </ComponentCard>

            <ComponentCard name="DescriptionList & Timeline" meta="desglose + historial">
              <div className="space-y-4">
                <DescriptionList>
                  <DescriptionItem label="Cédula" mono>5.239.363</DescriptionItem>
                  <DescriptionItem label="Teléfono" mono>+595 987 171892</DescriptionItem>
                  <DescriptionItem label="Estado">
                    <StatusPill tone="success" dot>Habilitado</StatusPill>
                  </DescriptionItem>
                </DescriptionList>
                <Timeline>
                  <TimelineItem tone="success" title="Habilitado" time="30 jun · 19:51" />
                  <TimelineItem tone="info" title="Documentos aprobados" time="28 jun · 11:20" />
                  <TimelineItem tone="warning" title="Capacitación agendada" time="25 jun · 09:00" last />
                </Timeline>
              </div>
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 6: TABLAS ─────────────────────────────────── */}
          <Family id="tablas" number={6} title="Tablas">
            <ComponentCard name="DataTable" meta="sortable, con toolbar" wide noPad>
              <div className="overflow-x-auto">
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow>
                      <DataTableHead>Driver</DataTableHead>
                      <DataTableHead>Zona</DataTableHead>
                      <DataTableHead>Pedidos</DataTableHead>
                      <DataTableHead>Aceptación</DataTableHead>
                      <DataTableHead>Estado</DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {[
                      { name: "Cristian R. Aquino", zone: "Centro", orders: 1060, acc: "23%", tone: "success" as const },
                      { name: "Pablo A. Cabral", zone: "Carmelitas", orders: 1023, acc: "61%", tone: "neutral" as const },
                      { name: "Rodrigo M. Gamarra", zone: "San Lorenzo", orders: 876, acc: "78%", tone: "success" as const },
                      { name: "Jorge L. Benítez", zone: "Lambaré", orders: 543, acc: "45%", tone: "warning" as const },
                    ].map((row) => (
                      <DataTableRow key={row.name}>
                        <DataTableCell className="font-medium">{row.name}</DataTableCell>
                        <DataTableCell>{row.zone}</DataTableCell>
                        <DataTableCell>
                          <span className="font-[family-name:var(--font-mono)]">{row.orders}</span>
                        </DataTableCell>
                        <DataTableCell>
                          <span className="font-[family-name:var(--font-mono)]">{row.acc}</span>
                        </DataTableCell>
                        <DataTableCell>
                          <StatusPill tone={row.tone} dot>
                            {row.tone === "success" ? "Habilitado" : row.tone === "warning" ? "Pendiente" : "De baja"}
                          </StatusPill>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </div>
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 7: MÉTRICAS ───────────────────────────────── */}
          <Family id="metricas" number={7} title="Métricas">
            <ComponentCard name="KpiCard" meta="6 tonos semánticos" wide>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Total drivers" value="4.397" icon={Bike} />
                <KpiCard label="Habilitados" value="1.712" tone="success" icon={Bike} />
                <KpiCard label="De baja" value="2.685" tone="danger" icon={Bike} />
                <KpiCard label="Docs pendientes" value="4.677" tone="warning" sub="requiere acción" />
                <KpiCard label="En revisión" value="523" tone="info" />
                <KpiCard label="Meta cumplida" value="83%" tone="brand" sub="pedidos/semana" />
              </div>
            </ComponentCard>

            <ComponentCard name="Metric" meta="delta vs período anterior">
              <div className="grid grid-cols-3 gap-4 rounded-[var(--radius-lg)] bg-surface-3/50 p-4">
                <Metric label="Pedidos" value="8.501" delta="12%" deltaDir="up" sub="vs semana anterior" />
                <Metric label="E2E promedio" value="41m" delta="3m" deltaDir="up" invertDeltaColor sub="subir es malo" />
                <Metric label="Aceptación" value="63%" delta="2pp" deltaDir="down" />
              </div>
            </ComponentCard>

            <ComponentCard name="Sparkline" meta="mini tendencia inline">
              <div className="space-y-3">
                {[
                  { label: "Pedidos / día", data: [120, 98, 134, 111, 156, 182, 143], tone: "brand" as const },
                  { label: "Tiempo E2E (min)", data: [41, 39, 43, 38, 36, 40, 42], tone: "neutral" as const },
                  { label: "Cancelaciones", data: [8, 12, 6, 9, 4, 7, 5], tone: "warning" as const },
                ].map(({ label, data, tone }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-36 truncate text-xs text-muted-foreground">{label}</span>
                    <Sparkline data={data} tone={tone} className="flex-1" />
                    <span className="font-[family-name:var(--font-mono)] text-xs font-medium">{data[data.length - 1]}</span>
                  </div>
                ))}
              </div>
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 8: GRÁFICOS ───────────────────────────────── */}
          <Family id="graficos" number={8} title="Gráficos">
            <ComponentCard name="BarChart" meta="ordenes por día">
              <ChartCard title="Pedidos por día" subtitle="8.501 esta semana" height={160}>
                <BarChartDS
                  data={BAR_DATA}
                  series={[{ key: "ordenes", label: "Pedidos", color: "var(--brand)" }]}
                  xKey="dia"
                />
              </ChartCard>
            </ComponentCard>

            <ComponentCard name="LineChart" meta="comparación W-N">
              <ChartCard title="Tiempo E2E (min)" subtitle="promedio esta semana" height={160}>
                <LineChartDS
                  data={LINE_DATA}
                  series={[
                    { key: "actual", label: "Esta semana", color: "var(--brand)" },
                    { key: "prev", label: "Semana anterior", color: "var(--muted-foreground)" },
                  ]}
                  xKey="dia"
                />
              </ChartCard>
            </ComponentCard>

            <ComponentCard name="DonutChart" meta="distribución por zona">
              <ChartCard title="Pedidos por zona" subtitle="8.501 esta semana" height={200}>
                <DonutChartDS data={DONUT_DATA} centerLabel="Total" centerValue="8.501" />
              </ChartCard>
            </ComponentCard>

            <ComponentCard name="FunnelChart" meta="onboarding pipeline">
              <ChartCard title="Embudo de onboarding" subtitle="314 agendados" height={200}>
                <FunnelChartDS stages={FUNNEL_STAGES} />
              </ChartCard>
            </ComponentCard>

            <ComponentCard name="AreaChart" meta="tendencia de cobertura" wide>
              <ChartCard title="Cobertura de drivers" subtitle="73% media del período" height={160}>
                <AreaChartDS
                  data={LINE_DATA}
                  series={[
                    { key: "actual", label: "Esta semana", color: "var(--brand)" },
                    { key: "prev", label: "Semana anterior", color: "var(--muted-foreground)" },
                  ]}
                  xKey="dia"
                />
              </ChartCard>
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 9: NAVEGACIÓN ─────────────────────────────── */}
          <Family id="navegacion" number={9} title="Navegación">
            <ComponentCard name="FilterBar & Toolbar" meta="composición de controles">
              <div className="space-y-4">
                <FilterBar>
                  <FilterLabel>Estado</FilterLabel>
                  <SegmentedControl
                    value={seg}
                    onValueChange={setSeg}
                    options={[
                      { value: "todas", label: "Todas" },
                      { value: "hab", label: "Habilitados" },
                      { value: "baja", label: "De baja" },
                    ]}
                  />
                  <div className="lg:ml-auto">
                    <Button variant="outline" size="sm">Exportar</Button>
                  </div>
                </FilterBar>
                <Toolbar>
                  <SearchInput value="" onChange={() => {}} placeholder="Buscar driver…" />
                  <Button variant="outline" size="sm">Filtros</Button>
                  <Button size="sm"><Plus className="size-3.5" />Nuevo</Button>
                </Toolbar>
              </div>
            </ComponentCard>

            <ComponentCard name="Breadcrumbs & Pagination" meta="orientación + paginado">
              <div className="space-y-5">
                <Breadcrumbs
                  items={[
                    { label: "Admin", href: "/admin" },
                    { label: "Drivers", href: "/admin/onboarding" },
                    { label: "Cristian Aquino" },
                  ]}
                />
                <Pagination
                  page={page}
                  totalPages={12}
                  onPageChange={setPage}
                />
              </div>
            </ComponentCard>

            <ComponentCard name="Accordion" meta="contenido colapsable">
              <Accordion type="single" collapsible defaultValue="item-1">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Requisitos del driver</AccordionTrigger>
                  <AccordionContent>
                    Cédula vigente, vehículo en buen estado y cuenta bancaria activa.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Proceso de onboarding</AccordionTrigger>
                  <AccordionContent>
                    Registro → Documentos → Capacitación → Habilitación.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Pagos y bonificaciones</AccordionTrigger>
                  <AccordionContent>
                    Pagos semanales los viernes. Bonos por desempeño.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ComponentCard>

            <ComponentCard name="Stepper" meta="flujo de pasos">
              <Stepper
                steps={[
                  { label: "Registro" },
                  { label: "Documentos" },
                  { label: "Capacitación" },
                  { label: "Habilitación" },
                ]}
                current={2}
              />
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 10: OVERLAYS ──────────────────────────────── */}
          <Family id="overlays" number={10} title="Overlays">
            <ComponentCard name="Modal" meta="diálogo general">
              <Button variant="outline" onClick={() => setModalOpen(true)}>
                Abrir modal
              </Button>
              <Modal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title="Confirmar acción"
                description="¿Estás seguro de que querés continuar con esta operación?"
                footer={
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                    <Button onClick={() => setModalOpen(false)}>Confirmar</Button>
                  </div>
                }
              >
                <Callout tone="warning">Esta acción no se puede deshacer.</Callout>
              </Modal>
            </ComponentCard>

            <ComponentCard name="ConfirmDialog" meta="destructivo con confirmación">
              <Button variant="outline" onClick={() => setConfirmOpen(true)}>
                Eliminar driver
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Eliminar driver"
                description="¿Estás seguro? Esta acción eliminará permanentemente al driver y todos sus datos."
                confirmLabel="Sí, eliminar"
                tone="danger"
                onConfirm={() => setConfirmOpen(false)}
              />
            </ComponentCard>

            <ComponentCard name="DetailDrawer" meta="panel lateral de detalle">
              <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                Ver detalle
              </Button>
              <DetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                icon="CR"
                title="Cristian Ramón Aquino"
                subtitle="6786b3104f57580395b3a710"
                badge={<StatusPill tone="success">Habilitado</StatusPill>}
                footer={
                  <Button className="w-full">
                    Ver actividad <ArrowRight className="size-4" />
                  </Button>
                }
              >
                <DrawerSection title="Datos personales">
                  <DrawerField label="Cédula" mono>5.239.363</DrawerField>
                  <DrawerField label="Teléfono" mono>+595 987 171892</DrawerField>
                </DrawerSection>
                <div className="grid grid-cols-2 gap-2.5">
                  <DrawerStat label="Pedidos" value="1060" />
                  <DrawerStat label="Aceptación" value="23%" sub="247/1060" tone="text-warning" />
                  <DrawerStat label="Sesiones" value="176" sub="28 días activos" />
                  <DrawerStat label="Horas" value="329h" />
                </div>
              </DetailDrawer>
            </ComponentCard>

            <ComponentCard name="BottomSheet" meta="panel inferior (mobile)">
              <Button variant="outline" onClick={() => setBottomOpen(true)}>
                Abrir bottom sheet
              </Button>
              <BottomSheet
                open={bottomOpen}
                onOpenChange={setBottomOpen}
                title="Opciones del driver"
              >
                <div className="space-y-2 px-1 pb-4">
                  <Button variant="outline" className="w-full justify-start" onClick={() => setBottomOpen(false)}>
                    Ver perfil completo
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setBottomOpen(false)}>
                    Editar datos
                  </Button>
                  <Button variant="destructive" className="w-full justify-start" onClick={() => setBottomOpen(false)}>
                    Dar de baja
                  </Button>
                </div>
              </BottomSheet>
            </ComponentCard>
          </Family>

          {/* ── FAMILIA 11: ÁTOMOS ────────────────────────────────── */}
          <Family id="atomos" number={11} title="Átomos">
            <ComponentCard name="Avatar & AvatarGroup" meta="identidad visual">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Avatar name="CR" size="sm" />
                  <Avatar name="PA" size="md" />
                  <Avatar name="Rodrigo Gamarra" size="lg" />
                  <Avatar name="Jorge Benítez" size="lg" />
                </div>
                <AvatarGroup
                  items={[
                    { name: "Cristian Ramón" },
                    { name: "Pablo Alejandro" },
                    { name: "Rodrigo Gamarra" },
                    { name: "Jorge Benítez" },
                    { name: "María Soledad" },
                  ]}
                  max={4}
                />
              </div>
            </ComponentCard>

            <ComponentCard name="Spinner & Skeletons" meta="estados de carga">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Spinner size="sm" />
                  <Spinner />
                  <Spinner size="lg" />
                  <span className="text-xs text-muted-foreground">Spinner</span>
                </div>
                <SkeletonKpi />
                <SkeletonList rows={2} />
              </div>
            </ComponentCard>

            <ComponentCard name="Kbd & Rating" meta="átomos de UI">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <KbdGroup keys={["⌘", "K"]} />
                  <KbdGroup keys={["Ctrl", "S"]} />
                  <Kbd>Esc</Kbd>
                  <Kbd>Tab</Kbd>
                </div>
                <Rating value={ratingVal} onChange={setRatingVal} max={5} />
              </div>
            </ComponentCard>

            <ComponentCard name="CopyButton & CopyField" meta="copiado rápido">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-sm">6786b3104f57580395b3a710</span>
                  <CopyButton value="6786b3104f57580395b3a710" />
                </div>
                <CopyField value="https://monchis.com.py/drivers/register?ref=ABC123" label="Link de registro" />
              </div>
            </ComponentCard>

            <ComponentCard name="InfoTile" meta="tarjeta de navegación / feature">
              <div className="grid grid-cols-2 gap-3">
                <InfoTile title="Drivers activos" description="Habilitados hoy" />
                <InfoTile title="Documentos" description="Pendientes de revisión" />
              </div>
            </ComponentCard>

            <ComponentCard name="Money & StatDelta" meta="moneda + variación">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Money value={145000} currency="Gs" />
                  <Money value={25} currency="USD" />
                  <Money value={-3200} currency="Gs" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatDelta value="+12%" dir="up" />
                  <StatDelta value="+3m" dir="up" invertColor />
                  <StatDelta value="-2pp" dir="down" />
                  <StatDelta value="0%" dir="flat" />
                </div>
              </div>
            </ComponentCard>

            <ComponentCard name="DateText & TimeAgo" meta="fechas formateadas">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <DateText value={new Date(Date.now() - 3 * 60 * 60 * 1000)} />
                <DateText value={new Date()} pattern="dd MMM yyyy, HH:mm" />
                <TimeAgo value={new Date(Date.now() - 25 * 60 * 1000)} />
                <TimeAgo value={new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)} />
              </div>
            </ComponentCard>
          </Family>

          {/* ── SHELL DE ADMIN ────────────────────────────────────── */}
          <Family id="shell" number={12} title="Shell de admin">

            <ComponentCard name="TopBar (AdminTopBar)" meta="header global · h-16" wide>
              <div className="-mx-5 -mt-5 mb-5 overflow-hidden rounded-t-[calc(var(--radius-xl)-1px)] border-b border-border bg-card">
                <div className="flex h-14 items-center gap-3 px-4">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary shrink-0">
                    <span className="text-[11px] font-bold text-white">M</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <nav className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">Dashboard</span>
                    <ChevronRight className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Gestión</span>
                    <ChevronRight className="size-3 text-muted-foreground" />
                    <span className="font-medium text-foreground">Drivers</span>
                  </nav>
                  <div className="ml-auto flex items-center gap-2">
                    <button className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <Bell className="size-4" />
                    </button>
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                      AI
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Breadcrumb derivado automáticamente del pathname · vive en{" "}
                <code className="rounded bg-muted px-1 py-0.5">app/admin/layout.tsx</code>
              </p>
            </ComponentCard>

            <ComponentCard name="PageHeader" meta="encabezado de sección">
              <div className="space-y-5">
                <div className="flex items-end justify-between">
                  <div>
                    <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                      Drivers
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">362 habilitados · 14 pendientes</p>
                  </div>
                  <Button size="sm">
                    <Plus className="size-3.5" /> Nuevo driver
                  </Button>
                </div>
                <div className="border-t border-border pt-4 flex items-end justify-between">
                  <div>
                    <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                      Configuración
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Agente IA y parámetros del sistema</p>
                  </div>
                </div>
              </div>
            </ComponentCard>

            <ComponentCard name="AppSidebar" meta="navegación principal · colapsible" wide>
              <div className="flex gap-5 overflow-x-auto pb-1">
                {/* Expanded sidebar */}
                <div className="w-52 shrink-0 overflow-hidden rounded-[var(--r-lg)] border border-border bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
                  <div className="border-b border-[var(--sidebar-border)] p-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
                      <span className="text-[11px] font-bold text-white">M</span>
                    </div>
                  </div>
                  <nav className="space-y-2 p-2 text-[12px]">
                    {[
                      { section: "General",         items: ["Dashboard", "Postulaciones"] },
                      { section: "Gestión",          items: ["Capacitaciones", "Pagos"] },
                      { section: "Gestión Admin",    items: ["Live", "Turnos", "Pedidos", "Anomalías", "Drivers"] },
                      { section: "Comunicaciones",   items: ["WhatsApp", "Intercom"] },
                      { section: "Sistema",          items: ["Agente IA", "Reportes", "Configuración"] },
                    ].map((group, gi) => (
                      <div key={group.section}>
                        <p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                          {group.section}
                        </p>
                        {group.items.map((item, i) => (
                          <div
                            key={item}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2.5 py-1.5",
                              gi === 0 && i === 0
                                ? "bg-[var(--sidebar-accent)] font-medium text-[var(--sidebar-accent-foreground)]"
                                : "text-muted-foreground",
                            )}
                          >
                            <div className="size-1 rounded-full bg-current opacity-50" />
                            {item}
                          </div>
                        ))}
                      </div>
                    ))}
                  </nav>
                  <div className="border-t border-[var(--sidebar-border)] p-2.5">
                    <div className="flex items-center gap-2 rounded-md px-1 py-1">
                      <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                        AI
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-medium">Agustin Iglesias</div>
                        <div className="truncate text-[10px] text-muted-foreground">Admin</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsed (icon only) */}
                <div className="w-12 shrink-0 overflow-hidden rounded-[var(--r-lg)] border border-border bg-[var(--sidebar)]">
                  <div className="flex justify-center border-b border-[var(--sidebar-border)] p-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
                      <span className="text-[10px] font-bold text-white">M</span>
                    </div>
                  </div>
                  <nav className="flex flex-col items-center gap-1 p-1.5">
                    {[LayoutDashboard, UserPlus, CalendarRange, ShoppingBag, AlertTriangle, MessageSquare, Sparkles, Settings].map((Icon, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg",
                          i === 0
                            ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                            : "text-muted-foreground",
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>
                    ))}
                  </nav>
                </div>

                {/* Floating variant */}
                <div className="w-52 shrink-0 overflow-hidden rounded-[var(--r-xl)] border border-border bg-[var(--sidebar)] shadow-[var(--shadow-2)]">
                  <div className="border-b border-[var(--sidebar-border)] px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      Variante flotante
                    </p>
                  </div>
                  <nav className="space-y-0.5 p-2 text-[12px]">
                    <div className="flex items-center gap-2 rounded-xl bg-[var(--sidebar-accent)] px-2.5 py-1.5 font-medium text-[var(--sidebar-accent-foreground)]">
                      <div className="size-1 rounded-full bg-current opacity-70" /> Dashboard
                    </div>
                    {["Postulaciones", "Capacitaciones", "Turnos", "Pedidos"].map((item) => (
                      <div key={item} className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-muted-foreground">
                        <div className="size-1 rounded-full bg-current opacity-40" /> {item}
                      </div>
                    ))}
                  </nav>
                </div>
              </div>
            </ComponentCard>

          </Family>

          {/* ── PANTALLAS ─────────────────────────────────────────── */}
          {/* ── FAMILIA 13: PATRONES ─────────────────────────────── */}
          <Family id="patrones" number={13} title="Patrones">

            <ComponentCard name="MonthlyCalendar & AgendaPanel" meta="agenda de capacitaciones" wide>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <MonthlyCalendar events={CAL_EVENTS} selected={calDate} onSelect={setCalDate} />
                <AgendaPanel
                  date={calDate}
                  events={CAL_EVENTS.filter((e) => e.date.toDateString() === calDate.toDateString())}
                  action={
                    <Button variant="outline" size="sm">
                      <Plus className="size-4" />
                      Agendar
                    </Button>
                  }
                />
              </div>
            </ComponentCard>

            <ComponentCard name="ChatPanel" meta="conversaciones estilo WhatsApp" wide>
              <ChatPanel
                conversations={CHAT_CONVS}
                height={440}
                onAttach={() => {}}
                headerActions={
                  <Button variant="outline" size="sm">
                    <Phone className="size-4" />
                    Llamar
                  </Button>
                }
              />
            </ComponentCard>

            <ComponentCard name="KanbanBoard" meta="drag & drop nativo" wide>
              <KanbanBoard
                columns={KANBAN_COLUMNS}
                items={kanban}
                onMove={(id, col) =>
                  setKanban((prev) => prev.map((it) => (it.id === id ? { ...it, column: col } : it)))
                }
                maxColumnHeight={320}
                renderItem={(item) => (
                  <div className="space-y-1.5 pr-5">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {item.zona}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Avatar name={item.driver} size="sm" />
                      <span className="text-xs font-medium text-muted-foreground">{item.driver}</span>
                    </div>
                  </div>
                )}
              />
            </ComponentCard>

            <ComponentCard name="NotificationBell" meta="campana + panel agrupado">
              <div className="flex min-h-[460px] justify-end">
                <NotificationBell
                  notifications={notifs}
                  onMarkRead={(id) => setNotifs((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))}
                  onMarkAllRead={() => setNotifs((p) => p.map((n) => ({ ...n, read: true })))}
                  footerLabel="Ver todas las notificaciones"
                />
              </div>
            </ComponentCard>

            <ComponentCard name="MultiSelect & AddonInput" meta="inputs compuestos">
              <div className="min-h-[460px] space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">Zonas asignadas</label>
                  <MultiSelect
                    values={multiZonas}
                    onChange={setMultiZonas}
                    options={ZONA_MULTI_OPTS}
                    placeholder="Elegí zonas…"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">Monto del bono</label>
                  <AddonInput value={montoBono} onChange={setMontoBono} prefix="₲" suffix="PYG" inputMode="numeric" mono />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">Teléfono</label>
                  <AddonInput value={telefono} onChange={setTelefono} prefix="+595" inputMode="tel" />
                </div>
              </div>
            </ComponentCard>

            <ComponentCard name="Markdown" meta="renderer seguro sin dependencias">
              <Markdown source={MD_SAMPLE} />
            </ComponentCard>

            <ComponentCard name="ImageUploadGrid" meta="previews + validación 5MB">
              <ImageUploadGrid files={imgs} onChange={setImgs} max={6} />
            </ComponentCard>

            <ComponentCard name="Tour" meta="spotlight paso a paso">
              <div className="space-y-4">
                <div data-tour="demo-kpi" className="rounded-[var(--r-lg)] border border-border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Drivers activos</p>
                  <p className="font-[family-name:var(--font-display)] text-2xl font-bold">214</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button data-tour="demo-accion" variant="outline" size="sm">
                    <UserPlus className="size-4" />
                    Nuevo driver
                  </Button>
                  <Button size="sm" onClick={() => setTourOpen(true)}>
                    <Sparkles className="size-4" />
                    Iniciar tour
                  </Button>
                </div>
                <Tour steps={TOUR_STEPS} open={tourOpen} onClose={() => setTourOpen(false)} />
              </div>
            </ComponentCard>

            <ComponentCard name="PageState" meta="404 · error de servidor" wide>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <PageState
                  icon={Search}
                  eyebrow="Error 404"
                  title="Página no encontrada"
                  description="La página que buscás no existe o fue movida."
                  actions={
                    <Button variant="outline" size="sm">
                      Volver al inicio
                    </Button>
                  }
                />
                <PageState
                  icon={ServerCrash}
                  tone="danger"
                  badge={<StatusPill tone="danger" dot>Servicio caído</StatusPill>}
                  title="Algo salió mal"
                  description="Estamos trabajando para restablecer el servicio."
                  actions={<Button size="sm">Reintentar</Button>}
                />
              </div>
            </ComponentCard>

            <ComponentCard name="WhatsAppIcon" meta="glyph oficial como componente">
              <div className="flex items-center gap-5">
                <WhatsAppIcon className="size-5 text-muted-foreground" />
                <WhatsAppIcon className="size-7 text-[#25D366]" />
                <Button variant="outline" size="sm">
                  <WhatsAppIcon className="size-4 text-[#25D366]" />
                  Escribir por WhatsApp
                </Button>
              </div>
            </ComponentCard>

          </Family>

          <Family id="pantallas" number={14} title="Pantallas">

            {/* Auth: 2 columnas — login + signup, luego reset full-width */}
            <ComponentCard name="Autenticación" meta="login · registro · recuperar" wide noPad>
              <div className="grid grid-cols-2 gap-5 p-5">
                <ScreenPreview title="Iniciar sesión" route="/design/screens/login" height={560}>
                  <LoginScreen />
                </ScreenPreview>
                <ScreenPreview title="Crear cuenta" route="/design/screens/signup" height={560}>
                  <SignupScreen />
                </ScreenPreview>
                <ScreenPreview title="Recuperar contraseña" route="/design/screens/reset" wide height={420}>
                  <ResetScreen />
                </ScreenPreview>
              </div>
            </ComponentCard>

            {/* Dashboard: full-width, más alto para mostrar contenido */}
            <ComponentCard name="Dashboard" meta="pantalla principal" wide noPad>
              <div className="p-5">
                <ScreenPreview title="Dashboard" route="/design/screens/dashboard" wide height={600}>
                  <DashboardScreen />
                </ScreenPreview>
              </div>
            </ComponentCard>

            {/* App screens: links a las otras pantallas */}
            <ComponentCard name="Más pantallas" meta="lista · detalle · configuración · wizard · error" wide>
              <div className="grid grid-cols-3 gap-3">
                {DESIGN_SCREENS.filter(s => !['login','signup','reset','dashboard'].some(k => s.href.includes(k))).map((screen) => (
                  <a
                    key={screen.href}
                    href={screen.href}
                    target="_blank"
                    rel="noopener"
                    className="group flex flex-col gap-3 rounded-[var(--r-lg)] border border-border bg-muted/30 p-4 transition-colors hover:border-primary/40 hover:bg-[var(--brand-soft)]/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-8 items-center justify-center rounded-[var(--r-md)] border border-border bg-card">
                        <screen.icon className="size-4 text-muted-foreground" />
                      </div>
                      <ExternalLink className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{screen.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{screen.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
            </ComponentCard>

          </Family>

        </div>
      </main>
    </div>
  )
}
