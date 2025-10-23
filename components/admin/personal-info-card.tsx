// components/admin/personal-info-card.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User } from "lucide-react"
import { formatBirthDateWithAge, formatDateOnly } from "@/lib/utils"

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
  setEditedData,
}: PersonalInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
          <User className="h-4 w-4" />
          Información Personal
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Identificación */}
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nombre Completo</Label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={editedData.firstName || ''}
                    onChange={(e) => setEditedData({ ...editedData, firstName: e.target.value })}
                    placeholder="Nombre"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={editedData.lastName || ''}
                    onChange={(e) => setEditedData({ ...editedData, lastName: e.target.value })}
                    placeholder="Apellido"
                    className="h-8 text-sm"
                  />
                </div>
              ) : (
                <p className="text-sm font-medium">{postulacion.fullName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CI</Label>
                <p className="text-sm">{postulacion.cedula}</p>
              </div>
              
              {postulacion.birthDate && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fecha de Nacimiento</Label>
                  <p className="text-sm">
                    {formatBirthDateWithAge(postulacion.birthDate) || formatDateOnly(postulacion.birthDate) || postulacion.birthDate}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-2 pt-3 border-t">
            <h5 className="text-xs font-semibold text-muted-foreground">CONTACTO</h5>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Teléfono</Label>
                {isEditing ? (
                  <Input
                    value={editedData.phoneNumber || ''}
                    onChange={(e) => setEditedData({ ...editedData, phoneNumber: e.target.value })}
                    className="h-8 text-sm"
                  />
                ) : (
                  <p className="text-sm">{postulacion.phoneNumber}</p>
                )}
              </div>

              {postulacion.email && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mail</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editedData.email || ''}
                      onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm truncate">{postulacion.email}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-2 pt-3 border-t">
            <h5 className="text-xs font-semibold text-muted-foreground">UBICACIÓN</h5>
            
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editedData.address || ''}
                  onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                  placeholder="Dirección"
                  className="h-8 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={editedData.city || ''}
                    onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                    placeholder="Ciudad"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={editedData.department || ''}
                    onChange={(e) => setEditedData({ ...editedData, department: e.target.value })}
                    placeholder="Departamento"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                {postulacion.address && <p>{postulacion.address}</p>}
                {postulacion.neighborhood && (
                  <p className="text-muted-foreground text-xs">Barrio: {postulacion.neighborhood}</p>
                )}
                <p>{postulacion.city}, {postulacion.department}</p>
              </div>
            )}
          </div>

          {/* Vehículo */}
          <div className="space-y-2 pt-3 border-t">
            <h5 className="text-xs font-semibold text-muted-foreground">VEHÍCULO</h5>
            
            {postulacion.hasVehicle ? (
              isEditing ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={editedData.vehicleBrand || ''}
                      onChange={(e) => setEditedData({ ...editedData, vehicleBrand: e.target.value })}
                      placeholder="Marca"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={editedData.vehicleModel || ''}
                      onChange={(e) => setEditedData({ ...editedData, vehicleModel: e.target.value })}
                      placeholder="Modelo"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={editedData.vehicleYear || ''}
                      onChange={(e) => setEditedData({ ...editedData, vehicleYear: e.target.value })}
                      placeholder="Año"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={editedData.vehiclePlate || ''}
                      onChange={(e) => setEditedData({ ...editedData, vehiclePlate: e.target.value })}
                      placeholder="Placa"
                      className="h-8 text-sm"
                    />
                  </div>
                  <Input
                    value={editedData.workZone || ''}
                    onChange={(e) => setEditedData({ ...editedData, workZone: e.target.value })}
                    placeholder="Zona de Trabajo"
                    className="h-8 text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{postulacion.vehicleBrand} {postulacion.vehicleModel}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {postulacion.vehicleYear && <p>Año: {postulacion.vehicleYear}</p>}
                    {postulacion.vehiclePlate && <p>Placa: {postulacion.vehiclePlate}</p>}
                  </div>
                  {postulacion.workZone && (
                    <p className="text-xs text-muted-foreground">Zona: {postulacion.workZone}</p>
                  )}
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground italic">No posee vehículo</p>
            )}
          </div>

          {/* Contacto de Emergencia */}
          {postulacion.emergencyName && (
            <div className="space-y-2 pt-3 border-t">
              <h5 className="text-xs font-semibold text-muted-foreground">CONTACTO DE EMERGENCIA</h5>
              
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editedData.emergencyName || ''}
                    onChange={(e) => setEditedData({ ...editedData, emergencyName: e.target.value })}
                    placeholder="Nombre"
                    className="h-8 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={editedData.emergencyPhone || ''}
                      onChange={(e) => setEditedData({ ...editedData, emergencyPhone: e.target.value })}
                      placeholder="Teléfono"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={editedData.emergencyRelationship || ''}
                      onChange={(e) => setEditedData({ ...editedData, emergencyRelationship: e.target.value })}
                      placeholder="Relación"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{postulacion.emergencyName}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <p>{postulacion.emergencyPhone}</p>
                    {postulacion.emergencyRelationship && (
                      <p>{postulacion.emergencyRelationship}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Información Adicional */}
          {(postulacion.experience || postulacion.availability || postulacion.whenCanStart) && (
            <div className="space-y-2 pt-3 border-t">
              <h5 className="text-xs font-semibold text-muted-foreground">INFORMACIÓN ADICIONAL</h5>
              
              {isEditing ? (
                <div className="space-y-2">
                  {postulacion.experience !== undefined && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Experiencia</Label>
                      <Input
                        value={editedData.experience || ''}
                        onChange={(e) => setEditedData({ ...editedData, experience: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  {postulacion.whenCanStart !== undefined && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Disponibilidad de inicio</Label>
                      <Input
                        value={editedData.whenCanStart || ''}
                        onChange={(e) => setEditedData({ ...editedData, whenCanStart: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1 text-sm">
                  {postulacion.experience && (
                    <div className="grid grid-cols-2">
                      <span className="text-xs text-muted-foreground">Experiencia:</span>
                      <span className="text-xs">{postulacion.experience}</span>
                    </div>
                  )}
                  {postulacion.availability && (
                    <div className="grid grid-cols-2">
                      <span className="text-xs text-muted-foreground">Disponibilidad:</span>
                      <span className="text-xs">{Array.isArray(postulacion.availability) ? postulacion.availability.join(', ') : postulacion.availability}</span>
                    </div>
                  )}
                  {postulacion.whenCanStart && (
                    <div className="grid grid-cols-2">
                      <span className="text-xs text-muted-foreground">Puede iniciar:</span>
                      <span className="text-xs">{postulacion.whenCanStart}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}