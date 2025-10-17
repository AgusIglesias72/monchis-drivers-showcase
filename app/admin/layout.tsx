// app/admin/layout.tsx
import { AppSidebar } from '@/components/admin/app-sidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'

export const metadata = {
  title: 'Admin - Monchis Drivers',
  description: 'Panel de administración de drivers',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>        {/* Page Content */}
        <main className="flex flex-1 flex-col gap-4 container mx-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}