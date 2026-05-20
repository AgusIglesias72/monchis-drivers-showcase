// lib/services/paraguay-identity-validator.service.ts

import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { FormDocumentStatus, FormDocumentsStatus, WhatsAppMessageType, WhatsAppMessageSource } from '@prisma/client';
import { messagesService } from '@/lib/services/messages.service';
import { buildDocumentRejectedMessage } from '@/lib/services/whatsapp-messenger.service';

// ==================== TIPOS DE DATOS EXTRAÍDOS ====================

interface CedulaData {
  numeroCI: string;
  nombreCompleto: string;
  fechaNacimiento: string; // YYYY-MM-DD
  fechaVencimiento: string; // YYYY-MM-DD
  sexo: 'M' | 'F';
}

interface AntecedentesData {
  numeroCI: string;
  nombreCompleto: string;
  fechaEmision: string; // YYYY-MM-DD
  periodoValidezMeses: number; // Extraído de "SEIS MESES" -> 6
  registraAntecedentes: boolean; // true = tiene antecedentes, false = limpio
}

interface ExtractedDocumentsData {
  cedula: CedulaData | null;
  antecedentes: AntecedentesData | null;
  extractionErrors: string[];
}

// ==================== RESULTADO DE VALIDACIÓN ====================

interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'critical' | 'warning';
}

interface ParaguayIdentityValidationResult {
  status: 'approved' | 'rejected' | 'needs_review';
  errors: ValidationError[];
  extractedData: ExtractedDocumentsData;
  validationMetadata: {
    ciMatch: boolean;
    nameMatch: boolean;
    cedulaExpired: boolean;
    antecedentesExpired: boolean;
    hasAntecedentes: boolean;
    validatedAt: string;
    autoDecision: boolean; // true si fue auto-aprobado/rechazado
    validationScore: number; // 0-100
  };
}

// ==================== SERVICIO ====================

export class ParaguayIdentityValidator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  /**
   * 🎯 FUNCIÓN PRINCIPAL: Valida documentos de identidad paraguayos
   */
  async validateIdentityDocuments(
    formDriverId: string
  ): Promise<ParaguayIdentityValidationResult> {
    console.log(`🇵🇾 Iniciando validación de identidad paraguaya para driver ${formDriverId}`);

    try {
      // 1. Buscar documentos de cédula y antecedentes
      const documents = await prisma.formDocument.findMany({
        where: {
          formDriverId,
          documentType: {
            in: ['CEDULA', 'CRIMINAL_RECORD']
          }
        },
        include: {
          formDriver: true
        },
        orderBy: {
          uploadedAt: 'desc' // Más reciente primero
        }
      });

      const cedulaDocs = documents.filter(d => d.documentType === 'CEDULA');
      const antecedentesDocs = documents.filter(d =>
        d.documentType === 'CRIMINAL_RECORD'
      );

      if (cedulaDocs.length === 0 || antecedentesDocs.length === 0) {
        throw new Error(
          `Documentos incompletos. Cédulas: ${cedulaDocs.length}, Antecedentes: ${antecedentesDocs.length}`
        );
      }

      console.log(`  📄 Encontrados: ${cedulaDocs.length} cédula(s), ${antecedentesDocs.length} antecedente(s)`);

      // Si hay múltiples cédulas, usar solo la más reciente
      if (cedulaDocs.length > 1) {
        console.log(`  ⚠️  Múltiples cédulas encontradas, usando la más reciente`);
      }
      if (antecedentesDocs.length > 1) {
        console.log(`  ⚠️  Múltiples antecedentes encontrados, usando el más reciente`);
      }

      // 2. Extraer datos con Claude API
      const extractedData = await this.extractDocumentData(
        cedulaDocs,
        antecedentesDocs
      );

      if (!extractedData.cedula || !extractedData.antecedentes) {
        return {
          status: 'rejected',
          errors: [
            {
              code: 'EXTRACTION_FAILED',
              field: 'documents',
              message: 'No se pudieron extraer los datos de los documentos',
              severity: 'critical'
            }
          ],
          extractedData,
          validationMetadata: {
            ciMatch: false,
            nameMatch: false,
            cedulaExpired: false,
            antecedentesExpired: false,
            hasAntecedentes: false,
            validatedAt: new Date().toISOString(),
            autoDecision: true,
            validationScore: 0
          }
        };
      }

      // 3. Validar reglas de negocio en TypeScript
      const validationResult = this.validateBusinessRules(extractedData);

      // 4. Guardar resultados en la base de datos
      await this.saveValidationResults(formDriverId, validationResult, documents);

      console.log(`  ✅ Validación completada: ${validationResult.status}`);
      console.log(`     Score: ${validationResult.validationMetadata.validationScore}`);
      console.log(`     Errores: ${validationResult.errors.length}`);

      return validationResult;

    } catch (error) {
      console.error(`❌ Error en validación de identidad:`, error);
      throw error;
    }
  }

  /**
   * 📤 PASO 1: Extrae datos estructurados usando Claude API
   */
  private async extractDocumentData(
    cedulaDocs: any[],
    antecedentesDocs: any[]
  ): Promise<ExtractedDocumentsData> {
    console.log(`  🤖 Extrayendo datos con Claude API...`);

    const extractionErrors: string[] = [];

    // Extraer datos de cédula (usar la primera/más reciente)
    let cedulaData: CedulaData | null = null;
    try {
      const cedulaDoc = cedulaDocs[0];
      console.log(`     📄 Procesando cédula: docId=${cedulaDoc.id} type=${cedulaDoc.documentType}`);
      cedulaData = await this.extractCedulaData(cedulaDoc.blobUrl);
      console.log(`     ✓ Cédula extraída OK (docId=${cedulaDoc.id})`);
    } catch (error) {
      console.error(`     ✗ Error extrayendo cédula:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      extractionErrors.push(`Error extrayendo cédula: ${errorMsg}`);

      // Si hay múltiples cédulas, intentar con la siguiente
      if (cedulaDocs.length > 1) {
        console.log(`     🔄 Intentando con la siguiente cédula...`);
        try {
          cedulaData = await this.extractCedulaData(cedulaDocs[1].blobUrl);
          console.log(`     ✓ Cédula extraída OK en intento 2 (docId=${cedulaDocs[1].id})`);
        } catch (error2) {
          console.error(`     ✗ Error en segundo intento:`, error2);
        }
      }
    }

    // Extraer datos de antecedentes (usar el primero/más reciente)
    let antecedentesData: AntecedentesData | null = null;
    try {
      const antecedentesDoc = antecedentesDocs[0];
      console.log(`     📄 Procesando antecedentes: docId=${antecedentesDoc.id}`);
      antecedentesData = await this.extractAntecedentesData(antecedentesDoc.blobUrl);
      console.log(`     ✓ Antecedentes extraídos OK (docId=${antecedentesDoc.id})`);
    } catch (error) {
      console.error(`     ✗ Error extrayendo antecedentes:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      extractionErrors.push(`Error extrayendo antecedentes: ${errorMsg}`);
    }

    return {
      cedula: cedulaData,
      antecedentes: antecedentesData,
      extractionErrors
    };
  }

  /**
   * 🪪 Extrae datos de la cédula usando Claude
   */
  private async extractCedulaData(blobUrl: string): Promise<CedulaData> {
    const imageBuffer = await this.downloadImage(blobUrl);
    const compressedBuffer = await this.compressImageIfNeeded(imageBuffer);
    const base64Data = compressedBuffer.toString('base64');

    const prompt = `Extrae ÚNICAMENTE los siguientes datos de esta Cédula de Identidad Civil paraguaya.

CRÍTICO - NÚMERO DE CÉDULA:
- El número de cédula (CI) es un número de 7 dígitos (ejemplo: 6541723, 1234567)
- Aparece etiquetado como "Nº:" o "cédula de identidad Nº:" o "C.I. Nº:" en el documento
- En el FRENTE: aparece junto al texto "CÉDULA DE IDENTIDAD" en la parte superior
- En el DORSO: aparece en una línea separada, claramente etiquetado como "Nº:" seguido del número
- Formato típico: puede tener o no puntos separadores (6.541.723 o 6541723) - extrae solo los dígitos

NO CONFUNDIR CON:
- Número de trámite (aparece como "Nº de trámite:" - es diferente al CI)
- Código de verificación (números pequeños junto a códigos QR)
- Códigos de barras o números dentro de códigos QR
- Números de serie del documento
- Cualquier número que no esté explícitamente etiquetado como "Nº:" o "C.I. Nº:"

ESTRATEGIA:
1. Busca la etiqueta "Nº:" o "C.I. Nº:" o "cédula de identidad Nº:"
2. El número inmediatamente después de esa etiqueta es el CI
3. Si ves múltiples números, selecciona el que está etiquetado como "Nº:" y tiene 7 dígitos
4. Verifica que sea un número de 7 dígitos (con o sin puntos separadores)

OTROS DATOS:
- La fecha de nacimiento está en formato DD/MM/YYYY
- La fecha de vencimiento está en formato DD/MM/YYYY
- El sexo es M (masculino) o F (femenino)

Responde ÚNICAMENTE con JSON en este formato exacto:
{
  "numeroCI": "1234567",
  "nombreCompleto": "APELLIDOS Y NOMBRES completos",
  "fechaNacimiento": "YYYY-MM-DD",
  "fechaVencimiento": "YYYY-MM-DD",
  "sexo": "M" o "F"
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Debug: Mostrar respuesta de Claude si no es JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Respuesta de Claude no contiene JSON válido:');
      console.error('Primeros 500 caracteres:', responseText.substring(0, 500));
      throw new Error(`No se pudo extraer JSON de la respuesta de Claude. Respuesta: "${responseText.substring(0, 200)}..."`);
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * 📜 Extrae datos del certificado de antecedentes usando Claude
   */
  private async extractAntecedentesData(blobUrl: string): Promise<AntecedentesData> {
    const imageBuffer = await this.downloadImage(blobUrl);
    const compressedBuffer = await this.compressImageIfNeeded(imageBuffer);
    const base64Data = compressedBuffer.toString('base64');

    const prompt = `Analiza esta imagen y determina si es un Certificado de Antecedentes de la Policía Nacional de Paraguay VÁLIDO.

VALIDACIÓN CRÍTICA:
1. DEBES verificar que sea un certificado de antecedentes oficial
2. Si la imagen NO es un certificado (foto random, otro documento, imagen en blanco, etc.), responde con un error
3. Solo si es un certificado válido, extrae los datos

IMPORTANTE sobre los datos:
- El número de CI aparece en el texto, usualmente "Con cédula de identidad Nº:" o similar
- La fecha de emisión es la fecha del documento
- El período de validez está escrito en letras (ej: "SEIS MESES", "TRES MESES")
- Registra antecedentes: true si dice "REGISTRA ANTECEDENTES", false si dice "NO REGISTRA ANTECEDENTES"

Si NO ES UN CERTIFICADO DE ANTECEDENTES válido, responde:
{
  "error": "NO_ES_CERTIFICADO",
  "descripcion": "Breve descripción de qué es la imagen"
}

Si ES un certificado válido, responde:
{
  "numeroCI": "1234567",
  "nombreCompleto": "APELLIDOS Y NOMBRES completos",
  "fechaEmision": "YYYY-MM-DD",
  "periodoValidezMeses": 6,
  "registraAntecedentes": false
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta de Claude');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Verificar si Claude detectó que NO es un certificado válido
    if (parsed.error === 'NO_ES_CERTIFICADO') {
      throw new Error(
        `El documento no es un Certificado de Antecedentes válido. ${parsed.descripcion || 'Imagen no reconocida como certificado oficial'}`
      );
    }

    return parsed;
  }

  /**
   * ✅ PASO 2: Valida reglas de negocio en TypeScript puro (SIN IA)
   */
  private validateBusinessRules(
    extractedData: ExtractedDocumentsData
  ): ParaguayIdentityValidationResult {
    console.log(`  📋 Validando reglas de negocio...`);

    const errors: ValidationError[] = [];
    const { cedula, antecedentes } = extractedData;

    if (!cedula || !antecedentes) {
      return {
        status: 'rejected',
        errors: [
          {
            code: 'MISSING_DATA',
            field: 'documents',
            message: 'No se pudieron extraer los datos de los documentos',
            severity: 'critical'
          }
        ],
        extractedData,
        validationMetadata: {
          ciMatch: false,
          nameMatch: false,
          cedulaExpired: false,
          antecedentesExpired: false,
          hasAntecedentes: false,
          validatedAt: new Date().toISOString(),
          autoDecision: true,
          validationScore: 0
        }
      };
    }

    // REGLA 1: El número de CI debe coincidir
    const ciMatch = cedula.numeroCI === antecedentes.numeroCI;
    if (!ciMatch) {
      errors.push({
        code: 'CI_MISMATCH',
        field: 'numeroCI',
        message: `El número de CI no coincide. Cédula: ${cedula.numeroCI}, Antecedentes: ${antecedentes.numeroCI}`,
        severity: 'critical'
      });
    }

    // REGLA 2: El nombre debe coincidir (tolerancia MUY flexible - solo 1 nombre en común)
    const nameMatch = this.compareNames(cedula.nombreCompleto, antecedentes.nombreCompleto);
    if (!nameMatch) {
      errors.push({
        code: 'NAME_MISMATCH',
        field: 'nombreCompleto',
        message: `Ningún nombre coincide. Cédula: "${cedula.nombreCompleto}", Antecedentes: "${antecedentes.nombreCompleto}". Esto puede indicar documentos de personas diferentes.`,
        severity: 'warning' // Warning porque puede ser nombre incompleto
      });
    }

    // REGLA 3: La cédula no debe estar vencida
    const cedulaExpired = this.isDateExpired(cedula.fechaVencimiento);
    if (cedulaExpired) {
      errors.push({
        code: 'CEDULA_EXPIRED',
        field: 'fechaVencimiento',
        message: `La cédula venció el ${cedula.fechaVencimiento}`,
        severity: 'critical'
      });
    }

    // REGLA 4: El certificado debe estar vigente
    const antecedentesExpired = this.isCertificateExpired(
      antecedentes.fechaEmision,
      antecedentes.periodoValidezMeses
    );
    if (antecedentesExpired) {
      errors.push({
        code: 'ANTECEDENTES_EXPIRED',
        field: 'fechaEmision',
        message: `El certificado de antecedentes está vencido. Emitido: ${antecedentes.fechaEmision}, Validez: ${antecedentes.periodoValidezMeses} meses`,
        severity: 'critical'
      });
    }

    // REGLA 5: El certificado debe indicar "NO REGISTRA ANTECEDENTES"
    if (antecedentes.registraAntecedentes) {
      errors.push({
        code: 'HAS_ANTECEDENTES',
        field: 'registraAntecedentes',
        message: 'El certificado indica que la persona REGISTRA ANTECEDENTES',
        severity: 'critical'
      });
    }

    // Calcular score de validación (0-100)
    const validationScore = this.calculateValidationScore(errors);

    // Determinar status automático
    let status: 'approved' | 'rejected' | 'needs_review' = 'approved';
    const hasCriticalErrors = errors.some(e => e.severity === 'critical');

    if (hasCriticalErrors) {
      status = 'rejected';
    } else if (errors.length > 0) {
      status = 'needs_review';
    }

    console.log(`     Errores críticos: ${errors.filter(e => e.severity === 'critical').length}`);
    console.log(`     Warnings: ${errors.filter(e => e.severity === 'warning').length}`);
    console.log(`     Decisión: ${status.toUpperCase()}`);

    return {
      status,
      errors,
      extractedData,
      validationMetadata: {
        ciMatch,
        nameMatch,
        cedulaExpired,
        antecedentesExpired,
        hasAntecedentes: antecedentes.registraAntecedentes,
        validatedAt: new Date().toISOString(),
        autoDecision: true,
        validationScore
      }
    };
  }

  /**
   * 🔤 Compara nombres con tolerancia MUY flexible
   * Solo requiere que AL MENOS UN NOMBRE coincida entre los dos documentos
   */
  private compareNames(name1: string, name2: string): boolean {
    const normalize = (name: string) => {
      return name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^A-Z\s]/g, '') // Quitar caracteres especiales
        .trim();
    };

    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // Coincidencia exacta
    if (n1 === n2) return true;

    // Dividir nombres en palabras individuales
    const words1 = n1.split(/\s+/).filter(w => w.length > 2); // Ignorar palabras muy cortas
    const words2 = n2.split(/\s+/).filter(w => w.length > 2);

    // Si al menos una palabra coincide con tolerancia, es válido
    for (const word1 of words1) {
      for (const word2 of words2) {
        // Coincidencia exacta de palabra
        if (word1 === word2) {
          console.log(`     ✓ Nombre coincide: "${word1}" encontrado en ambos documentos`);
          return true;
        }

        // Coincidencia con tolerancia (hasta 2 caracteres de diferencia)
        const distance = this.levenshteinDistance(word1, word2);
        if (distance <= 2 && word1.length >= 4) {
          console.log(`     ✓ Nombre coincide con tolerancia: "${word1}" ≈ "${word2}" (diff: ${distance})`);
          return true;
        }
      }
    }

    // Si no encontró ninguna coincidencia
    console.log(`     ✗ Ningún nombre coincide entre "${n1}" y "${n2}"`);
    return false;
  }

  /**
   * 📏 Calcula distancia de Levenshtein entre dos strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 📅 Verifica si una fecha está vencida
   */
  private isDateExpired(dateStr: string): boolean {
    const date = new Date(dateStr);
    const now = new Date();
    return date < now;
  }

  /**
   * 📅 Verifica si un certificado está vencido
   */
  private isCertificateExpired(emisionStr: string, validezMeses: number): boolean {
    const emision = new Date(emisionStr);
    const vencimiento = new Date(emision);
    vencimiento.setMonth(vencimiento.getMonth() + validezMeses);

    const now = new Date();
    return vencimiento < now;
  }

  /**
   * 💯 Calcula score de validación (0-100)
   */
  private calculateValidationScore(errors: ValidationError[]): number {
    if (errors.length === 0) return 100;

    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const warnings = errors.filter(e => e.severity === 'warning').length;

    // Cada error crítico resta 30 puntos, cada warning resta 10
    const score = 100 - (criticalErrors * 30) - (warnings * 10);

    return Math.max(0, score);
  }

  /**
   * 💾 PASO 3: Guarda resultados en la base de datos
   */
  private async saveValidationResults(
    formDriverId: string,
    result: ParaguayIdentityValidationResult,
    documents: any[]
  ): Promise<void> {
    console.log(`  💾 Guardando resultados en base de datos...`);

    try {
      // Actualizar estado de documentos
      const documentStatus: FormDocumentStatus =
        result.status === 'approved' ? 'APPROVED' :
        result.status === 'rejected' ? 'REJECTED' :
        'IN_REVIEW';

      for (const doc of documents) {
        // Determinar el rejectionReason específico para este documento
        let documentSpecificRejection: string | null = null;

        if (result.status === 'rejected' || result.status === 'needs_review') {
          const relevantErrors: string[] = [];

          // Identificar si es cédula o antecedentes
          const isCedula = doc.documentType === 'CEDULA';
          const isAntecedentes = doc.documentType === 'CRIMINAL_RECORD';

          // Mapeo de códigos de error a mensajes cortos
          const errorMessages: Record<string, string> = {
            // Errores de cédula
            'CEDULA_EXPIRED': 'Documento vencido',
            'CEDULA_EXTRACTION_FAILED': 'No se pudo leer el documento',
            'CEDULA_INVALID': 'Documento inválido',

            // Errores de antecedentes
            'ANTECEDENTES_EXPIRED': 'Certificado vencido',
            'HAS_ANTECEDENTES': 'Registra antecedentes penales',
            'ANTECEDENTES_EXTRACTION_FAILED': 'No se pudo leer el certificado',
            'ANTECEDENTES_INVALID': 'Certificado inválido',
            'NOT_A_CERTIFICATE': 'No corresponde a lo solicitado',

            // Errores compartidos
            'CI_MISMATCH': 'Número de CI no coincide',
            'NAME_MISMATCH': 'Nombre no coincide con otros documentos'
          };

          // Agregar solo los errores relevantes para este documento
          for (const error of result.errors) {
            let shouldInclude = false;

            if (isCedula) {
              // Errores relacionados con la cédula
              if (error.code === 'CEDULA_EXPIRED' ||
                  error.code === 'CEDULA_EXTRACTION_FAILED' ||
                  error.code === 'CEDULA_INVALID') {
                shouldInclude = true;
              }
            }

            if (isAntecedentes) {
              // Errores relacionados con antecedentes
              if (error.code === 'ANTECEDENTES_EXPIRED' ||
                  error.code === 'HAS_ANTECEDENTES' ||
                  error.code === 'ANTECEDENTES_EXTRACTION_FAILED' ||
                  error.code === 'ANTECEDENTES_INVALID' ||
                  error.code === 'NOT_A_CERTIFICATE') {
                shouldInclude = true;
              }
            }

            // Errores que afectan a ambos documentos
            if (error.code === 'CI_MISMATCH' || error.code === 'NAME_MISMATCH') {
              shouldInclude = true;
            }

            // Agregar mensaje corto si es relevante
            if (shouldInclude && errorMessages[error.code]) {
              relevantErrors.push(errorMessages[error.code]);
            }
          }

          documentSpecificRejection = relevantErrors.length > 0
            ? relevantErrors.join(', ')
            : null;
        }

        const updatedDoc = await prisma.formDocument.update({
          where: { id: doc.id },
          data: {
            status: documentStatus,
            reviewedAt: new Date(),
            reviewedBy: null, // No hay usuario admin, es validación automática
            rejectionReason: documentSpecificRejection,
            adminNotes: `✅ Validación automática con IA: ${result.validationMetadata.validationScore}/100 puntos`,
            metadata: {
              ...(doc.metadata as any || {}),
              paraguayValidation: {
                status: result.status,
                validatedAt: result.validationMetadata.validatedAt,
                validatedBy: 'AI_PARAGUAY_VALIDATOR',
                score: result.validationMetadata.validationScore,
                errors: result.errors,
                extractedData: result.extractedData,
                ciMatch: result.validationMetadata.ciMatch,
                nameMatch: result.validationMetadata.nameMatch,
                cedulaExpired: result.validationMetadata.cedulaExpired,
                antecedentesExpired: result.validationMetadata.antecedentesExpired,
                hasAntecedentes: result.validationMetadata.hasAntecedentes
              }
            }
          }
        });

        // Enviar WhatsApp si el documento fue rechazado
        if (documentStatus === 'REJECTED' && documentSpecificRejection) {
          await this.sendRejectionWhatsApp(
            formDriverId,
            updatedDoc.documentType,
            documentSpecificRejection
          );
        }
      }

      // Actualizar estado general de documentación del driver
      const driverDocumentsStatus: FormDocumentsStatus =
        result.status === 'approved' ? 'APPROVED' :
        result.status === 'rejected' ? 'CORRECTIONS' :
        'IN_REVIEW';

      await prisma.formDriver.update({
        where: { id: formDriverId },
        data: {
          documentsStatus: driverDocumentsStatus,
          updatedAt: new Date()
        }
      });

      // Crear nota de auditoría (solo si existe un admin user disponible)
      const noteContent = result.status === 'approved'
        ? `✅ Documentos de identidad validados automáticamente con IA\n\nScore: ${result.validationMetadata.validationScore}/100\n\nDatos extraídos:\n- CI: ${result.extractedData.cedula?.numeroCI || 'N/A'}\n- Nombre (Cédula): ${result.extractedData.cedula?.nombreCompleto || 'N/A'}\n- Nombre (Antecedentes): ${result.extractedData.antecedentes?.nombreCompleto || 'N/A'}`
        : result.status === 'rejected'
        ? `❌ Documentos rechazados automáticamente con IA\n\nScore: ${result.validationMetadata.validationScore}/100\n\nErrores encontrados:\n${result.errors.map(e => `- ${e.message}`).join('\n')}`
        : `⚠️ Documentos requieren revisión manual\n\nScore: ${result.validationMetadata.validationScore}/100\n\nWarnings:\n${result.errors.map(e => `- ${e.message}`).join('\n')}`;

      // Intentar crear nota, pero no fallar si no hay usuario de sistema
      try {
        // Buscar cualquier admin user para crear la nota
        const firstAdmin = await prisma.adminUser.findFirst({
          orderBy: { createdAt: 'asc' }
        });

        if (firstAdmin) {
          await prisma.formNote.create({
            data: {
              content: noteContent,
              formDriverId,
              createdBy: firstAdmin.id
            }
          });
          console.log(`     ✓ Nota de auditoría creada`);
        } else {
          console.log(`     ⚠️  No se pudo crear nota (no hay usuarios admin)`);
        }
      } catch (noteError) {
        console.log(`     ⚠️  No se pudo crear nota de auditoría:`, noteError);
        // No fallar por esto, continuar con el proceso
      }

      console.log(`     ✓ Documentos actualizados a: ${documentStatus}`);
      console.log(`     ✓ Driver actualizado a: ${driverDocumentsStatus}`);

    } catch (error) {
      console.error(`Error guardando resultados de validación:`, error);
      throw error;
    }
  }

  /**
   * 📥 Helper: Descarga imagen desde URL
   */
  private async downloadImage(blobUrl: string): Promise<Buffer> {
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Error descargando imagen: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * 🗜️ Helper: Comprime imagen si excede el límite de 5MB de Claude
   */
  private async compressImageIfNeeded(imageBuffer: Buffer): Promise<Buffer> {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB en bytes
    const currentSize = imageBuffer.length;

    // Si la imagen es menor a 5MB, retornarla tal cual
    if (currentSize <= MAX_SIZE) {
      return imageBuffer;
    }

    console.log(`     ⚠️  Imagen de ${(currentSize / 1024 / 1024).toFixed(2)}MB excede límite de 5MB, comprimiendo...`);

    try {
      // Comprimir con calidad 85 y convertir a JPEG
      let compressed = await sharp(imageBuffer)
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Si aún es muy grande, reducir calidad hasta que entre en 5MB
      let quality = 80;
      while (compressed.length > MAX_SIZE && quality > 40) {
        compressed = await sharp(imageBuffer)
          .jpeg({ quality, progressive: true })
          .toBuffer();
        quality -= 10;
      }

      // Si aún es muy grande, reducir dimensiones
      if (compressed.length > MAX_SIZE) {
        const metadata = await sharp(imageBuffer).metadata();
        const scaleFactor = Math.sqrt(MAX_SIZE / compressed.length) * 0.9; // Factor de seguridad
        const newWidth = Math.floor((metadata.width || 1920) * scaleFactor);

        compressed = await sharp(imageBuffer)
          .resize(newWidth, null, { withoutEnlargement: true })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
      }

      const finalSize = compressed.length;
      console.log(`     ✓ Imagen comprimida de ${(currentSize / 1024 / 1024).toFixed(2)}MB a ${(finalSize / 1024 / 1024).toFixed(2)}MB`);

      return compressed;
    } catch (error) {
      console.error(`     ✗ Error comprimiendo imagen, usando original:`, error);
      // Si falla la compresión, intentar enviar la original
      return imageBuffer;
    }
  }

  /**
   * 📊 Procesa batch de documentos pendientes (para cron job)
   */
  async processPendingValidationsBatch(limit: number = 5): Promise<{
    totalProcessed: number;
    approved: number;
    rejected: number;
    needsReview: number;
    errors: number;
    details: any[];
  }> {
    console.log(`🔄 Procesando batch de validaciones pendientes (límite: ${limit})`);

    const results = {
      totalProcessed: 0,
      approved: 0,
      rejected: 0,
      needsReview: 0,
      errors: 0,
      details: [] as any[]
    };

    try {
      // Buscar drivers con documentos de cédula y antecedentes pendientes
      const driversWithPendingDocs = await prisma.formDriver.findMany({
        where: {
          documents: {
            some: {
              documentType: {
                in: ['CEDULA', 'CRIMINAL_RECORD']
              },
              status: 'PENDING'
            }
          }
        },
        include: {
          documents: {
            where: {
              documentType: {
                in: ['CEDULA', 'CRIMINAL_RECORD']
              }
            }
          }
        },
        take: limit
      });

      console.log(`  📋 Encontrados ${driversWithPendingDocs.length} drivers para procesar`);

      for (const driver of driversWithPendingDocs) {
        try {
          console.log(`\n  👤 Procesando: ${driver.fullName} (${driver.id})`);

          const result = await this.validateIdentityDocuments(driver.id);

          results.totalProcessed++;

          switch (result.status) {
            case 'approved':
              results.approved++;
              break;
            case 'rejected':
              results.rejected++;
              break;
            case 'needs_review':
              results.needsReview++;
              break;
          }

          results.details.push({
            driverId: driver.id,
            driverName: driver.fullName,
            status: result.status,
            score: result.validationMetadata.validationScore,
            errors: result.errors.length
          });

          // Pequeña pausa entre requests para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`  ❌ Error procesando driver ${driver.id}:`, error);
          results.errors++;
          results.details.push({
            driverId: driver.id,
            driverName: driver.fullName,
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`\n✅ Batch completado`);
      console.log(`   Total procesados: ${results.totalProcessed}`);
      console.log(`   Aprobados: ${results.approved}`);
      console.log(`   Rechazados: ${results.rejected}`);
      console.log(`   Requieren revisión: ${results.needsReview}`);
      console.log(`   Errores: ${results.errors}`);

      return results;

    } catch (error) {
      console.error(`Error en procesamiento batch:`, error);
      throw error;
    }
  }

  /**
   * 📱 Envía mensaje de WhatsApp cuando se rechaza un documento
   */
  private async sendRejectionWhatsApp(
    formDriverId: string,
    documentType: string,
    rejectionReason: string
  ): Promise<void> {
    try {
      // Obtener información del conductor
      const driver = await prisma.formDriver.findUnique({
        where: { id: formDriverId },
        select: {
          id: true,
          phoneNumber: true,
          fullName: true,
        }
      });

      if (!driver || !driver.phoneNumber || !driver.fullName) {
        console.log(`     ⚠️  No se puede enviar WhatsApp: conductor sin teléfono o nombre`);
        return;
      }

      // Mapeo de tipos de documento a nombres legibles
      const documentTypeNames: Record<string, string> = {
        'CEDULA': 'Cédula',
        'CRIMINAL_RECORD': 'Certificado de Antecedentes Penales',
        'ANTECEDENTES': 'Certificado de Antecedentes Penales',
      };

      const documentTypeName = documentTypeNames[documentType] || documentType;
      const firstName = driver.fullName.split(' ')[0];

      // Enviar mensaje de WhatsApp con el motivo del rechazo.
      const messageResult = await messagesService.sendWhatsAppMessage({
        phone: driver.phoneNumber,
        name: firstName,
        type: WhatsAppMessageType.DOCUMENT_REJECTED,
        customMessage: buildDocumentRejectedMessage({
          firstName,
          documentTypeName,
          reason: rejectionReason,
        }),
        formDriverId: driver.id,
        source: WhatsAppMessageSource.TRIGGER,
        metadata: {
          documentType: documentType,
          documentTypeName: documentTypeName,
          rejectionReason: rejectionReason,
          rejectedAt: new Date().toISOString(),
          triggeredBy: 'ai_validation',
          validatedBy: 'AI_PARAGUAY_VALIDATOR',
        },
      });

      console.log(`     📱 WhatsApp enviado para rechazo de ${documentTypeName}:`, messageResult.success);
    } catch (whatsappError) {
      // No fallar la validación si falla el envío de WhatsApp
      console.error(`     ✗ Error al enviar WhatsApp:`, whatsappError);
    }
  }
}

export const paraguayIdentityValidator = new ParaguayIdentityValidator();
