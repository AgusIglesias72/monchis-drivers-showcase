// components/admin/sidebar.tsx

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  LayoutDashboard,
  UserPlus,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
} from "lucide-react"

import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface MenuItem {
  title: string
  icon?: any
  href?: string
  exact?: boolean
  items?: {
    title: string
    href: string
  }[]
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
    exact: true,
  },
  {
    title: "Adquisición",
    icon: UserPlus,
    items: [
      {
        title: "Postulantes",
        href: "/admin/adquisicion/postulantes",
      },
      {
        title: "Documentos",
        href: "/admin/adquisicion/documentos",
      },
      {
        title: "Formularios",
        href: "/admin/adquisicion/formularios",
      },
    ],
  },
  // Separador
  { title: "separator-1" } as any,
  {
    title: "Drivers Activos",
    icon: Users,
    href: "/admin/drivers",
  },
  {
    title: "Comunicaciones",
    icon: MessageSquare,
    href: "/admin/comunicaciones",
  },
  // Separador
  { title: "separator-2" } as any,
  {
    title: "Reportes",
    icon: BarChart3,
    href: "/admin/reportes",
  },
  {
    title: "Configuración",
    icon: Settings,
    href: "/admin/configuracion",
  },
]

function SidebarMenuItem({ 
  item, 
  isCollapsed 
}: { 
  item: MenuItem
  isCollapsed: boolean 
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const pathname = usePathname()

  // Si es separador
  if (item.title?.startsWith("separator")) {
    return <div className="my-2 border-t" />
  }

  // Si tiene subitems
  if (item.items) {
    const hasActiveChild = item.items.some(
      (subItem) => pathname === subItem.href
    )

    React.useEffect(() => {
      if (hasActiveChild) {
        setIsOpen(true)
      }
    }, [hasActiveChild])

    const Icon = item.icon

    // Si está colapsado, no mostrar subitems
    if (isCollapsed) {
      return (
        <div className="relative group">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-full justify-center cursor-pointer",
              hasActiveChild && "bg-accent"
            )}
            title={item.title}
          >
            {Icon && <Icon className="h-5 w-5" />}
          </Button>
          {/* Tooltip on hover */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md invisible group-hover:visible whitespace-nowrap z-50">
            {item.title}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 font-normal cursor-pointer",
            hasActiveChild && "bg-accent"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
          <span className="flex-1 text-left">{item.title}</span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
        </Button>
        {isOpen && (
          <div className="pl-6 space-y-1">
            {item.items.map((subItem) => {
              const isSubActive = pathname === subItem.href
              return (
                <Link key={subItem.href} href={subItem.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start font-normal text-sm cursor-pointer",
                      isSubActive && "bg-accent"
                    )}
                  >
                    {subItem.title}
                  </Button>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Item simple
  const Icon = item.icon
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href || "")

  if (isCollapsed) {
    return (
      <div className="relative group">
        <Link href={item.href || "#"}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-full justify-center cursor-pointer",
              isActive && "bg-accent"
            )}
            title={item.title}
          >
            {Icon && <Icon className="h-5 w-5" />}
          </Button>
        </Link>
        {/* Tooltip on hover */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md invisible group-hover:visible whitespace-nowrap z-50">
          {item.title}
        </div>
      </div>
    )
  }

  return (
    <Link href={item.href || "#"}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 font-normal cursor-pointer",
          isActive && "bg-accent"
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {item.title}
      </Button>
    </Link>
  )
}

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  return (
    <aside 
      className={cn(
        "border-r bg-background flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <Image
              src="/monchis-logo.png"
              alt="Monchis"
              width={256}
              height={96}
              className="object-contain"
            />
          </div>
        )}
        {isCollapsed && (
          <div className="w-full flex justify-center">
            <Image
              src="/monchis-logo.png"
              alt="Monchis"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="cursor-pointer flex-shrink-0"
          title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => (
          <SidebarMenuItem 
            key={item.title || `separator-${index}`} 
            item={item} 
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* User Section (Placeholder) */}
      <div className="p-4 border-t">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <Avatar className="cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground">
                AD
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">
                admin@monchis.com
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar className="cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground">
                AD
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </aside>
  )
}