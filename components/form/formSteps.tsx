import React from 'react';
import { User, MapPin, Car, FileText, Phone, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  label: string;
  value: string;
  onChange: (file: File) => void;
  uploading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, value, onChange, uploading }) => {
  const MONCHIS_RED = '#e7243f';
  
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && onChange(e.target.files[0])}
          className="hidden"
          id={label}
          disabled={uploading}
        />
        <label
          htmlFor={label}
          className={`flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500 hover:bg-red-50'
          } ${value ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
        >
          {uploading ? (
            <div className="text-center">
              <div className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse">📤</div>
              <p className="text-sm text-gray-600">Subiendo...</p>
            </div>
          ) : value ? (
            <div className="text-center">
              <img src={value} alt="Preview" className="max-h-32 mx-auto mb-2 rounded-lg" />
              <p className="text-sm text-green-600 font-medium">✓ Archivo cargado</p>
              <p className="text-xs text-gray-500 mt-1">Click para cambiar</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-2">📸</div>
              <p className="text-sm text-gray-600">Click para subir imagen</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG hasta 5MB</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};

export const getFormSteps = (formData: any, handleInputChange: any, handleFileUpload: any, uploadingDoc: string | null) => [
  {
    title: '¡Empecemos!',
    subtitle: 'Solo necesitamos tu contacto',
    icon: User,
    component: (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombres *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('firstName', e.target.value)}
            placeholder="Juan"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellidos *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('lastName', e.target.value)}
            placeholder="Pérez"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cedula">Cédula de Identidad *</Label>
          <Input
            id="cedula"
            value={formData.cedula}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('cedula', e.target.value)}
            placeholder="1234567"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Teléfono *</Label>
          <Input
            id="phoneNumber"
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
    title: '¿Dónde estás?',
    subtitle: 'Necesitamos tu ubicación',
    icon: MapPin,
    component: (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="department">Departamento *</Label>
          <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Central">Central</SelectItem>
              <SelectItem value="Asunción">Asunción</SelectItem>
              <SelectItem value="Alto Paraná">Alto Paraná</SelectItem>
              <SelectItem value="Itapúa">Itapúa</SelectItem>
              <SelectItem value="Caaguazú">Caaguazú</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('city', e.target.value)}
            placeholder="Asunción"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Barrio *</Label>
          <Input
            id="neighborhood"
            value={formData.neighborhood}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('neighborhood', e.target.value)}
            placeholder="Las Mercedes"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Dirección Domicilio *</Label>
          <Textarea
            id="address"
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
    icon: Car,
    component: (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>¿Tenés vehículo propio? *</Label>
          <div className="flex gap-4">
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
              <Label htmlFor="vehicleBrand">Marca *</Label>
              <Input
                id="vehicleBrand"
                value={formData.vehicleBrand}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicleBrand', e.target.value)}
                placeholder="Honda, Yamaha, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleModel">Modelo *</Label>
              <Input
                id="vehicleModel"
                value={formData.vehicleModel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicleModel', e.target.value)}
                placeholder="Wave, Biz, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleYear">Año *</Label>
              <Input
                id="vehicleYear"
                type="number"
                value={formData.vehicleYear}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicleYear', e.target.value)}
                placeholder="2020"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehiclePlate">Placa *</Label>
              <Input
                id="vehiclePlate"
                value={formData.vehiclePlate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehiclePlate', e.target.value)}
                placeholder="ABC123"
              />
            </div>
          </>
        )}
      </div>
    )
  },
  {
    title: 'Documentos',
    subtitle: 'Sube fotos claras',
    icon: FileText,
    component: (
      <div className="space-y-4">
        <FileUpload
          label="Foto de Cédula (ambos lados)"
          value={formData.cedulaPhotoUrl}
          onChange={(file) => handleFileUpload('cedulaPhotoUrl', file)}
          uploading={uploadingDoc === 'cedulaPhotoUrl'}
        />
        <FileUpload
          label="Foto de Licencia de Conducir"
          value={formData.licensePhotoUrl}
          onChange={(file) => handleFileUpload('licensePhotoUrl', file)}
          uploading={uploadingDoc === 'licensePhotoUrl'}
        />
        {formData.hasVehicle === 'si' && (
          <FileUpload
            label="Foto del Vehículo"
            value={formData.vehiclePhotoUrl}
            onChange={(file) => handleFileUpload('vehiclePhotoUrl', file)}
            uploading={uploadingDoc === 'vehiclePhotoUrl'}
          />
        )}
      </div>
    )
  },
  {
    title: 'Contacto de Emergencia',
    subtitle: '¿A quién llamamos?',
    icon: Phone,
    component: (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="emergencyName">Nombre del Contacto *</Label>
          <Input
            id="emergencyName"
            value={formData.emergencyName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('emergencyName', e.target.value)}
            placeholder="María Pérez"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>Parentesco *</Label>
          <div className="grid grid-cols-2 gap-2">
            {['Familiar', 'Amigo', 'Conocido', 'Otros'].map((rel) => (
              <Button
                key={rel}
                type="button"
                variant={formData.emergencyRelationship === rel ? 'default' : 'outline'}
                onClick={() => handleInputChange('emergencyRelationship', rel)}
              >
                {rel}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="emergencyPhone">Teléfono de Emergencia *</Label>
          <Input
            id="emergencyPhone"
            type="tel"
            value={formData.emergencyPhone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('emergencyPhone', e.target.value)}
            placeholder="0981234567"
            required
          />
        </div>
      </div>
    )
  },
  {
    title: 'Zona de Trabajo',
    subtitle: '¿Dónde preferís trabajar?',
    icon: MapPin,
    component: (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Selecciona tu zona preferida *</Label>
          <div className="grid grid-cols-2 gap-2">
            {['Carmelitas', 'Centro', 'Lambaré', 'Mariano', 'Luque', 'Fdo/San Lorenzo'].map((zone) => (
              <Button
                key={zone}
                type="button"
                variant={formData.workZone === zone ? 'default' : 'outline'}
                onClick={() => handleInputChange('workZone', zone)}
              >
                {zone}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>¿Cómo te enteraste de nosotros? *</Label>
          <div className="flex gap-4">
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
            <Label htmlFor="referredBy">¿Quién te recomendó? *</Label>
            <Input
              id="referredBy"
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
    title: '¡Última info!',
    subtitle: 'Solo falta esto',
    icon: Briefcase,
    component: (
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="experience">¿Tenés experiencia en delivery? *</Label>
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
          <Label>¿Cuándo podés trabajar? *</Label>
          <div className="grid grid-cols-3 gap-2">
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
          <Label htmlFor="whenCanStart">¿Cuándo podés empezar? *</Label>
          <Select value={formData.whenCanStart} onValueChange={(value) => handleInputChange('whenCanStart', value)}>
            <SelectTrigger>
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
      </div>
    )
  }
];