// app/admin/layout.tsx
import { AppSidebar } from '@/components/admin/app-sidebar'
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

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        {/* Page Content */}
        <main className="flex flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}