import Link from "next/link"
import {
  ArrowUpRight,
  IdCard,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  LogIn,
  Settings,
  TriangleAlert,
  UserPlus,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { PageHeader } from "@/components/ds"

type Screen = {
  href: string
  title: string
  desc: string
  icon: LucideIcon
}

const SCREENS: Screen[] = [
  {
    href: "/design/screens/dashboard",
    title: "Dashboard",
    desc: "KPIs, gráficos (barras/línea/dona/funnel) y top drivers.",
    icon: LayoutDashboard,
  },
  {
    href: "/design/screens/list",
    title: "Lista (Pedidos)",
    desc: "Filtros segmentados + search + cards que abren un drawer de detalle.",
    icon: ListOrdered,
  },
  {
    href: "/design/screens/detail",
    title: "Detalle de driver",
    desc: "Header con acciones, tabs, description list, timeline y KPIs.",
    icon: IdCard,
  },
  {
    href: "/design/screens/settings",
    title: "Configuración",
    desc: "Paneles con campos, toggles, radio cards y barra de guardado.",
    icon: Settings,
  },
  {
    href: "/design/screens/wizard",
    title: "Wizard de onboarding",
    desc: "Stepper multi-paso con formulario y checklists.",
    icon: ListChecks,
  },
  {
    href: "/design/screens/login",
    title: "Iniciar sesión",
    desc: "Login con Google + email/contraseña, con toggle de visibilidad.",
    icon: LogIn,
  },
  {
    href: "/design/screens/signup",
    title: "Crear cuenta",
    desc: "Registro con nombre, email y confirmación de contraseña.",
    icon: UserPlus,
  },
  {
    href: "/design/screens/reset",
    title: "Recuperar contraseña",
    desc: "Envío de instrucciones por email con estado de éxito.",
    icon: KeyRound,
  },
  {
    href: "/design/screens/error",
    title: "Error 404",
    desc: "Pantalla amigable de página no encontrada.",
    icon: TriangleAlert,
  },
]

export default function ScreensIndexPage() {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-primary">
            <LogIn className="size-4" />
          </div>
          <div>
            <div className="font-[family-name:var(--font-display)] text-sm font-bold leading-none">
              Design System · Monchis STUDIO
            </div>
            <div className="text-[11px] text-muted-foreground">
              Pantallas · mockups de flujos
            </div>
          </div>
          <nav className="ml-auto text-xs text-muted-foreground">
            <Link
              href="/design"
              className="rounded-full px-2.5 py-1 hover:bg-muted hover:text-foreground"
            >
              Componentes
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <PageHeader
          title="Pantallas"
          description="Mockups de flujos completos armados con el sistema STUDIO. Diseño puro: los botones son inertes."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {SCREENS.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group flex items-start gap-4 rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-[box-shadow,border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-2)]"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-brand-soft text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-[family-name:var(--font-display)] text-base font-bold tracking-[var(--ls-tight)] text-foreground">
                      {s.title}
                    </h3>
                    <ArrowUpRight className="size-4 text-ink-subtle transition-colors group-hover:text-primary" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
