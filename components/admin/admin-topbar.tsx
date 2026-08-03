// components/admin/admin-topbar.tsx
"use client"

import { usePathname } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import { toast } from "sonner"
import { Bell, GraduationCap, LogOut, UserCog } from "lucide-react"

import { BugReportWidget } from "@/components/admin/bug-report-widget"

import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Etiquetas legibles por segmento de ruta para el breadcrumb automático.
const SEGMENT_LABELS: Record<string, string> = {
  postulaciones: "Postulaciones",
  onboarding: "Capacitaciones",
  pagos: "Pagos",
  gestion: "Gestión",
  live: "Live",
  turnos: "Turnos",
  historial: "Histórico",
  pedidos: "Pedidos",
  anomalias: "Anomalías",
  drivers: "Drivers",
  comunicaciones: "Comunicaciones",
  intercom: "Intercom",
  masivo: "Masivo",
  pruebas: "Pruebas",
  "plantillas-whatsapp": "Plantillas",
  "agent-runs": "Agente IA",
  reportes: "Reportes",
  configuracion: "Configuración",
}

function humanize(seg: string) {
  // IDs/tokens largos → recortar; resto → Capitalizar y reemplazar guiones.
  if (/^[0-9a-f]{8,}$/i.test(seg) || seg.length > 24) return `#${seg.slice(0, 6)}`
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ")
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function AdminTopBar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()

  const displayName = user?.fullName || user?.username || "Usuario"
  const displayEmail = user?.primaryEmailAddress?.emailAddress || ""
  const initials = getInitials(displayName)

  // Breadcrumb derivado del pathname: Dashboard > Sección > Subsección.
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = [{ label: "Dashboard", href: "/admin" }]
  let acc = "/admin"
  for (const seg of segments) {
    acc += `/${seg}`
    crumbs.push({ label: SEGMENT_LABELS[seg] ?? humanize(seg), href: acc })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[52px] items-center border-b border-border bg-background/85 backdrop-blur-sm">
      {/* Toggle + Breadcrumb a la izquierda */}
      <div className="flex min-w-0 items-center gap-1.5 pl-2">
        <SidebarTrigger className="shrink-0" />
        <Separator orientation="vertical" className="h-4" />
      </div>
      <Breadcrumb className="min-w-0 pl-2">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator className="mx-1.5" />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Acciones globales — lado derecho */}
      <div className="ml-auto flex items-center gap-0.5 px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tutorial"
              onClick={() => toast.info("Tutorial", { description: "Próximamente: guía de uso del panel." })}
            >
              <GraduationCap className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tutorial</TooltipContent>
        </Tooltip>

        <BugReportWidget />

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Notificaciones">
                  <Bell className="size-[18px]" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Notificaciones</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No tenés notificaciones nuevas.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1.5 h-5" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Cuenta"
              className="flex cursor-pointer items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Avatar className="size-8">
                <AvatarImage src={user?.imageUrl} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8">
                  <AvatarImage src={user?.imageUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => openUserProfile()}>
              <UserCog className="mr-2 size-4" />
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => signOut({ redirectUrl: "/" })}
            >
              <LogOut className="mr-2 size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
