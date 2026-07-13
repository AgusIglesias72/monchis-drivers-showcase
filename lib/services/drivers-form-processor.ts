// lib/services/driver-form-processor.ts

import { google } from 'googleapis';
import { FormDriverStatus, OnboardingStatus } from '@prisma/client';
import { differenceInDays, parse, isValid } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { assignDriverSlug } from '@/lib/services/postulacion.service';

// Mapeo de nombres de columnas - basado en los headers reales del sheet
const COLUMN_MAPPINGS = {
  // Información personal
  timestamp: ['marca temporal'],
  email: ['dirección de correo electrónico'],
  fullName: ['nombres y apellidos'],
  cedula: ['numero de ci/pasaporte', 'número de ci/pasaporte', 'NUMERO DE CI: (Paraguay)'],
  phone: ['telefono / celular', 'teléfono / celular'],
  birthDate: ['fecha de nacimiento'],
  
  // Información adicional
  nationality: ['nacionalidad'],
  sex: ['sexo'],
  maritalStatus: ['estado civil'],
  hasChildren: ['hijos'],
  childrenCount: ['cantidad de hijos'],
  department: ['departamento'],
  city: ['ciudad'],
  neighborhood: ['barrio'],
  address: ['dirección domicilio', 'direccion domicilio'],
  
  // Información del vehículo
  vehicleBrand: ['marca del rodado'],
  vehicleModel: ['modelo del rodado'],
  vehicleYear: ['año del rodado', 'ano del rodado'],
  vehiclePlate: ['chapa del rodado'],
  
  // Documentos (URLs de Google Drive)
  paymentProof: ['adjunte comprobante de pago'],
  taxCompliance: ['en caso de contar con factura cargar certificado de cumplimiento tributario'],
  cedulaUrl: ['cedula de identidad o pasaporte', 'cédula de identidad o pasaporte'],
  criminalRecordUrl: ['antecedente policial, judicial o interpol', 'antecedente policial'],
  vehicleDocUrl: ['cedula verde o f22', 'cédula verde'],
  habilitacionUrl: ['habilitacion', 'habilitación'],
  licenseUrl: ['registro de conducir'],
  selfieUrl: ['selfie con cedula en mano', 'selfie con cédula en mano'],
  
  // Información de pago
  paymentMethod: ['forma de pago'],
  paymentNumber: ['nro comp. de pago', 'número comp. de pago'],
  invoiceNumber: ['nro de factura', 'número de factura'],
  paymentAmount: ['monto entrega'],
  
  // Información laboral
  workZone: ['seleccione zona en la que te gustaría trabajar', 'zona de trabajo'],
  howHeardAboutUs: ['¿cómo te enteraste de nosotros?', '¿como se entero de nosotros?'],
  referredBy: ['en caso de ser recomendación favor indicar nombre y apellido del driver quien te recomendó'],
  hasWorkedBefore: ['¿ya trabajo con nosotros?', 'ya trabajo con nosotros'],
  
  // Información de agendamiento
  schedulingPreference: ['¿cuando le gustaría venir a capacitarse y retirar equipos?'],
  scheduledDate: ['fecha agendamiento'],
  confirmed: ['agendamiento confirmado'],
  trained: ['capacitado'],
  
  // Información financiera
  hasInvoice: ['¿contas con factura a tu nombre?', 'contas con factura'],
  interestedInAccounting: ['¿le interesaría nuestro servicio de contabilidad con conto?'],
  hasUenoBank: ['¿tenes una cuenta bancaria con ueno bank?'],
  uenoBankAccount: ['en caso de tener cuenta con ueno bank digitar el número de cuenta'],
  
  // Contacto de emergencia
  emergencyContactName: ['nombre de contacto de emergencia'],
  emergencyContactRelation: ['parentesco con contacto de emergencia'],
  emergencyContactPhone: ['número de contacto de emergencia'],
  
  // Planes de trabajo
  workPlan: ['¿como planea trabajar con nosotros?'],
  workDays: ['¿que días le gustaría trabajar?'],
  
  // Estados y verificación
  documentStatus: ['estado documentacion', 'estado documentación'],
  verifiedData: ['datos verficados', 'datos verificados'],
  verifiedBy: ['verificado por operador'],
  assignedAdvisor: ['asesor designado']
};

export interface ProcessedFormData {
  // Datos básicos
  timestamp: Date | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  cedula: string | null;
  phone: string | null;
  birthDate: Date | null;
  
  // Vehículo
  hasVehicle: boolean;
  vehicleInfo: {
    brand: string | null;
    model: string | null;
    year: number | null;
    plate: string | null;
  } | null;
  
  // Documentos
  documents: {
    cedulaFront: string | null;
    cedulaBack: string | null;
    licenseFront: string | null;
    licenseBack: string | null;
    criminalRecord: string | null;
  };
  
  // Adicional
  city: string | null;
  hasSmartphone: boolean;
  internetAccess: boolean;
  availability: string | null;
  experience: string | null;
  whyDriver: string | null;
  referral: string | null;
  comments: string | null;
  
  // Metadata
  rawData: Record<string, any>;
}

export class DriverFormProcessor {
  private auth: any;
  private sheets: any;
  private initialized: boolean = false;

  constructor() {
    // No inicializar en el constructor para evitar errores en build time
  }

  /**
   * Inicializa la conexión con Google Sheets (lazy initialization)
   */
  private ensureInitialized() {
    if (this.initialized) return;

    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      throw new Error('Missing Google Sheets credentials');
    }

    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.initialized = true;
  }
  
  /**
   * Obtiene los headers dinámicamente de la primera fila
   */
  private async getHeaders(spreadsheetId: string, sheetName: string): Promise<string[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });
    
    return response.data.values?.[0] || [];
  }
  
  /**
   * Mapea los headers a índices para facilitar el acceso
   */
  private createHeaderMap(headers: string[]): Map<string, number> {
    const headerMap = new Map<string, number>();
    
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      headerMap.set(normalizedHeader, index);
    });
    
    return headerMap;
  }
  
  /**
   * Busca el valor de una columna por sus posibles nombres
   */
  private findColumnValue(
    row: any[],
    headerMap: Map<string, number>,
    possibleNames: string[]
  ): string | null {
    for (const name of possibleNames) {
      const normalizedSearchName = name.toLowerCase().trim();
      
      // Buscar coincidencia exacta primero
      for (const [header, index] of headerMap.entries()) {
        // Normalizar el header para comparación
        const normalizedHeader = header.toLowerCase().trim();
        
        // Coincidencia exacta
        if (normalizedHeader === normalizedSearchName) {
          if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
            return String(row[index]).trim();
          }
        }
      }
      
      // Si no hay coincidencia exacta, buscar quitando caracteres especiales
      const cleanSearchName = normalizedSearchName.replace(/[¿?¡!:]/g, '').trim();
      
      for (const [header, index] of headerMap.entries()) {
        const cleanHeader = header.toLowerCase().replace(/[¿?¡!:]/g, '').trim();
        
        if (cleanHeader === cleanSearchName) {
          if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
            return String(row[index]).trim();
          }
        }
      }
      
      // Finalmente, buscar coincidencia parcial
      for (const [header, index] of headerMap.entries()) {
        const normalizedHeader = header.toLowerCase().trim();
        if (normalizedHeader.includes(normalizedSearchName) || normalizedSearchName.includes(normalizedHeader)) {
          if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
            return String(row[index]).trim();
          }
        }
      }
    }
    return null;
  }
  
  /**
   * Extrae el ID de Google Drive de una URL
   */
  private extractDriveId(url: string | null): string | null {
    if (!url) return null;
    
    const patterns = [
      /\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /^([a-zA-Z0-9-_]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return url;
  }
  
  /**
   * Limpia y formatea el número de teléfono (sin agregar código de país)
   */
  private cleanPhoneNumber(phone: string | null): string | null {
    if (!phone) return null;
    
    // Solo limpiar espacios, guiones, paréntesis y puntos
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    
    return cleaned;
  }
  
  /**
   * Parsea una fecha en varios formatos posibles
   */
  private parseDate(dateStr: string | null): Date | null {
    if (!dateStr) return null;
    
    const formats = [
      'dd/MM/yyyy HH:mm:ss',
      'dd/MM/yyyy',
      'd/M/yyyy',
      'MM/dd/yyyy',
      'yyyy-MM-dd'
    ];
    
    for (const format of formats) {
      try {
        const parsed = parse(dateStr, format, new Date());
        if (isValid(parsed)) return parsed;
      } catch {}
    }
    
    const directParse = new Date(dateStr);
    if (isValid(directParse)) return directParse;
    
    return null;
  }
  
  /**
   * Procesa una fila del formulario a datos estructurados
   */
  private processFormRow(row: any[], headerMap: Map<string, number>): ProcessedFormData {
    // Helper para buscar valores
    const findValue = (possibleNames: string[]) => 
      this.findColumnValue(row, headerMap, possibleNames);
    
    // Extraer nombre completo y separarlo
    const fullName = findValue(COLUMN_MAPPINGS.fullName);
    let firstName = null;
    let lastName = null;
    
    if (fullName) {
      const nameParts = fullName.trim().split(' ');
      if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else {
        firstName = fullName;
      }
    }
    
    // Determinar si tiene vehículo
    const vehicleBrand = findValue(COLUMN_MAPPINGS.vehicleBrand);
    const hasVehicle = !!vehicleBrand;
    
    const vehicleYear = findValue(COLUMN_MAPPINGS.vehicleYear);
    
    // Procesar estado de capacitación
    const trainedStr = findValue(COLUMN_MAPPINGS.trained);
    const confirmedStr = findValue(COLUMN_MAPPINGS.confirmed);
    
    // Crear objeto raw data con todos los valores encontrados
    const rawData: Record<string, any> = {};
    for (const [key, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
      rawData[key] = findValue(possibleNames);
    }
    
    // Agregar campos adicionales al rawData
    rawData.nationality = findValue(COLUMN_MAPPINGS.nationality);
    rawData.sex = findValue(COLUMN_MAPPINGS.sex);
    rawData.maritalStatus = findValue(COLUMN_MAPPINGS.maritalStatus);
    rawData.department = findValue(COLUMN_MAPPINGS.department);
    rawData.neighborhood = findValue(COLUMN_MAPPINGS.neighborhood);
    rawData.address = findValue(COLUMN_MAPPINGS.address);
    rawData.workZone = findValue(COLUMN_MAPPINGS.workZone);
    rawData.howHeardAboutUs = findValue(COLUMN_MAPPINGS.howHeardAboutUs);
    rawData.hasWorkedBefore = findValue(COLUMN_MAPPINGS.hasWorkedBefore);
    rawData.schedulingPreference = findValue(COLUMN_MAPPINGS.schedulingPreference);
    rawData.scheduledDate = findValue(COLUMN_MAPPINGS.scheduledDate);
    rawData.confirmed = confirmedStr;
    rawData.trained = trainedStr;
    rawData.hasInvoice = findValue(COLUMN_MAPPINGS.hasInvoice);
    rawData.workDays = findValue(COLUMN_MAPPINGS.workDays);
    rawData.workPlan = findValue(COLUMN_MAPPINGS.workPlan);
    rawData.emergencyContactName = findValue(COLUMN_MAPPINGS.emergencyContactName);
    rawData.emergencyContactRelation = findValue(COLUMN_MAPPINGS.emergencyContactRelation);
    rawData.emergencyContactPhone = findValue(COLUMN_MAPPINGS.emergencyContactPhone);
    
    return {
      // Datos básicos
      timestamp: this.parseDate(findValue(COLUMN_MAPPINGS.timestamp)),
      email: findValue(COLUMN_MAPPINGS.email) ?? null,
      firstName,
      lastName,
      cedula: findValue(COLUMN_MAPPINGS.cedula)?.replace(/\./g, '') ?? null,
      phone: this.cleanPhoneNumber(findValue(COLUMN_MAPPINGS.phone)),
      birthDate: this.parseDate(findValue(COLUMN_MAPPINGS.birthDate)),
      
      // Vehículo
      hasVehicle,
      vehicleInfo: hasVehicle ? {
        brand: vehicleBrand,
        model: findValue(COLUMN_MAPPINGS.vehicleModel),
        year: vehicleYear ? parseInt(vehicleYear) : null,
        plate: findValue(COLUMN_MAPPINGS.vehiclePlate)
      } : null,
      
      // Documentos
      documents: {
        cedulaFront: this.extractDriveId(findValue(COLUMN_MAPPINGS.cedulaUrl)),
        cedulaBack: null,
        licenseFront: this.extractDriveId(findValue(COLUMN_MAPPINGS.licenseUrl)),
        licenseBack: null,
        criminalRecord: this.extractDriveId(findValue(COLUMN_MAPPINGS.criminalRecordUrl))
      },
      
      // Adicional
      city: findValue(COLUMN_MAPPINGS.city),
      hasSmartphone: true,
      internetAccess: true,
      availability: findValue(COLUMN_MAPPINGS.workDays),
      experience: findValue(COLUMN_MAPPINGS.hasWorkedBefore),
      whyDriver: null,
      referral: findValue(COLUMN_MAPPINGS.referredBy),
      comments: null,
      
      // Metadata
      rawData
    };
  }
  
  /**
   * Obtiene los datos raw sin procesar para debugging
   */
  async getRawData(
    spreadsheetId: string,
    sheetName: string = 'Respuestas de formulario 1',
    limit: number = 10
  ): Promise<{ rawRows: any[][], headers: string[] }> {
    this.ensureInitialized();
    try {
      const headers = await this.getHeaders(spreadsheetId, sheetName);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A2:ZZ`,
      });
      
      const allRows = response.data.values || [];
      
      // Filtrar filas que tengan Marca Temporal (columna B, índice 1)
      const nonEmptyRows = allRows.filter((row: any[]) => {
        if (!row || row.length < 2) return false;
        const timestamp = row[1];
        return timestamp && timestamp.toString().trim() !== '';
      });
      
      const latestRows = nonEmptyRows.slice(-limit);
      
      return {
        rawRows: latestRows,
        headers
      };
    } catch (error) {
      console.error('Error getting raw data:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene y procesa los últimos N registros del formulario
   */
  async getLatestFormResponses(
    spreadsheetId: string,
    sheetName: string = 'Respuestas de formulario 1',
    limit: number = 10
  ): Promise<ProcessedFormData[]> {
    this.ensureInitialized();
    try {
      console.log(`📊 Obteniendo últimas ${limit} respuestas del formulario...`);
      
      const headers = await this.getHeaders(spreadsheetId, sheetName);
      const headerMap = this.createHeaderMap(headers);
      
      console.log(`📋 Headers encontrados: ${headers.length} columnas`);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A2:ZZ`,
      });
      
      const allRows = response.data.values || [];
      
      // Filtrar filas que tengan Marca Temporal (columna B, índice 1)
      const nonEmptyRows = allRows.filter((row: any[]) => {
        if (!row || row.length < 2) return false;
        const timestamp = row[1];
        return timestamp && timestamp.toString().trim() !== '';
      });
      
      console.log(`📝 Total de filas en el sheet: ${allRows.length}`);
      console.log(`📝 Filas con marca temporal: ${nonEmptyRows.length}`);
      
      if (nonEmptyRows.length === 0) {
        console.warn('⚠️ No se encontraron filas con marca temporal');
        return [];
      }
      
      const latestRows = nonEmptyRows.slice(-limit);
      
      console.log(`📋 Procesando últimas ${latestRows.length} respuestas`);
      console.log('Primera fila a procesar:', {
        timestamp: latestRows[0]?.[1],
        name: latestRows[0]?.[2],
        cedula: latestRows[0]?.[5],
        phone: latestRows[0]?.[7]
      });
      
      const processedData = latestRows.map((row: any[]) => 
        this.processFormRow(row, headerMap)
      );
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Error obteniendo respuestas del formulario:', error);
      throw error;
    }
  }
  
  /**
   * Guarda o actualiza un driver en la base de datos con todos sus datos relacionados
   */
  async saveDriverToDatabase(
    formData: ProcessedFormData,
    formRow: any[],
    headers: string[]
  ): Promise<string> {
    try {
      if (!formData.cedula || !formData.phone) {
        throw new Error('Cédula y teléfono son requeridos');
      }
      
      // Buscar driver existente por cédula
      const existingDriver = await prisma.formDriver.findFirst({
        where: { cedula: formData.cedula }
      });
      
      let driver;
      if (existingDriver) {
        // Actualizar driver existente
        driver = await prisma.formDriver.update({
          where: { id: existingDriver.id },
          data: {
            email: formData.email ?? undefined,
            firstName: formData.firstName ?? undefined,
            lastName: formData.lastName ?? undefined,
            fullName: formData.firstName && formData.lastName 
              ? `${formData.firstName} ${formData.lastName}`
              : undefined,
            phoneNumber: formData.phone!,
            birthDate: formData.birthDate ?? undefined,
            // Campos de dirección
            department: formData.rawData.department ?? undefined,
            city: formData.city ?? undefined,
            neighborhood: formData.rawData.neighborhood ?? undefined,
            address: formData.rawData.address ?? undefined,
            metadata: {
              ...(existingDriver.metadata as any || {}),
              lastFormSubmission: formData.timestamp?.toISOString(),
              referral: formData.referral,
              formData: formData.rawData
            },
            updatedAt: new Date()
          }
        });
      } else {
        // Crear nuevo driver
        driver = await prisma.formDriver.create({
          data: {
            cedula: formData.cedula,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            fullName: formData.firstName && formData.lastName 
              ? `${formData.firstName} ${formData.lastName}`
              : null,
            phoneNumber: formData.phone!,
            birthDate: formData.birthDate,
            // Campos de dirección
            department: formData.rawData.department,
            city: formData.city,
            neighborhood: formData.rawData.neighborhood,
            address: formData.rawData.address,
            status: 'IN_PROGRESS',
            documentsStatus: 'INCOMPLETE',
            onboardingStatus: null,
            source: 'GOOGLE_FORM',
            metadata: {
              registrationTimestamp: formData.timestamp?.toISOString(),
              hasSmartphone: formData.hasSmartphone,
              internetAccess: formData.internetAccess,
              availability: formData.availability,
              experience: formData.experience,
              whyDriver: formData.whyDriver,
              referral: formData.referral,
              comments: formData.comments,
              formData: formData.rawData
            },
            startedAt: formData.timestamp || new Date()
          }
        });
        await assignDriverSlug(driver.id, driver.fullName).catch(() => {});
      }

      console.log(`✅ Driver ${driver.id} guardado/actualizado`);
      
      // Procesar todos los documentos usando el DocumentProcessor
      const { documentProcessor } = await import('./document-processor.service');
      const docResult = await documentProcessor.processDriverDocuments(
        driver.id,
        formRow,
        headers
      );
      
      console.log(`📄 Documentos: ${docResult.processed} procesados`);
      
      // Procesar vehículo si existe
      if (formData.vehicleInfo) {
        const vehicleId = await documentProcessor.processDriverVehicle(
          driver.id,
          formData.vehicleInfo
        );
        if (vehicleId) {
          console.log(`🚗 Vehículo guardado`);
        }
      }
      
      // Procesar contacto de emergencia
      const emergencyName = formData.rawData.emergencyContactName;
      const emergencyPhone = formData.rawData.emergencyContactPhone;
      const emergencyRelation = formData.rawData.emergencyContactRelation;
      
      if (emergencyName && emergencyPhone) {
        const contactId = await documentProcessor.processEmergencyContact(
          driver.id,
          {
            name: emergencyName,
            relationship: emergencyRelation,
            phone: emergencyPhone
          }
        );
        if (contactId) {
          console.log(`👥 Contacto de emergencia guardado`);
        }
      }
      
      // Procesar servicios financieros (incluyendo certificado tributario)
      const taxComplianceUrl = formData.rawData.taxCompliance;
      const financialData = {
        hasInvoice: formData.rawData.hasInvoice,
        interestedInConto: formData.rawData.interestedInAccounting,
        hasUenoAccount: formData.rawData.hasUenoBank,
        uenoAccountNumber: formData.rawData.uenoBankAccount,
        taxComplianceUrl // Certificado de cumplimiento tributario
      };
      
      const financialId = await documentProcessor.processFinancialServices(
        driver.id,
        financialData
      );
      if (financialId) {
        console.log(`💳 Servicios financieros guardados`);
      }
      
      // Procesar pago de equipamiento
      const paymentData = {
        paymentProofUrl: formData.rawData.paymentProof,
        paymentMethod: formData.rawData.paymentMethod,
        paymentNumber: formData.rawData.paymentNumber,
        invoiceNumber: formData.rawData.invoiceNumber,
        amount: formData.rawData.paymentAmount
      };
      
      const paymentId = await documentProcessor.processEquipmentPayment(
        driver.id,
        paymentData
      );
      if (paymentId) {
        console.log(`💰 Pago de equipamiento guardado`);
      }
      
      // Crear nota en lugar de actividad
      await prisma.formNote.create({
        data: {
          content: `Driver procesado desde Google Forms. Documentos: ${docResult.processed}, Vehículo: ${!!formData.vehicleInfo}, Contacto emergencia: ${!!(emergencyName && emergencyPhone)}, Servicios financieros: ${!!financialId}, Pago equipamiento: ${!!paymentId}`,
          formDriverId: driver.id,
          createdBy: 'SYSTEM'
        }
      });
      
      return driver.id;
      
    } catch (error) {
      console.error('❌ Error guardando driver:', error);
      throw error;
    }
  }
  
  /**
   * Procesa múltiples respuestas del formulario
   */
  async processFormResponses(
    spreadsheetId: string,
    sheetName: string = 'Respuestas de formulario 1',
    limit: number = 10
  ): Promise<{
    processed: number;
    errors: number;
    results: Array<{ cedula: string; status: 'success' | 'error'; message?: string }>
  }> {
    this.ensureInitialized();
    // Obtener headers primero
    const headers = await this.getHeaders(spreadsheetId, sheetName);
    
    // Obtener las filas raw
    const { rawRows } = await this.getRawData(spreadsheetId, sheetName, limit);
    
    // Procesar las filas a formato estructurado
    const headerMap = this.createHeaderMap(headers);
    const responses = rawRows.map((row: any[]) => 
      this.processFormRow(row, headerMap)
    );
    
    const results = [];
    let processed = 0;
    let errors = 0;
    
    // Procesar cada respuesta con su fila raw correspondiente
    for (let i = 0; i < responses.length; i++) {
      const formData = responses[i];
      const rawRow = rawRows[i];
      
      try {
        await this.saveDriverToDatabase(formData, rawRow, headers);
        processed++;
        results.push({
          cedula: formData.cedula || 'SIN_CEDULA',
          status: 'success' as const
        });
      } catch (error: any) {
        errors++;
        results.push({
          cedula: formData.cedula || 'SIN_CEDULA',
          status: 'error' as const,
          message: error.message
        });
      }
    }
    
    return { processed, errors, results };
  }
}

export const driverFormProcessor = new DriverFormProcessor();