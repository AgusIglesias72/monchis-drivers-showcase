const getStepName = (stepNumber: number): string => {
    const stepNames: Record<number, string> = {
      1: 'contact_info',
      2: 'location',
      3: 'vehicle',
      4: 'documents',
      5: 'emergency_contact',
      6: 'work_zone',
      7: 'additional_info'
    };
    return stepNames[stepNumber] || 'unknown';
  };import React, { useState, useEffect } from 'react';
import { Upload, User, MapPin, Car, FileText, Phone, Briefcase, Check, Share2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { trackFormStepCompleted, trackFormAbandoned, trackFormCompleted, trackDocumentUploaded, trackFormResumed } from '@/lib/analytics';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const MONCHIS_RED = '#e7243f';

// Generar UUID simple
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Logo SVG simplificado
const MonchisIcon = ({ className = "", spin = false }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={`${className} ${spin ? 'animate-spin' : ''}`}
    style={{ animationDuration: spin ? '2s' : undefined }}
  >
    <circle cx="50" cy="50" r="45" fill="none" stroke={MONCHIS_RED} strokeWidth="4"/>
    <path d="M35 25 L35 55 M45 25 L45 55 M55 25 L55 55 M40 55 L40 75 M45 60 Q50 58 55 60" 
          stroke={MONCHIS_RED} strokeWidth="4" strokeLinecap="round" fill="none"/>
  </svg>
);

const FormularioMonchis = () => {
  const [sessionId, setSessionId] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Datos de contacto
    firstName: '',
    lastName: '',
    cedula: '',
    phoneNumber: '',
    email: '',
    
    // Step 2: Ubicación
    department: '',
    city: '',
    neighborhood: '',
    address: '',
    
    // Step 3: Vehículo
    hasVehicle: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    
    // Step 4: Documentos
    cedulaPhotoUrl: '',
    licensePhotoUrl: '',
    vehiclePhotoUrl: '',
    
    // Step 5: Contacto de emergencia
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    
    // Step 6: Zona de trabajo
    workZone: '',
    howHeardAboutUs: '',
    referredBy: '',
    
    // Step 7: Info adicional
    experience: '',
    availability: [] as string[],
    whenCanStart: '',
  });

  // Inicializar sessionId y cargar datos guardados
  useEffect(() => {
    const initSession = async () => {
      let sid = localStorage.getItem('monchis_session_id');
      
      if (!sid) {
        sid = generateUUID();
        localStorage.setItem('monchis_session_id', sid);
      }
      
      setSessionId(sid);
      
      // Intentar recuperar sesión de la DB
      try {
        const response = await fetch(`/api/form/resume-session?sessionId=${sid}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.submission) {
            setFormData(data.submission.formData);
            setStep(data.submission.currentStep - 1);
            
            // Analytics: Sesión recuperada
            trackFormResumed(data.submission.currentStep);
            
            toast.success('¡Bienvenido de vuelta!', {
              description: 'Continuamos donde lo dejaste'
            });
          }
        }
      } catch (error) {
        // Si falla, intentar cargar de localStorage
        const saved = localStorage.getItem('monchis_form_data');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setFormData(parsed.formData);
            setStep(parsed.step || 0);
          } catch (e) {
            console.error('Error al cargar datos guardados');
          }
        }
      }
    };
    
    initSession();
  }, []);

  // Guardar en localStorage en cada cambio
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('monchis_form_data', JSON.stringify({
        formData,
        step,
        sessionId
      }));
    }
  }, [formData, step, sessionId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (field: string, file: File) => {
    if (!file) return;
    
    setUploadingDoc(field);
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('sessionId', sessionId);
      uploadFormData.append('documentType', field.replace('PhotoUrl', ''));
      
      const response = await fetch('/api/form/upload-document', {
        method: 'POST',
        body: uploadFormData
      });
      
      const data = await response.json();
      
      if (data.success) {
        handleInputChange(field, data.url);
        
        // Analytics: Documento subido
        trackDocumentUploaded(field.replace('PhotoUrl', ''));
        
        toast.success('Documento subido correctamente');
      } else {
        toast.error('Error al subir el archivo: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al subir el archivo');
    } finally {
      setUploadingDoc(null);
    }
  };

  const saveStep = async (stepNumber: number) => {
    try {
      const stepData = getStepData(stepNumber);
      
      const response = await fetch('/api/form/submit-step', {
        method: step === 0 ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          step: stepNumber,
          stepData
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Analytics: Step completado
        trackFormStepCompleted(stepNumber, getStepName(stepNumber));
      }
      
      return data.success;
    } catch (error) {
      console.error('Error guardando step:', error);
      toast.error('Error al guardar. Intenta nuevamente.');
      return false;
    }
  };

  const getStepData = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return {
          firstName: formData.firstName,
          lastName: formData.lastName,
          cedula: formData.cedula,
          phoneNumber: formData.phoneNumber,
          email: formData.email
        };
      case 2:
        return {
          department: formData.department,
          city: formData.city,
          neighborhood: formData.neighborhood,
          address: formData.address
        };
      case 3:
        return {
          hasVehicle: formData.hasVehicle,
          vehicleBrand: formData.vehicleBrand,
          vehicleModel: formData.vehicleModel,
          vehicleYear: formData.vehicleYear,
          vehiclePlate: formData.vehiclePlate
        };
      case 4:
        return {
          cedulaPhotoUrl: formData.cedulaPhotoUrl,
          licensePhotoUrl: formData.licensePhotoUrl,
          vehiclePhotoUrl: formData.vehiclePhotoUrl
        };
      case 5:
        return {
          emergencyName: formData.emergencyName,
          emergencyRelationship: formData.emergencyRelationship,
          emergencyPhone: formData.emergencyPhone
        };
      case 6:
        return {
          workZone: formData.workZone,
          howHeardAboutUs: formData.howHeardAboutUs,
          referredBy: formData.referredBy
        };
      case 7:
        return {
          experience: formData.experience,
          availability: formData.availability,
          whenCanStart: formData.whenCanStart
        };
      default:
        return {};
    }
  };

  const nextStep = async () => {
    const saved = await saveStep(step + 1);
    if (saved && step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      await saveStep(7);
      
      const response = await fetch('/api/form/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCompleted(true);
        localStorage.removeItem('monchis_session_id');
        localStorage.removeItem('monchis_form_data');
        
        // Analytics: Formulario completado
        trackFormCompleted(data.submissionId);
        
        toast.success('¡Postulación enviada con éxito!');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar el formulario. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent(
      `¡Hola! Acabo de completar mi postulación para ser driver de Monchis 🛵\n\n` +
      `Nombre: ${formData.firstName} ${formData.lastName}\n` +
      `Ciudad: ${formData.city}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const steps = [
    {
      title: '¡Empecemos!',
      subtitle: 'Solo necesitamos tu contacto',
      icon: User,
      component: (
        <div className="space-y-4">
          <Input
            label="Nombres"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Juan"
            required
          />
          <Input
            label="Apellidos"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Pérez"
            required
          />
          <Input
            label="Cédula de Identidad"
            value={formData.cedula}
            onChange={(e) => handleInputChange('cedula', e.target.value)}
            placeholder="1234567"
            required
          />
          <Input
            label="Teléfono"
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="0981234567"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="tu@email.com"
          />
        </div>
      )
    },
    {
      title: '¿Dónde estás?',
      subtitle: 'Necesitamos tu ubicación',
      icon: MapPin,
      component: (
        <div className="space-y-4">
          <Select
            label="Departamento"
            value={formData.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            options={[
              'Central',
              'Asunción',
              'Alto Paraná',
              'Itapúa',
              'Caaguazú',
              'Otro'
            ]}
            required
          />
          <Input
            label="Ciudad"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="Asunción"
            required
          />
          <Input
            label="Barrio"
            value={formData.neighborhood}
            onChange={(e) => handleInputChange('neighborhood', e.target.value)}
            placeholder="Las Mercedes"
            required
          />
          <TextArea
            label="Dirección Domicilio"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Calle principal, número de casa e intersección"
            required
          />
        </div>
      )
    },
    {
      title: 'Tu Vehículo',
      subtitle: '¿Con qué vas a trabajar?',
      icon: Car,
      component: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Tenés vehículo propio?
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleInputChange('hasVehicle', 'si')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  formData.hasVehicle === 'si'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('hasVehicle', 'no')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  formData.hasVehicle === 'no'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {formData.hasVehicle === 'si' && (
            <>
              <Input
                label="Marca"
                value={formData.vehicleBrand}
                onChange={(e) => handleInputChange('vehicleBrand', e.target.value)}
                placeholder="Honda, Yamaha, etc."
              />
              <Input
                label="Modelo"
                value={formData.vehicleModel}
                onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                placeholder="Wave, Biz, etc."
              />
              <Input
                label="Año"
                type="number"
                value={formData.vehicleYear}
                onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
                placeholder="2020"
              />
              <Input
                label="Placa"
                value={formData.vehiclePlate}
                onChange={(e) => handleInputChange('vehiclePlate', e.target.value)}
                placeholder="ABC123"
              />
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
        <div className="space-y-4">
          <Input
            label="Nombre del Contacto"
            value={formData.emergencyName}
            onChange={(e) => handleInputChange('emergencyName', e.target.value)}
            placeholder="María Pérez"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parentesco
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Familiar', 'Amigo', 'Conocido', 'Otros'].map((rel) => (
                <button
                  key={rel}
                  type="button"
                  onClick={() => handleInputChange('emergencyRelationship', rel)}
                  className={`py-2 px-4 rounded-lg border-2 transition-all ${
                    formData.emergencyRelationship === rel
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {rel}
                </button>
              ))}
            </div>
          </div>
          
          <Input
            label="Teléfono de Emergencia"
            type="tel"
            value={formData.emergencyPhone}
            onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
            placeholder="0981234567"
            required
          />
        </div>
      )
    },
    {
      title: 'Zona de Trabajo',
      subtitle: '¿Dónde preferís trabajar?',
      icon: MapPin,
      component: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecciona tu zona preferida
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Carmelitas', 'Centro', 'Lambaré', 'Mariano', 'Luque', 'Fdo/San Lorenzo'].map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => handleInputChange('workZone', zone)}
                  className={`py-2 px-4 rounded-lg border-2 transition-all ${
                    formData.workZone === zone
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cómo te enteraste de nosotros?
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleInputChange('howHeardAboutUs', 'Redes Sociales')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  formData.howHeardAboutUs === 'Redes Sociales'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Redes Sociales
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('howHeardAboutUs', 'Recomendación')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                  formData.howHeardAboutUs === 'Recomendación'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Recomendación
              </button>
            </div>
          </div>
          
          {formData.howHeardAboutUs === 'Recomendación' && (
            <Input
              label="¿Quién te recomendó?"
              value={formData.referredBy}
              onChange={(e) => handleInputChange('referredBy', e.target.value)}
              placeholder="Nombre y apellido del driver"
            />
          )}
        </div>
      )
    },
    {
      title: '¡Última info!',
      subtitle: 'Solo falta esto',
      icon: Briefcase,
      component: (
        <div className="space-y-4">
          <Select
            label="¿Tenés experiencia en delivery?"
            value={formData.experience}
            onChange={(e) => handleInputChange('experience', e.target.value)}
            options={[
              'Sin experiencia',
              'Menos de 1 año',
              '1-3 años',
              'Más de 3 años'
            ]}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cuándo podés trabajar?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Mañana', 'Tarde', 'Noche'].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => {
                    const current = formData.availability;
                    const updated = current.includes(time)
                      ? current.filter(t => t !== time)
                      : [...current, time];
                    handleInputChange('availability', updated);
                  }}
                  className={`py-2 px-4 rounded-lg border-2 transition-all ${
                    formData.availability.includes(time)
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          
          <Select
            label="¿Cuándo podés empezar?"
            value={formData.whenCanStart}
            onChange={(e) => handleInputChange('whenCanStart', e.target.value)}
            options={[
              'Inmediatamente',
              'Esta semana',
              'Este mes',
              'A evaluar'
            ]}
            required
          />
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <MonchisIcon className="w-24 h-24 mx-auto mb-4" spin />
          <p className="text-xl font-semibold text-gray-700">Enviando tu postulación...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Postulación Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Gracias por tu interés en unirte al equipo de Monchis. Te contactaremos pronto.
          </p>
          <button
            onClick={shareWhatsApp}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Compartir en WhatsApp
          </button>
        </div>
      </div>
    );
  }

  const CurrentStepIcon = steps[step].icon;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <MonchisIcon className="w-12 h-12" />
            <div className="text-right">
              <p className="text-sm text-gray-600">Paso {step + 1} de {steps.length}</p>
              <p className="text-xs text-gray-500">{steps[step].title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-2xl mx-auto px-4 mt-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: MONCHIS_RED }}
          />
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Step Icon & Title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <CurrentStepIcon className="w-6 h-6" style={{ color: MONCHIS_RED }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{steps[step].title}</h2>
              <p className="text-sm text-gray-500">{steps[step].subtitle}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="mb-8">
            {steps[step].component}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {step > 0 && (
              <button
                onClick={prevStep}
                className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Anterior
              </button>
            )}
            
            {step < steps.length - 1 ? (
              <button
                onClick={nextStep}
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: MONCHIS_RED }}
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 px-4 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
                style={{ backgroundColor: MONCHIS_RED }}
              >
                <Check className="w-5 h-5" />
                Enviar Postulación
              </button>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Tu progreso se guarda automáticamente</p>
          <p className="mt-1">Podés volver cuando quieras para continuar</p>
        </div>
      </div>
    </div>
  );
};

// Componentes auxiliares
interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}

const Input = ({ label, type = 'text', value, onChange, placeholder, required }: InputProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all"
      style={{ '--tw-ring-color': MONCHIS_RED } as any}
    />
  </div>
);

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
}

const TextArea = ({ label, value, onChange, placeholder, required }: TextAreaProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      rows={3}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all"
      style={{ '--tw-ring-color': MONCHIS_RED } as any}
    />
  </div>
);

interface SelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  required?: boolean;
}

const Select = ({ label, value, onChange, options, required }: SelectProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all"
      style={{ '--tw-ring-color': MONCHIS_RED } as any}
    >
      <option value="">Selecciona una opción</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

interface FileUploadProps {
  label: string;
  value: string;
  onChange: (file: File) => void;
  uploading?: boolean;
}

const FileUpload = ({ label, value, onChange, uploading }: FileUploadProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <div className="relative">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
        className="hidden"
        id={label}
        disabled={uploading}
      />
      <label
        htmlFor={label}
        className={`flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
          uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-500 hover:bg-red-50'
        }`}
        style={{ borderColor: value ? MONCHIS_RED : undefined }}
      >
        {uploading ? (
          <div className="text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-gray-600">Subiendo...</p>
          </div>
        ) : value ? (
          <div className="text-center">
            <img src={value} alt="Preview" className="max-h-32 mx-auto mb-2 rounded" />
            <p className="text-sm text-green-600 font-medium">✓ Archivo cargado</p>
            <p className="text-xs text-gray-500 mt-1">Click para cambiar</p>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Click para subir imagen</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG hasta 5MB</p>
          </div>
        )}
      </label>
    </div>
  </div>
);

export default FormularioMonchis;