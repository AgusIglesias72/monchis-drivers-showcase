// components/admin/personal-info-card.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Bike, Calendar, CreditCard, MapPin, Phone, User } from "lucide-react"
import { ContactActions } from "@/components/admin/contact-actions"
import { EditableField, InfoField } from "@/components/admin/postulacion-helpers"

interface PersonalInfoCardProps {
  postulacion: any
  editedData: any
  isEditing: boolean
  setEditedData: (data: any) => void
}

export function PersonalInfoCard({ 
  postulacion, 
  editedData, 
  isEditing, 
  setEditedData 
}: PersonalInfoCardProps) {
  return (
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
        {/* Datos Básicos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">            
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
            isEditing={isEditing} 
            onChange={(v) => setEditedData({...editedData, email: v})} 
          />
        </div>

        {/* Ubicación */}
        <div className="border-t pt-3">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <MapPin className="h-3 w-3" />
            UBICACIÓN
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 pt-2">
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
            />
          </div>
        </div>

        {/* Contacto de Emergencia */}
        {postulacion.emergencyName && (
          <div className="border-t pt-3">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <AlertCircle className="h-3 w-3" />
              CONTACTO DE EMERGENCIA
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3 pt-2">
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
              />
            </div>
          </div>
        )}

        {/* Zonas y Referencia */}
        <div className="border-t pt-3">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Bike className="h-3 w-3" />
            TRABAJO
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2 pb-2">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground block mb-1.5">Zonas de Trabajo</span>
              <div className="flex flex-wrap gap-1.5">
                {editedData.workZone?.split(',').map((zone: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs py-0 px-2">
                    {zone}
                  </Badge>
                ))}
              </div>
              <InfoField label="¿Cómo se enteró?" value={postulacion.howHeardAboutUs} />
              {postulacion.referredBy && (
                <InfoField label="Referido por" value={postulacion.referredBy} />
              )}
            </div>
            {editedData.hasVehicle && (
              <div className="">
                <span className="text-xs text-muted-foreground block mb-2">Vehículo</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2">
                  <InfoField label="Marca" value={editedData.vehicleBrand} />
                  <InfoField label="Modelo" value={editedData.vehicleModel} />
                  <InfoField label="Año" value={editedData.vehicleYear} />
                  <InfoField label="Placa" value={editedData.vehiclePlate} />
                </div>
              </div>
            )}
          </div>

          {/* Disponibilidad */}
          <div className="pt-2 border-t">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Calendar className="h-3 w-3" />
              DISPONIBILIDAD
            </span>
            <div className="grid grid-cols-3 gap-3">
              <InfoField label="Experiencia" value={postulacion.experience} />
              <InfoField label="Horarios" value={postulacion.availability?.join(', ')} />
              <InfoField label="Puede empezar" value={postulacion.whenCanStart} />
            </div>
          </div>
        </div>

        {/* Servicios Financieros */}
        <div className="border-t pt-3">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <CreditCard className="h-3 w-3" />
            SERVICIOS FINANCIEROS
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-6 gap-y-3 pt-2">
            <InfoField label="Cuenta Ueno" value={postulacion.hasUenoAccount === 'si' ? 'Sí' : 'No'} />
            {postulacion.hasUenoAccount === 'si' && postulacion.uenoAccountNumber && (
              <div className="">
                <InfoField label="Nro. Cuenta Ueno" value={postulacion.uenoAccountNumber} />
              </div>
            )}
            <InfoField label="Puede facturar" value={postulacion.canInvoice === 'si' ? 'Sí' : 'No'} />
            {postulacion.financialService?.interestedInConto && (
              <div className="">
                <InfoField label="Interés en Conto" value="Interesado" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}