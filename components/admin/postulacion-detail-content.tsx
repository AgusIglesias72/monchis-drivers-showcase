// components/admin/postulacion-detail-content.tsx

"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
} from "lucide-react"
import { DocumentPreview } from "@/components/admin/document-preview"
import { ContactActions } from "@/components/admin/contact-actions"

interface PostulacionDetailContentProps {
  postulacion: any
}

export function PostulacionDetailContent({ postulacion }: PostulacionDetailContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(postulacion)
  const [newNote, setNewNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [notes, setNotes] = useState(postulacion.notes || [])

  const handleSave = () => {
    console.log('Guardando cambios:', editedData)
    setIsEditing(false)
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
          createdBy: 'Admin User', // TODO: Obtener del usuario actual
        }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar la nota')
      }

      const savedNote = await response.json()
      
      // Actualizar la lista de notas localmente
      setNotes([savedNote, ...notes])
      setNewNote('')
      
      console.log('Nota guardada exitosamente:', savedNote)
    } catch (error) {
      console.error('Error al añadir nota:', error)
      alert('Error al guardar la nota. Por favor intenta nuevamente.')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleApprove = () => {
    console.log('Aprobando postulación - Siguiente paso: Agendar OnBoarding')
    // TODO: En versión futura, abrir modal para agendar OnBoarding
  }

  const handleReject = () => {
    console.log('Rechazando postulación')
  }

  const handleDocumentDelete = (docType: string, fileIndex: number) => {
    console.log('Eliminando documento:', docType, 'index:', fileIndex)
    // TODO: Implementar lógica de eliminación
  }

  const handleDocumentUpload = (docType: string, files: FileList) => {
    console.log('Subiendo archivos para:', docType, files)
    // TODO: Implementar lógica de carga
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminHeader 
        breadcrumbs={[
          { label: "Postulaciones", href: "/admin/postulaciones" },
          { label: postulacion.fullName }
        ]}
      />
      
      <div className="flex-1 p-8 space-y-6">
        {/* Header con acciones y badges */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{postulacion.fullName}</h1>
            </div>
            <p className="text-muted-foreground">
              CI: {postulacion.cedula} • Postulación iniciada el {new Date(postulacion.startedAt).toLocaleDateString('es-PY')}
            </p>
            {/* Badges de estado */}
            <div className="flex items-center gap-2 mt-3">
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

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Button variant="outline" className="gap-2" disabled>
                          <Bot className="h-4 w-4" />
                          Verificar con IA
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
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                >
                  <CheckCircle className="h-4 w-4" />
                  Aprobar
                </Button>
                <Button variant="destructive" className="gap-2" onClick={handleReject}>
                  <XCircle className="h-4 w-4" />
                  Rechazar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancel} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button variant="default" onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Primera fila: Información Personal (1/2) + Documentos (1/2) */}
          <div className="grid grid-cols-2 gap-6">
            {/* Información Personal (incluye Ubicación y Contacto de Emergencia) */}
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
              <CardContent className="space-y-4">
                {/* Datos básicos */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <InfoField label="Nombre completo" value={postulacion.fullName} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, fullName: v})} className="col-span-2" />
                  <InfoField label="Cédula" value={postulacion.cedula} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, cedula: v})} />
                  <InfoField label="Fecha de Nacimiento" value={postulacion.birthDate} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, birthDate: v})} />
                  <InfoField label="Teléfono" value={postulacion.phoneNumber} icon={<Phone className="h-3 w-3" />} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, phoneNumber: v})} />
                  <InfoField label="Email" value={postulacion.email} icon={<Mail className="h-3 w-3" />} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, email: v})} />
                </div>

                {/* Divisor */}
                <div className="border-t pt-3">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <MapPin className="h-3 w-3" />
                    UBICACIÓN
                  </span>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <InfoField label="Departamento" value={postulacion.department} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, department: v})} />
                    <InfoField label="Ciudad" value={postulacion.city} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, city: v})} />
                    <InfoField label="Dirección" value={postulacion.address} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, address: v})} className="col-span-2" />
                  </div>
                </div>

                {/* Contacto de Emergencia */}
                {postulacion.emergencyName && (
                  <div className="border-t pt-3">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                      <AlertCircle className="h-3 w-3" />
                      CONTACTO DE EMERGENCIA
                    </span>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <InfoField label="Nombre" value={postulacion.emergencyName} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, emergencyName: v})} />
                      <InfoField label="Relación" value={postulacion.emergencyRelationship} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, emergencyRelationship: v})} />
                      <InfoField label="Teléfono" value={postulacion.emergencyPhone} icon={<Phone className="h-3 w-3" />} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, emergencyPhone: v})} className="col-span-2" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <FileText className="h-4 w-4" />
                  Documentos Adjuntos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentPreview 
                  documents={postulacion.documents}
                  isEditing={isEditing}
                  onDocumentDelete={handleDocumentDelete}
                  onDocumentUpload={handleDocumentUpload}
                />
              </CardContent>
            </Card>
          </div>

          {/* Segunda fila: Trabajo y Vehículo (1/3) + Info Adicional (1/3) + Notas (1/3) */}
          <div className="grid grid-cols-3 gap-6">
            {/* Trabajo y Vehículo */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <Bike className="h-4 w-4" />
                  Trabajo y Vehículo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Zonas de Trabajo */}
                <div>
                  <span className="text-xs text-muted-foreground block mb-1.5">Zonas de Trabajo</span>
                  <div className="flex flex-wrap gap-1.5">
                    {postulacion.workZone?.split(',').map((zone: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs py-0 px-2">
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Cómo se enteró */}
                <div className="space-y-2">
                  <InfoField label="¿Cómo se enteró?" value={postulacion.howHeardAboutUs} isEditing={false} onChange={() => {}} />
                  {postulacion.referredBy && (
                    <InfoField label="Referido por" value={postulacion.referredBy} isEditing={false} onChange={() => {}} />
                  )}
                </div>

                {/* Vehículo */}
                {postulacion.hasVehicle ? (
                  <div className="pt-2 border-t">
                    <span className="text-xs font-semibold text-muted-foreground block mb-2">VEHÍCULO</span>
                    <div className="space-y-2">
                      <InfoField label="Marca" value={postulacion.vehicleBrand} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, vehicleBrand: v})} />
                      <InfoField label="Modelo" value={postulacion.vehicleModel} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, vehicleModel: v})} />
                      <InfoField label="Año" value={postulacion.vehicleYear} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, vehicleYear: v})} />
                      <InfoField label="Placa" value={postulacion.vehiclePlate} isEditing={isEditing} onChange={(v) => setEditedData({...editedData, vehiclePlate: v})} />
                    </div>
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
              <CardContent>
                <div className="space-y-2">
                  <InfoField label="Experiencia" value={postulacion.experience} isEditing={false} onChange={() => {}} />
                  <InfoField label="Disponibilidad" value={postulacion.availability?.join(', ')} isEditing={false} onChange={() => {}} />
                  <InfoField label="Puede empezar" value={postulacion.whenCanStart} isEditing={false} onChange={() => {}} />
                  <InfoField label="Cuenta ueno" value={postulacion.hasUenoAccount === 'si' ? `Sí - ${postulacion.uenoAccountNumber}` : 'No'} isEditing={false} onChange={() => {}} />
                  <InfoField label="Puede facturar" value={postulacion.canInvoice === 'si' ? 'Sí' : 'No'} isEditing={false} onChange={() => {}} />
                  <div className="pt-2 border-t">
                    <InfoField label="Fecha de inicio" value={new Date(postulacion.startedAt).toLocaleString('es-PY')} isEditing={false} onChange={() => {}} />
                  </div>
                  {postulacion.completedAt && (
                    <InfoField label="Completada el" value={new Date(postulacion.completedAt).toLocaleString('es-PY')} isEditing={false} onChange={() => {}} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notas */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <MessageSquare className="h-4 w-4" />
                  Notas Internas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Lista de notas */}
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

                {/* Añadir nota */}
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
                    className="w-full h-8 cursor-pointer"
                    disabled={!newNote.trim() || isSavingNote}
                  >
                    {isSavingNote ? 'Guardando...' : 'Añadir Nota'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline - Ancho completo al final */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                <Clock className="h-4 w-4" />
                Historial del Proceso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Línea horizontal de fondo */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted" />
                
                {/* Línea de progreso */}
                <div 
                  className="absolute top-6 left-0 h-0.5 bg-primary transition-all duration-500"
                  style={{ 
                    width: `${((postulacion.completedSteps.length - 1) / (postulacion.timeline.length - 1)) * 100}%` 
                  }}
                />
                
                {/* Steps */}
                <div className="relative grid grid-cols-5 gap-2">
                  {postulacion.timeline.map((step: any) => {
                    const isCompleted = postulacion.completedSteps.includes(step.step)
                    
                    return (
                      <div key={step.step} className="text-center">
                        {/* Círculo del step */}
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold mb-3 transition-all ${
                          isCompleted
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {step.step}
                        </div>
                        
                        {/* Nombre del step */}
                        <p className="text-xs font-medium text-foreground mb-1 px-1">
                          {step.name}
                        </p>
                        
                        {/* Hora de completado */}
                        {step.completedAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(step.completedAt).toLocaleTimeString('es-PY', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} a. m.
                          </p>
                        )}
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

function StatusBadge({ status }: { status: string }) {
  const config = {
    COMPLETED: {
      label: 'Completada',
      className: 'bg-green-100 text-green-800 hover:bg-green-100'
    },
    IN_PROGRESS: {
      label: 'En Progreso',
      className: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
    },
    ABANDONED: {
      label: 'Abandonada',
      className: 'bg-red-100 text-red-800 hover:bg-red-100'
    },
  }

  const { label, className } = config[status as keyof typeof config] || config.IN_PROGRESS

  return (
    <Badge className={className}>
      {label}
    </Badge>
  )
}

function InfoField({ 
  label, 
  value, 
  icon, 
  isEditing, 
  onChange,
  className = ""
}: { 
  label: string
  value: any
  icon?: React.ReactNode
  isEditing: boolean
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground block mb-0.5">{label}</label>
      {isEditing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 text-xs border rounded-md"
        />
      ) : (
        <div className="flex items-center gap-1">
          {icon}
          <span className="font-medium text-xs">{value}</span>
        </div>
      )}
    </div>
  )
}