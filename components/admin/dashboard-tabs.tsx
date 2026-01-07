// components/admin/dashboard-tabs.tsx
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, TrendingUp, UserCheck, Users } from "lucide-react"

interface DashboardTabsProps {
  generalContent: React.ReactNode
  funnelContent: React.ReactNode
  asistenciasContent: React.ReactNode
  demografiaContent: React.ReactNode
}

export function DashboardTabs({
  generalContent,
  funnelContent,
  asistenciasContent,
  demografiaContent,
}: DashboardTabsProps) {
  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-8">
        <TabsTrigger value="general" className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">General</span>
        </TabsTrigger>
        <TabsTrigger value="funnel" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Funnel</span>
        </TabsTrigger>
        <TabsTrigger value="asistencias" className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Asistencias</span>
        </TabsTrigger>
        <TabsTrigger value="demografia" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Demografía</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-6">
        {generalContent}
      </TabsContent>

      <TabsContent value="funnel" className="space-y-6">
        {funnelContent}
      </TabsContent>

      <TabsContent value="asistencias" className="space-y-6">
        {asistenciasContent}
      </TabsContent>

      <TabsContent value="demografia" className="space-y-6">
        {demografiaContent}
      </TabsContent>
    </Tabs>
  )
}
