// lib/services/ai-document-validator.service.ts

import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { DocumentType, ValidationStatus } from '@prisma/client';
import sharp from 'sharp';

// Tipos para el análisis de documentos
interface DocumentAnalysis {
  documentType: DocumentType;
  documentSide?: 'FRONT' | 'BACK' | 'BOTH' | 'UNKNOWN';
  confidence: number;
  
  extractedData: {
    documentNumber?: string;
    fullName?: string;
    issueDate?: string;
    expiryDate?: string;
    nationality?: string;
    birthDate?: string;
    sex?: string;
    maritalStatus?: string;
    licenseCategory?: string[];
    restrictions?: string;
    bloodType?: string;
    vehiclePlate?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    vehicleColor?: string;
    criminalRecordStatus?: 'CLEAN' | 'WITH_RECORDS';
    issuingAuthority?: string;
    [key: string]: any;
  };
  
  quality: {
    isReadable: boolean;
    imageQuality: 'HIGH' | 'MEDIUM' | 'LOW';
    hasAllRequiredElements: boolean;
    missingElements?: string[];
    possibleIssues?: string[];
  };
  
  authenticity: {
    appearsGenuine: boolean;
    suspiciousElements?: string[];
    securityFeatures?: {
      watermark?: boolean;
      hologram?: boolean;
      microtext?: boolean;
      [key: string]: any;
    };
    fraudRiskScore: number;
  };
  
  validation: {
    isExpired: boolean;
    expiresInDays?: number;
    matchesDriverData: boolean;
    discrepancies?: {
      field: string;
      expected: string;
      found: string;
    }[];
  };
  
  documentMetadata: {
    description: string;
    visibleText: string[];
    documentCondition: string;
    photoQuality: string;
    additionalObservations?: string;
  };
  
  finalVerdict: {
    status: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
    score: number;
    reasons?: string[];
    recommendations?: string[];
  };
}

interface DriverDataForValidation {
  fullName?: string;
  cedula?: string;
  birthDate?: string;
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
}

export class AIDocumentValidator {
  private anthropic: Anthropic;
  private drive: any;
  private readonly MAX_BASE64_SIZE = 5 * 1024 * 1024; // 5 MB para imágenes
  private readonly MAX_PDF_SIZE = 32 * 1024 * 1024; // 32 MB para PDFs
  private readonly TARGET_SIZE = 3.5 * 1024 * 1024; // Target 3.5 MB
  
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    this.drive = google.drive({ version: 'v3', auth });
  }
  
  /**
   * Descarga archivo desde Google Drive directamente a Buffer (en memoria)
   */
  private async downloadFromDriveToBuffer(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      
      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Error descargando archivo ${fileId}:`, error);
      throw error;
    }
  }
  
  /**
   * Detecta el media type del archivo usando magic numbers
   */
  private detectMediaType(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf' {
    const header = buffer.slice(0, 8).toString('hex');
    
    // PDF: %PDF (25 50 44 46)
    if (header.startsWith('25504446')) {
      return 'application/pdf';
    }
    
    // JPEG: FF D8 FF
    if (header.startsWith('ffd8ff')) {
      return 'image/jpeg';
    }
    
    // PNG: 89 50 4E 47
    if (header.startsWith('89504e47')) {
      return 'image/png';
    }
    
    // GIF: 47 49 46 38
    if (header.startsWith('47494638')) {
      return 'image/gif';
    }
    
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (header.startsWith('52494646') && buffer.slice(8, 12).toString('hex') === '57454250') {
      return 'image/webp';
    }
    
    // Default a JPEG si no se puede detectar
    return 'image/jpeg';
  }
  
  /**
   * Comprime una imagen en memoria si excede el tamaño máximo
   */
  private async compressImageIfNeeded(imageBuffer: Buffer): Promise<{
    buffer: Buffer;
    originalSize: number;
    finalSize: number;
    wasCompressed: boolean;
  }> {
    try {
      const originalSize = imageBuffer.length;
      
      console.log(`  📏 Tamaño original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
      
      if (originalSize <= this.TARGET_SIZE) {
        console.log(`  ✅ Imagen dentro del límite (considerando expansión base64)`);
        return {
          buffer: imageBuffer,
          originalSize,
          finalSize: originalSize,
          wasCompressed: false
        };
      }
      
      console.log(`  🗜️  Imagen excede límite, comprimiendo en memoria...`);
      
      const metadata = await sharp(imageBuffer).metadata();
      console.log(`  📐 Dimensiones originales: ${metadata.width}x${metadata.height}`);
      
      const compressionRatio = this.TARGET_SIZE / originalSize;
      let quality = Math.max(60, Math.min(90, Math.floor(compressionRatio * 100)));
      
      console.log(`  📐 Aplicando calidad: ${quality}%`);
      
      let compressedBuffer = await sharp(imageBuffer)
        .jpeg({ quality, progressive: true })
        .toBuffer();
      
      let compressedSize = compressedBuffer.length;
      console.log(`  ✅ Primera compresión: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
      
      if (compressedSize > this.TARGET_SIZE) {
        console.log(`  🔄 Aún muy grande, reduciendo dimensiones...`);
        
        const scaleFactor = Math.sqrt(this.TARGET_SIZE / compressedSize);
        const newWidth = Math.floor((metadata.width || 1920) * scaleFactor);
        
        console.log(`  📐 Nueva anchura: ${newWidth}px`);
        
        compressedBuffer = await sharp(imageBuffer)
          .resize(newWidth, null, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
        
        compressedSize = compressedBuffer.length;
        console.log(`  ✅ Tamaño final: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
      }
      
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      console.log(`  💾 Reducción total: ${reduction}%`);
      
      return {
        buffer: compressedBuffer,
        originalSize,
        finalSize: compressedSize,
        wasCompressed: true
      };
      
    } catch (error) {
      console.error(`Error comprimiendo imagen:`, error);
      return {
        buffer: imageBuffer,
        originalSize: imageBuffer.length,
        finalSize: imageBuffer.length,
        wasCompressed: false
      };
    }
  }
  
  /**
   * Construye el prompt para Claude según el tipo de documento esperado
   */
  private buildValidationPrompt(
    expectedType: DocumentType,
    driverData?: DriverDataForValidation
  ): string {
    const basePrompt = `Eres un experto en validación de documentos paraguayos. 
    Analiza la imagen del documento y proporciona un análisis detallado en formato JSON.
    
    IMPORTANTE: 
    - Evalúa si el documento parece genuino o tiene signos de falsificación
    - Verifica la calidad y legibilidad
    - Extrae TODA la información visible
    - Compara con los datos esperados si se proporcionan (CRÍTICO)
    - Sé estricto pero justo en la evaluación
    
    EXTRACCIÓN DE NÚMERO DE DOCUMENTO (CRÍTICO):
    - En CÉDULAS: El número de cédula aparece como "Nº:" o "cédula de identidad Nº:" o "CI Nº:"
    - En LICENCIAS: El número aparece como "Licencia Nº:" o "Registro Nº:"
    - En ANTECEDENTES: El número de cédula aparece en el texto, usualmente después de "Con cédula de identidad Nº:"
    - NO confundas con: "Código de Verificación", "Número de Trámite", "Folio", "Expediente", códigos QR, o números al pie del documento
    - Si hay múltiples números, prioriza el que está identificado explícitamente como número de documento/cédula/licencia
    
    NOTAS SOBRE FOTOS DE DOCUMENTOS:
    - Es COMÚN y ACEPTABLE que las personas fotografíen sus documentos físicos o impresiones de los mismos
    - Una foto de un documento impreso NO es señal de falsificación por sí misma
    - Enfócate en la INFORMACIÓN del documento, no en el medio de captura
    - Solo marca como sospechoso si hay signos CLAROS de manipulación digital o alteración de datos
    - La calidad de impresión o foto NO debe ser factor de rechazo si la información es legible y coincide
    
    Tipo de documento esperado: ${expectedType}
    `;
    
    const dataValidation = driverData ? `
    ====== DATOS DEL DRIVER PARA VALIDACIÓN CRUZADA ======
    El usuario proporcionó los siguientes datos al registrarse. DEBES validar que los datos del documento coincidan EXACTAMENTE con estos:
    
    ${driverData.fullName ? `- Nombre completo: ${driverData.fullName}` : ''}
    ${driverData.cedula ? `- Número de cédula: ${driverData.cedula}` : ''}
    ${driverData.birthDate ? `- Fecha de nacimiento: ${driverData.birthDate}` : ''}
    ${driverData.vehiclePlate ? `- Placa del vehículo: ${driverData.vehiclePlate}` : ''}
    ${driverData.vehicleBrand ? `- Marca del vehículo: ${driverData.vehicleBrand}` : ''}
    ${driverData.vehicleModel ? `- Modelo del vehículo: ${driverData.vehicleModel}` : ''}
    ${driverData.vehicleYear ? `- Año del vehículo: ${driverData.vehicleYear}` : ''}
    ${driverData.vehicleColor ? `- Color del vehículo: ${driverData.vehicleColor}` : ''}
    
    CRÍTICO: 
    - Si encuentras discrepancias entre los datos del documento y los proporcionados, repórtalas en "validation.discrepancies"
    - Cada discrepancia debe incluir: campo, valor esperado (del registro) y valor encontrado (en el documento)
    - TOLERANCIA A ERRORES TIPOGRÁFICOS: Diferencias de hasta 2 caracteres en nombres son ACEPTABLES (ej: "CRISTIAN" vs "CRISTIN", "MARÍA" vs "MARIA")
    - Pequeñas variaciones en formato son aceptables (ej: "Juan Pérez" vs "JUAN PEREZ")
    - Errores menores de ortografía o tildes NO deben considerarse discrepancias graves
    - Solo reporta como discrepancia si hay diferencias significativas (más de 2 caracteres diferentes, o nombres completamente distintos)
    - Discrepancias mayores deben bajar el score y requerir revisión manual o rechazo
    ` : '';
    
    const responseFormat = `
    Responde ÚNICAMENTE con un JSON válido con la siguiente estructura:
    {
      "documentType": "CEDULA_FRONT|CEDULA_BACK|LICENSE_FRONT|LICENSE_BACK|CRIMINAL_RECORD|VEHICLE_REGISTRATION|etc",
      "documentSide": "FRONT|BACK|BOTH|UNKNOWN",
      "confidence": 0-100,
      "extractedData": {
        "documentNumber": "SOLO el número del documento principal (cédula, licencia, etc). NO códigos de verificación, NO números de trámite, NO códigos QR",
        "fullName": "nombre completo extraído",
        "issueDate": "fecha de emisión",
        "expiryDate": "fecha de vencimiento",
        "birthDate": "fecha de nacimiento (si aplica)",
        "nationality": "nacionalidad (si aplica)",
        "sex": "sexo (si aplica)",
        "licenseCategory": ["A", "B"] (si es licencia),
        "vehiclePlate": "placa (si es doc de vehículo)",
        "vehicleBrand": "marca (si es doc de vehículo)",
        "vehicleModel": "modelo (si es doc de vehículo)",
        "vehicleYear": "año (si es doc de vehículo)",
        "vehicleColor": "color (si es doc de vehículo)"
      },
      "quality": {
        "isReadable": true/false,
        "imageQuality": "HIGH|MEDIUM|LOW",
        "hasAllRequiredElements": true/false,
        "missingElements": ["elemento1", "elemento2"],
        "possibleIssues": ["problema1", "problema2"]
      },
      "authenticity": {
        "appearsGenuine": true/false,
        "suspiciousElements": ["elemento sospechoso 1"],
        "securityFeatures": {
          "watermark": true/false,
          "hologram": true/false,
          "microtext": true/false
        },
        "fraudRiskScore": 0-100
      },
      "validation": {
        "isExpired": true/false,
        "expiresInDays": número o null,
        "matchesDriverData": true/false,
        "discrepancies": [
          {
            "field": "nombre del campo",
            "expected": "valor esperado",
            "found": "valor encontrado"
          }
        ]
      },
      "documentMetadata": {
        "description": "Descripción detallada",
        "visibleText": ["todo", "el", "texto", "visible"],
        "documentCondition": "estado físico",
        "photoQuality": "calidad de foto",
        "additionalObservations": "observaciones"
      },
      "finalVerdict": {
        "status": "APPROVED|REJECTED|MANUAL_REVIEW",
        "score": 0-100,
        "reasons": ["razón 1"],
        "recommendations": ["recomendación 1"]
      }
    }
    
    CRITERIOS DE EVALUACIÓN:
    - APPROVED (≥85): Genuino, datos coinciden, no expirado, buena calidad
    - MANUAL_REVIEW (60-84): Genuino con problemas menores, pequeñas discrepancias
    - REJECTED (<60): Falsificación evidente, expirado, discrepancias mayores, ilegible
    `;
    
    return basePrompt + dataValidation + responseFormat;
  }
  
  /**
   * Valida un documento usando Claude Vision - Soporta imágenes y PDFs nativamente
   */
  async validateDocument(
    documentId: string,
    driveFileId: string,
    expectedType: DocumentType,
    driverData?: DriverDataForValidation
  ): Promise<DocumentAnalysis> {
    try {
      console.log(`🤖 Iniciando validación con IA para documento ${documentId}`);
      console.log(`   Tipo esperado: ${expectedType}`);
      if (driverData) {
        console.log(`   Validación cruzada con datos del driver:`, {
          nombre: driverData.fullName,
          cedula: driverData.cedula,
          vehiculo: driverData.vehiclePlate
        });
      }
      
      // 1. Descargar archivo a memoria
      console.log(`  📥 Descargando archivo ${driveFileId} desde Drive...`);
      const fileBuffer = await this.downloadFromDriveToBuffer(driveFileId);
      const originalSize = fileBuffer.length;
      
      // 2. Detectar tipo de archivo
      const mediaType = this.detectMediaType(fileBuffer);
      console.log(`  📋 Tipo de archivo: ${mediaType}`);
      console.log(`  📏 Tamaño original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
      
      let processedBuffer = fileBuffer;
      let finalSize = originalSize;
      let wasCompressed = false;
      
      // 3. Solo comprimir si es imagen Y excede el límite
      if (mediaType.startsWith('image/')) {
        const compressionResult = await this.compressImageIfNeeded(fileBuffer);
        processedBuffer = compressionResult.buffer;
        finalSize = compressionResult.finalSize;
        wasCompressed = compressionResult.wasCompressed;
      } else if (mediaType === 'application/pdf') {
        // Para PDFs, verificar que no exceda el límite
        if (originalSize > this.MAX_PDF_SIZE) {
          throw new Error(
            `PDF demasiado grande: ${(originalSize / 1024 / 1024).toFixed(2)} MB. Máximo: 32 MB`
          );
        }
      }
      
      // 4. Convertir a base64
      const base64Data = processedBuffer.toString('base64');
      const base64Size = base64Data.length;
      
      console.log(`  📊 Tamaño en base64: ${(base64Size / 1024 / 1024).toFixed(2)} MB`);
      
      // 5. Preparar prompt
      const prompt = this.buildValidationPrompt(expectedType, driverData);
      
      // 6. Enviar a Claude para análisis
      console.log(`  🔍 Enviando a Claude para análisis...`);
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: mediaType === 'application/pdf' ? 'document' : 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              } as any,
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });
      
      // 7. Parsear respuesta
      const responseText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      console.log(`  📊 Respuesta recibida, parseando JSON...`);
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta de Claude');
      }
      
      const analysis: DocumentAnalysis = JSON.parse(jsonMatch[0]);
      
      // 8. Guardar análisis en la base de datos
      await this.saveAnalysisResults(documentId, analysis, {
        originalSize,
        finalSize,
        wasCompressed,
        compressionRatio: wasCompressed ? ((1 - finalSize / originalSize) * 100) : 0,
        mediaType
      });
      
      console.log(`  ✅ Validación completada`);
      console.log(`     Tipo de archivo: ${mediaType}`);
      console.log(`     Score: ${analysis.finalVerdict.score}`);
      console.log(`     Status: ${analysis.finalVerdict.status}`);
      console.log(`     Coincide con datos: ${analysis.validation.matchesDriverData}`);
      if (analysis.validation.discrepancies && analysis.validation.discrepancies.length > 0) {
        console.log(`     ⚠️  Discrepancias encontradas: ${analysis.validation.discrepancies.length}`);
      }
      
      return analysis;
      
    } catch (error) {
      console.error(`❌ Error en validación con IA:`, error);
      throw error;
    }
  }
  
  /**
   * Guarda los resultados del análisis en la DB
   */
  private async saveAnalysisResults(
    documentId: string,
    analysis: DocumentAnalysis,
    compressionMetrics?: {
      originalSize: number;
      finalSize: number;
      wasCompressed: boolean;
      compressionRatio: number;
      mediaType?: string;
    }
  ): Promise<void> {
    try {
      let status: ValidationStatus;
      switch (analysis.finalVerdict.status) {
        case 'APPROVED':
          status = 'APPROVED';
          break;
        case 'REJECTED':
          status = 'REJECTED';
          break;
        default:
          status = 'MANUAL_REVIEW';
      }
      
      await prisma.document.update({
        where: { id: documentId },
        data: {
          type: analysis.documentType,
          status,
          aiValidation: analysis as any,
          extractedData: analysis.extractedData as any,
          confidenceScore: analysis.finalVerdict.score,
          validatedAt: new Date(),
          validatedBy: 'AI_CLAUDE_SONNET',
          rejectionReason: analysis.finalVerdict.status === 'REJECTED' 
            ? analysis.finalVerdict.reasons?.join(', ') 
            : null,
          notes: analysis.documentMetadata.additionalObservations,
          metadata: {
            documentSide: analysis.documentSide,
            fraudRiskScore: analysis.authenticity.fraudRiskScore,
            expiresInDays: analysis.validation.expiresInDays,
            imageQuality: analysis.quality.imageQuality,
            description: analysis.documentMetadata.description,
            visibleText: analysis.documentMetadata.visibleText,
            discrepancies: analysis.validation.discrepancies,
            recommendations: analysis.finalVerdict.recommendations,
            matchesDriverData: analysis.validation.matchesDriverData,
            suspiciousElements: analysis.authenticity.suspiciousElements,
            ...(compressionMetrics && {
              processing: {
                originalSizeMB: (compressionMetrics.originalSize / 1024 / 1024).toFixed(2),
                finalSizeMB: (compressionMetrics.finalSize / 1024 / 1024).toFixed(2),
                wasCompressed: compressionMetrics.wasCompressed,
                reductionPercent: compressionMetrics.compressionRatio.toFixed(1),
                mediaType: compressionMetrics.mediaType,
                isPdf: compressionMetrics.mediaType === 'application/pdf'
              }
            })
          } as any
        }
      });
      
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { driver: true }
      });
      
      if (document) {
        await prisma.driverActivity.create({
          data: {
            driverId: document.driverId,
            type: status === 'APPROVED' ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
            description: `Documento ${analysis.documentType} validado por IA: ${status}`,
            metadata: {
              documentId,
              score: analysis.finalVerdict.score,
              fraudRisk: analysis.authenticity.fraudRiskScore,
              reasons: analysis.finalVerdict.reasons,
              discrepancies: analysis.validation.discrepancies,
              matchesDriverData: analysis.validation.matchesDriverData,
              isPdf: compressionMetrics?.mediaType === 'application/pdf'
            },
            performedBy: 'AI_SYSTEM'
          }
        });
      }
      
    } catch (error) {
      console.error(`Error guardando resultados del análisis:`, error);
      throw error;
    }
  }
  
  /**
   * Procesa todos los documentos pendientes de un driver
   */
  async processDriverDocuments(driverId: string): Promise<{
    processed: number;
    approved: number;
    rejected: number;
    needsReview: number;
    details: any[];
  }> {
    const results = {
      processed: 0,
      approved: 0,
      rejected: 0,
      needsReview: 0,
      details: [] as any[]
    };
    
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: {
          documents: {
            where: {
              status: 'PENDING'
            }
          },
          vehicles: true
        }
      });
      
      if (!driver || driver.documents.length === 0) {
        console.log(`No hay documentos pendientes para el driver ${driverId}`);
        return results;
      }
      
      console.log(`🚀 Procesando ${driver.documents.length} documentos del driver ${driver.fullName}`);
      
      const driverData: DriverDataForValidation = {
        fullName: driver.fullName || undefined,
        cedula: driver.cedula || undefined,
        birthDate: driver.birthDate?.toISOString().split('T')[0],
        vehiclePlate: driver.vehicles?.[0]?.plate || undefined,
        vehicleBrand: driver.vehicles?.[0]?.brand || undefined,
        vehicleModel: driver.vehicles?.[0]?.model || undefined,
        vehicleYear: driver.vehicles?.[0]?.year || undefined,
        vehicleColor: driver.vehicles?.[0]?.color || undefined,
      };
      
      for (const doc of driver.documents) {
        if (!doc.driveFileId) {
          console.log(`  ⚠️  Documento ${doc.id} no tiene driveFileId, saltando...`);
          continue;
        }
        
        try {
          console.log(`\n  📄 Procesando documento: ${doc.type}`);
          
          const analysis = await this.validateDocument(
            doc.id,
            doc.driveFileId,
            doc.type,
            driverData
          );
          
          results.processed++;
          
          const detail = {
            documentId: doc.id,
            type: doc.type,
            status: analysis.finalVerdict.status,
            score: analysis.finalVerdict.score,
            matchesDriverData: analysis.validation.matchesDriverData,
            discrepancies: analysis.validation.discrepancies,
            fraudRisk: analysis.authenticity.fraudRiskScore
          };
          
          results.details.push(detail);
          
          switch (analysis.finalVerdict.status) {
            case 'APPROVED':
              results.approved++;
              break;
            case 'REJECTED':
              results.rejected++;
              break;
            default:
              results.needsReview++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`  ❌ Error procesando documento ${doc.id}:`, error);
          results.details.push({
            documentId: doc.id,
            type: doc.type,
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      await this.updateDriverDocumentStatus(driverId, results);
      
      console.log(`\n✅ Procesamiento completado para driver ${driverId}`);
      console.log(`   Total procesados: ${results.processed}`);
      console.log(`   Aprobados: ${results.approved}`);
      console.log(`   Rechazados: ${results.rejected}`);
      console.log(`   Requieren revisión: ${results.needsReview}`);
      
      return results;
      
    } catch (error) {
      console.error(`Error procesando documentos del driver:`, error);
      throw error;
    }
  }
  
  /**
   * Actualiza el estado de documentación del driver
   */
  private async updateDriverDocumentStatus(
    driverId: string,
    results: any
  ): Promise<void> {
    let documentStatus: 'APPROVED' | 'REJECTED' | 'IN_REVIEW' = 'IN_REVIEW';
    
    if (results.rejected > 0) {
      documentStatus = 'REJECTED';
    } else if (results.needsReview > 0) {
      documentStatus = 'IN_REVIEW';
    } else if (results.approved > 0 && results.rejected === 0 && results.needsReview === 0) {
      documentStatus = 'APPROVED';
    }
    
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        documentStatus,
        updatedAt: new Date()
      }
    });
    
    console.log(`   Estado del driver actualizado a: ${documentStatus}`);
  }
  
  /**
   * Procesa documentos en batch (para cron jobs)
   */
  async processPendingDocumentsBatch(limit: number = 10): Promise<any> {
    try {
      const drivers = await prisma.driver.findMany({
        where: {
          documents: {
            some: {
              status: 'PENDING'
            }
          }
        },
        include: {
          documents: {
            where: {
              status: 'PENDING'
            }
          }
        },
        take: limit
      });
      
      console.log(`🔄 Procesando batch de ${drivers.length} drivers con documentos pendientes`);
      
      const batchResults = {
        totalDrivers: drivers.length,
        totalDocuments: 0,
        approved: 0,
        rejected: 0,
        needsReview: 0,
        errors: 0,
        driverResults: [] as any[]
      };
      
      for (const driver of drivers) {
        try {
          console.log(`\n📋 Procesando driver: ${driver.fullName} (${driver.id})`);
          
          const results = await this.processDriverDocuments(driver.id);
          
          batchResults.totalDocuments += results.processed;
          batchResults.approved += results.approved;
          batchResults.rejected += results.rejected;
          batchResults.needsReview += results.needsReview;
          
          batchResults.driverResults.push({
            driverId: driver.id,
            driverName: driver.fullName,
            results
          });
          
        } catch (error) {
          batchResults.errors++;
          console.error(`Error procesando driver ${driver.id}:`, error);
          
          batchResults.driverResults.push({
            driverId: driver.id,
            driverName: driver.fullName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      console.log(`\n✅ Batch procesado`);
      console.log(`   Drivers procesados: ${batchResults.totalDrivers}`);
      console.log(`   Documentos procesados: ${batchResults.totalDocuments}`);
      console.log(`   Aprobados: ${batchResults.approved}`);
      console.log(`   Rechazados: ${batchResults.rejected}`);
      console.log(`   Requieren revisión: ${batchResults.needsReview}`);
      console.log(`   Errores: ${batchResults.errors}`);
      
      return batchResults;
      
    } catch (error) {
      console.error(`Error en procesamiento batch:`, error);
      throw error;
    }
  }
}

export const aiDocumentValidator = new AIDocumentValidator();