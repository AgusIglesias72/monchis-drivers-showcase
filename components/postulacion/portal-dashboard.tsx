// components/postulacion/portal-dashboard.tsx
'use client'

import { useEffect, useState } from 'react'
import { Loader2, FileText, User, Calendar, AlertCircle, X, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import type { PortalData } from '@/lib/types/portal.types'
import { DocumentsSection } from './documents-section'
import { PersonalDataSection } from './personal-data-section'
import { CapacitacionSelector } from './capacitacion-selector'
import { BookingRecoveryButton } from './booking-recovery-button'

const MONCHIS_RED = '#e7243f'

type TabType = 'datos' | 'documentos' | 'capacitacion'

interface PortalDashboardProps {
  token: string
}

export function PortalDashboard({ token }: PortalDashboardProps) {
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('datos')
  const [showGuide, setShowGuide] = useState(false)

  // Show guide on first visit
  useEffect(() => {
    const key = `portal_guide_seen_${token}`
    if (!localStorage.getItem(key)) {
      setShowGuide(true)
      localStorage.setItem(key, '1')
    }
  }, [token])

  // Recordamos el token del portal para que /capacitaciones identifique al
  // driver automáticamente sin pedirle cédula+phone de nuevo.
  useEffect(() => {
    try {
      localStorage.setItem('monchis.driver.portalToken', token)
    } catch {}
  }, [token])

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

  const refreshData = () => {
    fetchPortalData()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="text-white/80">Cargando tu información...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 mt-12">
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 text-red-600 mb-3">
            <AlertCircle className="h-6 w-6" />
            <h2 className="text-lg font-bold">Error de acceso</h2>
          </div>
          <p className="text-gray-600">
            {error || 'No se pudo acceder a tu información. Verifica que el link sea correcto.'}
          </p>
        </div>
      </div>
    )
  }

  const tabs: { key: TabType; label: string; shortLabel: string; icon: typeof User }[] = [
    { key: 'datos', label: 'Mis Datos', shortLabel: 'Datos', icon: User },
    { key: 'documentos', label: 'Mis Documentos', shortLabel: 'Docs', icon: FileText },
    { key: 'capacitacion', label: 'Mi Capacitación', shortLabel: 'Capacitación', icon: Calendar },
  ]

  return (
    <div>
      {/* Pill Navigation (same style as TopNavigation.tsx) */}
      <div className="relative backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="bg-white/20 rounded-full p-1 flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex-1 py-2.5 px-3 rounded-full flex items-center justify-center gap-2 transition-all duration-300
                    ${activeTab === tab.key ? 'bg-white text-gray-900 font-bold shadow-sm' : 'text-white'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">{tab.label}</span>
                  <span className="text-xs sm:hidden">{tab.shortLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* First-visit guide */}
      {showGuide && (
        <div className="relative max-w-2xl mx-auto px-4 mt-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-start gap-3">
            <ArrowLeftRight className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <p className="text-sm text-white leading-snug flex-1">
              <strong>¡Bienvenido a tu portal!</strong> Desde acá podés gestionar toda tu postulación.
              Usá las pestañas de arriba para moverte entre <strong>Mis Datos</strong>, <strong>Mis Documentos</strong> y <strong>Mi Capacitación</strong>.
            </p>
            <button
              onClick={() => setShowGuide(false)}
              className="text-white/70 hover:text-white shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content in white card */}
      <div className="relative max-w-2xl mx-auto px-4 pb-6 mt-2">
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8">
          {/* Header with name and status */}
          <div className="mb-6 pb-4 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-800">
              {data.fullName || 'Postulante'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              CI: {data.cedula} • Tel: {data.phoneNumber}
            </p>
          </div>

          {/* Tab Content */}
          {activeTab === 'datos' && (
            <PersonalDataSection
              token={token}
              personalData={data.personalData}
              onUpdate={refreshData}
            />
          )}

          {activeTab === 'documentos' && (
            <DocumentsSection
              token={token}
              documents={data.documents}
              documentsStatus={data.documentsStatus}
              onUpdate={refreshData}
            />
          )}

          {activeTab === 'capacitacion' && (
            <>
              {/* Acceso rápido a la nueva pantalla pública de capacitaciones —
                  solo si todavía no agendaron. Si ya tienen reserva activa,
                  el ActiveBookingCard de adentro de CapacitacionSelector ya
                  expone "Ver detalles / Cambiar fecha / Cancelar". */}
              {!data.assignedCapacitacion &&
                (() => {
                  const cedulaOk = data.documents?.some(
                    (d: any) => d.documentType === 'CEDULA' && d.status === 'APPROVED',
                  )
                  const antecedentesOk = data.documents?.some(
                    (d: any) => d.documentType === 'CRIMINAL_RECORD' && d.status === 'APPROVED',
                  )
                  const eligible =
                    !!cedulaOk &&
                    !!antecedentesOk &&
                    !!data.personalData?.firstName &&
                    !!data.personalData?.lastName &&
                    data.status !== 'REJECTED'
                  return (
                    <div className="mb-4">
                      <BookingRecoveryButton
                        portalToken={token}
                        disabled={!eligible}
                        disabledReason={
                          !eligible
                            ? 'Completá tus datos y validá cédula + antecedentes para reservar'
                            : undefined
                        }
                      />
                    </div>
                  )
                })()}
              <CapacitacionSelector
                token={token}
                documents={data.documents}
                personalData={data.personalData}
                status={data.status}
                documentsStatus={data.documentsStatus}
                assignedCapacitacion={data.assignedCapacitacion}
                payment={data.payment}
                onUpdate={refreshData}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
