// components/admin/app-sidebar.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import {
  AlertTriangle,
  LayoutDashboard,
  UserPlus,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  BikeIcon,
  ChevronUp,
  LogOut,
  UserCog,
  CreditCard,
  ChevronRight,
  Sparkles,
  CalendarClock,
  CalendarRange,
  ShoppingBag,
  Radio,
  History,
  Pin,
  PinOff,
} from "lucide-react"
import { IntercomIcon } from "@/components/admin/icons/intercom-icon"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const menuItems = [
  {
    title: "General",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Adquisición",
    items: [
      {
        title: "Postulaciones",
        url: "/admin/postulaciones",
        icon: UserPlus,
      },
      {
        title: "Capacitaciones",
        url: "/admin/onboarding",
        icon: CalendarRange,
      },
      {
        title: "Agente IA",
        url: "/admin/agent-runs",
        icon: Sparkles,
      },
      {
        title: "Pagos",
        url: "/admin/pagos",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Gestión Admin",
    items: [
      {
        title: "Live",
        url: "/admin/gestion/live",
        icon: Radio,
        badge: "WIP",
      },
      {
        title: "Turnos",
        url: "/admin/gestion/turnos",
        icon: CalendarClock,
      },
      {
        title: "Turnos histórico",
        url: "/admin/gestion/turnos/historial",
        icon: History,
      },
      {
        title: "Pedidos",
        url: "/admin/gestion/pedidos",
        icon: ShoppingBag,
      },
      {
        title: "Anomalías",
        url: "/admin/gestion/anomalias",
        icon: AlertTriangle,
      },
      {
        title: "Drivers",
        url: "/admin/gestion/drivers",
        icon: BikeIcon,
      },
    ],
  },
  {
    title: "Comunicaciones",
    items: [
      {
        title: "WhatsApp",
        url: "/admin/comunicaciones",
        icon: MessageSquare,
      },
      {
        title: "Plantillas",
        url: "/admin/plantillas-whatsapp",
        icon: MessageSquare,
      },
      {
        title: "Intercom",
        url: "/admin/comunicaciones/intercom",
        icon: IntercomIcon,
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        title: "Reportes",
        url: "/admin/reportes",
        icon: BarChart3,
      },
      {
        title: "Configuración",
        url: "/admin/configuracion",
        icon: Settings,
      },
    ],
  },
]

type SidebarVariant = "sidebar" | "floating"

export function AppSidebar({
  initialVariant = "sidebar",
}: {
  initialVariant?: SidebarVariant
}) {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const { toggleSidebar } = useSidebar()

  // Modo del sidebar: "sidebar" (fijo, pegado al borde) o "floating" (flotante,
  // tarjeta redondeada despegada). Se persiste en cookie para que el layout (SSR)
  // lo lea y no haya parpadeo al recargar.
  const [variant, setVariant] = React.useState<SidebarVariant>(initialVariant)
  const toggleVariant = () => {
    const next: SidebarVariant = variant === "floating" ? "sidebar" : "floating"
    setVariant(next)
    document.cookie = `sidebar:variant=${next}; path=/; max-age=31536000; SameSite=Lax`
  }

  // Obtener las iniciales del usuario
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const displayName = user?.fullName || user?.username || "Usuario"
  const displayEmail = user?.primaryEmailAddress?.emailAddress || ""
  const initials = getInitials(displayName)

  return (
    <Sidebar
      collapsible="icon"
      variant={variant}
      // El contenedor fijo arranca debajo del top bar (52px).
      className="!top-[52px] !h-[calc(100svh-52px)]"
    >
      <SidebarHeader>
        <button
          onClick={toggleSidebar}
          aria-label="Abrir o cerrar el menú lateral"
          className="flex items-center rounded-md p-1.5 transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/40 group-data-[collapsible=icon]:justify-center"
        >
          {/* Logo completo — visible sólo cuando el sidebar está expandido */}
          <Image
            src="/monchis-logo-color.png"
            alt="Monchis"
            width={148}
            height={44}
            className="h-8 w-auto object-contain group-data-[collapsible=icon]:hidden"
            priority
          />
          {/* Solo ícono — visible sólo cuando el sidebar está colapsado */}
          <Image
            src="/monchis-icon.svg"
            alt="Monchis"
            width={28}
            height={28}
            className="hidden shrink-0 object-contain group-data-[collapsible=icon]:block"
            priority
          />
        </button>
      </SidebarHeader>

      <SidebarContent className="pt-1">
        {menuItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  // Si tiene subItems, es un item colapsible
                  if ('subItems' in item && item.subItems && Array.isArray(item.subItems)) {
                    const hasActiveSubItem = item.subItems.some(
                      (subItem) => pathname === subItem.url || pathname.startsWith(subItem.url + '/')
                    )

                    return (
                      <Collapsible
                        key={item.title}
                        asChild
                        defaultOpen={hasActiveSubItem}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.title}>
                              {item.icon && <item.icon />}
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.subItems.map((subItem) => {
                                const isActive = pathname === subItem.url || pathname.startsWith(subItem.url + '/')
                                return (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton asChild isActive={isActive}>
                                      <Link href={subItem.url}>
                                        <span>{subItem.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }

                  // Item normal sin subItems
                  const isActive = pathname === item.url
                  const itemBadge = "badge" in item ? item.badge : undefined
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          {itemBadge && (
                            <span className="ml-auto rounded-full bg-[var(--warning-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--warning)]">
                              {itemBadge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {/* Switch fijo ↔ flotante */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleVariant}
              tooltip={variant === "floating" ? "Fijar la barra" : "Flotar la barra"}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              {variant === "floating" ? <Pin /> : <PinOff />}
              <span>{variant === "floating" ? "Fijar barra" : "Flotar barra"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.imageUrl} alt={displayName} />
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs">{displayEmail}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{displayName}</span>
                      <span className="truncate text-xs">{displayEmail}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => openUserProfile()}
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  Editar Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => signOut({ redirectUrl: "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}