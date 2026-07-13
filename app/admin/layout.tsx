// app/admin/layout.tsx
import { AppSidebar } from '@/components/admin/app-sidebar'
import { AdminTopBar } from '@/components/admin/admin-topbar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export const metadata = {
  title: 'Admin - Monchis Drivers',
  description: 'Panel de administración de drivers',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Gate de admin: cualquier ruta /admin/* requiere un AdminUser activo.
  // Sin esto, cualquier usuario autenticado (incluyendo postulantes) podía entrar
  // y solo las páginas individuales con su propio check rechazaban.
  const adminUser = await getCurrentUser()
  if (!adminUser) {
    redirect('/sign-in?reason=admin-required')
  }
  if (!adminUser.isActive) {
    redirect('/?reason=account-disabled')
  }

  // Obtener el estado del sidebar desde cookies para persistencia
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar:state")?.value !== "false"
  const sidebarVariant =
    cookieStore.get("sidebar:variant")?.value === "floating" ? "floating" : "sidebar"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {/* Top bar global, full-width arriba de todo (el logo Monchis abre/cierra el sidebar). */}
      <AdminTopBar />
      {/* El sidebar arranca DEBAJO del top bar (offset de 4rem = h-16). */}
      <AppSidebar initialVariant={sidebarVariant} />
      <SidebarInset className="pt-[52px]">
        {/* Page Content */}
        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}