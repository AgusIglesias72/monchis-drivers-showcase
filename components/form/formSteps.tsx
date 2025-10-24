import React, { useState, useRef } from 'react';
import { User, MapPin, Bike, FileText, Building2, X, Upload, Info, Eye, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const MONCHIS_RED = '#e7243f';

interface FileItem {
  url: string;
  name: string;
  uploading?: boolean;
  tempId?: string;
}

interface MultiFileUploadProps {
  label: string;
  value: string;
  onChange: (files: FileList) => void;
  onRemove: (index: number) => void;
  uploading?: boolean;
  acceptedTypes?: string;
  required?: boolean;
  uploadingFiles?: FileItem[];
}

export const MultiFileUpload: React.FC<MultiFileUploadProps> = ({
  label,
  value,
  onChange,
  onRemove,
  uploading,
  acceptedTypes = "image/*,.pdf",
  required = false,
  uploadingFiles = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Combinar archivos subidos + archivos en proceso de subida
  const uploadedFiles = value ? value.split(',').filter(f => f) : [];
  const allFiles: FileItem[] = [
    ...uploadedFiles.map(url => ({ url, name: getFileName(url), uploading: false })),
    ...uploadingFiles
  ];
  
  const inputId = `file-${label.replace(/\s+/g, '-')}`;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      onChange(droppedFiles);
    }
  };

  const handleViewDocument = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  function isPDF(url: string) {
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');
  }

  function getFileName(url: string) {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Archivo';
  }

  return (
    <>
      <div className="space-y-3">
        <Label>
          {label} {required && <span style={{ color: MONCHIS_RED }}>*</span>}
        </Label>

        {allFiles.length > 0 && (
          <div className="space-y-2">
            {allFiles.map((file, index) => {
              const fileName = file.name;
              const isImage = !isPDF(file.url);
              const isUploading = file.uploading;

              return (
                <div 
                  key={file.tempId || file.url} 
                  className={`relative group flex items-center gap-3 p-3 border-2 rounded-lg transition-colors ${
                    isUploading 
                      ? 'border-gray-200 bg-gray-50/50 opacity-70' 
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isUploading ? (
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                      </div>
                    ) : isImage ? (
                      <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded bg-red-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-red-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isUploading ? 'text-gray-500' : 'text-gray-900'}`}>
                      {fileName}
                    </p>
                    {isUploading ? (
                      <p className="text-xs text-gray-400">Subiendo...</p>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleViewDocument(e, file.url)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Ver documento
                      </button>
                    )}
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove(index);
                      }}
                      className="flex-shrink-0 p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="relative">
          <input
            ref={fileInputRef}
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
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed rounded-xl transition-all ${
              uploading
                ? 'opacity-50 cursor-not-allowed'
                : isDragging
                ? 'border-red-500 bg-red-50'
                : 'hover:border-red-500 hover:bg-red-50 cursor-pointer'
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
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  {isDragging ? 'Soltá para subir' : allFiles.length > 0 ? 'Agregar más archivos' : 'Click o arrastrá archivos'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF o imágenes (JPG, PNG) hasta 5MB</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Documento</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewUrl && (
              <>
                {isPDF(previewUrl) ? (
                  <div className="w-full h-[70vh]">
                    <iframe
                      src={previewUrl}
                      className="w-full h-full border-0"
                      title="PDF Preview"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={400}
                      height={300}
                      className="max-w-full h-auto rounded-lg"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};




export const getFormSteps = (formData: any, handleInputChange: any, handleFileUpload: any, uploadingDoc: string | null, uploadingFiles: Record<string, FileItem[]>) => {
  const workZones = [
    'Carmelitas',
    'Centro',
    'Lambaré',
    'Fdo/San Lorenzo',
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
  const currentYear = new Date().getFullYear();
  const vehicleYears = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return [
    // STEP 1: Contacto básico
    {
      title: '¡Empecemos!',
      subtitle: 'Información de contacto',
      icon: User,
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                Nombre <span style={{ color: MONCHIS_RED }}>*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Juan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Apellido <span style={{ color: MONCHIS_RED }}>*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Pérez"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">
              Fecha de Nacimiento <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
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
              placeholder="ejemplo@email.com"
            />
          </div>
        </div>
      )
    },
    // STEP 2: Ubicación + Contacto de Emergencia
    {
      title: 'Tu Ubicación',
      subtitle: 'Donde vivís y contacto de emergencia',
      icon: MapPin,
      component: (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Tu Domicilio</h3>

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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-800 font-bold">Contacto de Emergencia</span>
            </div>
          </div>

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
                  className="flex-1 cursor-pointer"
                  style={formData.howHeardAboutUs === 'Redes Sociales' ? { backgroundColor: MONCHIS_RED } : {}}
                >
                  Redes Sociales
                </Button>
                <Button
                  type="button"
                  variant={formData.howHeardAboutUs === 'Referido' ? 'default' : 'outline'}
                  onClick={() => handleInputChange('howHeardAboutUs', 'Referido')}
                  className="flex-1 cursor-pointer"
                  style={formData.howHeardAboutUs === 'Referido' ? { backgroundColor: MONCHIS_RED } : {}}
                >
                  Referido
                </Button>
                <Button
                  type="button"
                  variant={formData.howHeardAboutUs === 'Otro' ? 'default' : 'outline'}
                  onClick={() => handleInputChange('howHeardAboutUs', 'Otro')}
                  className="flex-1 cursor-pointer"
                  style={formData.howHeardAboutUs === 'Otro' ? { backgroundColor: MONCHIS_RED } : {}}
                >
                  Otro
                </Button>
              </div>
            </div>

            {formData.howHeardAboutUs === 'Referido' && (
              <div className="space-y-2">
                <Label htmlFor="referredBy">
                  ¿Quién te refirió?
                </Label>
                <Input
                  id="referredBy"
                  value={formData.referredBy}
                  onChange={(e) => handleInputChange('referredBy', e.target.value)}
                  placeholder="Nombre de quien te refirió"
                />
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Tu Vehículo</span>
            </div>
          </div>

          <div className="space-y-4">
            <Label>
              ¿Tenés vehículo propio? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={formData.hasVehicle === 'si' ? 'default' : 'outline'}
                onClick={() => handleInputChange('hasVehicle', 'si')}
                className="flex-1 cursor-pointer"
                style={formData.hasVehicle === 'si' ? { backgroundColor: MONCHIS_RED } : {}}
              >
                Sí
              </Button>
              <Button
                type="button"
                variant={formData.hasVehicle === 'no' ? 'default' : 'outline'}
                onClick={() => handleInputChange('hasVehicle', 'no')}
                className="flex-1 cursor-pointer"
                style={formData.hasVehicle === 'no' ? { backgroundColor: MONCHIS_RED } : {}}
              >
                No
              </Button>
            </div>

            {formData.hasVehicle === 'si' && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleBrand">
                    Marca <span style={{ color: MONCHIS_RED }}>*</span>
                  </Label>
                  <Input
                    id="vehicleBrand"
                    value={formData.vehicleBrand}
                    onChange={(e) => handleInputChange('vehicleBrand', e.target.value)}
                    placeholder="Honda, Yamaha, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleModel">
                    Modelo <span style={{ color: MONCHIS_RED }}>*</span>
                  </Label>
                  <Input
                    id="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                    placeholder="Wave, Crypton, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleYear">
                      Año <span style={{ color: MONCHIS_RED }}>*</span>
                    </Label>
                    <Select value={formData.vehicleYear} onValueChange={(value) => handleInputChange('vehicleYear', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Año" />
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
                    <Label htmlFor="vehiclePlate">
                      Chapa <span style={{ color: MONCHIS_RED }}>*</span>
                    </Label>
                    <Input
                      id="vehiclePlate"
                      value={formData.vehiclePlate}
                      onChange={(e) => handleInputChange('vehiclePlate', e.target.value)}
                      placeholder="ABC123"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    },
    // STEP 4: Documentos (SOLO CÉDULA Y CERTIFICADO DE ANTECEDENTES)
    {
      title: 'Documentos',
      subtitle: 'Sube tus documentos requeridos',
      icon: FileText,
      component: (
        <div className="space-y-6">
          <MultiFileUpload
            label="Cédula de Identidad"
            value={formData.cedulaPhotoUrl}
            onChange={(files) => handleFileUpload(files, 'cedulaPhotoUrl')}
            onRemove={(index) => {
              const urls = formData.cedulaPhotoUrl.split(',').filter((u: string) => u);
              urls.splice(index, 1);
              handleInputChange('cedulaPhotoUrl', urls.join(','));
            }}
            uploading={uploadingDoc === 'cedulaPhotoUrl'}
            uploadingFiles={uploadingFiles['cedulaPhotoUrl'] || []}
            required={true}
          />

          <MultiFileUpload
            label="Certificado de Antecedentes Policiales"
            value={formData.licensePhotoUrl}
            onChange={(files) => handleFileUpload(files, 'licensePhotoUrl')}
            onRemove={(index) => {
              const urls = formData.licensePhotoUrl.split(',').filter((u: string) => u);
              urls.splice(index, 1);
              handleInputChange('licensePhotoUrl', urls.join(','));
            }}
            uploading={uploadingDoc === 'licensePhotoUrl'}
            uploadingFiles={uploadingFiles['licensePhotoUrl'] || []}
            required={true}
          />
        </div>
      )
    },
    // STEP 5: Información Adicional
    {
      title: 'Información Adicional',
      subtitle: 'Últimos detalles',
      icon: Building2,
      component: (
        <div className="space-y-6">
          {/* ========== CAMPOS COMENTADOS - NO BORRAR ==========
          
          {/* Experiencia como delivery *}
          <div className="space-y-2">
            <Label>
              ¿Tenés experiencia como delivery? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'No tengo experiencia', label: 'Sin experiencia' },
                { value: 'Hasta 1 año de Experiencia', label: 'Hasta 1 año' },
                { value: '1 a 3 Años de Experiencia', label: '1 a 3 años' },
                { value: 'Más de 3 años de Experiencia', label: '+3 años' }
              ].map((option) => {
                const isSelected = formData.experience === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleInputChange('experience', option.value)}
                    className="cursor-pointer"
                    style={isSelected ? { backgroundColor: MONCHIS_RED } : {}}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Horarios disponibles *}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                ¿Qué horarios tenés disponibles? <span style={{ color: MONCHIS_RED }}>*</span>
              </Label>
              <span className="text-sm text-gray-500">
                {(formData.availability || []).length}/4
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Mañana', 'Tarde', 'Noche', 'Fines de Semana'].map((horario) => {
                const availability = formData.availability || [];
                const isSelected = availability.includes(horario);
                return (
                  <Button
                    key={horario}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => {
                      const current = formData.availability || [];
                      if (isSelected) {
                        handleInputChange('availability', current.filter((h: string) => h !== horario));
                      } else {
                        handleInputChange('availability', [...current, horario]);
                      }
                    }}
                    className="cursor-pointer"
                    style={isSelected ? { backgroundColor: MONCHIS_RED } : {}}
                  >
                    {horario}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Cuándo puede empezar *}
          <div className="space-y-2">
            <Label>
              ¿Cuándo podrías empezar? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {['Inmediatamente', 'Próxima Semana', 'Próximo Mes'].map((when) => {
                const isSelected = formData.whenCanStart === when;
                return (
                  <Button
                    key={when}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleInputChange('whenCanStart', when)}
                    className="cursor-pointer"
                    style={isSelected ? { backgroundColor: MONCHIS_RED } : {}}
                  >
                    {when}
                  </Button>
                );
              })}
            </div>
          </div>
          
          ========== FIN CAMPOS COMENTADOS ========== */}

          {/* Cuenta ueno bank */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              ¿Tenés cuenta en 
              <Image 
                src="https://www.ueno.com.py/wp-content/uploads/2024/07/Brand.svg" 
                alt="ueno bank" 
                width={80}
                height={20}
                className="h-5"
              />
              ? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={formData.hasUenoAccount === 'si' ? 'default' : 'outline'}
                onClick={() => handleInputChange('hasUenoAccount', 'si')}
                className="cursor-pointer"
                style={formData.hasUenoAccount === 'si' ? { backgroundColor: MONCHIS_RED } : {}}
              >
                Sí
              </Button>
              <Button
                type="button"
                variant={formData.hasUenoAccount === 'no' ? 'default' : 'outline'}
                onClick={() => handleInputChange('hasUenoAccount', 'no')}
                className="cursor-pointer"
                style={formData.hasUenoAccount === 'no' ? { backgroundColor: MONCHIS_RED } : {}}
              >
                No
              </Button>
            </div>
          </div>

          {formData.hasUenoAccount === 'si' && (
            <div className="space-y-2">
              <Label htmlFor="uenoAccountNumber">
                Número de Cuenta ueno bank <span style={{ color: MONCHIS_RED }}>*</span>
              </Label>
              <Input
                id="uenoAccountNumber"
                value={formData.uenoAccountNumber}
                onChange={(e) => handleInputChange('uenoAccountNumber', e.target.value)}
                placeholder="Ingresa tu número de cuenta"
              />
            </div>
          )}

          {/* Información de ueno bank si NO tiene cuenta */}
          {formData.hasUenoAccount === 'no' && (
            <div className="rounded-lg p-4 border-2" style={{ backgroundColor: '#7af5c020', borderColor: '#7af5c0' }}>
              <div className="flex items-start gap-3">
                <Image 
                  src="https://www.ueno.com.py/wp-content/uploads/2024/07/Brand.svg" 
                  alt="ueno bank" 
                  width={120}
                  height={30}
                  className="h-8 flex-shrink-0 mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-800 leading-relaxed mb-3">
                    <strong>¡Importante!</strong> Es requisito tener una cuenta en <strong>ueno bank</strong> para poder cobrar tus comisiones en Monchis.
                  </p>
                  <p className="text-sm text-gray-800 mb-4">
                    ¡Es súper fácil! Podés crear tu cuenta desde la app en minutos, sin papeleos ni complicaciones.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="https://play.google.com/store/apps/details?id=py.com.elcomercio.retailbanking"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
                      style={{ backgroundColor: '#7af5c0', color: '#000' }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                      </svg>
                      Descargar App
                    </a>
                    <a
                      href="https://www.ueno.com.py/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all hover:bg-gray-50"
                      style={{ borderColor: '#7af5c0', color: '#000' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Más Info
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Beneficio ueno seguros */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 flex items-start gap-2">
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Beneficio exclusivo:</strong> Como driver de Monchis, accedés de forma gratuita a <a href="https://www.ueno.com.py/personas/seguros/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">ueno seguros</a>, brindándote protección adicional en tus entregas.
              </span>
            </p>
          </div>

          {/* Puede emitir facturas */}
          <div className="space-y-2">
            <Label>
              ¿Podés emitir facturas? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={formData.canInvoice === 'si' ? 'default' : 'outline'}
                onClick={() => handleInputChange('canInvoice', 'si')}
                className="cursor-pointer"
                style={formData.canInvoice === 'si' ? { backgroundColor: MONCHIS_RED } : {}}
              >
                Sí
              </Button>
              <Button
                type="button"
                variant={formData.canInvoice === 'no' ? 'default' : 'outline'}
                onClick={() => handleInputChange('canInvoice', 'no')}
                className="cursor-pointer"
                style={formData.canInvoice === 'no' ? { backgroundColor: MONCHIS_RED } : {}}
              >
                No
              </Button>
            </div>
          </div>

          {/* Certificado de cumplimiento tributario - solo si NO puede emitir facturas */}
          {formData.canInvoice === 'si' && (
            <div className="space-y-4">
              <MultiFileUpload
                label="Certificado de Cumplimiento Tributario (opcional)"
                value={formData.taxCompliancePhotoUrl}
                onChange={(files) => handleFileUpload(files, 'taxCompliancePhotoUrl')}
                onRemove={(index) => {
                  const urls = formData.taxCompliancePhotoUrl.split(',').filter((u: string) => u);
                  urls.splice(index, 1);
                  handleInputChange('taxCompliancePhotoUrl', urls.join(','));
                }}
                uploading={uploadingDoc === 'taxCompliancePhotoUrl'}
                uploadingFiles={uploadingFiles['taxCompliancePhotoUrl'] || []}
                required={false}
              />
              <p className="text-xs text-gray-500 -mt-2">
                Este documento es gratis y lo podés solicitar a tu contador.
              </p>
            </div>
          )}

          {/* Información de Conto */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              ¿Te interesa usar 
              <Image 
                src="https://contoapp.com/img/main-logov2.png" 
                alt="Conto" 
                width={60}
                height={24}
                className="h-6"
              />
              para gestionar tu contabilidad? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="rounded-lg p-4 border-2" style={{ backgroundColor: '#f5ef6920', borderColor: '#f5ef69' }}>
              <div className="flex items-start gap-3">
                <Image 
                  src="https://contoapp.com/img/main-logov2.png" 
                  alt="Conto" 
                  width={80}
                  height={32}
                  className="h-8 flex-shrink-0 mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    <strong>CONTO</strong> es una empresa miembro del Grupo Vazquez, enfocada a brindar soluciones en cuanto la contabilidad de nuestros drivers, con un <strong>costo exclusivo de solo 55.000 Gs mensuales</strong> para drivers de Monchis.
                  </p>
                  <p className="text-sm text-gray-800 mt-2">
                    ¡No tendrás que entregarnos facturas quincenalmente en persona si deseas avanzar con CONTO!
                  </p>
                  <p className="text-xs text-gray-600 mt-3 italic">
                    En caso de responder SÍ, nuestros asesores de CONTO se pondrán en contacto con vos.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={formData.interestedInConto === 'si' ? 'default' : 'outline'}
                onClick={() => handleInputChange('interestedInConto', 'si')}
                className="cursor-pointer"
                style={formData.interestedInConto === 'si' ? { backgroundColor: '#f5ef69', color: '#000', border: 'none' } : { borderColor: '#f5ef69', color: '#000' }}
              >
                Sí, me interesa
              </Button>
              <Button
                type="button"
                variant={formData.interestedInConto === 'no' ? 'default' : 'outline'}
                onClick={() => handleInputChange('interestedInConto', 'no')}
                className="cursor-pointer"
                style={formData.interestedInConto === 'no' ? { backgroundColor: '#f5ef69', color: '#000', border: 'none' } : { borderColor: '#f5ef69', color: '#000' }}
              >
                No, gracias
              </Button>
            </div>
          </div>
        </div>
      )
    },
    // STEP 6: Pago del Equipo
    {
      title: 'Equipo de Trabajo',
      subtitle: 'Equipamiento y forma de pago',
      icon: Building2,
      component: (
        <div className="space-y-6">
<div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-6">
  {/* Header con icono y título */}
  <div className="flex items-center gap-4 mb-4">
    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: MONCHIS_RED }}>
      <Building2 className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-bold text-gray-800">Equipamiento Monchis</h3>
  </div>

  {/* Contenido en blanco de ancho completo */}
  <p className="text-gray-700 mb-3">
    Para comenzar a trabajar con nosotros, necesitás tu equipo completo de delivery.
  </p>
  
  <div className="bg-white rounded-lg p-4 space-y-3">
    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
      <span className="font-semibold text-gray-800">Pago inicial requerido:</span>
      <span className="text-3xl font-bold" style={{ color: MONCHIS_RED }}>100.000 Gs.</span>
    </div>
    
    <div>
      <p className="font-semibold text-gray-800 mb-2">Incluye:</p>
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="text-green-600">✓</span>
          <span>Mochila térmica profesional</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="text-green-600">✓</span>
          <span>Remera Monchis</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="text-green-600">✓</span>
          <span>Porta vasos</span>
        </div>
      </div>
    </div>
    
    <div className="pt-3 border-t border-gray-200">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-blue-900 font-semibold">Costo total del equipo:</span>
          <span className="text-lg font-bold text-blue-900">418.000 Gs.</span>
        </div>
        <p className="text-xs text-blue-800">
          El saldo restante (318.000 Gs.) se irá descontando de tus comisiones semanales.
        </p>
      </div>
      
      <p className="text-xs text-gray-600 mt-2">
        <strong>Importante:</strong> Este monto no es reembolsable.
      </p>
    </div>
  </div>
</div>

          <div className="space-y-2">
            <Label>
              ¿Cómo querés realizar el pago inicial de 100.000 Gs.? <span style={{ color: MONCHIS_RED }}>*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={formData.paymentMethod === 'TRANSFERENCIA' ? 'default' : 'outline'}
                onClick={() => handleInputChange('paymentMethod', 'TRANSFERENCIA')}
                className="h-auto py-4 flex-col"
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-sm font-medium">Transferencia</span>
                <span className="text-xs text-gray-500">Previo a capacitación</span>
              </Button>
              <Button
                type="button"
                variant={formData.paymentMethod === 'POS' ? 'default' : 'outline'}
                onClick={() => handleInputChange('paymentMethod', 'POS')}
                className="h-auto py-4 flex-col"
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-sm font-medium">Punto de Venta</span>
                <span className="text-xs text-gray-500">Día de capacitación</span>
              </Button>
            </div>
          </div>

          {formData.paymentMethod === 'TRANSFERENCIA' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">Datos para Transferencia</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Entidad:</span>
                    <span className="font-medium text-blue-900">UENO BANK S.A.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Titular:</span>
                    <span className="font-medium text-blue-900">HANOI S.A.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Número de cuenta:</span>
                    <span className="font-medium text-blue-900">619751858</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">RUC:</span>
                    <span className="font-medium text-blue-900">80089722-6</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">E-mail:</span>
                    <a href="mailto:hanoimonchis@gmail.com" className="font-medium text-blue-600 hover:underline">hanoimonchis@gmail.com</a>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>Monto a transferir:</strong> 100.000 Gs.
                  </p>
                </div>
              </div>

              <MultiFileUpload
                label="Comprobante de Transferencia"
                value={formData.paymentProofUrl}
                onChange={(files) => handleFileUpload(files, 'paymentProofUrl')}
                onRemove={(index) => {
                  const urls = formData.paymentProofUrl.split(',').filter((u: string) => u);
                  urls.splice(index, 1);
                  handleInputChange('paymentProofUrl', urls.join(','));
                }}
                uploading={uploadingDoc === 'paymentProofUrl'}
                uploadingFiles={uploadingFiles['paymentProofUrl'] || []}
                required={true}
              />
            </div>
          )}

          {formData.paymentMethod === 'POS' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Perfecto!</strong> Podrás realizar el pago de 100.000 Gs. en nuestro punto de venta el día de la capacitación. Te contactaremos para coordinar.
              </p>
            </div>
          )}
        </div>
      )
    }
  ];
};