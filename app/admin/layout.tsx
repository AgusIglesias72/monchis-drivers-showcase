// app/admin/layout.tsx
import { AppSidebar } from '@/components/admin/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { cookies } from 'next/headers'

export const metadata = {
  title: 'Admin - Monchis Drivers',
  description: 'Panel de administración de drivers',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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