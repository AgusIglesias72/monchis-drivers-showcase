"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Check, Share2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { trackFormStepCompleted, trackFormCompleted, trackDocumentUploaded, trackFormResumed } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from './LoadingScreen';
import { Header } from './Header';
import { InformationSection } from './InformationSection';
import { TopNavigation } from './TopNavigation';
import { getFormSteps } from './formSteps';

// ============================================
// CONFIGURACIÓN - Cambia esto para testing
// ============================================
const SKIP_VALIDATION = false; // Cambia a false para activar validaciones

const MONCHIS_RED = '#e7243f';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const getStepName = (stepNumber: number): string => {
  const stepNames: Record<number, string> = {
    1: 'contact_info',
    2: 'work_zone',
    3: 'location',
    4: 'vehicle',
    5: 'documents',
    6: 'emergency_contact',
    7: 'additional_info'
  };
  return stepNames[stepNumber] || 'unknown';
};

const FormularioMonchis: React.FC = () => {
  const [sessionId, setSessionId] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'form' | 'info'>('form');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    cedula: '',
    phoneNumber: '',
    email: '',
    department: '',
    city: '',
    neighborhood: '',
    address: '',
    hasVehicle: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    cedulaPhotoUrl: '',
    licensePhotoUrl: '',
    vehiclePhotoUrl: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    workZone: '',
    howHeardAboutUs: '',
    referredBy: '',
    experience: '',
    availability: [] as string[],
    whenCanStart: '',
    hasUenoAccount: '',
    uenoAccountNumber: '',
    canInvoice: '',
  });

  useEffect(() => {
    const initSession = async () => {
      let sid = localStorage.getItem('monchis_session_id');
      
      if (!sid) {
        sid = generateUUID();
        localStorage.setItem('monchis_session_id', sid);
      }
      
      setSessionId(sid);
      
      try {
        const response = await fetch(`/api/form/resume-session?sessionId=${sid}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.submission) {
            setFormData(data.submission.formData);
            setStep(data.submission.currentStep - 1);
            
            trackFormResumed(data.submission.currentStep);
            
            toast.success('¡Bienvenido de vuelta!', {
              description: 'Continuamos donde lo dejaste'
            });
          }
        }
      } catch (error) {
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

      setTimeout(() => setShowLoading(false), 1500);
    };
    
    initSession();
  }, []);

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

  const handleFileUpload = async (field: string, files: FileList) => {
    if (!files || files.length === 0) return;
    
    setUploadingDoc(field);
    
    try {
      const uploadedUrls: string[] = [];
      
      // Subir cada archivo
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
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
          uploadedUrls.push(data.url);
        } else {
          toast.error(`Error al subir ${file.name}: ${data.error}`);
        }
      }
      
      if (uploadedUrls.length > 0) {
        // Agregar las nuevas URLs a las existentes
        const currentUrls = (formData as Record<string, any>)[field]
          ? (formData as Record<string, any>)[field].split(',').filter((u: string) => u)
          : [];
        const allUrls = [...currentUrls, ...uploadedUrls];
        handleInputChange(field, allUrls.join(','));

        trackDocumentUploaded(field.replace('PhotoUrl', ''));
        toast.success(`${uploadedUrls.length} archivo(s) subido(s) correctamente`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al subir los archivos');
    } finally {
      setUploadingDoc(null);
    }
  };

  const getStepData = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return {
          firstName: formData.firstName,
          lastName: formData.lastName,
          birthDate: formData.birthDate,
          cedula: formData.cedula,
          phoneNumber: formData.phoneNumber,
          email: formData.email
        };
      case 2:
        return {
          workZone: formData.workZone,
          howHeardAboutUs: formData.howHeardAboutUs,
          referredBy: formData.referredBy
        };
      case 3:
        return {
          department: formData.department,
          city: formData.city,
          neighborhood: formData.neighborhood,
          address: formData.address
        };
      case 4:
        return {
          hasVehicle: formData.hasVehicle,
          vehicleBrand: formData.vehicleBrand,
          vehicleModel: formData.vehicleModel,
          vehicleYear: formData.vehicleYear,
          vehiclePlate: formData.vehiclePlate
        };
      case 5:
        return {
          cedulaPhotoUrl: formData.cedulaPhotoUrl,
          licensePhotoUrl: formData.licensePhotoUrl,
          vehiclePhotoUrl: formData.vehiclePhotoUrl
        };
      case 6:
        return {
          emergencyName: formData.emergencyName,
          emergencyRelationship: formData.emergencyRelationship,
          emergencyPhone: formData.emergencyPhone
        };
      case 7:
        return {
          experience: formData.experience,
          availability: formData.availability,
          whenCanStart: formData.whenCanStart,
          hasUenoAccount: formData.hasUenoAccount,
          uenoAccountNumber: formData.uenoAccountNumber,
          canInvoice: formData.canInvoice
        };
      default:
        return {};
    }
  };

  const validateCurrentStep = (): boolean => {
    if (SKIP_VALIDATION) {
      return true;
    }
  
    const currentStep = step + 1;
    
    switch (currentStep) {
      case 1: // Datos de contacto
        if (!formData.firstName.trim()) {
          toast.error('Por favor completa tu nombre');
          return false;
        }
        if (!formData.lastName.trim()) {
          toast.error('Por favor completa tu apellido');
          return false;
        }
        if (!formData.cedula.trim()) {
          toast.error('Por favor completa tu cédula');
          return false;
        }
        if (!formData.phoneNumber.trim()) {
          toast.error('Por favor completa tu teléfono');
          return false;
        }
        break;
        
      case 2: // Zona de Trabajo
        if (!formData.workZone || formData.workZone.trim() === '') {
          toast.error('Por favor selecciona al menos una zona de trabajo');
          return false;
        }
        const zones = formData.workZone.split(',').filter((z: string) => z.trim());
        if (zones.length === 0) {
          toast.error('Por favor selecciona al menos una zona de trabajo');
          return false;
        }
        if (!formData.howHeardAboutUs) {
          toast.error('Por favor indica cómo te enteraste de nosotros');
          return false;
        }
        break;
        
      case 3: // Ubicación/Domicilio
        if (!formData.department) {
          toast.error('Por favor selecciona tu departamento');
          return false;
        }
        if (!formData.city.trim()) {
          toast.error('Por favor completa tu ciudad');
          return false;
        }
        if (!formData.neighborhood.trim()) {
          toast.error('Por favor completa tu barrio');
          return false;
        }
        if (!formData.address.trim()) {
          toast.error('Por favor completa tu dirección');
          return false;
        }
        break;
        
      case 4: // Vehículo
        if (!formData.hasVehicle) {
          toast.error('Por favor indica si tenés vehículo');
          return false;
        }
        break;        
      case 5: // Documentos
        if (!formData.cedulaPhotoUrl || formData.cedulaPhotoUrl.trim() === '') {
          toast.error('Por favor sube la foto de tu cédula');
          return false;
        }
        if (!formData.licensePhotoUrl || formData.licensePhotoUrl.trim() === '') {
          toast.error('Por favor sube el certificado de antecedentes penales');
          return false;
        }
        break;
        
      case 6: // Contacto de Emergencia - OPCIONAL
        // No se valida nada, es completamente opcional
        break;
        
      case 7: // Información Adicional
        if (!formData.experience) {
          toast.error('Por favor indica tu experiencia');
          return false;
        }
        if (!formData.availability || formData.availability.length === 0) {
          toast.error('Por favor selecciona al menos un horario disponible');
          return false;
        }
        if (!formData.whenCanStart) {
          toast.error('Por favor indica cuándo podés empezar');
          return false;
        }
        if (!formData.hasUenoAccount) {
          toast.error('Por favor indica si tenés cuenta en ueno');
          return false;
        }
        if (!formData.canInvoice) {
          toast.error('Por favor indica si podés emitir facturas');
          return false;
        }
        break;
    }
    
    return true;
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
        trackFormStepCompleted(stepNumber, getStepName(stepNumber));
      }
      
      return data.success;
    } catch (error) {
      console.error('Error guardando step:', error);
      toast.error('Error al guardar. Intenta nuevamente.');
      return false;
    }
  };

  const nextStep = async () => {
    if (!validateCurrentStep()) {
      return;
    }
    
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
      `¡Hola! 👋\n\n` +
      `¿Te gustaría trabajar como driver de Monchis? 🛵\n\n` +
      `Es súper fácil postularte, solo tenés que completar este formulario:\n` +
      `${window.location.origin}\n\n` +
      `¡Te están esperando! 🚀`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const steps = getFormSteps(formData, handleInputChange, handleFileUpload, uploadingDoc);

  if (showLoading) {
    return <LoadingScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: MONCHIS_RED }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/15 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <Image 
              src="/monchis-short-white.png" 
              alt="Monchis" 
              width={96} 
              height={96}
              className="animate-spin"
              style={{ animationDuration: '1.5s' }}
            />
          </div>
          <p className="text-xl font-semibold text-white">Enviando tu postulación...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{ backgroundColor: MONCHIS_RED }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-white/15 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center relative z-10 animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Postulación Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Gracias por tu interés en unirte al equipo de Monchis. Te contactaremos pronto.
          </p>

          {/* Botón para ver postulación */}
          <Button
            onClick={() => {
              // Aquí puedes implementar la lógica para mostrar la postulación
              // Por ahora, abre WhatsApp para consultas
              const message = encodeURIComponent(
                `Hola! Acabo de completar mi postulación para ser driver de Monchis.\n\n` +
                `Quisiera consultar sobre mi postulación.\n\n` +
                `Nombre: ${formData.firstName} ${formData.lastName}`
              );
              window.open(`https://wa.me/595974236666?text=${message}`, '_blank');
            }}
            variant="outline"
            className="w-full cursor-pointer"
          >
            <svg className="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
  <path fill="currentColor" fill-rule="evenodd" d="M12 4a8 8 0 0 0-6.895 12.06l.569.718-.697 2.359 2.32-.648.379.243A8 8 0 1 0 12 4ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10a9.96 9.96 0 0 1-5.016-1.347l-4.948 1.382 1.426-4.829-.006-.007-.033-.055A9.958 9.958 0 0 1 2 12Z" clip-rule="evenodd"/>
  <path fill="currentColor" d="M16.735 13.492c-.038-.018-1.497-.736-1.756-.83a1.008 1.008 0 0 0-.34-.075c-.196 0-.362.098-.49.291-.146.217-.587.732-.723.886-.018.02-.042.045-.057.045-.013 0-.239-.093-.307-.123-1.564-.68-2.751-2.313-2.914-2.589-.023-.04-.024-.057-.024-.057.005-.021.058-.074.085-.101.08-.079.166-.182.249-.283l.117-.14c.121-.14.175-.25.237-.375l.033-.066a.68.68 0 0 0-.02-.64c-.034-.069-.65-1.555-.715-1.711-.158-.377-.366-.552-.655-.552-.027 0 0 0-.112.005-.137.005-.883.104-1.213.311-.35.22-.94.924-.94 2.16 0 1.112.705 2.162 1.008 2.561l.041.06c1.161 1.695 2.608 2.951 4.074 3.537 1.412.564 2.081.63 2.461.63.16 0 .288-.013.4-.024l.072-.007c.488-.043 1.56-.599 1.804-1.276.192-.534.243-1.117.115-1.329-.088-.144-.239-.216-.43-.308Z"/>
</svg>

            Consultar sobre mi postulación
          </Button>

          {/* Sección de referidos */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-700 font-medium mb-3">
              ¿Conocés a otra persona a la que le pueda interesar?
            </p>
            <p className="text-xs text-gray-500 mb-4">Compartir por:</p>
            <Button
              onClick={shareWhatsApp}
              className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
            >
            <svg className="w-6 h-6 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
  <path fill="currentColor" fill-rule="evenodd" d="M12 4a8 8 0 0 0-6.895 12.06l.569.718-.697 2.359 2.32-.648.379.243A8 8 0 1 0 12 4ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10a9.96 9.96 0 0 1-5.016-1.347l-4.948 1.382 1.426-4.829-.006-.007-.033-.055A9.958 9.958 0 0 1 2 12Z" clip-rule="evenodd"/>
  <path fill="currentColor" d="M16.735 13.492c-.038-.018-1.497-.736-1.756-.83a1.008 1.008 0 0 0-.34-.075c-.196 0-.362.098-.49.291-.146.217-.587.732-.723.886-.018.02-.042.045-.057.045-.013 0-.239-.093-.307-.123-1.564-.68-2.751-2.313-2.914-2.589-.023-.04-.024-.057-.024-.057.005-.021.058-.074.085-.101.08-.079.166-.182.249-.283l.117-.14c.121-.14.175-.25.237-.375l.033-.066a.68.68 0 0 0-.02-.64c-.034-.069-.65-1.555-.715-1.711-.158-.377-.366-.552-.655-.552-.027 0 0 0-.112.005-.137.005-.883.104-1.213.311-.35.22-.94.924-.94 2.16 0 1.112.705 2.162 1.008 2.561l.041.06c1.161 1.695 2.608 2.951 4.074 3.537 1.412.564 2.081.63 2.461.63.16 0 .288-.013.4-.024l.072-.007c.488-.043 1.56-.599 1.804-1.276.192-.534.243-1.117.115-1.329-.088-.144-.239-.216-.43-.308Z"/>
</svg>
              WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const CurrentStepIcon = steps[step].icon;

  return (
    <div className="min-h-screen relative overflow-hidden pb-20" style={{ backgroundColor: MONCHIS_RED }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -right-40 w-[500px] h-[500px] bg-white/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Indicador de modo testing - aparece solo si SKIP_VALIDATION es true */}
      {SKIP_VALIDATION && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full shadow-lg flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-semibold">Modo Testing - Validaciones OFF</span>
          </div>
        </div>
      )}

      {/* Header fijo arriba - SIEMPRE muestra el progreso */}
      <Header 
        currentStep={step + 1} 
        totalSteps={steps.length} 
        stepTitle={steps[step].title}
        showProgress={true}
      />

      {/* Switch de navegación debajo del Header */}
      <TopNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contenido - cambia directamente sin slide */}
      {activeTab === 'form' ? (
        <div className="relative max-w-2xl mx-auto px-4 pb-6 animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${MONCHIS_RED}20` }}>
                <CurrentStepIcon className="w-7 h-7" style={{ color: MONCHIS_RED }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{steps[step].title}</h2>
                <p className="text-sm text-gray-500">{steps[step].subtitle}</p>
              </div>
            </div>

            <div className="mb-8">
              {steps[step].component}
            </div>

            <div className="flex gap-4">
              {step > 0 && (
                <Button
                  onClick={prevStep}
                  variant="outline"
                  className="flex-1"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Anterior
                </Button>
              )}
              
              {step < steps.length - 1 ? (
                <Button
                  onClick={nextStep}
                  className="flex-1 text-white"
                  style={{ backgroundColor: MONCHIS_RED }}
                >
                  Siguiente
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="flex-1 text-white"
                  style={{ backgroundColor: MONCHIS_RED }}
                >
                  <Check className="w-5 h-5 mr-2" />
                  Enviar
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <InformationSection />
      )}
    </div>
  );
};

export default FormularioMonchis;