// components/admin/postulacion-detail-content.tsx

"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  User,
  MapPin,
  Phone,
  Mail,
  Bike,
  FileText,
  Clock,
  MessageSquare,
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  Bot,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { DocumentPreview } from "@/components/admin/document-preview"
import { ContactActions } from "@/components/admin/contact-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PostulacionDetailContentProps {
  postulacion: any
}

export function PostulacionDetailContent({ postulacion }: PostulacionDetailContentProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(postulacion)
  const [isSaving, setIsSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [notes, setNotes] = useState(postulacion.notes || [])
  const [documents, setDocuments] = useState(postulacion.documents || [])

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/postulaciones/${postulacion.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData),
      })

      if (!response.ok) {
        throw new Error('Error al guardar los cambios')
      }

      toast.success('Cambios guardados exitosamente')
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      console.error('Error al guardar:', error)
      toast.error('Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedData(postulacion)
    setIsEditing(false)
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    
    setIsSavingNote(true)
    
    try {
      const response = await fetch('/api/postulaciones/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formDriverId: postulacion.id,
          content: newNote,
          createdBy: 'Admin User',
        }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar la nota')
      }

      const savedNote = await response.json()
      setNotes([savedNote, ...notes])
      setNewNote('')
      toast.success('Nota añadida exitosamente')
    } catch (error) {
      console.error('Error al añadir nota:', error)
      toast.error('Error al guardar la nota')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleApprove = () => {
    console.log('Aprobando postulación')
    toast.success('Postulación aprobada')
  }

  const handleReject = () => {
    console.log('Rechazando postulación')
    toast.error('Postulación rechazada')
  }

  const handleDocumentDelete = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      return
    }

    try {
      const response = await fetch(`/api/postulaciones/documents/${documentId}/delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar el documento')
      }

      setDocuments(documents.filter((doc: any) => doc.id !== documentId))
      toast.success('Documento eliminado exitosamente')
      router.refresh()
    } catch (error) {
      console.error('Error al eliminar documento:', error)
      toast.error('Error al eliminar el documento')
    }
  }

  const handleDocumentUpload = async (documentType: string, files: FileList) => {
    if (!files || files.length === 0) return

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        uploadFormData.append('formDriverId', postulacion.id)
        uploadFormData.append('documentType', documentType)

        const response = await fetch('/api/postulaciones/documents/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!response.ok) {
          throw new Error(`Error al subir ${file.name}`)
        }

        const { document } = await response.json()
        setDocuments([...documents, document])
      }

      toast.success(`${files.length} documento(s) subido(s) exitosamente`)
      router.refresh()
    } catch (error) {
      console.error('Error al subir documentos:', error)
      toast.error('Error al subir los documentos')
    }
  }

  const handleDocumentApprove = async (documentId: string) => {
    try {
      const response = await fetch(`/api/postulaciones/documents/${documentId}/approve`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Error al aprobar el documento')
      }

      const { document: updatedDoc } = await response.json()
      setDocuments(documents.map((doc: any) => 
        doc.id === documentId ? updatedDoc : doc
      ))
      
      toast.success('Documento aprobado exitosamente')
      router.refresh()
    } catch (error) {
      console.error('Error al aprobar documento:', error)
      toast.error('Error al aprobar el documento')
    }
  }

  const handleDocumentReject = async (documentId: string, reason: string) => {
    try {
      const response = await fetch(`/api/postulaciones/documents/${documentId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        throw new Error('Error al rechazar el documento')
      }

      const { document: updatedDoc } = await response.json()
      setDocuments(documents.map((doc: any) => 
        doc.id === documentId ? updatedDoc : doc
      ))
      
      toast.success('Documento rechazado')
      router.refresh()
    } catch (error) {
      console.error('Error al rechazar documento:', error)
      toast.error('Error al rechazar el documento')
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: "Postulaciones", href: "/admin/postulaciones" },
          { label: postulacion.fullName }
        ]}
      />
      
      <div className="flex-1 p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Header con acciones y badges */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{postulacion.fullName}</h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground">
              CI: {postulacion.cedula} • Postulación iniciada el {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <StatusBadge status={postulacion.status} />
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {postulacion.currentStep}/5 pasos
              </Badge>
              {postulacion.completedAt && (
                <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3" />
                  Completada
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2 flex-1 sm:flex-none">
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
                
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span className="inline-block flex-1 sm:flex-none">
                        <Button variant="outline" className="gap-2 w-full" disabled>
                          <Bot className="h-4 w-4" />
                          <span className="hidden sm:inline">Verificar con IA</span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">Función en desarrollo - Próximamente disponible</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button 
                  variant="default" 
                  className="gap-2 bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  onClick={handleApprove}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Aprobar</span>
                </Button>
                <Button variant="destructive" className="gap-2 flex-1 sm:flex-none" onClick={handleReject}>
                  <XCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Rechazar</span>
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancel} 
                  className="gap-2 flex-1 sm:flex-none"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleSave} 
                  className="gap-2 flex-1 sm:flex-none"
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
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {/* Primera fila: Información Personal + Documentos - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Información Personal */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                    <User className="h-4 w-4" />
                    Información Personal
                  </CardTitle>
                  <ContactActions 
                    phoneNumber={postulacion.phoneNumber}
                    email={postulacion.email}
                    name={postulacion.fullName}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <EditableField 
                    label="Nombre completo" 
                    value={editedData.fullName} 
                    isEditing={isEditing} 
                    onChange={(v) => setEditedData({...editedData, fullName: v})} 
                    className="sm:col-span-2" 
                  />
                  <EditableField 
                    label="Cédula" 
                    value={editedData.cedula} 
                    isEditing={isEditing} 
                    onChange={(v) => setEditedData({...editedData, cedula: v})} 
                  />
                  <EditableField 
                    label="Fecha de Nacimiento" 
                    value={editedData.birthDate} 
                    isEditing={isEditing} 
                    onChange={(v) => setEditedData({...editedData, birthDate: v})} 
                  />
                  <EditableField 
                    label="Teléfono" 
                    value={editedData.phoneNumber} 
                    icon={<Phone className="h-3 w-3" />} 
                    isEditing={isEditing} 
                    onChange={(v) => setEditedData({...editedData, phoneNumber: v})} 
                  />
                  <EditableField 
                    label="Email" 
                    value={editedData.email} 
                    icon={<Mail className="h-3 w-3" />} 
                    isEditing={isEditing} 
                    onChange={(v) => setEditedData({...editedData, email: v})} 
                  />
                </div>

                <div className="border-t pt-3">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <MapPin className="h-3 w-3" />
                    UBICACIÓN
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <EditableField 
                      label="Departamento" 
                      value={editedData.department} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, department: v})} 
                    />
                    <EditableField 
                      label="Ciudad" 
                      value={editedData.city} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, city: v})} 
                    />
                    <EditableField 
                      label="Dirección" 
                      value={editedData.address} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, address: v})} 
                      className="sm:col-span-2" 
                    />
                  </div>
                </div>

                {postulacion.emergencyName && (
                  <div className="border-t pt-3">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                      <AlertCircle className="h-3 w-3" />
                      CONTACTO DE EMERGENCIA
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      <EditableField 
                        label="Nombre" 
                        value={editedData.emergencyName} 
                        isEditing={isEditing} 
                        onChange={(v) => setEditedData({...editedData, emergencyName: v})} 
                      />
                      <EditableField 
                        label="Relación" 
                        value={editedData.emergencyRelationship} 
                        isEditing={isEditing} 
                        onChange={(v) => setEditedData({...editedData, emergencyRelationship: v})} 
                      />
                      <EditableField 
                        label="Teléfono" 
                        value={editedData.emergencyPhone} 
                        icon={<Phone className="h-3 w-3" />} 
                        isEditing={isEditing} 
                        onChange={(v) => setEditedData({...editedData, emergencyPhone: v})} 
                        className="sm:col-span-2" 
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                    <FileText className="h-4 w-4" />
                    Documentos Adjuntos
                  </CardTitle>
                  <DocumentsStatusBadge status={postulacion.documentsStatus} />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <DocumentPreview 
                  documents={documents}
                  isEditing={true}
                  onDocumentDelete={handleDocumentDelete}
                  onDocumentUpload={handleDocumentUpload}
                  onDocumentApprove={handleDocumentApprove}
                  onDocumentReject={handleDocumentReject}
                />
              </CardContent>
            </Card>
          </div>

          {/* Segunda fila: Trabajo + Info Adicional + Notas - Responsive */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Trabajo y Vehículo */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <Bike className="h-4 w-4" />
                  Trabajo y Vehículo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1.5">Zonas de Trabajo</span>
                  <div className="flex flex-wrap gap-1.5">
                    {editedData.workZone?.split(',').map((zone: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs py-0 px-2">
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <InfoField label="¿Cómo se enteró?" value={postulacion.howHeardAboutUs} />
                  {postulacion.referredBy && (
                    <InfoField label="Referido por" value={postulacion.referredBy} />
                  )}
                </div>

                {editedData.hasVehicle ? (
                  <div className="pt-2 border-t space-y-2">
                    <span className="text-xs font-semibold text-muted-foreground block mb-2">VEHÍCULO</span>
                    <EditableField 
                      label="Marca" 
                      value={editedData.vehicleBrand} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, vehicleBrand: v})} 
                    />
                    <EditableField 
                      label="Modelo" 
                      value={editedData.vehicleModel} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, vehicleModel: v})} 
                    />
                    <EditableField 
                      label="Año" 
                      value={editedData.vehicleYear} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, vehicleYear: v})} 
                    />
                    <EditableField 
                      label="Placa" 
                      value={editedData.vehiclePlate} 
                      isEditing={isEditing} 
                      onChange={(v) => setEditedData({...editedData, vehiclePlate: v})} 
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic pt-2 border-t">No posee vehículo</p>
                )}
              </CardContent>
            </Card>

            {/* Información Adicional */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <FileText className="h-4 w-4" />
                  Información Adicional
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <InfoField label="Experiencia" value={postulacion.experience} />
                  <InfoField label="Disponibilidad" value={postulacion.availability?.join(', ')} />
                  <InfoField label="Puede empezar" value={postulacion.whenCanStart} />
                  <InfoField label="Cuenta ueno" value={postulacion.hasUenoAccount === 'si' ? `Sí - ${postulacion.uenoAccountNumber}` : 'No'} />
                  <InfoField label="Puede facturar" value={postulacion.canInvoice === 'si' ? 'Sí' : 'No'} />
                  
                  {postulacion.canInvoice === 'si' && (
                    <div className="pt-2 border-t">
                      <span className="text-xs font-semibold text-muted-foreground block mb-2">
                        CERTIFICADO TRIBUTARIO
                      </span>
                      {documents?.some((doc: any) => 
                        doc.documentType === 'TAX_COMPLIANCE' || 
                        doc.metadata?.isTaxCompliance
                      ) ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-700 font-medium">
                            Certificado cargado
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-3 w-3 text-amber-600" />
                          <span className="text-xs text-amber-700 font-medium">
                            Certificado pendiente
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-2 border-t">
                    <InfoField label="Fecha de inicio" value={new Date(postulacion.startedAt).toLocaleString('es-PY')} />
                  </div>
                  {postulacion.completedAt && (
                    <InfoField label="Completada el" value={new Date(postulacion.completedAt).toLocaleString('es-PY')} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notas */}
            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <MessageSquare className="h-4 w-4" />
                  Notas Internas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notes.map((note: any) => (
                    <div key={note.id} className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-xs">{note.content}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>{note.createdBy}</span>
                        <span>•</span>
                        <span>{new Date(note.createdAt).toLocaleString('es-PY')}</span>
                      </div>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No hay notas aún
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Añadir una nota interna..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    className="text-xs"
                    disabled={isSavingNote}
                  />
                  <Button 
                    onClick={handleAddNote} 
                    size="sm" 
                    className="w-full h-8"
                    disabled={!newNote.trim() || isSavingNote}
                  >
                    {isSavingNote ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Añadir Nota'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline - Responsive */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                <Clock className="h-4 w-4" />
                Historial del Proceso
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative">
                {/* Desktop: Línea horizontal */}
                <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-muted" />
                <div 
                  className="hidden md:block absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500"
                  style={{ 
                    width: `${((postulacion.completedSteps.length - 1) / (postulacion.timeline.length - 1)) * 100}%` 
                  }}
                />
                
                {/* Mobile: Línea vertical */}
                <div className="md:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />
                <div 
                  className="md:hidden absolute left-6 top-0 w-0.5 bg-primary transition-all duration-500"
                  style={{ 
                    height: `${((postulacion.completedSteps.length - 1) / (postulacion.timeline.length - 1)) * 100}%` 
                  }}
                />
                
                {/* Steps - Responsive */}
                <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
                  {postulacion.timeline.map((step: any) => {
                    const isCompleted = postulacion.completedSteps.includes(step.step)
                    return (
                      <div key={step.step} className="flex md:block items-start md:text-center">
                        {/* Círculo del step */}
                        <div className={`flex-shrink-0 md:mx-auto w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold mb-0 md:mb-3 transition-all ${
                          isCompleted
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {step.step}
                        </div>
                        
                        {/* Texto del step */}
                        <div className="ml-4 md:ml-0 flex-1">
                          <p className="text-xs font-medium text-foreground mb-1">
                            {step.name}
                          </p>
                          {step.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(step.completedAt).toLocaleTimeString('es-PY', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Componentes auxiliares
function StatusBadge({ status }: { status: string }) {
  const config = {
    COMPLETED: { label: 'Completada', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    IN_PROGRESS: { label: 'En Progreso', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
    ABANDONED: { label: 'Abandonada', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  }
  const { label, className } = config[status as keyof typeof config] || config.IN_PROGRESS
  return <Badge className={className}>{label}</Badge>
}

function DocumentsStatusBadge({ status }: { status: string }) {
  const config = {
    INCOMPLETE: { label: 'Incompleto', className: 'bg-gray-100 text-gray-800 border-gray-200' },
    PENDING: { label: 'Pendiente Revisión', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    IN_REVIEW: { label: 'En Revisión', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    CORRECTIONS: { label: 'Requiere Correcciones', className: 'bg-red-100 text-red-800 border-red-200' },
    APPROVED: { label: 'Aprobado', className: 'bg-green-100 text-green-800 border-green-200' },
  }
  const { label, className } = config[status as keyof typeof config] || config.INCOMPLETE
  return <Badge variant="outline" className={className}>{label}</Badge>
}

function EditableField({ 
  label, 
  value, 
  icon, 
  isEditing, 
  onChange,
  className = ""
}: { 
  label: string; 
  value: any; 
  icon?: React.ReactNode; 
  isEditing: boolean; 
  onChange: (value: string) => void; 
  className?: string 
}) {
  // Formatear fecha de nacimiento para display
  const displayValue = label === "Fecha de Nacimiento" && value && !isEditing
    ? value // Ya viene en formato dd/mm/yyyy desde el servidor
    : value;

  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground mb-1">{label}</Label>
      {isEditing ? (
        <Input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
          className="h-8 text-xs"
          placeholder={label === "Fecha de Nacimiento" ? "dd/mm/yyyy" : ""}
        />
      ) : (
        <div className="flex items-center gap-1.5 min-h-[32px]">
          {icon}
          <span className="text-xs font-medium">{displayValue || '-'}</span>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-0.5">{label}</label>
      <span className="font-medium text-xs">{value || '-'}</span>
    </div>
  )
}