// migrate-drivers-from-xlsx.ts
// Script para migrar drivers desde XLSX a la base de datos
// Descarga imágenes de Google Drive y las sube a Vercel Blob

import { PrismaClient, FormDriverStatus } from '@prisma/client';
import { google } from 'googleapis';
import { put } from '@vercel/blob';
import * as XLSX from 'xlsx';
import { promises as fs } from 'fs';

const prisma = new PrismaClient();

// Configurar Google Drive API
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

const drive = google.drive({ version: 'v3', auth });

// Interfaz para los datos del formulario
interface DriverRow {
  // Step 1
  fullName: string;
  cedula: string;
  birthDate: Date | null;
  phoneNumber: string;
  email: string;
  
  // Step 2
  department: string;
  city: string;
  neighborhood: string;
  address: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  
  // Step 3
  workZone: string;
  howHeardAboutUs: string;
  referredBy: string | null;
  hasVehicle: boolean;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehiclePlate: string | null;
  
  // Step 4 - URLs de Google Drive
  cedulaPhotoUrls: string[];
  licensePhotoUrls: string[];
  
  // Step 5
  hasUenoAccount: boolean;
  uenoAccountNumber: string | null;
  canInvoice: boolean;
  interestedInConto: boolean;
  taxComplianceUrls: string[];
  
  // Step 6
  paymentMethod: string | null;
  paymentNumber: string | null;
  invoiceNumber: string | null;
  paymentAmount: number | null;
  paymentProofUrls: string[];
  
  // Onboarding
  onboardingDate: Date | null;
  confirmed: boolean;
  trained: boolean;
}

// Mapeo de columnas del XLSX
const COLUMN_MAP: Record<string, number> = {
  fullName: 4,
  cedula: 5,
  birthDate: 6,
  phoneNumber: 9,
  email: 3,
  department: 11,
  city: 12,
  neighborhood: 13,
  address: 14,
  emergencyName: 15,
  emergencyRelationship: 16,
  emergencyPhone: 17,
  workZone: 22,
  howHeardAboutUs: 23,
  referredBy: 24,
  vehicleBrand: 28,
  vehicleModel: 29,
  vehiclePlate: 30,
  vehicleYear: 31,
  canInvoice: 33,
  taxCompliance: 34,
  interestedInConto: 35,
  hasUenoAccount: 36,
  uenoAccountNumber: 37,
  paymentProof: 38,
  paymentMethod: 39,
  paymentNumber: 40,
  invoiceNumber: 41,
  paymentAmount: 42,
  onboardingDate: 46,
  confirmed: 47,
  trained: 48,
  cedulaUrls: 18,
  licenseUrls: 19,
};

/**
 * Extrae IDs de Google Drive de una celda que puede contener múltiples URLs
 */
function extractDriveIds(content: string | null | undefined): string[] {
  if (!content) return [];
  
  const driveIds: string[] = [];
  const contentStr = String(content);
  
  // Patrones para extraer IDs de Drive
  const patterns = [
    /drive\.google\.com\/.*?[\/=]([a-zA-Z0-9-_]{25,})/g,
    /id=([a-zA-Z0-9-_]{25,})/g,
    /^([a-zA-Z0-9-_]{25,})$/gm
  ];
  
  // Separar por comas, espacios o saltos de línea
  const parts = contentStr.split(/[,\s\n]+/);
  
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
 * Descarga un archivo desde Google Drive
 */
async function downloadFromDrive(fileId: string): Promise<Buffer> {
  try {
    console.log(`  📥 Descargando archivo ${fileId}...`);
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error(`  ❌ Error descargando ${fileId}:`, error);
    throw error;
  }
}

/**
 * Sube un archivo a Vercel Blob
 */
async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  sessionId: string,
  documentType: string
): Promise<string> {
  try {
    console.log(`  📤 Subiendo a Blob: ${filename}...`);
    
    // Detectar tipo de archivo por magic numbers
    const header = buffer.slice(0, 8).toString('hex');
    let contentType = 'image/jpeg'; // default
    let extension = 'jpg';
    
    if (header.startsWith('25504446')) {
      contentType = 'application/pdf';
      extension = 'pdf';
    } else if (header.startsWith('89504e47')) {
      contentType = 'image/png';
      extension = 'png';
    } else if (header.startsWith('ffd8ff')) {
      contentType = 'image/jpeg';
      extension = 'jpg';
    }
    
    const blob = await put(
      `migration/${sessionId}/${documentType}-${Date.now()}.${extension}`,
      buffer,
      {
        access: 'public',
        addRandomSuffix: false,
        contentType
      }
    );
    
    console.log(`  ✅ Subido: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error(`  ❌ Error subiendo a Blob:`, error);
    throw error;
  }
}

/**
 * Procesa documentos: descarga de Drive y sube a Blob
 */
async function processDocuments(
  driveIds: string[],
  sessionId: string,
  documentType: string
): Promise<string[]> {
  const blobUrls: string[] = [];
  
  for (let i = 0; i < driveIds.length; i++) {
    const driveId = driveIds[i];
    try {
      const buffer = await downloadFromDrive(driveId);
      const blobUrl = await uploadToBlob(buffer, `${documentType}-${i}`, sessionId, documentType);
      blobUrls.push(blobUrl);
    } catch (error) {
      console.error(`  ❌ Error procesando documento ${driveId}:`, error);
      // Continuar con el siguiente documento
    }
  }
  
  return blobUrls;
}

/**
 * Parsea fecha en formato DD/MM/YYYY o objeto Date de Excel
 */
function parseDate(value: any): Date | null {
  if (!value) return null;
  
  // Si ya es un objeto Date
  if (value instanceof Date) {
    return value;
  }
  
  // Si es string en formato DD/MM/YYYY
  if (typeof value === 'string') {
    const parts = value.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }
  
  // Si es número (formato de Excel)
  if (typeof value === 'number') {
    // Excel almacena fechas como números desde 1900-01-01
    const date = new Date((value - 25569) * 86400 * 1000);
    return date;
  }
  
  return null;
}

/**
 * Separa nombre completo en firstName y lastName
 */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  
  // Asumir que el primer nombre es firstName y el resto es lastName
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  
  return { firstName, lastName };
}

/**
 * Limpia número de teléfono
 */
function cleanPhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  
  // Limpiar espacios, guiones, paréntesis
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Si empieza con 0, quitarlo (es el formato local de Paraguay)
  if (cleaned.startsWith('0')) {
    return cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Procesa una fila del XLSX y retorna objeto DriverRow
 */
function processRow(row: any[]): DriverRow | null {
  try {
    // Validar que tenga datos mínimos
    const cedula = row[COLUMN_MAP.cedula];
    const email = row[COLUMN_MAP.email];
    
    if (!cedula || !email) {
      console.log('  ⏭️  Saltando fila sin cédula o email');
      return null;
    }
    
    // Separar nombre completo
    const fullName = String(row[COLUMN_MAP.fullName] || '');
    const { firstName, lastName } = splitFullName(fullName);
    
    // Procesar vehículo
    const vehicleBrand = row[COLUMN_MAP.vehicleBrand];
    const hasVehicle = !!vehicleBrand && vehicleBrand !== 'NULL' && vehicleBrand !== '';
    
    // Procesar URLs de documentos
    const cedulaPhotoUrls = extractDriveIds(row[COLUMN_MAP.cedulaUrls]);
    const licensePhotoUrls = extractDriveIds(row[COLUMN_MAP.licenseUrls]);
    const taxComplianceUrls = extractDriveIds(row[COLUMN_MAP.taxCompliance]);
    const paymentProofUrls = extractDriveIds(row[COLUMN_MAP.paymentProof]);
    
    // Procesar booleans
    const canInvoice = String(row[COLUMN_MAP.canInvoice] || '').toLowerCase() === 'si';
    const hasUenoAccount = String(row[COLUMN_MAP.hasUenoAccount] || '').toLowerCase() === 'sí' || 
                           String(row[COLUMN_MAP.hasUenoAccount] || '').toLowerCase() === 'si';
    const interestedInConto = String(row[COLUMN_MAP.interestedInConto] || '').toLowerCase().includes('si');
    const confirmed = row[COLUMN_MAP.confirmed] === true || row[COLUMN_MAP.confirmed] === 'True';
    const trained = row[COLUMN_MAP.trained] === true || row[COLUMN_MAP.trained] === 'True';
    
    return {
      fullName: fullName,
      cedula: String(cedula).replace(/\./g, ''),
      birthDate: parseDate(row[COLUMN_MAP.birthDate]),
      phoneNumber: cleanPhoneNumber(String(row[COLUMN_MAP.phoneNumber])) || '',
      email: String(email),
      
      department: String(row[COLUMN_MAP.department] || ''),
      city: String(row[COLUMN_MAP.city] || ''),
      neighborhood: String(row[COLUMN_MAP.neighborhood] || ''),
      address: String(row[COLUMN_MAP.address] || ''),
      emergencyName: String(row[COLUMN_MAP.emergencyName] || ''),
      emergencyRelationship: String(row[COLUMN_MAP.emergencyRelationship] || ''),
      emergencyPhone: cleanPhoneNumber(String(row[COLUMN_MAP.emergencyPhone])) || '',
      
      workZone: String(row[COLUMN_MAP.workZone] || ''),
      howHeardAboutUs: String(row[COLUMN_MAP.howHeardAboutUs] || ''),
      referredBy: row[COLUMN_MAP.referredBy] && row[COLUMN_MAP.referredBy] !== 'NULL' 
        ? String(row[COLUMN_MAP.referredBy]) 
        : null,
      
      hasVehicle,
      vehicleBrand: hasVehicle ? String(vehicleBrand) : null,
      vehicleModel: hasVehicle ? String(row[COLUMN_MAP.vehicleModel] || '') : null,
      vehicleYear: hasVehicle && row[COLUMN_MAP.vehicleYear] 
        ? parseInt(String(row[COLUMN_MAP.vehicleYear])) 
        : null,
      vehiclePlate: hasVehicle ? String(row[COLUMN_MAP.vehiclePlate] || '') : null,
      
      cedulaPhotoUrls,
      licensePhotoUrls,
      
      hasUenoAccount,
      uenoAccountNumber: hasUenoAccount && row[COLUMN_MAP.uenoAccountNumber] 
        ? String(row[COLUMN_MAP.uenoAccountNumber]) 
        : null,
      canInvoice,
      interestedInConto,
      taxComplianceUrls,
      
      paymentMethod: row[COLUMN_MAP.paymentMethod] ? String(row[COLUMN_MAP.paymentMethod]) : null,
      paymentNumber: row[COLUMN_MAP.paymentNumber] ? String(row[COLUMN_MAP.paymentNumber]) : null,
      invoiceNumber: row[COLUMN_MAP.invoiceNumber] ? String(row[COLUMN_MAP.invoiceNumber]) : null,
      paymentAmount: row[COLUMN_MAP.paymentAmount] ? parseFloat(String(row[COLUMN_MAP.paymentAmount])) : null,
      paymentProofUrls,
      
      onboardingDate: parseDate(row[COLUMN_MAP.onboardingDate]),
      confirmed,
      trained,
    };
  } catch (error) {
    console.error('Error procesando fila:', error);
    return null;
  }
}

/**
 * Guarda un driver en la base de datos
 */
async function saveDriver(driverData: DriverRow, sessionId: string): Promise<void> {
  console.log(`\n📝 Guardando driver: ${driverData.fullName} (${driverData.cedula})`);
  
  try {
    // Verificar si ya existe
    const existing = await prisma.formDriver.findFirst({
      where: { cedula: driverData.cedula }
    });
    
    if (existing) {
      console.log(`  ⏭️  Driver ya existe, saltando...`);
      return;
    }
    
    const { firstName, lastName } = splitFullName(driverData.fullName);
    
    // Todos los drivers migrados están completos (tienen los 6 pasos)
    const driverStatus: 'COMPLETED' = 'COMPLETED';
    
    // Crear FormSubmission (sin completedSteps - ese campo NO existe en FormSubmission)
    const submission = await prisma.formSubmission.create({
      data: {
        sessionId,
        currentStep: 6,
        totalSteps: 6,
        isComplete: true, // ✅ Marcado como completo
        lastActivityAt: new Date(),
        completedAt: new Date(), // ✅ Con fecha de completado
        formData: {
          firstName,
          lastName,
          cedula: driverData.cedula,
          birthDate: driverData.birthDate?.toISOString() || '',
          phoneNumber: driverData.phoneNumber,
          email: driverData.email,
          department: driverData.department,
          city: driverData.city,
          neighborhood: driverData.neighborhood,
          address: driverData.address,
          emergencyName: driverData.emergencyName,
          emergencyRelationship: driverData.emergencyRelationship,
          emergencyPhone: driverData.emergencyPhone,
          workZone: driverData.workZone,
          howHeardAboutUs: driverData.howHeardAboutUs,
          referredBy: driverData.referredBy,
          hasVehicle: driverData.hasVehicle ? 'si' : 'no',
          vehicleBrand: driverData.vehicleBrand,
          vehicleModel: driverData.vehicleModel,
          vehicleYear: driverData.vehicleYear?.toString(),
          vehiclePlate: driverData.vehiclePlate,
          hasUenoAccount: driverData.hasUenoAccount ? 'si' : 'no',
          uenoAccountNumber: driverData.uenoAccountNumber,
          canInvoice: driverData.canInvoice ? 'si' : 'no',
          interestedInConto: driverData.interestedInConto ? 'si' : 'no',
          paymentMethod: driverData.paymentMethod,
        }
      }
    });
    
    console.log(`  ✅ FormSubmission creado: ${submission.id}`);
    
    // Crear FormDriver (con completedSteps correcto y contacto de emergencia incluido)
    const formDriver = await prisma.formDriver.create({
      data: {
        id: submission.id, // Usar mismo ID
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        cedula: driverData.cedula,
        birthDate: driverData.birthDate,
        phoneNumber: driverData.phoneNumber,
        email: driverData.email,
        department: driverData.department,
        city: driverData.city,
        neighborhood: driverData.neighborhood,
        address: driverData.address,
        
        // Contacto de emergencia (va directo en FormDriver, NO es tabla separada)
        emergencyName: driverData.emergencyName,
        emergencyRelationship: driverData.emergencyRelationship,
        emergencyPhone: driverData.emergencyPhone,
        
        workZone: driverData.workZone,
        howHeardAboutUs: driverData.howHeardAboutUs,
        referredBy: driverData.referredBy,
        
        hasVehicle: driverData.hasVehicle,
        vehicleBrand: driverData.vehicleBrand,
        vehicleModel: driverData.vehicleModel,
        vehicleYear: driverData.vehicleYear,
        vehiclePlate: driverData.vehiclePlate,
        
        hasUenoAccount: driverData.hasUenoAccount,
        uenoAccountNumber: driverData.uenoAccountNumber,
        canInvoice: driverData.canInvoice,
        
        // Estados correctos según enum - SIEMPRE COMPLETED para migración
        status: 'COMPLETED', // ✅ Todos los drivers migrados están completos
        currentStep: 6,
        completedSteps: [1, 2, 3, 4, 5, 6],
        documentsStatus: 'PENDING',
        
        // Timestamps - SIEMPRE con fecha de completado
        completedAt: new Date(), // ✅ Marcado como completado
      }
    });
    
    console.log(`  ✅ FormDriver creado: ${formDriver.id}`);
    
    // Actualizar submission con formDriverId
    await prisma.formSubmission.update({
      where: { id: submission.id },
      data: { formDriverId: formDriver.id }
    });
    
    // Procesar y subir documentos de cédula
    console.log(`  📄 Procesando documentos de cédula (${driverData.cedulaPhotoUrls.length})...`);
    if (driverData.cedulaPhotoUrls.length > 0) {
      const blobUrls = await processDocuments(
        driverData.cedulaPhotoUrls,
        sessionId,
        'cedula'
      );
      
      for (const [idx, url] of blobUrls.entries()) {
        await prisma.formDocument.create({
          data: {
            formDriverId: formDriver.id,
            documentType: idx === 0 ? 'CEDULA_FRONT' : 'CEDULA_BACK',
            blobUrl: url,
            fileName: `cedula-${idx}.jpg`,
            status: 'PENDING',
            metadata: {
              source: 'migration',
              originalDriveId: driverData.cedulaPhotoUrls[idx]
            }
          }
        });
      }
    }
    
    // Procesar documentos de antecedentes
    console.log(`  📄 Procesando antecedentes (${driverData.licensePhotoUrls.length})...`);
    if (driverData.licensePhotoUrls.length > 0) {
      const blobUrls = await processDocuments(
        driverData.licensePhotoUrls,
        sessionId,
        'criminal_record'
      );
      
      for (const [idx, url] of blobUrls.entries()) {
        await prisma.formDocument.create({
          data: {
            formDriverId: formDriver.id,
            documentType: 'CRIMINAL_RECORD',
            blobUrl: url,
            fileName: `criminal-record-${idx}.jpg`,
            status: 'PENDING',
            metadata: {
              source: 'migration',
              originalDriveId: driverData.licensePhotoUrls[idx]
            }
          }
        });
      }
    }
    
    // Crear FinancialService
    await prisma.financialService.create({
      data: {
        formDriverId: formDriver.id,
        hasInvoice: driverData.canInvoice,
        interestedInConto: driverData.interestedInConto,
        taxComplianceUrl: driverData.taxComplianceUrls.length > 0 
          ? await processDocuments(driverData.taxComplianceUrls, sessionId, 'tax_compliance').then(urls => urls[0])
          : null,
      }
    });
    console.log(`  ✅ FinancialService creado`);
    
    // Crear EquipmentPayment si tiene datos de pago
    if (driverData.paymentMethod || driverData.paymentAmount) {
      const paymentProofUrl = driverData.paymentProofUrls.length > 0
        ? await processDocuments(driverData.paymentProofUrls, sessionId, 'payment_proof').then(urls => urls[0])
        : null;
      
      await prisma.equipmentPayment.create({
        data: {
          formDriverId: formDriver.id,
          paymentMethod: driverData.paymentMethod,
          paymentNumber: driverData.paymentNumber,
          invoiceNumber: driverData.invoiceNumber,
          amount: driverData.paymentAmount,
          paymentProofUrl: paymentProofUrl,
          status: driverData.paymentAmount ? 'VERIFIED' : 'PENDING',
        }
      });
      console.log(`  ✅ EquipmentPayment creado`);
    }
    
    // Actualizar estado de Onboarding en FormDriver si tiene fecha
    if (driverData.onboardingDate && driverData.confirmed) {
      await prisma.formDriver.update({
        where: { id: formDriver.id },
        data: {
          onboardingStatus: driverData.trained ? 'COMPLETED' : 'SCHEDULED',
          onboardingScheduledAt: driverData.onboardingDate,
          onboardingCompletedAt: driverData.trained ? new Date() : null,
        }
      });
      console.log(`  ✅ Estado Onboarding actualizado: ${driverData.trained ? 'COMPLETED' : 'SCHEDULED'}`);
    }
    
    console.log(`✅ Driver ${driverData.fullName} guardado exitosamente!\n`);
    
  } catch (error) {
    console.error(`❌ Error guardando driver ${driverData.fullName}:`, error);
    throw error;
  }
}

/**
 * Función principal de migración
 */
async function main() {
  console.log('🚀 Iniciando migración de drivers desde XLSX...\n');
  
  try {
    // Leer archivo XLSX
    const xlsxPath = './postulacion.xlsx';
    console.log(`📖 Leyendo archivo: ${xlsxPath}`);
    
    const fileBuffer = await fs.readFile(xlsxPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
    
    console.log(`📊 Total de filas: ${data.length - 1} (excluyendo header)\n`);
    
    let processed = 0;
    let errors = 0;
    let skipped = 0;
    
    // Procesar cada fila (saltando el header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      console.log(`\n=== Procesando fila ${i}/${data.length - 1} ===`);
      
      const driverData = processRow(row);
      
      if (!driverData) {
        skipped++;
        continue;
      }
      
      try {
        // Generar sessionId único para este driver
        const sessionId = `migration-${driverData.cedula}-${Date.now()}`;
        
        await saveDriver(driverData, sessionId);
        processed++;
      } catch (error) {
        console.error(`Error procesando driver:`, error);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Procesados exitosamente: ${processed}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`⏭️  Saltados: ${skipped}`);
    console.log(`📝 Total: ${data.length - 1}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
main()
  .then(() => {
    console.log('\n✅ Migración completada!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });