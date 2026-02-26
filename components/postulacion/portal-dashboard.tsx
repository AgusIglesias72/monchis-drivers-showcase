// components/postulacion/portal-dashboard.tsx
'use client'

import { useEffect, useState } from 'react'
import { Loader2, FileText, User, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { PortalData } from '@/lib/types/portal.types'
import { DocumentsSection } from './documents-section'
import { PersonalDataSection } from './personal-data-section'
import { CapacitacionSelector } from './capacitacion-selector'
import { ProgressTimeline } from './progress-timeline'

const MONCHIS_RED = '#e7243f'

interface PortalDashboardProps {
  token: string
}

export function PortalDashboard({ token }: PortalDashboardProps) {
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('documentos')

  // Cargar datos del portal
  useEffect(() => {
    fetchPortalData()
  }, [token])

  const fetchPortalData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/postulacion/${token}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar datos')
      }

      setData(result.data)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching portal data:', err)
      setError(err.message || 'No se pudo cargar tu información')
      toast.error('Error al cargar tu información')
    } finally {
      setLoading(false)
    }
  }

  // Refrescar datos (útil después de actualizar algo)
  const refreshData = () => {
    fetchPortalData()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin" style={{ color: MONCHIS_RED }} />
        <p className="text-gray-600">Cargando tu información...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'No se pudo acceder a tu información. Verifica que el link sea correcto.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Determinar color del badge según estado
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      APPROVED: 'bg-green-100 text-green-800',
      ACTIVE: 'bg-green-100 text-green-800',
      CORRECTIONS: 'bg-yellow-100 text-yellow-800',
      REJECTED: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      IN_PROGRESS: 'En Progreso',
      COMPLETED: 'Completado',
      APPROVED: 'Aprobado',
      ACTIVE: 'Activo',
      CORRECTIONS: 'Requiere Correcciones',
      REJECTED: 'Rechazado',
      SCHEDULED: 'Agendado',
    }
    return texts[status] || status
  }

  return (
    <div className="space-y-6">
      {/* Header con info del postulante */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{data.fullName || 'Postulante'}</CardTitle>
              <CardDescription className="mt-1">
                CI: {data.cedula} • Tel: {data.phoneNumber}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor(data.status)}>
                {getStatusText(data.status)}
              </Badge>
              {data.documentsStatus && (
                <Badge className={getStatusColor(data.documentsStatus)}>
                  Docs: {getStatusText(data.documentsStatus)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="documentos" className="flex items-center gap-2 py-3">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="datos" className="flex items-center gap-2 py-3">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Mis Datos</span>
            <span className="sm:hidden">Datos</span>
          </TabsTrigger>
          <TabsTrigger value="capacitacion" className="flex items-center gap-2 py-3">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Capacitación</span>
            <span className="sm:hidden">Capa.</span>
          </TabsTrigger>
          <TabsTrigger value="progreso" className="flex items-center gap-2 py-3">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Progreso</span>
            <span className="sm:hidden">Prog.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="mt-6">
          <DocumentsSection
            token={token}
            documents={data.documents}
            documentsStatus={data.documentsStatus}
            onUpdate={refreshData}
          />
        </TabsContent>

        <TabsContent value="datos" className="mt-6">
          <PersonalDataSection
            token={token}
            personalData={data.personalData}
            onUpdate={refreshData}
          />
        </TabsContent>

        <TabsContent value="capacitacion" className="mt-6">
          <CapacitacionSelector
            token={token}
            documentsStatus={data.documentsStatus}
            assignedCapacitacion={data.assignedCapacitacion}
            onUpdate={refreshData}
          />
        </TabsContent>

        <TabsContent value="progreso" className="mt-6">
          <ProgressTimeline
            status={data.status}
            documentsStatus={data.documentsStatus}
            onboardingStatus={data.onboardingStatus}
            nextSteps={data.nextSteps}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
