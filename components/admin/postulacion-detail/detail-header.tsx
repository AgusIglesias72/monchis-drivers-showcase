// components/admin/postulacion-detail/detail-header.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Banner } from "@/components/ds"
import {
  Calendar,
  Copy,
  Edit,
  ExternalLink,
  Loader2,
  MoreVertical,
  Save,
  X,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusBadges } from "@/components/admin/postulacion-helpers"
import { ContactButton } from "@/components/admin/postulaciones/contact-button"
import { RejectButton } from "@/components/admin/postulaciones/reject-button"
import { ArchiveButton } from "@/components/admin/postulaciones/archive-button"
import { RefreshRucButton } from "@/components/admin/postulaciones/refresh-ruc-button"
import { RunAgentButton } from "@/components/admin/postulaciones/run-agent-button"
import { AssistedCompletionButton } from "@/components/admin/postulaciones/assisted-completion-button"
import { TriggerApprovalNotificationButton } from "@/components/admin/trigger-approval-notification-button"
import { AgentRunBadge } from "@/components/admin/agent-runs/agent-run-badge"
import { getContactStatus } from "@/lib/utils/contact-status.utils"
import { toast } from "sonner"

interface DetailHeaderProps {
  postulacion: any
  contactStatus: ReturnType<typeof getContactStatus>
  hasScheduledOnboarding: boolean
  isEditing: boolean
  isSaving: boolean
  onEditStart: () => void
  onEditSave: () => void
  onEditCancel: () => void
  onScheduleOnboarding: () => void
  onActionSuccess: () => void
}

export function DetailHeader({
  postulacion,
  contactStatus,
  hasScheduledOnboarding,
  isEditing,
  isSaving,
  onEditStart,
  onEditSave,
  onEditCancel,
  onScheduleOnboarding,
  onActionSuccess,
}: DetailHeaderProps) {
  return (
    <>
      {postulacion.archivedAt && (
        <Banner
          tone="warning"
          title="Postulación archivada"
          action={
            <ArchiveButton
              driverId={postulacion.id}
              driverName={postulacion.fullName || 'Driver'}
              isArchived
              showLabel
              onSuccess={onActionSuccess}
            />
          }
        >
          Archivada el {new Date(postulacion.archivedAt).toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' })}. No aparece en el listado de trabajo ni en los contadores.
        </Banner>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
              {postulacion.fullName}
            </h1>
            {postulacion.agentRuns?.[0] && (
              <AgentRunBadge
                driverName={postulacion.fullName || 'Driver'}
                cedula={postulacion.cedula}
                run={{
                  ...postulacion.agentRuns[0],
                  createdAt:
                    postulacion.agentRuns[0].createdAt instanceof Date
                      ? postulacion.agentRuns[0].createdAt.toISOString()
                      : postulacion.agentRuns[0].createdAt,
                }}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
            <span>CI: {postulacion.cedula}</span>
            <span>•</span>
            <span>Postulación iniciada el {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}</span>
            <StatusBadges
              formStatus={postulacion.status}
              paymentStatus={postulacion.equipmentPayments?.[0]?.status}
              onboardingStatus={postulacion.onboardingAttendances?.[0]?.status}
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end items-center gap-2">
          {!isEditing && postulacion.phoneNumber && (
            <ContactButton
              driverId={postulacion.id}
              driverName={postulacion.fullName || 'Driver'}
              phoneNumber={postulacion.phoneNumber}
              contactStatus={contactStatus}
              showLabel={true}
              approvalNotifiedAt={postulacion.approvalNotifiedAt}
            />
          )}

          {!isEditing && hasScheduledOnboarding ? (
            <Button
              onClick={onScheduleOnboarding}
              className="gap-2 cursor-pointer"
              variant="outline"
            >
              <Calendar className="h-4 w-4" />
              Gestionar Onboarding
            </Button>
          ) : !isEditing ? (
            <Button
              onClick={onScheduleOnboarding}
              className="gap-2 cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              Agendar Onboarding
            </Button>
          ) : null}

          {!isEditing ? (
            <Button
              onClick={onEditStart}
              variant="outline"
              className="gap-2 cursor-pointer"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          ) : (
            <>
              <Button
                onClick={onEditCancel}
                variant="outline"
                className="gap-2 cursor-pointer"
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={onEditSave}
                className="gap-2 cursor-pointer"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar
                  </>
                )}
              </Button>
            </>
          )}

          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <MoreVertical className="h-4 w-4" />
                  Acciones
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {postulacion.accessToken && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      Portal Público
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => window.open(`/postulacion/${postulacion.accessToken}`, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                      Abrir portal
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const url = `${window.location.origin}/postulacion/${postulacion.accessToken}`
                        navigator.clipboard.writeText(url)
                        toast.success('Link del portal copiado al portapapeles')
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                      Copiar link del portal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {postulacion.phoneNumber && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      Contacto
                    </DropdownMenuLabel>

                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="p-0"
                    >
                      <TriggerApprovalNotificationButton
                        driverId={postulacion.id}
                        driverName={postulacion.fullName || 'Driver'}
                        approvalNotifiedAt={postulacion.approvalNotifiedAt}
                        inDropdown={true}
                        onSuccess={onActionSuccess}
                      />
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Gestionar
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="p-0"
                >
                  <RefreshRucButton
                    driverId={postulacion.id}
                    onSuccess={onActionSuccess}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="p-0"
                >
                  <RunAgentButton
                    driverId={postulacion.id}
                    hasExistingRun={(postulacion.agentRuns?.length ?? 0) > 0}
                  />
                </DropdownMenuItem>
                {postulacion.status === 'IN_PROGRESS' && (
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="p-0"
                  >
                    <AssistedCompletionButton
                      driverId={postulacion.id}
                      driverName={postulacion.fullName || 'Driver'}
                      isAssisted={postulacion.assistedCompletion || false}
                      onSuccess={onActionSuccess}
                    />
                  </DropdownMenuItem>
                )}
                <ArchiveButton
                  driverId={postulacion.id}
                  driverName={postulacion.fullName || 'Driver'}
                  isArchived={!!postulacion.archivedAt}
                  onSuccess={onActionSuccess}
                />
                <RejectButton
                  driverId={postulacion.id}
                  driverName={postulacion.fullName || 'Driver'}
                  isRejected={postulacion.status === 'REJECTED'}
                  onSuccess={onActionSuccess}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </>
  )
}
