// components/admin/app-sidebar.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useUser, useClerk } from "@clerk/nextjs"
import {
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
  Mail,
  ChevronRight,
} from "lucide-react"

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
      {
        title: "Postulaciones",
        url: "/admin/postulaciones",
        icon: UserPlus,
      },
    ],
  },
  {
    title: "Gestión",
    items: [
      {
        title: "On Boarding",
        url: "/admin/onboarding",
        icon: Users
      },
      {
        title: "Drivers Activos",
        url: "/admin/drivers",
        icon: BikeIcon,
      },
      {
        title: "Pagos",
        url: "/admin/pagos",
        icon: CreditCard,
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
        title: "Braze",
        url: "/admin/comunicaciones/braze",
        icon: Mail,
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

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()

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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Image
            src="/monchis-logo-red.png"
            alt="Monchis"
            width={120}
            height={40}
            className="object-contain"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
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
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.url}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
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
                  className="cursor-pointer text-red-600 focus:text-red-600"
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
    </Sidebar>
  )
}