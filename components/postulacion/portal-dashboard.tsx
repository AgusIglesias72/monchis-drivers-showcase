// components/postulacion/portal-dashboard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FileText, User, Calendar, AlertCircle, X, ArrowLeftRight, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { PortalData } from '@/lib/types/portal.types'
import { DocumentsSection } from './documents-section'
import { PersonalDataSection } from './personal-data-section'
import { CapacitacionSelector } from './capacitacion-selector'
import { BookingRecoveryButton } from './booking-recovery-button'

const MONCHIS_RED = '#e7243f'

type TabType = 'datos' | 'documentos' | 'capacitacion'

type ErrorKind = 'session_expired' | 'not_found' | 'generic'

interface PortalDashboardProps {
  token: string
}

export function PortalDashboard({ token }: PortalDashboardProps) {
  const router = useRouter()
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ kind: ErrorKind; message?: string } | null>(null)
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

      // 401/403 → cookie/token inválido. 404 → token no apunta a ningún driver.
      // En ambos casos el camino correcto es re-identificarse, no reintentar.
      if (response.status === 401 || response.status === 403) {
        setError({ kind: 'session_expired' })
        return
      }
      if (response.status === 404) {
        setError({ kind: 'not_found' })
        return
      }

      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setError({ kind: 'generic', message: result?.error || 'Error al cargar datos' })
        toast.error('Error al cargar tu información')
        return
      }

      setData(result.data)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching portal data:', err)
      setError({ kind: 'generic', message: err.message || 'No se pudo cargar tu información' })
      toast.error('Error al cargar tu información')
    } finally {
      setLoading(false)
    }
  }

  const handleReIdentify = () => {
    // Limpieza: borrar cookie + localStorage para forzar el IdentifyForm
    try {
      document.cookie = 'monchis_portal_token=; Max-Age=0; path=/; samesite=lax'
      localStorage.removeItem('monchis.driver.portalToken')
      localStorage.removeItem('monchis.bookingShareToken')
    } catch {}
    router.refresh()
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
    const kind = error?.kind ?? 'generic'

    const titleByKind: Record<ErrorKind, string> = {
      session_expired: 'Tu sesión expiró',
      not_found: 'No encontramos tu postulación',
      generic: 'No pudimos cargar tu información',
    }
    const copyByKind: Record<ErrorKind, string> = {
      session_expired: 'Necesitamos que vuelvas a identificarte para mostrarte tu portal.',
      not_found:
        'Este link ya no apunta a una postulación válida. Volvé a identificarte con tu cédula y los últimos 4 dígitos del teléfono.',
      generic:
        error?.message || 'Puede ser una falla momentánea. Probá recargar — si sigue, escribinos por WhatsApp.',
    }

    return (
      <div className="max-w-md mx-auto px-4 pt-8 sm:pt-12 pb-8">
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 text-red-600 mb-3">
            <AlertCircle className="h-6 w-6" />
            <h2 className="text-lg font-bold text-gray-900">{titleByKind[kind]}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">{copyByKind[kind]}</p>

          {(kind === 'session_expired' || kind === 'not_found') ? (
            <Button
              onClick={handleReIdentify}
              className="w-full bg-brand text-brand-foreground hover:bg-brand-hover"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Volver a identificarme
            </Button>
          ) : (
            <Button
              onClick={fetchPortalData}
              className="w-full bg-brand text-brand-foreground hover:bg-brand-hover"
            >
              Reintentar
            </Button>
          )}

          <a
            href="https://wa.me/15754194027?text=Hola%2C%20no%20puedo%20acceder%20a%20mi%20portal"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 text-xs text-center text-gray-500 hover:text-gray-900"
          >
            ¿Sigue sin funcionar? Escribinos por WhatsApp
          </a>
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

      {/* First-visit guide — copy adaptado al estado del driver para dirigirlo al
          próximo paso concreto en lugar de un texto genérico. */}
      {showGuide && (() => {
        const nextStep = computeNextStep(data)
        return (
          <div className="relative max-w-2xl mx-auto px-4 mt-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-start gap-3">
              <ArrowLeftRight className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <p className="text-sm text-white leading-snug flex-1">
                <strong>{nextStep.title}</strong> {nextStep.body}
              </p>
              <button
                onClick={() => setShowGuide(false)}
                className="text-white/70 hover:text-white shrink-0 mt-0.5"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })()}

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
                recentNoShow={data.recentNoShow}
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

/**
 * Devuelve el copy de la guía de bienvenida adaptado al estado actual del driver.
 * Apunta al próximo paso concreto en lugar de mostrar una descripción genérica.
 */
function computeNextStep(data: PortalData): { title: string; body: string } {
  if (data.status === 'REJECTED') {
    return {
      title: 'Tu postulación fue rechazada.',
      body: 'Revisá tus datos y documentos para entender qué pasó. Si tenés dudas, escribinos por WhatsApp.',
    }
  }

  const cedulaApproved = data.documents?.some(
    (d) => d.documentType === 'CEDULA' && d.status === 'APPROVED',
  )
  const antecedentesApproved = data.documents?.some(
    (d) => d.documentType === 'CRIMINAL_RECORD' && d.status === 'APPROVED',
  )
  const anyRejected = data.documents?.some((d) => d.status === 'REJECTED')

  if (anyRejected) {
    return {
      title: 'Tenés documentos para corregir.',
      body: 'Entrá a Mis Documentos para ver el motivo y subir una versión nueva.',
    }
  }

  if (data.assignedCapacitacion) {
    return {
      title: 'Ya estás listo.',
      body: 'En Mi Capacitación revisá los detalles, sumá el evento a tu calendario o cambiá la fecha si lo necesitás.',
    }
  }

  if (cedulaApproved && antecedentesApproved) {
    return {
      title: '¡Tus documentos están aprobados!',
      body: 'Ahora reservá tu capacitación en Mi Capacitación — ese es el último paso.',
    }
  }

  if (data.status === 'APPROVED') {
    return {
      title: 'Tu postulación fue aprobada.',
      body: 'Estamos terminando de validar tus documentos (24–48hs). Cuando los aprobemos, vas a poder agendar tu capacitación.',
    }
  }

  return {
    title: 'Bienvenido a tu portal.',
    body: 'Completá tus datos y subí los documentos pedidos. Cuando estén aprobados, vas a poder reservar tu capacitación.',
  }
}
