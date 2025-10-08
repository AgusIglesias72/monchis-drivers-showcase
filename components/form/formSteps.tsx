import React, { useState, useEffect, useRef } from 'react';
import { User, MapPin, Bike, FileText, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const MONCHIS_RED = '#e7243f';

interface MultiFileUploadProps {
  label: string;
  value: string;
  onChange: (files: FileList) => void;
  onRemove: (index: number) => void;
  uploading?: boolean;
  acceptedTypes?: string;
  required?: boolean;
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  label,
  value,
  onChange,
  onRemove,
  uploading,
  acceptedTypes = "image/*,.pdf",
  required = false,
}) => {
  const files = value ? value.split(',').filter(f => f) : [];
  const inputId = `file-${label.replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-3">
      <Label>
        {label} {required && <span style={{ color: MONCHIS_RED }}>*</span>}
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
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
          className={`flex items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500 hover:bg-red-50'
            } border-gray-300`}
        >
          {uploading ? (
            <div className="text-center">
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <p className="text-sm text-gray-600">Subiendo...</p>
            </div>
          ) : (
            <div className="text-center">
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
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

  const handleAddressSelect = (addressComponents: any[]) => {
    let street = '';
    let streetNumber = '';
    let city = '';
    let department = '';

    addressComponents.forEach((component: any) => {
      const types = component.types;

      if (types.includes('route')) {
        street = component.long_name;
      }
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (types.includes('locality')) {
        city = component.long_name;
      }
      // En Paraguay, administrative_area_level_1 es el Departamento
      if (types.includes('administrative_area_level_1')) {
        department = component.long_name;
      }
    });

    const fullAddress = `${street} ${streetNumber} ${city} ${department}`.trim();
    handleInputChange('address', fullAddress);
    handleInputChange('city', city);
    handleInputChange('department', department);
  };

  const selectedZones = formData.workZone ? formData.workZone.split(',').filter((z: string) => z) : [];
  const currentYear = new Date().getFullYear();
  const vehicleYears = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return [
    // STEP 1: Contacto básico
    {
      title: '¡Empecemos!',
      subtitle: 'Datos de contacto',
      icon: User,
      component: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              Nombres <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
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
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
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
              placeholder="dd/mm/aaaa"
              value={formData.birthDate || ''}
              onChange={(e) => {
                let value = e.target.value;
                const numbersOnly = value.replace(/\D/g, '');

                if (numbersOnly.length <= 8) {
                  let formatted = numbersOnly;

                  if (numbersOnly.length >= 3) {
                    formatted = numbersOnly.slice(0, 2) + '/' + numbersOnly.slice(2);
                  }
                  if (numbersOnly.length >= 5) {
                    formatted = numbersOnly.slice(0, 2) + '/' +
                      numbersOnly.slice(2, 4) + '/' +
                      numbersOnly.slice(4);
                  }

                  handleInputChange('birthDate', formatted);
                }
              }}
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cedula">
              Cédula de Identidad <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="cedula"
              value={formData.cedula}
              onChange={(e) => handleInputChange('cedula', e.target.value)}
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
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="0981234567"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>
        </div>
      )
    },
    // STEP 2: Datos Personales (Ubicación + Contacto de Emergencia)
    {
      title: 'Datos Personales',
      subtitle: 'Ubicación y contacto de emergencia',
      icon: MapPin,
      component: (
        <div className="space-y-6">
          {/* Sección de Ubicación */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Ubicación</h3>

            <div className="space-y-2">
              <Label htmlFor="address">
                Dirección <span style={{ color: MONCHIS_RED }}>*</span>
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Calle y número"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">
                  Ciudad <span style={{ color: MONCHIS_RED }}>*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Asunción"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">
                  Departamento <span style={{ color: MONCHIS_RED }}>*</span>
                </Label>
                <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asunción">Asunción</SelectItem>
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
                    <SelectItem value="Ñeembucú">Ñeembucú</SelectItem>
                    <SelectItem value="Paraguarí">Paraguarí</SelectItem>
                    <SelectItem value="Presidente Hayes">Presidente Hayes</SelectItem>
                    <SelectItem value="San Pedro">San Pedro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Contacto de Emergencia</span>
            </div>
          </div>

          {/* Sección de Contacto de Emergencia */}
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Para tu seguridad (opcional)</p>

            <div className="space-y-2">
              <Label htmlFor="emergencyName">Nombre y Apellido</Label>
              <Input
                id="emergencyName"
                value={formData.emergencyName}
                onChange={(e) => handleInputChange('emergencyName', e.target.value)}
                placeholder="María González"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Parentesco</Label>
                <Input
                  id="emergencyRelationship"
                  value={formData.emergencyRelationship}
                  onChange={(e) => handleInputChange('emergencyRelationship', e.target.value)}
                  placeholder="Madre, Hermano..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Teléfono</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                  placeholder="0981234567"
                />
              </div>
            </div>
          </div>
        </div>
      )
    },
    // STEP 3: Trabajo y Vehículo
    {
      title: 'Trabajo y Vehículo',
      subtitle: 'Zona de trabajo y medio de transporte',
      icon: Bike,
      component: (
        <div className="space-y-6">
          {/* Sección de Zona de Trabajo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Zona de Trabajo</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Zona Preferida <span style={{ color: MONCHIS_RED }}>*</span>
                </Label>
                <span className="text-sm text-gray-500">{selectedZones.length}/3 seleccionadas</span>
              </div>

              <div className="gap-2 grid grid-cols-2 md:grid-cols-3">
                {workZones.map((zone) => {
                  const isSelected = selectedZones.includes(zone);
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => handleWorkZoneToggle(zone)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isSelected
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
                  value={formData.referredBy}
                  onChange={(e) => handleInputChange('referredBy', e.target.value)}
                  placeholder="Nombre y apellido del driver"
                />
              </div>
            )}
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Vehículo</span>
            </div>
          </div>

          {/* Sección de Vehículo */}
          <div className="space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleBrand">Marca</Label>
                    <Input
                      id="vehicleBrand"
                      value={formData.vehicleBrand}
                      onChange={(e) => handleInputChange('vehicleBrand', e.target.value)}
                      placeholder="Toyota, Honda..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel">Modelo</Label>
                    <Input
                      id="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                      placeholder="Corolla, Civic..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleYear">Año</Label>
                    <Select value={formData.vehicleYear} onValueChange={(value) => handleInputChange('vehicleYear', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehiclePlate">Placa/Chapa</Label>
                    <Input
                      id="vehiclePlate"
                      value={formData.vehiclePlate}
                      onChange={(e) => handleInputChange('vehiclePlate', e.target.value)}
                      placeholder="ABC123"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )
    },
    // STEP 4: Documentos
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
    // STEP 5: Información Adicional
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
              <SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inmediatamente">Inmediatamente</SelectItem>
                <SelectItem value="La próxima semana">La próxima semana</SelectItem>
                <SelectItem value="El próximo mes">El próximo mes</SelectItem>
                <SelectItem value="A definir">A definir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              ¿Tenés cuenta en ueno? <span style={{ color: MONCHIS_RED }}>*</span>
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
                Número de Cuenta ueno
              </Label>
              <Input
                id="uenoAccountNumber"
                value={formData.uenoAccountNumber}
                onChange={(e) => handleInputChange('uenoAccountNumber', e.target.value)}
                placeholder="Ingresa tu número de cuenta"
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

          {/* Certificado de Cumplimiento Tributario - Solo si puede facturar */}
          {formData.canInvoice === 'si' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-blue-900 font-semibold">
                  Certificado de Cumplimiento Tributario (Opcional)
                </Label>
                <p className="text-xs text-blue-700">
                  Este documento es gratis y lo podés solicitar a tu contador. Podés cargarlo ahora o te lo solicitaremos más adelante.
                </p>
              </div>

              <MultiFileUpload
                label="Certificado Tributario"
                value={formData.taxCompliancePhotoUrl || ''}
                onChange={(files) => handleFileUpload('taxCompliancePhotoUrl', files)}
                onRemove={(index) => {
                  const current = (formData.taxCompliancePhotoUrl || '').split(',').filter((f: string) => f);
                  current.splice(index, 1);
                  handleInputChange('taxCompliancePhotoUrl', current.join(','));
                }}
                uploading={uploadingDoc === 'taxCompliancePhotoUrl'}
              />
            </div>
          )}
        </div>
      )
    }
  ];
};