// components/admin/onboarding/onboarding-event-content.tsx

"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Settings,
  UserPlus,
  List,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { AddDriversSection } from '@/components/admin/onboarding/add-drivers-section'
import { AttendeesManagementSection } from '@/components/admin/onboarding/attendees-management-section'
import { EventSettingsSection } from '@/components/admin/onboarding/event-settings-section'
import { getEventStatusLabel } from '@/types/onboarding'

interface OnboardingEventContentProps {
  event: any
}

export function OnboardingEventContent({ event }: OnboardingEventContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('attendees')

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const config = {
      DRAFT: { className: 'bg-gray-100 text-gray-800 border-gray-200' },
      SCHEDULED: { className: 'bg-blue-100 text-blue-800 border-blue-200' },
      IN_PROGRESS: { className: 'bg-amber-100 text-amber-800 border-amber-200' },
      COMPLETED: { className: 'bg-green-100 text-green-800 border-green-200' },
      CANCELLED: { className: 'bg-red-100 text-red-800 border-red-200' },
      POSTPONED: { className: 'bg-purple-100 text-purple-800 border-purple-200' },
    }
    const { className } = config[status as keyof typeof config] || config.DRAFT
    return (
      <Badge variant="outline" className={className}>
        {getEventStatusLabel(status as any)}
      </Badge>
    )
  }

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader
        breadcrumbs={[
          { label: 'On Boarding', href: '/admin/onboarding' },
          { label: event.title || formatDate(event.scheduledDate) },
        ]}
      />

      <div className="flex-1 p-4 md:p-8 space-y-6">
        {/* Event Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/admin/onboarding')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {event.title || 'Evento de On Boarding'}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(event.scheduledDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {event.startTime}
                    {event.endTime && ` - ${event.endTime}`}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(event.status)}
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {event.currentCapacity}
              {event.maxCapacity && `/${event.maxCapacity}`}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="attendees" className="gap-2">
              <List className="h-4 w-4" />
              Participantes ({event.attendees.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Agregar Drivers
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendees" className="space-y-4">
            <AttendeesManagementSection
              eventId={event.id}
              attendees={event.attendees}
              onRefresh={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <AddDriversSection
              eventId={event.id}
              onSuccess={() => {
                handleRefresh()
                setActiveTab('attendees')
              }}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <EventSettingsSection
              event={event}
              onUpdate={handleRefresh}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}