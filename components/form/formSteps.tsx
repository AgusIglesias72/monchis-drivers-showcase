import React from 'react';
import { User, MapPin, Bike, FileText, Phone, Briefcase, MapPinned, X, Paperclip, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MONCHIS_RED = '#e7243f';

interface MultiFileUploadProps {
  label: string;
  value: string;
  onChange: (files: FileList) => void;
  onRemove: (index: number) => void;
  uploading?: boolean;
  acceptedTypes?: string;
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({ 
  label, 
  value, 
  onChange, 
  onRemove,
  uploading,
  acceptedTypes = "image/*,.pdf"
}) => {
  const files = value ? value.split(',').filter(f => f) : [];
  const inputId = `file-${label.replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-3">
      <Label>
        {label} <span style={{ color: MONCHIS_RED }}>*</span>
      </Label>
      
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const fileName = file.split('/').pop() || file;
            
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{fileName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative">
        <input
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
              onChange(e.target.files);
            }
          }}
          className="hidden"
          id={inputId}
          disabled={uploading}
        />
        <label
          htmlFor={inputId}
          className={`flex items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500 hover:bg-red-50'
          } border-gray-300`}
        >
          {uploading ? (
            <div className="text-center">
              <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-gray-600">Subiendo...</p>
            </div>
          ) : (
            <div className="text-center">
              <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click para subir {files.length > 0 ? 'más archivos' : 'archivos'}</p>
              <p className="text-xs text-gray-400 mt-1">PDF o imágenes (JPG, PNG) hasta 5MB</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};

export const getFormSteps = (formData: any, handleInputChange: any, handleFileUpload: any, uploadingDoc: string | null) => {
  const workZones = [
    'Carmelitas',
    'Centro',
    'Lambaré',
    'Fernando de la Mora',
    'Luque',
    'Mariano'
  ];

  const handleWorkZoneToggle = (zone: string) => {
    const currentZones = formData.workZone ? formData.workZone.split(',') : [];
    
    if (currentZones.includes(zone)) {
      const updated = currentZones.filter((z: string) => z !== zone);
      handleInputChange('workZone', updated.join(','));
    } else {
      if (currentZones.length < 3) {
        const updated = [...currentZones, zone];
        handleInputChange('workZone', updated.join(','));
      }
    }
  };

  const selectedZones = formData.workZone ? formData.workZone.split(',').filter((z: string) => z) : [];

  return [
    {
      title: '¡Empecemos!',
      subtitle: 'Solo necesitamos tu contacto',
      icon: User,
      component: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              Nombres <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="firstName"
              className="w-full"
              value={formData.firstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('firstName', e.target.value)}
              placeholder="Juan"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">
              Apellidos <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="lastName"
              className="w-full"
              value={formData.lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('lastName', e.target.value)}
              placeholder="Pérez"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">
              Fecha de Nacimiento <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="birthDate"
              className="w-full"
              type="date"
              value={formData.birthDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('birthDate', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cedula">
              Cédula de Identidad <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="cedula"
              className="w-full"
              value={formData.cedula}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('cedula', e.target.value)}
              placeholder="1234567"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">
              Teléfono <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="phoneNumber"
              className="w-full"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="0981234567"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              className="w-full"
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
              placeholder="tu@email.com"
            />
          </div>
        </div>
      )
    },
    {
      title: 'Zona de Trabajo',
      subtitle: '¿Dónde te gustaría trabajar?',
      icon: MapPinned,
      component: (
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Zona Preferida <span style={{ color: MONCHIS_RED }}>*</span>
              </Label>
              {selectedZones.length > 0 && (
                <span className="text-sm text-gray-500">{selectedZones.length}/3 seleccionadas</span>
              )}
            </div>
            
            <div className="gap-2 grid grid-cols-2 md:grid-cols-3">
              {workZones.map((zone) => {
                const isSelected = selectedZones.includes(zone);
                return (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => handleWorkZoneToggle(zone)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? 'text-white hover:opacity-90'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${!isSelected && selectedZones.length >= 3 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={isSelected ? { backgroundColor: MONCHIS_RED } : {}}
                    disabled={!isSelected && selectedZones.length >= 3}
                  >
                    {zone}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>
              ¿Cómo te enteraste de nosotros? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="flex gap-4 w-full">
              <Button
                type="button"
                variant={formData.howHeardAboutUs === 'Redes Sociales' ? 'default' : 'outline'}
                onClick={() => handleInputChange('howHeardAboutUs', 'Redes Sociales')}
                className="flex-1"
              >
                Redes Sociales
              </Button>
              <Button
                type="button"
                variant={formData.howHeardAboutUs === 'Recomendación' ? 'default' : 'outline'}
                onClick={() => handleInputChange('howHeardAboutUs', 'Recomendación')}
                className="flex-1"
              >
                Recomendación
              </Button>
            </div>
          </div>
          
          {formData.howHeardAboutUs === 'Recomendación' && (
            <div className="space-y-2">
              <Label htmlFor="referredBy">¿Quién te recomendó? (opcional)</Label>
              <Input
                id="referredBy"
                className="w-full"
                value={formData.referredBy}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('referredBy', e.target.value)}
                placeholder="Nombre y apellido del driver"
              />
            </div>
          )}
        </div>
      )
    },
    {
      title: '¿Dónde estás?',
      subtitle: 'Necesitamos tu ubicación',
      icon: MapPin,
      component: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="department">
              Departamento <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asunción (capital del país)">Asunción (capital del país)</SelectItem>
                <SelectItem value="Central">Central</SelectItem>
                <SelectItem value="Alto Paraná">Alto Paraná</SelectItem>
                <SelectItem value="Alto Paraguay">Alto Paraguay</SelectItem>
                <SelectItem value="Amambay">Amambay</SelectItem>
                <SelectItem value="Boquerón">Boquerón</SelectItem>
                <SelectItem value="Caaguazú">Caaguazú</SelectItem>
                <SelectItem value="Caazapá">Caazapá</SelectItem>
                <SelectItem value="Canindeyú">Canindeyú</SelectItem>
                <SelectItem value="Concepción">Concepción</SelectItem>
                <SelectItem value="Cordillera">Cordillera</SelectItem>
                <SelectItem value="Guairá">Guairá</SelectItem>
                <SelectItem value="Itapúa">Itapúa</SelectItem>
                <SelectItem value="Misiones">Misiones</SelectItem>
                <SelectItem value="Paraguarí">Paraguarí</SelectItem>
                <SelectItem value="Presidente Hayes">Presidente Hayes</SelectItem>
                <SelectItem value="San Pedro">San Pedro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">
              Ciudad <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="city"
              className="w-full"
              value={formData.city}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('city', e.target.value)}
              placeholder="Asunción"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="neighborhood">
              Barrio <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="neighborhood"
              className="w-full"
              value={formData.neighborhood}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('neighborhood', e.target.value)}
              placeholder="Las Mercedes"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">
              Dirección Domicilio <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Textarea
              id="address"
              className="w-full"
              value={formData.address}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('address', e.target.value)}
              placeholder="Calle principal, número de casa e intersección"
              required
            />
          </div>
        </div>
      )
    },
    {
      title: 'Tu Vehículo',
      subtitle: '¿Con qué vas a trabajar?',
      icon: Bike,
      component: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>
              ¿Tenés vehículo propio? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="flex gap-4 w-full">
              <Button
                type="button"
                variant={formData.hasVehicle === 'si' ? 'default' : 'outline'}
                onClick={() => handleInputChange('hasVehicle', 'si')}
                className="flex-1"
              >
                Sí
              </Button>
              <Button
                type="button"
                variant={formData.hasVehicle === 'no' ? 'default' : 'outline'}
                onClick={() => handleInputChange('hasVehicle', 'no')}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>

          {formData.hasVehicle === 'si' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="vehicleBrand">
                  Marca <span style={{ color: MONCHIS_RED }}>*</span>
                </Label>
                <Input
                  id="vehicleBrand"
                  className="w-full"
                  value={formData.vehicleBrand}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicleBrand', e.target.value)}
                  placeholder="Toyota, Honda, Yamaha..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleModel">
                  Modelo <span style={{ color: MONCHIS_RED }}>*</span>
                </Label>
                <Input
                  id="vehicleModel"
                  className="w-full"
                  value={formData.vehicleModel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicleModel', e.target.value)}
                  placeholder="Corolla, Civic, Crypton..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleYear">
                  Año <span style={{ color: MONCHIS_RED }}>*</span>
                </Label>
                <Input
                  id="vehicleYear"
                  className="w-full"
                  value={formData.vehicleYear}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicleYear', e.target.value)}
                  placeholder="2020"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehiclePlate">
                  Placa/Chapa <span style={{ color: MONCHIS_RED }}>*</span>
                </Label>
                <Input
                  id="vehiclePlate"
                  className="w-full"
                  value={formData.vehiclePlate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehiclePlate', e.target.value)}
                  placeholder="ABC123"
                  required
                />
              </div>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Documentos',
      subtitle: 'Necesitamos verificar tu identidad',
      icon: FileText,
      component: (
        <div className="space-y-5">
          <MultiFileUpload
            label="Cédula (frente y dorso)"
            value={formData.cedulaPhotoUrl}
            onChange={(files) => handleFileUpload('cedulaPhotoUrl', files)}
            onRemove={(index) => {
              const current = formData.cedulaPhotoUrl.split(',').filter((f: string) => f);
              current.splice(index, 1);
              handleInputChange('cedulaPhotoUrl', current.join(','));
            }}
            uploading={uploadingDoc === 'cedulaPhotoUrl'}
          />
          <MultiFileUpload
            label="Certificado de Antecedentes Penales"
            value={formData.licensePhotoUrl}
            onChange={(files) => handleFileUpload('licensePhotoUrl', files)}
            onRemove={(index) => {
              const current = formData.licensePhotoUrl.split(',').filter((f: string) => f);
              current.splice(index, 1);
              handleInputChange('licensePhotoUrl', current.join(','));
            }}
            uploading={uploadingDoc === 'licensePhotoUrl'}
          />
        </div>
      )
    },
    {
      title: 'Contacto de Emergencia',
      subtitle: 'Para tu seguridad',
      icon: Phone,
      component: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="emergencyName">Nombre y Apellido</Label>
            <Input
              id="emergencyName"
              className="w-full"
              value={formData.emergencyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('emergencyName', e.target.value)}
              placeholder="María González"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyRelationship">Parentesco</Label>
            <Input
              id="emergencyRelationship"
              className="w-full"
              value={formData.emergencyRelationship}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('emergencyRelationship', e.target.value)}
              placeholder="Madre, Hermano, Amigo..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyPhone">Teléfono</Label>
            <Input
              id="emergencyPhone"
              className="w-full"
              type="tel"
              value={formData.emergencyPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('emergencyPhone', e.target.value)}
              placeholder="0981234567"
            />
          </div>
        </div>
      )
    },
    {
      title: 'Información Adicional',
      subtitle: 'Solo falta esto',
      icon: Building2,
      component: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="experience">
              ¿Tenés experiencia en delivery? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Select value={formData.experience} onValueChange={(value) => handleInputChange('experience', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sin experiencia">Sin experiencia</SelectItem>
                <SelectItem value="Menos de 1 año">Menos de 1 año</SelectItem>
                <SelectItem value="1-3 años">1-3 años</SelectItem>
                <SelectItem value="Más de 3 años">Más de 3 años</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              ¿Cuándo podés trabajar? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2 w-full">
              {['Mañana', 'Tarde', 'Noche'].map((time) => (
                <Button
                  key={time}
                  type="button"
                  variant={(formData.availability || []).includes(time) ? 'default' : 'outline'}
                  onClick={() => {
                    const current = formData.availability || [];
                    const updated = current.includes(time)
                      ? current.filter((t: string) => t !== time)
                      : [...current, time];
                    handleInputChange('availability', updated);
                  }}
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="whenCanStart">
              ¿Cuándo podés empezar? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Select value={formData.whenCanStart} onValueChange={(value) => handleInputChange('whenCanStart', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inmediatamente">Inmediatamente</SelectItem>
                <SelectItem value="Esta semana">Esta semana</SelectItem>
                <SelectItem value="Este mes">Este mes</SelectItem>
                <SelectItem value="A evaluar">A evaluar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              ¿Tenés cuenta en Ueno Bank? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="flex gap-4 w-full">
              <Button
                type="button"
                variant={formData.hasUenoAccount === 'si' ? 'default' : 'outline'}
                onClick={() => handleInputChange('hasUenoAccount', 'si')}
                className="flex-1"
              >
                Sí
              </Button>
              <Button
                type="button"
                variant={formData.hasUenoAccount === 'no' ? 'default' : 'outline'}
                onClick={() => handleInputChange('hasUenoAccount', 'no')}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>

          {formData.hasUenoAccount === 'si' && (
            <div className="space-y-2">
              <Label htmlFor="uenoAccountNumber">
                Número de Cuenta Ueno <span style={{ color: MONCHIS_RED }}>*</span>
              </Label>
              <Input
                id="uenoAccountNumber"
                className="w-full"
                value={formData.uenoAccountNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('uenoAccountNumber', e.target.value)}
                placeholder="Ingresa tu número de cuenta"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>
              ¿Estás habilitado para realizar facturas? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="flex gap-4 w-full">
              <Button
                type="button"
                variant={formData.canInvoice === 'si' ? 'default' : 'outline'}
                onClick={() => handleInputChange('canInvoice', 'si')}
                className="flex-1"
              >
                Sí
              </Button>
              <Button
                type="button"
                variant={formData.canInvoice === 'no' ? 'default' : 'outline'}
                onClick={() => handleInputChange('canInvoice', 'no')}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>
        </div>
      )
    }
  ];
};