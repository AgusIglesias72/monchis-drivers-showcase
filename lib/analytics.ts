// lib/analytics.ts - Helper para eventos de Google Analytics
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, eventParams);
    }
  };
  
  // Eventos específicos del formulario
  export const trackFormStepCompleted = (step: number, stepName: string) => {
    trackEvent('form_step_completed', {
      step_number: step,
      step_name: stepName,
      timestamp: new Date().toISOString(),
    });
  };
  
  export const trackFormAbandoned = (step: number, stepName: string) => {
    trackEvent('form_abandoned', {
      step_number: step,
      step_name: stepName,
      timestamp: new Date().toISOString(),
    });
  };
  
  export const trackFormCompleted = (submissionId: string) => {
    trackEvent('form_completed', {
      submission_id: submissionId,
      timestamp: new Date().toISOString(),
    });
  };
  
  export const trackDocumentUploaded = (documentType: string) => {
    trackEvent('document_uploaded', {
      document_type: documentType,
      timestamp: new Date().toISOString(),
    });
  };
  
  export const trackFormResumed = (currentStep: number) => {
    trackEvent('form_resumed', {
      current_step: currentStep,
      timestamp: new Date().toISOString(),
    });
  };