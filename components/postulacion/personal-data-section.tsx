// components/postulacion/personal-data-section.tsx
'use client'

import { useState } from 'react'
import { Save, User, MapPin, Phone, Car, Briefcase, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import type { PersonalDataSection as PersonalData } from '@/lib/types/portal.types'
import { AddressMapPicker } from '@/components/ui/address-map-picker'

const MONCHIS_RED = '#e7243f'

interface PersonalDataSectionProps {
  token: string
  personalData: PersonalData
  onUpdate: () => void
}

export function PersonalDataSection({ token, personalData, onUpdate }: PersonalDataSectionProps) {
  const [formData, setFormData] = useState<PersonalData>(personalData)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (field: keyof PersonalData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvailabilityChange = (day: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      availability: checked
        ? [...(prev.availability || []), day]
        : (prev.availability || []).filter((d) => d !== day),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSaving(true)

      const dataToSend: any = {}
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== personalData[key as keyof PersonalData]) {
          dataToSend[key] = value
        }
      })

      if (Object.keys(dataToSend).length === 0) {
        toast.info('No hay cambios para guardar')
        return
      }

      const response = await fetch(`/api/postulacion/${token}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar datos')
      }

      toast.success('Datos actualizados correctamente')
      onUpdate()
    } catch (err: any) {
      console.error('Error updating personal data:', err)
      toast.error(err.message || 'No se pudieron actualizar los datos')
    } finally {
      setIsSaving(false)
    }
  }

  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500">
        Podés actualizar tu información en cualquier momento. Los campos de <strong>cédula</strong> y <strong>teléfono</strong> no pueden ser modificados.
      </p>

      <Accordion type="single" collapsible defaultValue="datos-personales" className="w-full">
        {/* Datos Personales */}
        <AccordionItem value="datos-personales" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={User} title="Datos Personales" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName || ''}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName || ''}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Tu apellido"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="tu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={
                      formData.birthDate
                        ? new Date(formData.birthDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) => handleChange('birthDate', e.target.value ? new Date(e.target.value) : null)}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Ubicación */}
        <AccordionItem value="ubicacion" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={MapPin} title="Ubicación" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <AddressMapPicker
                value={{
                  address: formData.address || '',
                  city: formData.city || '',
                  department: formData.department || '',
                  neighborhood: formData.neighborhood || '',
                  lat: formData.addressLat ?? null,
                  lng: formData.addressLng ?? null,
                }}
                onChange={(changes) => {
                  if (changes.address !== undefined) handleChange('address', changes.address)
                  if (changes.city !== undefined) handleChange('city', changes.city)
                  if (changes.department !== undefined) handleChange('department', changes.department)
                  if (changes.neighborhood !== undefined) handleChange('neighborhood', changes.neighborhood)
                  if (changes.lat !== undefined) handleChange('addressLat', changes.lat)
                  if (changes.lng !== undefined) handleChange('addressLng', changes.lng)
                }}
                accentColor={MONCHIS_RED}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={formData.department || ''}
                    onChange={(e) => handleChange('department', e.target.value)}
                    placeholder="Ej: Central"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workZone">Zona de Trabajo Preferida</Label>
                  <Input
                    id="workZone"
                    value={formData.workZone || ''}
                    onChange={(e) => handleChange('workZone', e.target.value)}
                    placeholder="Ej: Asunción y alrededores"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Contacto de Emergencia */}
        <AccordionItem value="emergencia" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Phone} title="Contacto de Emergencia" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Nombre</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyName || ''}
                  onChange={(e) => handleChange('emergencyName', e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Relación</Label>
                <Input
                  id="emergencyRelationship"
                  value={formData.emergencyRelationship || ''}
                  onChange={(e) => handleChange('emergencyRelationship', e.target.value)}
                  placeholder="Ej: Madre, Hermano"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Teléfono</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone || ''}
                  onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                  placeholder="0981 123 456"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Vehículo */}
        <AccordionItem value="vehiculo" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Car} title="Vehículo" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasVehicle"
                  checked={formData.hasVehicle}
                  onCheckedChange={(checked) => handleChange('hasVehicle', checked === true)}
                />
                <Label htmlFor="hasVehicle" className="cursor-pointer">
                  Tengo vehículo propio
                </Label>
              </div>

              {formData.hasVehicle && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleBrand">Marca</Label>
                    <Input
                      id="vehicleBrand"
                      value={formData.vehicleBrand || ''}
                      onChange={(e) => handleChange('vehicleBrand', e.target.value)}
                      placeholder="Ej: Toyota"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel">Modelo</Label>
                    <Input
                      id="vehicleModel"
                      value={formData.vehicleModel || ''}
                      onChange={(e) => handleChange('vehicleModel', e.target.value)}
                      placeholder="Ej: Corolla"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleYear">Año</Label>
                    <Input
                      id="vehicleYear"
                      type="number"
                      value={formData.vehicleYear || ''}
                      onChange={(e) => handleChange('vehicleYear', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="2020"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehiclePlate">Chapa/Patente</Label>
                    <Input
                      id="vehiclePlate"
                      value={formData.vehiclePlate || ''}
                      onChange={(e) => handleChange('vehiclePlate', e.target.value)}
                      placeholder="ABC 123"
                    />
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Experiencia y Disponibilidad */}
        <AccordionItem value="experiencia" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={Briefcase} title="Experiencia y Disponibilidad" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="experience">Experiencia Previa</Label>
                <Textarea
                  id="experience"
                  value={formData.experience || ''}
                  onChange={(e) => handleChange('experience', e.target.value)}
                  placeholder="Contanos sobre tu experiencia laboral..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Disponibilidad (días de la semana)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={(formData.availability || []).includes(day)}
                        onCheckedChange={(checked) => handleAvailabilityChange(day, checked === true)}
                      />
                      <Label htmlFor={`day-${day}`} className="cursor-pointer text-sm">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whenCanStart">¿Cuándo podés comenzar?</Label>
                <Input
                  id="whenCanStart"
                  value={formData.whenCanStart || ''}
                  onChange={(e) => handleChange('whenCanStart', e.target.value)}
                  placeholder="Ej: Inmediatamente, En 2 semanas, etc."
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Información Financiera */}
        <AccordionItem value="financiera" className="border-b-0">
          <AccordionTrigger className="hover:no-underline py-3">
            <SectionHeader icon={DollarSign} title="Información Financiera" />
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasUenoAccount"
                    checked={formData.hasUenoAccount}
                    onCheckedChange={(checked) => handleChange('hasUenoAccount', checked === true)}
                  />
                  <Label htmlFor="hasUenoAccount" className="cursor-pointer">
                    Tengo cuenta en Ueno Bank
                  </Label>
                </div>

                {formData.hasUenoAccount && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="uenoAccountNumber">Número de Cuenta Ueno</Label>
                    <Input
                      id="uenoAccountNumber"
                      value={formData.uenoAccountNumber || ''}
                      onChange={(e) => handleChange('uenoAccountNumber', e.target.value)}
                      placeholder="Número de cuenta"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canInvoice"
                  checked={formData.canInvoice}
                  onCheckedChange={(checked) => handleChange('canInvoice', checked === true)}
                />
                <Label htmlFor="canInvoice" className="cursor-pointer">
                  Puedo emitir facturas
                </Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="howHeardAboutUs">¿Cómo te enteraste de nosotros?</Label>
                  <Input
                    id="howHeardAboutUs"
                    value={formData.howHeardAboutUs || ''}
                    onChange={(e) => handleChange('howHeardAboutUs', e.target.value)}
                    placeholder="Ej: Facebook, Amigo, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referredBy">¿Te refirió alguien? (opcional)</Label>
                  <Input
                    id="referredBy"
                    value={formData.referredBy || ''}
                    onChange={(e) => handleChange('referredBy', e.target.value)}
                    placeholder="Nombre de quien te refirió"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSaving}
        style={{ backgroundColor: MONCHIS_RED }}
        className="w-full hover:opacity-90 text-white"
        size="lg"
      >
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
      </Button>
    </form>
  )
}

// Section header for accordion trigger
function SectionHeader({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${MONCHIS_RED}15` }}
      >
        <Icon className="w-4 h-4" style={{ color: MONCHIS_RED }} />
      </div>
      <span className="font-semibold text-gray-800">{title}</span>
    </div>
  )
}
