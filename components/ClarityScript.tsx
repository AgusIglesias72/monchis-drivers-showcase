'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

export default function ClarityScript() {
  useEffect(() => {
    const projectId = "tmsd8d7a4e";
    
    // Only initialize if we have a project ID
    if (!projectId) {
      console.warn('Clarity Project ID not found in environment variables');
      return;
    }

    // Inicializar Clarity solo una vez
    if (typeof window !== 'undefined' && !(window as any).clarity) {
      Clarity.init(projectId);

      // Opcional: Registrar la inicialización en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('Microsoft Clarity initialized with project ID:', projectId);
      }
    }
  }, []);

  return null;
}