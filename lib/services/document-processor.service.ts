// lib/services/document-processor.service.ts

import { DocumentType, FormDocumentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface DocumentColumnMapping {
  columnPatterns: string[];
  documentType: DocumentType;
  category: 'identity' | 'vehicle' | 'legal' | 'other';
}

// Mapeo inteligente de columnas a tipos de documentos
const DOCUMENT_MAPPINGS: DocumentColumnMapping[] = [
  // Documentos de identidad
  {
    columnPatterns: ['cedula de identidad', 'cédula de identidad', 'ci frente', 'ci dorso', 'cedula frente', 'cedula dorso'],
    documentType: 'CEDULA',
    category: 'identity'
  },
  {
    columnPatterns: ['selfie con cedula', 'selfie con cédula', 'selfie'],
    documentType: 'SELFIE',
    category: 'identity'
  },
  
  // Documentos de conducir
  {
    columnPatterns: ['registro de conducir', 'licencia de conducir', 'licencia frente', 'licencia dorso'],
    documentType: 'LICENSE_FRONT',
    category: 'vehicle'
  },
  
  // Documentos legales
  {
    columnPatterns: ['antecedente policial', 'antecedentes', 'antecedente judicial'],
    documentType: 'CRIMINAL_RECORD',
    category: 'legal'
  },
  
  // Documentos vehiculares
  {
    columnPatterns: ['cedula verde', 'cédula verde', 'f22', 'registro del vehiculo'],
    documentType: 'VEHICLE_REGISTRATION',
    category: 'vehicle'
  },
  {
    columnPatterns: ['seguro', 'poliza', 'póliza'],
    documentType: 'VEHICLE_INSURANCE',
    category: 'vehicle'
  },
  {
    columnPatterns: ['habilitacion', 'habilitación', 'permiso municipal'],
    documentType: 'VEHICLE_REGISTRATION',
    category: 'vehicle'
  },
  
  // Fotos del vehículo
  {
    columnPatterns: ['foto vehiculo frente', 'foto vehículo frente', 'vehiculo frente'],
    documentType: 'VEHICLE_PHOTO_FRONT',
    category: 'vehicle'
  },
  {
    columnPatterns: ['foto vehiculo atras', 'foto vehículo atrás', 'vehiculo atras'],
    documentType: 'VEHICLE_PHOTO_BACK',
    category: 'vehicle'
  },
  {
    columnPatterns: ['foto vehiculo lateral', 'vehiculo lateral'],
    documentType: 'VEHICLE_PHOTO_SIDE',
    category: 'vehicle'
  }
];

export class DocumentProcessor {
  
  /**
   * Identifica el tipo de documento basado en el nombre de la columna
   * EXCLUYE comprobantes de pago y certificados tributarios (van a otras tablas)
   */
  private identifyDocumentType(columnName: string): DocumentType | null {
    const normalized = columnName.toLowerCase().trim();
    
    // CRÍTICO: Excluir comprobantes de pago - estos van a EquipmentPayment, NO a Documents
    if (normalized.includes('comprobante') && normalized.includes('pago')) {
      console.log(`  ⏭️  Saltando "${columnName}" - es comprobante de pago, no documento de identidad`);
      return null;
    }
    
    // Excluir también certificado de cumplimiento tributario - va a FinancialServices
    if ((normalized.includes('certificado') && normalized.includes('tributario')) ||
        (normalized.includes('cumplimiento') && normalized.includes('tributario'))) {
      console.log(`  ⏭️  Saltando "${columnName}" - es certificado tributario, no documento de identidad`);
      return null;
    }
    
    // Buscar en los mappings definidos
    for (const mapping of DOCUMENT_MAPPINGS) {
      for (const pattern of mapping.columnPatterns) {
        if (normalized.includes(pattern)) {
          return mapping.documentType;
        }
      }
    }
    
    // Si no matchea nada específico, retornar null para no crear documentos genéricos
    return null;
  }
  
  /**
   * Extrae múltiples IDs de Google Drive de un string
   * Maneja casos donde hay múltiples URLs separadas por comas, espacios o saltos de línea
   */
  private extractMultipleDriveIds(content: string | null): string[] {
    if (!content) return [];
    
    const driveIds: string[] = [];
    
    // Patrones para extraer IDs de Drive
    const patterns = [
      /drive\.google\.com\/.*?[\/=]([a-zA-Z0-9-_]{25,})/g,
      /id=([a-zA-Z0-9-_]{25,})/g,
      /^([a-zA-Z0-9-_]{25,})$/gm
    ];
    
    // Separar por comas, espacios o saltos de línea
    const parts = content.split(/[,\s\n]+/);
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      // Intentar extraer IDs con cada patrón
      for (const pattern of patterns) {
        const matches = trimmed.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && !driveIds.includes(match[1])) {
            driveIds.push(match[1]);
          }
        }
      }
      
      // Si no se encontró con patrones, ver si es un ID directo
      if (trimmed.length >= 25 && trimmed.length <= 100 && /^[a-zA-Z0-9-_]+$/.test(trimmed)) {
        if (!driveIds.includes(trimmed)) {
          driveIds.push(trimmed);
        }
      }
    }
    
    return driveIds;
  }
  
  /**
   * Procesa todos los documentos de una fila del formulario
   * EXCLUYE comprobantes de pago y certificados tributarios
   */
  async processDriverDocuments(
    driverId: string,
    formRow: any[],
    headers: string[]
  ): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;
    
    console.log(`📄 Procesando documentos para driver ${driverId}`);
    
    // Buscar columnas que puedan contener documentos
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = formRow[i];
      
      // Skip si no hay valor
      if (!value || value.toString().trim() === '') continue;
      
      // Verificar si esta columna podría contener documentos (URLs de Drive)
      const valueStr = value.toString();
      if (!valueStr.includes('drive.google.com') && !valueStr.includes('id=') && 
          !/^[a-zA-Z0-9-_]{25,}$/.test(valueStr)) {
        continue;
      }
      
      // Identificar tipo de documento por el nombre de la columna
      const documentType = this.identifyDocumentType(header);
      
      // Si retorna null, significa que debe ser excluido (comprobante de pago, certificado tributario, etc)
      if (documentType === null) {
        continue;
      }
      
      // Extraer todos los IDs de Drive
      const driveIds = this.extractMultipleDriveIds(valueStr);
      
      console.log(`  📎 Columna "${header}" - Tipo: ${documentType}, IDs encontrados: ${driveIds.length}`);
      
      // Crear un documento por cada ID encontrado
      for (let idx = 0; idx < driveIds.length; idx++) {
        const driveId = driveIds[idx];
        
        try {
          // Si hay múltiples documentos del mismo tipo, agregar sufijo
          const suffix = driveIds.length > 1 ? `_${idx + 1}` : '';
          const fileName = `${documentType.toLowerCase()}${suffix}.jpg`;
          
          // Crear documento directamente (no hay campo único para blobUrl)
          await prisma.formDocument.create({
            data: {
              formDriverId: driverId,
              documentType: documentType,
              blobUrl: `https://drive.google.com/file/d/${driveId}/view`,
              fileName,
              status: 'PENDING',
              metadata: {
                sourceColumn: header,
                columnIndex: i,
                multipleFiles: driveIds.length > 1,
                fileIndex: idx
              }
            }
          });
          
          processed++;
          console.log(`    ✅ Documento guardado: ${fileName}`);
          
        } catch (error) {
          console.error(`    ❌ Error guardando documento ${driveId}:`, error);
          errors++;
        }
      }
    }
    
    // Actualizar estado de documentación del driver
    if (processed > 0) {
      const documentCount = await prisma.formDocument.count({
        where: { formDriverId: driverId }
      });
      
      let documentStatus: 'INCOMPLETE' | 'PENDING' = 'INCOMPLETE';
      
      // Si tiene más de 3 documentos, probablemente está más completo
      if (documentCount >= 3) {
        documentStatus = 'PENDING';
      }
      
      await prisma.formDriver.update({
        where: { id: driverId },
        data: { 
          documentsStatus: documentStatus,
          updatedAt: new Date()
        }
      });
    }
    
    console.log(`📄 Resumen: ${processed} documentos procesados, ${errors} errores`);
    
    return { processed, errors };
  }
  
  /**
   * Procesa vehículo del driver
   */
  async processDriverVehicle(
    driverId: string,
    vehicleData: {
      brand?: string | null;
      model?: string | null;
      year?: number | null;
      plate?: string | null;
    }
  ): Promise<string | null> {
    if (!vehicleData.brand && !vehicleData.plate) {
      return null;
    }
    
    try {
      // Determinar tipo de vehículo por la marca/modelo
      let vehicleType: 'MOTORCYCLE' | 'CAR' | 'OTHER' = 'OTHER';
      
      const brandLower = vehicleData.brand?.toLowerCase() || '';
      const modelLower = vehicleData.model?.toLowerCase() || '';
      
      // Detectar motos
      const motoKeywords = ['kenton', 'leopard', 'yamaha', 'honda', 'suzuki', 'kawasaki', 
                           'bajaj', 'taiga', 'star', '125', '150', '250', 'cc'];
      if (motoKeywords.some(keyword => brandLower.includes(keyword) || modelLower.includes(keyword))) {
        vehicleType = 'MOTORCYCLE';
      }
      // Detectar autos
      else if (['toyota', 'nissan', 'ford', 'chevrolet', 'hyundai', 'kia'].some(
        keyword => brandLower.includes(keyword)
      )) {
        vehicleType = 'CAR';
      }
      
      // Actualizar el vehículo en el FormDriver en lugar de crear una tabla separada
      await prisma.formDriver.update({
        where: { id: driverId },
        data: {
          hasVehicle: true,
          vehicleBrand: vehicleData.brand,
          vehicleModel: vehicleData.model,
          vehicleYear: vehicleData.year,
          vehiclePlate: vehicleData.plate?.toUpperCase().replace(/\s+/g, ''),
          updatedAt: new Date()
        }
      });
      
      console.log(`🚗 Vehículo actualizado: ${vehicleData.brand} ${vehicleData.model} - ${vehicleData.plate}`);
      return driverId;
      
    } catch (error: any) {
      
      console.error(`❌ Error procesando vehículo:`, error);
      return null;
    }
  }
  
  /**
   * Procesa contacto de emergencia
   */
  async processEmergencyContact(
    driverId: string,
    contactData: {
      name?: string | null;
      relationship?: string | null;
      phone?: string | null;
    }
  ): Promise<string | null> {
    if (!contactData.name || !contactData.phone) {
      return null;
    }
    
    try {
      // Solo limpiar caracteres no deseados, no agregar código de país
      const cleanPhone = contactData.phone.replace(/[\s\-\(\)\.]/g, '');
      
      // Actualizar contacto de emergencia en FormDriver
      await prisma.formDriver.update({
        where: { id: driverId },
        data: {
          emergencyName: contactData.name,
          emergencyRelationship: contactData.relationship,
          emergencyPhone: cleanPhone,
          updatedAt: new Date()
        }
      });
      
      console.log(`👥 Contacto de emergencia actualizado: ${contactData.name} - ${contactData.relationship}`);
      return driverId;
      
    } catch (error) {
      console.error(`❌ Error procesando contacto de emergencia:`, error);
      return null;
    }
  }
  
  /**
   * Procesa servicios financieros del driver
   */
  async processFinancialServices(
    driverId: string,
    financialData: {
      hasInvoice?: string | null;
      interestedInConto?: string | null;
      hasUenoAccount?: string | null;
      uenoAccountNumber?: string | null;
      taxComplianceUrl?: string | null; // Certificado de cumplimiento tributario
    }
  ): Promise<string | null> {
    try {
      console.log(`  💳 Iniciando procesamiento financiero para driver ${driverId}`);
      
      // Función helper para convertir respuestas a booleanos
      const parseYesNo = (value: string | null | undefined): boolean => {
        if (!value) return false;
        const normalized = value.toLowerCase().trim();
        
        // Para Conto: "SI me interesa" vs "NO me interesa"
        if (normalized.includes('si me interesa') || normalized.includes('sí me interesa')) {
          return true;
        }
        if (normalized.includes('no me interesa')) {
          return false;
        }
        
        // Para respuestas simples: "Sí" o "No"
        if (normalized === 'sí' || normalized === 'si' || normalized === 'yes') {
          return true;
        }
        if (normalized === 'no') {
          return false;
        }
        
        // Default
        return false;
      };
      
      // Procesar cada campo
      const hasInvoice = parseYesNo(financialData.hasInvoice);
      const interestedInConto = parseYesNo(financialData.interestedInConto);
      const hasUenoAccount = parseYesNo(financialData.hasUenoAccount);
      
      // Log para debugging
      console.log(`     - Factura: "${financialData.hasInvoice}" → ${hasInvoice}`);
      console.log(`     - Conto: "${financialData.interestedInConto}" → ${interestedInConto}`);
      console.log(`     - Ueno: "${financialData.hasUenoAccount}" → ${hasUenoAccount}`);
      if (financialData.uenoAccountNumber) {
        console.log(`     - Ueno Account: "${financialData.uenoAccountNumber}"`);
      }
      
      // Extraer ID del certificado tributario si existe
      let taxComplianceId = null;
      let taxComplianceUrl = null;
      if (financialData.taxComplianceUrl) {
        const driveIds = this.extractMultipleDriveIds(financialData.taxComplianceUrl);
        if (driveIds.length > 0) {
          taxComplianceId = driveIds[0];
          taxComplianceUrl = `https://drive.google.com/file/d/${taxComplianceId}/view`;
          console.log(`     - Cert. Tributario: Encontrado`);
        }
      }
      
      // SIEMPRE crear el registro, aunque todo sea "No" o vacío
      console.log(`     ✓ Guardando servicio financiero (siempre se guarda para trazabilidad)`);
      
      const financialService = await prisma.financialService.upsert({
        where: { formDriverId: driverId },
        update: {
          hasInvoice,
          interestedInConto,
          contoStatus: interestedInConto ? 'INTERESTED' : null,
          taxComplianceUrl,
          updatedAt: new Date()
        },
        create: {
          formDriverId: driverId,
          hasInvoice,
          interestedInConto,
          contoStatus: interestedInConto ? 'INTERESTED' : null,
          taxComplianceUrl
        }
      });
      
      console.log(`  💳 Servicios financieros guardados con ID: ${financialService.id}`);
      return financialService.id;
      
    } catch (error) {
      console.error(`  ❌ Error procesando servicios financieros para driver ${driverId}:`, error);
      return null;
    }
  }
  
  /**
   * Procesa pago de equipamiento - SIEMPRE crea registro
   */
  async processEquipmentPayment(
    driverId: string,
    paymentData: {
      paymentProofUrl?: string | null;
      paymentMethod?: string | null;
      paymentNumber?: string | null;
      invoiceNumber?: string | null;
      amount?: string | null;
      paymentDate?: string | null; // Por ahora null, en futuro vendrá del comprobante
    }
  ): Promise<string | null> {
    try {
      console.log(`  💰 Iniciando procesamiento de pago para driver ${driverId}`);
      
      // Procesar comprobante si existe
      let paymentProofId = null;
      let paymentProofUrl = null;
      if (paymentData.paymentProofUrl) {
        const driveIds = this.extractMultipleDriveIds(paymentData.paymentProofUrl);
        if (driveIds.length > 0) {
          paymentProofId = driveIds[0];
          paymentProofUrl = `https://drive.google.com/file/d/${paymentProofId}/view`;
          console.log(`     - Comprobante de pago encontrado`);
        }
      }
      
      // Convertir monto a número si existe
      let amount: number | null = null;
      if (paymentData.amount) {
        const cleanAmount = paymentData.amount.replace(/[^\d.,]/g, '').replace(',', '.');
        amount = parseFloat(cleanAmount);
        if (isNaN(amount)) amount = null;
      }
      
      // Determinar estado basado en la información disponible
      let status: 'PENDING' | 'VERIFIED' = 'PENDING';
      if (paymentProofId && amount && paymentData.paymentNumber) {
        // Si tiene comprobante, monto y número, podríamos considerarlo verificado
        // Por ahora lo dejamos en PENDING para revisión manual
        status = 'PENDING';
      }
      
      // Log de lo que vamos a guardar
      console.log(`     - Método: "${paymentData.paymentMethod || 'No especificado'}"`);
      console.log(`     - Número: "${paymentData.paymentNumber || 'No especificado'}"`);
      console.log(`     - Factura: "${paymentData.invoiceNumber || 'No especificado'}"`);
      console.log(`     - Monto: ${amount || 'No especificado'}`);
      console.log(`     - Comprobante: ${paymentProofId ? 'Sí' : 'No'}`);
      
      // SIEMPRE crear el registro, aunque esté vacío
      console.log(`     ✓ Guardando pago de equipamiento (siempre se guarda para tracking)`);
      
      const payment = await prisma.equipmentPayment.create({
        data: {
          formDriverId: driverId,
          paymentMethod: paymentData.paymentMethod,
          paymentNumber: paymentData.paymentNumber,
          invoiceNumber: paymentData.invoiceNumber,
          amount,
          paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : null,
          paymentProofUrl,
          status,
          metadata: {
            importedAt: new Date().toISOString(),
            hasCompleteInfo: !!(paymentProofId && amount && paymentData.paymentNumber)
          }
        }
      });
      
      console.log(`  💰 Pago de equipamiento guardado con ID: ${payment.id} - Estado: ${status}`);
      return payment.id;
      
    } catch (error) {
      console.error(`  ❌ Error procesando pago de equipamiento para driver ${driverId}:`, error);
      return null;
    }
  }
}

export const documentProcessor = new DocumentProcessor();