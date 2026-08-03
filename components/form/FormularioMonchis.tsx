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
import { PostSubmitDecision, DECISION_SESSION_KEY } from './PostSubmitDecision';
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
  // Recovery post-submit: si el postulante recarga mientras corre la revisión IA,
  // rehidratamos la pantalla de decisión desde localStorage (TTL 1h).
  const [decisionSession, setDecisionSession] = useState<{
    sessionId: string;
    firstName: string;
    lastName: string;
  } | null>(null);
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
    addressLat: null as number | null,
    addressLng: null as number | null,
    hasVehicle: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    cedulaPhotoUrl: '',
    licensePhotoUrl: '',
    vehiclePhotoUrl: '',
    vehicleDocsConfirmed: false,
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
      // Recovery de la pantalla de decisión: el submit exitoso limpia
      // monchis_session_id, así que sin esto un reload volvería al paso 1.
      try {
        const raw = localStorage.getItem(DECISION_SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.sessionId && Date.now() - (saved.ts ?? 0) < 60 * 60 * 1000) {
            setDecisionSession({
              sessionId: saved.sessionId,
              firstName: saved.firstName ?? '',
              lastName: saved.lastName ?? '',
            });
            setShowLoading(false);
            return;
          }
          localStorage.removeItem(DECISION_SESSION_KEY);
        }
      } catch {}

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
          addressLat: formData.addressLat,
          addressLng: formData.addressLng,
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
          vehiclePhotoUrl: formData.vehiclePhotoUrl,
          vehicleDocsConfirmed: formData.vehicleDocsConfirmed
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
      if (!formData.vehicleDocsConfirmed) {
        toast.error('Confirmá que contás con la documentación del vehículo al día para continuar');
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
      } else {
        toast.error(data.error || 'No se pudo guardar el paso. Intentá nuevamente.');
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
        try {
          localStorage.setItem(
            DECISION_SESSION_KEY,
            JSON.stringify({
              sessionId,
              firstName: formData.firstName,
              lastName: formData.lastName,
              ts: Date.now(),
            })
          );
        } catch {}

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

  if (completed || decisionSession) {
    return (
      <PostSubmitDecision
        sessionId={decisionSession?.sessionId ?? sessionId}
        firstName={decisionSession?.firstName ?? formData.firstName}
        lastName={decisionSession?.lastName ?? formData.lastName}
        onShareWhatsApp={shareWhatsApp}
      />
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