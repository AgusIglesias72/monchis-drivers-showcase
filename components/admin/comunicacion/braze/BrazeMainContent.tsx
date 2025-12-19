// components/admin/comunicacion/braze/BrazeMainContent.tsx
'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BrazeTriggersListContent } from './BrazeTriggersListContent'
import { BrazeNewTriggerContent } from './BrazeNewTriggerContent'
import { BrazeHistorialContent } from './BrazeHistorialContent'
import { useSearchParams, useRouter } from 'next/navigation'
import { ListChecks, PlusCircle, History } from 'lucide-react'

export function BrazeMainContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab') || 'triggers'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Sincronizar con URL cuando cambia el searchParams
  useEffect(() => {
    const tab = searchParams.get('tab') || 'triggers'
    setActiveTab(tab)
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/admin/comunicaciones/braze?tab=${value}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Braze</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona campañas y canvas de Braze en modo broadcast
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="triggers" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Disparadores
          </TabsTrigger>
          <TabsTrigger value="nuevo" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Crear Nuevo
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="triggers" className="mt-6">
          <BrazeTriggersListContent />
        </TabsContent>

        <TabsContent value="nuevo" className="mt-6">
          <BrazeNewTriggerContent />
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <BrazeHistorialContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}
