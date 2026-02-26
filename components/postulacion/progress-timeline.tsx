// components/postulacion/progress-timeline.tsx
'use client'

import { CheckCircle, Circle, Clock, XCircle, FileText, Calendar, GraduationCap, Rocket } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { FormDriverStatus, FormDocumentsStatus, OnboardingStatus } from '@prisma/client'
import type { NextStepsInfo } from '@/lib/types/portal.types'

const MONCHIS_RED = '#e7243f'

interface ProgressTimelineProps {
  status: FormDriverStatus
  documentsStatus: FormDocumentsStatus
  onboardingStatus: OnboardingStatus | null
  nextSteps: NextStepsInfo
}

interface TimelineStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  status: 'completed' | 'in_progress' | 'pending' | 'rejected'
  details?: string[]
}

export function ProgressTimeline({
  status,
  documentsStatus,
  onboardingStatus,
  nextSteps,
}: ProgressTimelineProps) {
  const steps: TimelineStep[] = [
    {
      id: 'form',
      title: 'Formulario Completado',
      description: 'Recibimos tu postulación',
      icon: <FileText className="h-5 w-5" />,
      status: 'completed',
      details: ['Datos personales registrados', 'Formulario enviado exitosamente'],
    },
    {
      id: 'documents',
      title: 'Documentos',
      description: getDocumentsDescription(documentsStatus),
      icon: <FileText className="h-5 w-5" />,
      status: getDocumentsStepStatus(documentsStatus),
      details: getDocumentsDetails(documentsStatus),
    },
    {
      id: 'training_scheduled',
      title: 'Capacitación Agendada',
      description: 'Seleccioná tu fecha de capacitación',
      icon: <Calendar className="h-5 w-5" />,
      status: getTrainingScheduledStatus(onboardingStatus, documentsStatus),
      details: getTrainingScheduledDetails(onboardingStatus, documentsStatus),
    },
    {
      id: 'training_completed',
      title: 'Capacitación Completada',
      description: 'Asistí a la capacitación',
      icon: <GraduationCap className="h-5 w-5" />,
      status: getTrainingCompletedStatus(onboardingStatus),
      details: getTrainingCompletedDetails(onboardingStatus),
    },
    {
      id: 'activation',
      title: 'Activación',
      description: 'Comenzá a trabajar',
      icon: <Rocket className="h-5 w-5" />,
      status: getActivationStatus(status),
      details: getActivationDetails(status),
    },
  ]

  const completedSteps = steps.filter((s) => s.status === 'completed').length
  const totalSteps = steps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tu Progreso</CardTitle>
            <Badge style={{ backgroundColor: MONCHIS_RED }} className="text-white">
              {completedSteps} de {totalSteps} pasos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-sm text-gray-600 text-center">{Math.round(progressPercentage)}% completado</p>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <TimelineItem
                key={step.id}
                step={step}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      {nextSteps.pendingActions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Próximos Pasos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {nextSteps.pendingActions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                  <Circle className="h-4 w-4 mt-0.5 shrink-0" fill="currentColor" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Timeline Item Component
interface TimelineItemProps {
  step: TimelineStep
  isLast: boolean
}

function TimelineItem({ step, isLast }: TimelineItemProps) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-600" fill="currentColor" />
      case 'in_progress':
        return <Clock className="h-6 w-6 text-blue-600" />
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-600" />
      case 'pending':
      default:
        return <Circle className="h-6 w-6 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (step.status) {
      case 'completed':
        return 'text-green-900 bg-green-50'
      case 'in_progress':
        return 'text-blue-900 bg-blue-50'
      case 'rejected':
        return 'text-red-900 bg-red-50'
      case 'pending':
      default:
        return 'text-gray-700 bg-gray-50'
    }
  }

  const getLineColor = () => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-600'
      case 'in_progress':
        return 'bg-blue-600'
      case 'rejected':
        return 'bg-red-600'
      case 'pending':
      default:
        return 'bg-gray-300'
    }
  }

  return (
    <div className="flex gap-4">
      {/* Icon Column */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`p-2 rounded-full ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        {!isLast && <div className={`w-0.5 h-full mt-2 ${getLineColor()}`} />}
      </div>

      {/* Content Column */}
      <div className="flex-1 pb-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h3 className="font-semibold text-base">{step.title}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
          </div>
          <Badge
            className={`shrink-0 ${
              step.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : step.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-800'
                  : step.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            {step.status === 'completed'
              ? 'Completado'
              : step.status === 'in_progress'
                ? 'En Progreso'
                : step.status === 'rejected'
                  ? 'Rechazado'
                  : 'Pendiente'}
          </Badge>
        </div>

        {step.details && step.details.length > 0 && (
          <ul className="mt-3 space-y-1">
            {step.details.map((detail, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-gray-400">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// Helper Functions
function getDocumentsDescription(status: FormDocumentsStatus): string {
  switch (status) {
    case 'APPROVED':
      return 'Todos tus documentos fueron aprobados'
    case 'CORRECTIONS':
      return 'Algunos documentos requieren corrección'
    case 'IN_REVIEW':
      return 'Estamos revisando tus documentos'
    case 'PENDING':
      return 'Subí todos tus documentos'
    case 'INCOMPLETE':
    default:
      return 'Documentación en proceso'
  }
}

function getDocumentsStepStatus(status: FormDocumentsStatus): 'completed' | 'in_progress' | 'pending' | 'rejected' {
  switch (status) {
    case 'APPROVED':
      return 'completed'
    case 'CORRECTIONS':
      return 'rejected'
    case 'IN_REVIEW':
      return 'in_progress'
    case 'PENDING':
    case 'INCOMPLETE':
    default:
      return 'pending'
  }
}

function getDocumentsDetails(status: FormDocumentsStatus): string[] {
  switch (status) {
    case 'APPROVED':
      return ['Documentos verificados', 'Podés continuar con el siguiente paso']
    case 'CORRECTIONS':
      return ['Revisá los documentos rechazados', 'Subí versiones corregidas']
    case 'IN_REVIEW':
      return ['Nuestro equipo está revisando', 'Te avisaremos cuando estén aprobados']
    case 'PENDING':
      return ['Subí todos los documentos requeridos', 'Formatos permitidos: JPG, PNG, PDF']
    case 'INCOMPLETE':
    default:
      return ['Completá la carga de documentos']
  }
}

function getTrainingScheduledStatus(
  onboardingStatus: OnboardingStatus | null,
  documentsStatus: FormDocumentsStatus
): 'completed' | 'in_progress' | 'pending' | 'rejected' {
  if (onboardingStatus === 'SCHEDULED' || onboardingStatus === 'IN_PROGRESS' || onboardingStatus === 'COMPLETED') {
    return 'completed'
  }
  if (documentsStatus === 'APPROVED') {
    return 'in_progress'
  }
  return 'pending'
}

function getTrainingScheduledDetails(
  onboardingStatus: OnboardingStatus | null,
  documentsStatus: FormDocumentsStatus
): string[] {
  if (onboardingStatus === 'SCHEDULED' || onboardingStatus === 'IN_PROGRESS' || onboardingStatus === 'COMPLETED') {
    return ['Capacitación confirmada', 'Revisá los detalles en la pestaña Capacitación']
  }
  if (documentsStatus === 'APPROVED') {
    return ['Tus documentos están aprobados', 'Seleccioná tu fecha de capacitación']
  }
  return ['Esperá la aprobación de tus documentos']
}

function getTrainingCompletedStatus(onboardingStatus: OnboardingStatus | null): 'completed' | 'in_progress' | 'pending' | 'rejected' {
  if (onboardingStatus === 'IN_PROGRESS' || onboardingStatus === 'COMPLETED') {
    return 'completed'
  }
  if (onboardingStatus === 'SCHEDULED') {
    return 'in_progress'
  }
  return 'pending'
}

function getTrainingCompletedDetails(onboardingStatus: OnboardingStatus | null): string[] {
  if (onboardingStatus === 'IN_PROGRESS' || onboardingStatus === 'COMPLETED') {
    return ['Completaste la capacitación', 'Estás listo para la activación']
  }
  if (onboardingStatus === 'SCHEDULED') {
    return ['Capacitación agendada', 'Asegurate de asistir puntualmente']
  }
  return ['Primero debés agendar tu capacitación']
}

function getActivationStatus(status: FormDriverStatus): 'completed' | 'in_progress' | 'pending' | 'rejected' {
  if (status === 'ACTIVE') {
    return 'completed'
  }
  if (status === 'APPROVED') {
    return 'in_progress'
  }
  return 'pending'
}

function getActivationDetails(status: FormDriverStatus): string[] {
  if (status === 'ACTIVE') {
    return ['¡Estás activo!', 'Ya podés comenzar a trabajar']
  }
  if (status === 'APPROVED') {
    return ['En proceso de activación', 'Pronto podrás comenzar']
  }
  return ['Completá los pasos anteriores']
}
