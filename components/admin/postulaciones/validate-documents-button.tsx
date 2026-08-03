"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, Bot, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface ValidateDocumentsButtonProps {
  driverId: string
  driverName: string
  hasIdentityDocs: boolean
  onSuccess?: () => void
}

export function ValidateDocumentsButton({
  driverId,
  driverName,
  hasIdentityDocs,
  onSuccess,
}: ValidateDocumentsButtonProps) {
  const [isValidating, setIsValidating] = useState(false)

  const handleValidate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!hasIdentityDocs) {
      toast.error("No hay documentos de cédula y antecedentes pendientes")
      return
    }

    setIsValidating(true)

    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/validate-documents`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        const { results, validationType, cleanup } = data

        // Mostrar mensaje de limpieza si hubo duplicados
        if (cleanup && cleanup.duplicatesFound > 0) {
          toast.info(`🧹 Limpieza de duplicados`, {
            description: `Se eliminaron ${cleanup.documentsDeleted} documento(s) duplicado(s)`
          })
        }

        if (validationType === 'paraguay_identity') {
          // Validación de identidad paraguaya
          if (results.status === 'approved') {
            toast.success(`✅ Documentos aprobados automáticamente`, {
              description: `Score: ${results.validationMetadata.validationScore}/100. Los documentos de ${driverName} están validados.`
            })
          } else if (results.status === 'rejected') {
            toast.error(`❌ Documentos rechazados automáticamente`, {
              description: `${results.errors.length} error(es) encontrado(s). Revisa los detalles.`
            })
          } else {
            toast.warning(`⚠️ Requiere revisión manual`, {
              description: `Score: ${results.validationMetadata.validationScore}/100. Revisa los documentos manualmente.`
            })
          }
        } else {
          // Validación genérica
          toast.success(`✅ Documentos procesados`, {
            description: `${results.approved} aprobados, ${results.rejected} rechazados, ${results.needsReview} requieren revisión`
          })
        }

        // Llamar a onSuccess después de un breve delay para que se vea el toast
        setTimeout(() => {
          if (onSuccess) onSuccess()
        }, 1500)
      } else {
        toast.error('Error al validar documentos', {
          description: data.error
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al validar documentos', {
        description: 'Ocurrió un error inesperado'
      })
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <DropdownMenuItem
      onSelect={(e) => e.preventDefault()}
      onClick={handleValidate}
      disabled={isValidating || !hasIdentityDocs}
      className="cursor-pointer group"
    >
      {isValidating ? (
        <>
          <div className="relative mr-2">
            <Bot className="h-4 w-4 text-info" />
            <Sparkles className="h-2 w-2 absolute -top-1 -right-1 text-warning animate-pulse" />
          </div>
          <span className="text-info font-medium">Validando con IA...</span>
        </>
      ) : (
        <>
          <div className="relative mr-2">
            <Bot className="h-4 w-4 text-violet-600 group-hover:text-violet-700 transition-colors" />
            <Sparkles className="h-2 w-2 absolute -top-1 -right-1 text-warning opacity-75" />
          </div>
          <span className="font-medium text-violet-600 group-hover:text-violet-700 transition-colors">
            Validar con IA
          </span>
        </>
      )}
    </DropdownMenuItem>
  )
}
