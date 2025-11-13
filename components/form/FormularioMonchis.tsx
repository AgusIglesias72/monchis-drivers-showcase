"use client"

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Check, ChevronRight, ChevronLeft, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { 
  trackFormStepCompleted, 
  trackFormCompleted, 
  trackDocumentUploaded, 
  trackFormResumed,
  trackFormStarted,
  trackFormStepView
} from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from './LoadingScreen';
import { Header } from './Header';
import { InformationSection } from './InformationSection';
import { TopNavigation } from './TopNavigation';
import { getFormSteps } from './formSteps';

const SKIP_VALIDATION = false;
const MONCHIS_RED = '#e7243f';

interface FileItem {
  url: string;
  name: string;
  uploading?: boolean;
  tempId?: string;
}

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
    2: 'personal_data',
    3: 'work_vehicle',
    4: 'documents',
    5: 'additional_info',
    6: 'equipment_payment'
  };
  return stepNames[stepNumber] || 'unknown';
};

const FormularioMonchis: React.FC = () => {
  const [sessionId, setSessionId] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'form' | 'info'>('form');
  
  // Estado para archivos que se están subiendo (preview optimista)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, FileItem[]>>({});
  
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
    taxCompliancePhotoUrl: '',
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
    interestedInConto: '',
    paymentMethod: '',
    paymentProofUrl: '',
  });

  // Inicializar sesión y trackear inicio de formulario
  useEffect(() => {
    const initSession = async () => {
      let sid = localStorage.getItem('monchis_session_id');
      
      if (!sid) {
        sid = generateUUID();
        localStorage.setItem('monchis_session_id', sid);
        // ✅ Usuario nuevo - trackear inicio de formulario
        trackFormStarted();
      }
      
      setSessionId(sid);
      
      try {
        const response = await fetch(`/api/form/resume-session?sessionId=${sid}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.submission) {
            setFormData(data.submission.formData);
            setStep(data.submission.currentStep - 1);
            
            // ✅ Trackear que el usuario retomó el formulario
            trackFormResumed(data.submission.currentStep);
            
            toast.success('¡Bienvenido de vuelta! Continuá desde donde lo dejaste.');
          }
        }
      } catch (error) {
        console.error('Error al recuperar sesión:', error);
      }
      
      setTimeout(() => {
        setShowLoading(false);
      }, 1500);
    };

    initSession();
  }, []);

  // ✅ Trackear vista de cada step cuando cambia
  useEffect(() => {
    if (!showLoading && sessionId) {
      const currentStepNumber = step + 1;
      const stepName = getStepName(currentStepNumber);
      trackFormStepView(currentStepNumber, stepName);
    }
  }, [step, showLoading, sessionId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (files: FileList, field: string) => {
    if (!files || files.length === 0) return;
    
    setUploadingDoc(field);
    
    // Crear archivos temporales para preview optimista
    const tempFiles: FileItem[] = Array.from(files).map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      uploading: true,
      tempId: generateUUID()
    }));
    
    // Agregar archivos temporales al estado
    setUploadingFiles(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), ...tempFiles]
    }));
    
    try {
      const uploadedUrls: string[] = [];
      const uploadedNames: string[] = [];
      
      // Subir archivos uno por uno
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('sessionId', sessionId);
        uploadFormData.append('documentType', field.replace('PhotoUrl', ''));
        uploadFormData.append('originalFileName', file.name); // Enviar nombre original
        
        const response = await fetch('/api/form/upload-document', {
          method: 'POST',
          body: uploadFormData
        });
        
        const data = await response.json();
        
        if (data.success && data.url) {
          uploadedUrls.push(data.url);
          uploadedNames.push(file.name);
          
          // Remover el archivo temporal correspondiente
          setUploadingFiles(prev => ({
            ...prev,
            [field]: (prev[field] || []).filter(f => f.tempId !== tempFiles[i].tempId)
          }));
        } else {
          console.error(`Error al subir ${file.name}:`, data.error);
          toast.error(`Error al subir ${file.name}`);
          
          // Remover archivo temporal si falla
          setUploadingFiles(prev => ({
            ...prev,
            [field]: (prev[field] || []).filter(f => f.tempId !== tempFiles[i].tempId)
          }));
        }
      }
      
      if (uploadedUrls.length > 0) {
        const currentUrls = (formData as Record<string, any>)[field]
          ? (formData as Record<string, any>)[field].split(',').filter((u: string) => u)
          : [];
        const allUrls = [...currentUrls, ...uploadedUrls];
        handleInputChange(field, allUrls.join(','));

        // ✅ Trackear documento subido
        trackDocumentUploaded(field.replace('PhotoUrl', ''));
        toast.success(`${uploadedUrls.length} archivo(s) subido(s) correctamente`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al subir los archivos');
      
      // Limpiar todos los archivos temporales en caso de error
      setUploadingFiles(prev => ({
        ...prev,
        [field]: []
      }));
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
          department: formData.department,
          city: formData.city,
          neighborhood: formData.neighborhood,
          address: formData.address,
          emergencyName: formData.emergencyName,
          emergencyRelationship: formData.emergencyRelationship,
          emergencyPhone: formData.emergencyPhone
        };
      case 3:
        return {
          workZone: formData.workZone,
          howHeardAboutUs: formData.howHeardAboutUs,
          referredBy: formData.referredBy,
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
          experience: formData.experience,
          availability: formData.availability,
          whenCanStart: formData.whenCanStart,
          hasUenoAccount: formData.hasUenoAccount,
          uenoAccountNumber: formData.uenoAccountNumber,
          canInvoice: formData.canInvoice,
          taxCompliancePhotoUrl: formData.taxCompliancePhotoUrl,
          interestedInConto: formData.interestedInConto
        };
      case 6:
        return {
          paymentMethod: formData.paymentMethod,
          paymentProofUrl: formData.paymentProofUrl
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
    case 1:
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
      if (!formData.birthDate) {
        toast.error('Por favor ingresa tu fecha de nacimiento');
        return false;
      }
      if (!formData.phoneNumber.trim()) {
        toast.error('Por favor ingresa tu número de teléfono');
        return false;
      }
      if (!formData.email.trim()) {
        toast.error('Por favor ingresa tu email');
        return false;
      }
      break;

    case 2:
      if (!formData.address.trim()) {
        toast.error('Por favor completa tu dirección');
        return false;
      }
      if (!formData.city.trim()) {
        toast.error('Por favor completa tu ciudad');
        return false;
      }
      if (!formData.department) {
        toast.error('Por favor selecciona tu departamento');
        return false;
      }
      break;

    case 3:
      if (!formData.workZone || formData.workZone.split(',').filter(z => z).length === 0) {
        toast.error('Por favor selecciona al menos una zona de trabajo');
        return false;
      }
      if (!formData.howHeardAboutUs) {
        toast.error('Por favor indica cómo te enteraste de nosotros');
        return false;
      }
      if (!formData.hasVehicle) {
        toast.error('Por favor indica si tenés vehículo');
        return false;
      }
      if (formData.hasVehicle === 'si') {
        if (!formData.vehicleBrand.trim()) {
          toast.error('Por favor ingresa la marca del vehículo');
          return false;
        }
        if (!formData.vehicleModel.trim()) {
          toast.error('Por favor ingresa el modelo del vehículo');
          return false;
        }
        if (!formData.vehicleYear) {
          toast.error('Por favor selecciona el año del vehículo');
          return false;
        }
        if (!formData.vehiclePlate.trim()) {
          toast.error('Por favor ingresa la chapa del vehículo');
          return false;
        }
      }
      break;

    case 4:
      // Validación de documentos obligatorios
      if (!formData.cedulaPhotoUrl || formData.cedulaPhotoUrl.trim() === '') {
        toast.error('Por favor sube tu Cédula de Identidad para continuar');
        return false;
      }
      if (!formData.licensePhotoUrl || formData.licensePhotoUrl.trim() === '') {
        toast.error('Por favor sube tu Certificado de Antecedentes Policiales para continuar');
        return false;
      }
      break;

    case 5:
      // ========== VALIDACIONES COMENTADAS - NO BORRAR ==========
      /*
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
      */
      // ========== FIN VALIDACIONES COMENTADAS ==========
      
      if (!formData.hasUenoAccount) {
        toast.error('Por favor indica si tenés cuenta en ueno bank');
        return false;
      }
      // Validar número de cuenta si tiene cuenta ueno
      if (formData.hasUenoAccount === 'si' && (!formData.uenoAccountNumber || formData.uenoAccountNumber.trim() === '')) {
        toast.error('Por favor ingresa tu número de cuenta ueno bank');
        return false;
      }
      if (!formData.canInvoice) {
        toast.error('Por favor indica si podés emitir facturas');
        return false;
      }
      if (!formData.interestedInConto) {
        toast.error('Por favor indica si te interesa el servicio de Conto');
        return false;
      }
      break;
      
    case 6:
      if (!formData.paymentMethod) {
        toast.error('Por favor selecciona un método de pago');
        return false;
      }
      // Validación obligatoria de comprobante si es transferencia
      if (formData.paymentMethod === 'TRANSFERENCIA' && (!formData.paymentProofUrl || formData.paymentProofUrl.trim() === '')) {
        toast.error('Por favor sube el comprobante de transferencia para continuar');
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
        // ✅ Trackear completación del step
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
    
    setSavingStep(true);
    const saved = await saveStep(step + 1);
    setSavingStep(false);
    
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

    if (!validateCurrentStep()) {
      return;
    }
    
    setLoading(true);
    
    try {
      await saveStep(6);
      
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
        
        // ✅ Trackear formulario completado
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

  const steps = getFormSteps(formData, handleInputChange, handleFileUpload, uploadingDoc, uploadingFiles);

  if (showLoading) {
    return <LoadingScreen />;
  }

  if (!steps || steps.length === 0) {
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
        
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center relative z-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Postulación Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Gracias por tu interés en unirte al equipo de Monchis. Te contactaremos pronto.
          </p>

          <Button
            onClick={() => {
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
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Consultar sobre mi postulación
          </Button>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-700 font-medium mb-3">
              ¿Conocés a otra persona a la que le pueda interesar?
            </p>
            <p className="text-xs text-gray-500 mb-4">Compartir por:</p>
            <Button
              onClick={shareWhatsApp}
              className="w-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
            >
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const CurrentStepIcon = steps && steps[step] ? steps[step].icon : User;

  return (
    <>
      <div className="min-h-screen relative overflow-hidden pb-20" style={{ backgroundColor: MONCHIS_RED }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 -right-40 w-[500px] h-[500px] bg-white/15 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {SKIP_VALIDATION && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="font-semibold">Modo Testing - Validaciones OFF</span>
            </div>
          </div>
        )}

        <Header 
          currentStep={step + 1} 
          totalSteps={steps.length} 
          stepTitle={steps[step].title}
          showProgress={true}
        />

        <TopNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'form' ? (
          <div className="relative max-w-2xl mx-auto px-4 pb-6">
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
                    className="flex-1 cursor-pointer"
                    disabled={savingStep}
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Anterior
                  </Button>
                )}
                
                {step < steps.length - 1 ? (
                  <Button
                    onClick={nextStep}
                    className="flex-1 text-white cursor-pointer"
                    style={{ backgroundColor: MONCHIS_RED }}
                    disabled={savingStep}
                  >
                    {savingStep ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        Siguiente
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 text-white cursor-pointer"
                    style={{ backgroundColor: MONCHIS_RED }}
                    disabled={savingStep}
                  >
                    {savingStep ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <InformationSection />
        )}
      </div>
    </>
  );
};

export default FormularioMonchis;