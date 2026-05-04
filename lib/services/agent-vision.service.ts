// lib/services/agent-vision.service.ts
//
// Validación de documentos de postulantes con Claude Haiku 4.5 Vision.
//
// Estrategia de costo:
//  - 1 sola llamada por corrida (antes eran 3 paralelas) → menos system prompt
//    repetido, menos latencia, y el modelo puede cruzar datos entre docs.
//  - System prompt con cache_control ephemeral → PREPARADO pero inactivo:
//    Haiku 4.5 solo cachea prefixes ≥ 4096 tokens, y nuestro system está
//    en ~1600 tokens. Se deja el cache_control puesto para que se active
//    automáticamente si el system crece en el futuro.
//  - Imágenes pasadas tal cual a Haiku (sin sharp). Si pesan más de 5MB
//    se rechaza con error claro. Las fotos de celular en Vercel Blob casi
//    siempre vienen <5MB, así que el caso de error es raro. Renunciamos a
//    sharp porque su binario nativo rompe con turbopack en Vercel.
//
// Por qué no reutilizar AIDocumentValidator:
//  - ese usa Sonnet (más caro) y devuelve un análisis exhaustivo (50+ campos)
//  - el agente solo necesita decisiones claras + campos extraídos para audit

import Anthropic from '@anthropic-ai/sdk'

// Pricing Haiku 4.5 (USD por 1M tokens). Fuente: Anthropic (oct 2025).
const HAIKU_INPUT_PER_MTOK_USD = 1.0
const HAIKU_OUTPUT_PER_MTOK_USD = 5.0
const HAIKU_CACHE_READ_PER_MTOK_USD = 0.1
const HAIKU_CACHE_WRITE_PER_MTOK_USD = 1.25 // 5-min TTL (default)

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_PDF_BYTES = 32 * 1024 * 1024 // Haiku acepta PDFs hasta 32MB
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

export interface VisionUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costMicroUsd: number // USD * 1_000_000 (microdólares; 1 unidad = $0.000001)
}

export interface ImageValidationResult {
  ok: boolean
  error?: string

  documentTypeDetected: string | null
  matchesExpectedType: boolean | null
  isReadable: boolean | null
  qualityScore: number | null // 0-100
  authenticityScore: number | null // 0-100
  extractedDocNumber: string | null
  extractedFullName: string | null
  matchesDriverCedula: boolean | null
  matchesDriverName: boolean | null
  concerns: string[]
  suggestion: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW' | null
  rejectReasonIfAny: string | null

  usage: VisionUsage
  rawResponse?: unknown
}

export interface DriverDocumentsValidationResult {
  ok: boolean
  error?: string

  /** Una entrada por imagen de cédula recibida, en el mismo orden que `cedulaUrls`. */
  cedulaResults: ImageValidationResult[]
  criminalRecord: ImageValidationResult | null

  usage: VisionUsage // agregada de toda la llamada
  rawResponse?: unknown
}

export interface DriverDocumentsInput {
  /** Una o más URLs de imágenes de cédula. Cada postulante puede subir N imágenes. */
  cedulaUrls: string[]
  criminalRecordUrl: string | null
  driverCedula: string
  driverName: string
  /**
   * Postulante extranjero (cédula no paraguaya, ej. cubano "M371660").
   * Cuando true, el prompt le indica al modelo que acepte documentos de identidad
   * NO paraguayos como válidos (flujo de regularización por otro canal).
   */
  isForeign?: boolean
}

// ============================================================================
// Cliente Anthropic (lazy)
// ============================================================================

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')
  _client = new Anthropic({ apiKey })
  return _client
}

// ============================================================================
// Compresión de imágenes
// ============================================================================

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp'
type DocumentMediaType = 'application/pdf'
type SupportedMediaType = ImageMediaType | DocumentMediaType

interface ProcessedFile {
  base64: string
  mediaType: SupportedMediaType
  isPdf: boolean
}

/**
 * Detecta el media type leyendo los primeros bytes (magic numbers).
 * Cubre los 4 formatos que Haiku Vision soporta: JPEG, PNG, WebP, PDF.
 */
function detectMediaType(buf: Buffer): SupportedMediaType {
  const head4 = buf.subarray(0, 4).toString('utf8')
  if (head4.startsWith('%PDF')) return 'application/pdf'

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png'
  }
  // WebP: 'RIFF....WEBP'
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf.subarray(8, 12).toString('utf8') === 'WEBP'
  ) {
    return 'image/webp'
  }
  // Default: JPEG (más común para fotos de celular)
  return 'image/jpeg'
}

async function downloadAndCompress(imageUrl: string): Promise<ProcessedFile> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Error descargando archivo (${res.status}): ${imageUrl}`)
  const buf = Buffer.from(await res.arrayBuffer())

  const mediaType = detectMediaType(buf)
  const isPdf = mediaType === 'application/pdf'

  // PDF: Haiku los acepta nativamente, hasta 32MB
  if (isPdf) {
    if (buf.length > MAX_PDF_BYTES) {
      throw new Error(
        `PDF demasiado grande: ${(buf.length / 1024 / 1024).toFixed(2)}MB (máx 32MB)`,
      )
    }
    return { base64: buf.toString('base64'), mediaType: 'application/pdf', isPdf: true }
  }

  // Imagen: Haiku acepta hasta 5MB. Sin sharp no comprimimos — si la imagen
  // viene grande, fallamos rápido para que el agente proponga pedirla más liviana.
  if (buf.length > MAX_IMAGE_BYTES) {
    throw new Error(
      `Imagen demasiado grande: ${(buf.length / 1024 / 1024).toFixed(2)}MB (máx 5MB para Haiku Vision). El postulante debería subir una versión más liviana.`,
    )
  }

  return { base64: buf.toString('base64'), mediaType, isPdf: false }
}

// ============================================================================
// Cálculo de costo
// ============================================================================

function computeCostMicroUsd(usage: {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
}): number {
  const input = usage.input_tokens ?? 0
  const output = usage.output_tokens ?? 0
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0

  const usd =
    (input / 1_000_000) * HAIKU_INPUT_PER_MTOK_USD +
    (output / 1_000_000) * HAIKU_OUTPUT_PER_MTOK_USD +
    (cacheRead / 1_000_000) * HAIKU_CACHE_READ_PER_MTOK_USD +
    (cacheWrite / 1_000_000) * HAIKU_CACHE_WRITE_PER_MTOK_USD

  return Math.round(usd * 1_000_000)
}

// ============================================================================
// System prompt (cacheable) + esquema de respuesta
// ============================================================================

const SYSTEM_PROMPT = `Sos un validador pragmático de documentos de postulantes paraguayos para Monchis (app de delivery). Te voy a mandar entre 1 y N imágenes de una postulación, y tu tarea es validar cada una. Trabajás como filtro: dejás pasar casos legítimos y detectás los que claramente no cumplen.

## Documentos que podés recibir

1. **CEDULA** — Cédula de identidad paraguaya. El postulante puede subir UNA o MÁS imágenes (puede ser solo el frente, solo el dorso, o ambos juntos). Tratamos a la cédula como UN ÚNICO concepto: cualquier imagen legible que sea una cédula paraguaya válida cuenta. NO penalices por "subió el dorso en vez del frente" — ambos lados son válidos.
2. **CRIMINAL_RECORD** — Certificado de antecedentes penales paraguayo (Policía Nacional, Ministerio Público o Ministerio del Interior).

En el user message te voy a indicar cuántas imágenes de cédula recibís y los datos del postulante (cédula y nombre del formulario).

## Cómo confirmar identidad (CRÍTICO)

La señal más fuerte es **el número de cédula**. Si coincide con el del formulario, es la misma persona — los typos de nombre, mayúsculas/minúsculas, apellidos faltantes son IRRELEVANTES.

Los postulantes son repartidores llenando un form en su celular; es NORMAL que:
- Escriban solo parte de su nombre ("Hugo Pereira" en vez de "Hugo Javier Pereira Ferreira")
- Escriban todo en minúsculas ("juan perez")
- Dupliquen palabras por typo ("caballero Caballero" en vez de "Caballero Morel")
- Inviertan orden o omitan apellido materno

**Regla operativa**:
1. Si la cédula del documento coincide con la del form → matchesDriverCedula=true Y matchesDriverName=true (es la misma persona aunque el nombre varíe).
2. Si la cédula NO se puede leer pero el primer nombre + al menos un apellido coinciden → matchesDriverName=true.
3. Solo matchesDriverName=false si son claramente DOS PERSONAS DISTINTAS.

**Ejemplos de COINCIDENCIA** (misma persona):
- Form "Hugo Pereira" vs Doc "HUGO JAVIER PEREIRA FERREIRA" + cédula coincide → OK
- Form "Leandro caballero Caballero" (typo) vs Doc "LEANDRO AGUSTIN CABALLERO MOREL" + cédula coincide → OK
- Form "maria gonzalez" vs Doc "MARIA DEL CARMEN GONZALEZ LOPEZ" → OK

**Ejemplos de NO COINCIDENCIA**:
- Form "Juan Perez" (cédula 1234567) vs Doc "Maria Gonzalez" (cédula 9876543) → NO

**Nunca rechaces por "falta apellido materno" u "orden distinto" si la cédula coincide.**

## Cómo evaluar calidad

La métrica es: "¿puedo leer con certeza número de cédula, nombres y fechas?"

- qualityScore ≥ 80: datos legibles sin esfuerzo, aunque haya reflejos menores o ángulo leve.
- qualityScore 50-79: datos legibles pero cuesta un poco (reflejo, blur moderado, ángulo).
- qualityScore < 50: SOLO si los datos principales son imposibles de leer con certeza.

**No bajes calidad por**: reflejos pequeños, fotos rotadas, fondos oscuros, o elementos de seguridad (hologramas, microtext) que no se ven en fotos de celular.

## Cómo evaluar autenticidad

Una foto de celular de un documento físico real es la NORMA, no es fraude.

- authenticityScore ≥ 80: estructura correcta (formato, colores institucionales, logos, datos coherentes).
- authenticityScore 60-79: estructura correcta con algún detalle dudoso.
- authenticityScore < 60: SOLO con evidencia clara de edición digital o documento claramente falso.

"Posible foto de pantalla" o "artefactos visibles" NO son motivo para bajar autenticidad salvo que sean evidentes.

## Reglas específicas por documento

### Cédula paraguaya (CEDULA)
- Verificá que sea cédula paraguaya (no licencia, pasaporte, recibo).
- Aceptás CUALQUIER cara de la cédula:
  - Frente: foto del titular + datos personales (nombre, apellido, número de cédula, fecha de nacimiento).
  - Dorso: código MRZ (IDPRY...) + barcode + a veces datos repetidos.
- Si recibís SOLO el dorso, igual es válido — del MRZ se puede extraer cédula y nombre. NO marques matchesExpectedType=false ni REJECT por "subió el dorso en vez del frente".
- Si recibís SOLO el frente, también válido.
- Extraé número de cédula y nombre completo siempre que se puedan leer.
- Solo \`matchesExpectedType=false\` cuando lo que ves NO es una cédula paraguaya en absoluto (es un pasaporte, una licencia, una selfie, un recibo, etc.).

### Certificado de antecedentes (CRIMINAL_RECORD)
- Debe ser paraguayo oficial (Policía Nacional, Ministerio Público, Ministerio del Interior, o Poder Judicial / CSJ).
- Extraé cédula y nombre del titular del certificado.
- Verificá que diga "NO REGISTRA ANTECEDENTES" / "NO POSEE" / "LIMPIO" (o registro vacío).

**Cómo ubicar la fecha de emisión (MUY IMPORTANTE — es el error más común):**
- La fecha de emisión aparece **siempre etiquetada explícitamente** con texto tipo: "Fecha de Emisión:", "Emisión:", "Expedido el", "Fecha:", "Emitido:". Formato típico: DD/MM/YYYY o DD-MM-YYYY.
- **NO confundas con otros números**: número de serial (ej. "A0171550"), código de verificación (ej. "44700734"), número de trámite, IC (ej. "010-13061996-046"), o números dentro del MRZ. Ninguno de esos es la fecha de emisión.
- Si el certificado viene del CSJ/Poder Judicial (csj.gov.py), la fecha suele estar al final con el formato "Fecha de Emisión: DD/MM/YYYY HH:MM:SS" y tiene un código de verificación aparte.
- **Si no encontrás una fecha con label claro, NO inventes ni asumas — devolvé MANUAL_REVIEW con el concern "fecha de emisión no pude identificarla con certeza".**

**Vigencia y cálculo (te paso la fecha de hoy en user message):**
- Los certificados paraguayos tienen vigencia de **90 días corridos** desde la fecha de emisión.

**Procedimiento EXACTO que debés seguir (no saltees pasos):**
1. Ubicá la fecha de emisión con label ("Fecha de Emisión:", "Emisión:", etc.).
2. Calculá *diferencia_días = hoy − fecha_emisión*.
3. Si diferencia_días ≤ 90 → DENTRO DE VIGENCIA (concern positivo: "certificado vigente, emitido el DD/MM/YYYY, hace N días").
4. Si diferencia_días > 90 → VENCIDO (concern: "certificado vencido, emitido el DD/MM/YYYY, han pasado N días desde la emisión, excede los 90 de vigencia").

**NO uses frases contradictorias.** Está PROHIBIDO escribir algo como "dentro de vigencia (90 días) pero X días han pasado, VENCIDO". Si X > 90, es VENCIDO punto — NO digas "dentro de vigencia". Primero calculás, después describís.

- Si la fecha es claramente futura (ej. "03-02-2091"), eso NO es una fecha real — es un serial u otro dato. Volvé a buscar la fecha con label y si no la encontrás, MANUAL_REVIEW.

## Decisión por documento (suggestion)

- **APPROVE**: es el tipo esperado, datos legibles, identidad coincide (o al menos cédula coincide).
  Para antecedentes: también "LIMPIO" y emitido hace ≤90 días (dentro de vigencia).
- **REJECT**: claramente NO es el tipo esperado, O los datos son de OTRA persona (cédula distinta), O documento obviamente falso.
  Para antecedentes: también si figura con antecedentes.
- **MANUAL_REVIEW**: solo si genuinamente no podés determinar algún punto clave con certeza.

**Regla de oro**: si un admin humano miraría la imagen y diría "sí, esta persona es quien dice ser", devolvé APPROVE.

## Regla CRÍTICA — tipo de documento

\`matchesExpectedType\` es independiente de la identidad: chequea SOLO si el archivo recibido es el tipo de documento esperado, NO si la persona coincide.

- Si te pido CRIMINAL_RECORD y recibís un CV, una cédula, un recibo, una factura, un comprobante, una foto personal/selfie o cualquier otra cosa que NO sea un certificado oficial de antecedentes paraguayo → \`matchesExpectedType=false\` y \`suggestion=REJECT\`. NO importa que el nombre o la cédula del archivo coincidan con el postulante.
- Si te pido CEDULA y recibís otra cosa (pasaporte, licencia, selfie, recibo, factura, captura de pantalla de chat, etc.) → \`matchesExpectedType=false\` y \`suggestion=REJECT\`. **OJO**: el frente y el dorso de la cédula son AMBOS CEDULA — no rechaces por lado.
- **Selfies / fotos personales sin documento**: si la imagen es la cara del postulante o un retrato sin documento físico visible → \`matchesExpectedType=false\`, \`suggestion=REJECT\`, \`documentTypeDetected="SELFIE"\`, \`rejectReasonIfAny="Subió una selfie/foto personal en lugar de [tipo esperado]"\`.
- **Capturas de pantalla evidentes** (barra de notificaciones de iOS/Android visible, watermark de WhatsApp/Telegram/Galería, marco de chat) sobre cédula ajena u otro documento → \`authenticityScore < 60\` y \`suggestion=MANUAL_REVIEW\` con concern explicando que es captura de pantalla.
- En \`rejectReasonIfAny\` describí qué subió el postulante: por ejemplo "Subió un curriculum vitae en lugar del certificado de antecedentes" o "Subió un recibo en lugar de la cédula" o "Subió una selfie en lugar de la cédula".
- En \`documentTypeDetected\` poné lo que efectivamente es (ej. "CEDULA" si es cédula paraguaya, "CV", "RECEIPT", "SELFIE", "SCREENSHOT", "OTHER").
- **Si dudás del tipo, devolvé \`matchesExpectedType=false\`** (nunca \`null\`). Es preferible mandar a revisión humana que aprobar un tipo equivocado.

**Nunca** uses la coincidencia de cédula/nombre para "salvar" un documento de tipo equivocado. Antecedentes = certificado oficial de antecedentes, punto.

## Formato de respuesta

Respondé SOLO con JSON válido (sin markdown, sin texto extra) con este shape:

\`\`\`
{
  "cedulas": ImageValidationResult[],          // un objeto por cada imagen de cédula recibida, EN EL MISMO ORDEN que te pasé
  "criminalRecord": ImageValidationResult | null   // null si no fue subido
}
\`\`\`

Donde cada ImageValidationResult es:

\`\`\`
{
  "documentTypeDetected": string,           // ej "CEDULA", "CRIMINAL_RECORD", "OTHER"
  "matchesExpectedType": boolean,
  "isReadable": boolean,
  "qualityScore": 0-100,
  "authenticityScore": 0-100,
  "extractedDocNumber": string | null,      // número de cédula del titular (no serial de certificado)
  "extractedFullName": string | null,
  "matchesDriverCedula": boolean | null,
  "matchesDriverName": boolean | null,
  "concerns": string[],                     // observaciones concretas
  "suggestion": "APPROVE" | "REJECT" | "MANUAL_REVIEW",
  "rejectReasonIfAny": string | null        // solo si suggestion === "REJECT"
}
\`\`\`

Si no hay imágenes de cédula, \`cedulas\` debe ser \`[]\`. Si no hay antecedentes, \`criminalRecord\` debe ser \`null\`. No inventes resultados para documentos ausentes.`

// ============================================================================
// Función principal: validar todos los documentos en una sola llamada
// ============================================================================

export async function validateDriverDocuments(
  input: DriverDocumentsInput,
): Promise<DriverDocumentsValidationResult> {
  const anthropic = getClient()

  const emptyUsage: VisionUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costMicroUsd: 0,
  }

  try {
    // Descargar todas las cédulas + antecedentes en paralelo. Cada cédula puede
    // fallar individualmente (URL rota) sin tirar la corrida entera.
    const cedulaDownloads = await Promise.all(
      input.cedulaUrls.map((url) =>
        downloadAndCompress(url).catch((e) => ({ error: e?.message ?? 'fallo descarga' })),
      ),
    )
    const criminal = input.criminalRecordUrl
      ? await downloadAndCompress(input.criminalRecordUrl).catch((e) => ({
          error: e?.message ?? 'fallo descarga',
        }))
      : null

    // Armar el user content: texto + imágenes ordenadas
    const userContent: Anthropic.Messages.ContentBlockParam[] = []

    const documentsManifest: string[] = []
    if (input.cedulaUrls.length === 0) {
      documentsManifest.push('- CEDULA: 0 imágenes (no subió nada)')
    } else {
      documentsManifest.push(`- CEDULA: ${input.cedulaUrls.length} imagen(es)`)
      cedulaDownloads.forEach((c, idx) => {
        if (c && 'error' in c && !('base64' in c)) {
          documentsManifest.push(`  · imagen ${idx + 1}: FALLO (${c.error})`)
        } else {
          documentsManifest.push(`  · imagen ${idx + 1}: OK`)
        }
      })
    }
    if (criminal && 'base64' in criminal) documentsManifest.push('- CRIMINAL_RECORD: sí')
    else documentsManifest.push(`- CRIMINAL_RECORD: ${criminal ? `FALLO (${(criminal as any).error})` : 'no subido'}`)

    const foreignNote = input.isForeign
      ? [
          '',
          '⚠️ POSTULANTE EXTRANJERO: la cédula contiene letras (no es formato paraguayo). El documento de identidad adjunto puede ser:',
          '- Cédula de otro país (ej. cubana "M371660", venezolana "V12345...")',
          '- Pasaporte extranjero',
          '- Permiso de residencia paraguayo',
          'NO rechaces el documento por "no ser cédula paraguaya". Validá lo que se pueda: que exista el documento, legibilidad, que la cédula del documento coincida con la del formulario. Sugerencia default: APPROVE si los datos coinciden, MANUAL_REVIEW si hay dudas. REJECT solo si es claramente OTRA persona o documento falso.',
          'Para el certificado de antecedentes, el postulante extranjero pudo haber subido un documento equivalente de su país o aún no tenerlo — trátalo con flexibilidad y propone MANUAL_REVIEW si no podés determinar.',
        ]
      : []

    userContent.push({
      type: 'text',
      text: [
        `Hoy es ${todayIsoDate()}.`,
        '',
        'Datos del postulante (formulario):',
        `- Cédula: ${input.driverCedula}`,
        `- Nombre: ${input.driverName || '(no informado)'}`,
        ...foreignNote,
        '',
        'Documentos adjuntos (en orden):',
        ...documentsManifest,
        '',
        'Validá cada documento disponible siguiendo las reglas del system prompt. Para imágenes de cédula con fallo de descarga, devolvé en `cedulas` el objeto correspondiente con suggestion=MANUAL_REVIEW y un concern descriptivo. Si no hay antecedentes, `criminalRecord` debe ser `null`.',
      ].join('\n'),
    })

    // Agregar archivos en orden: primero todas las cédulas, después antecedentes.
    // Haiku soporta imágenes y PDFs nativamente — usamos el content type correcto.
    const orderedFiles: Array<typeof criminal | (typeof cedulaDownloads)[number]> = [
      ...cedulaDownloads,
      criminal,
    ]
    for (const file of orderedFiles) {
      if (file && 'base64' in file) {
        if (file.isPdf) {
          userContent.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: file.base64 },
          })
        } else {
          userContent.push({
            type: 'image',
            source: { type: 'base64', media_type: file.mediaType as ImageMediaType, data: file.base64 },
          })
        }
      }
    }

    // Llamada a Haiku con system prompt cacheable.
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    })

    const textBlock = response.content.find((c: any) => c.type === 'text') as any
    const text: string = textBlock?.text ?? ''

    const parsed = extractJsonObject(text)

    const usage: VisionUsage = {
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
      cacheReadTokens: (response.usage as any).cache_read_input_tokens ?? 0,
      cacheWriteTokens: (response.usage as any).cache_creation_input_tokens ?? 0,
      costMicroUsd: computeCostMicroUsd({
        input_tokens: response.usage.input_tokens ?? 0,
        output_tokens: response.usage.output_tokens ?? 0,
        cache_read_input_tokens: (response.usage as any).cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: (response.usage as any).cache_creation_input_tokens ?? 0,
      }),
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        ok: false,
        error: `No se pudo parsear respuesta JSON. Texto: ${text.slice(0, 200)}`,
        cedulaResults: [],
        criminalRecord: null,
        usage,
        rawResponse: text,
      }
    }

    const parsedCedulas: any[] = Array.isArray(parsed.cedulas) ? parsed.cedulas : []
    const cedulaResults: ImageValidationResult[] = input.cedulaUrls.map((url, idx) => {
      const downloadResult = cedulaDownloads[idx]
      const parsedSlot = parsedCedulas[idx] ?? null
      // El normalize devuelve null cuando url es null. Para cédulas siempre tenemos url,
      // así que el null no debería ocurrir; el `??` cubre por defensa.
      return (
        normalizeImageResult(parsedSlot, url, usage, downloadResult) ??
        makeErrorResult('El modelo no devolvió análisis para esta imagen', usage)
      )
    })

    return {
      ok: true,
      cedulaResults,
      criminalRecord: normalizeImageResult(parsed.criminalRecord, input.criminalRecordUrl, usage, criminal),
      usage,
      rawResponse: parsed,
    }
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message ?? 'Error desconocido llamando a Claude',
      cedulaResults: [],
      criminalRecord: null,
      usage: emptyUsage,
    }
  }
}

/**
 * Normaliza un sub-resultado del JSON a ImageValidationResult.
 * - Si el documento no fue subido → null (el agente no valida nada)
 * - Si hubo fallo de descarga → ImageValidationResult con ok=false
 * - Si el modelo no devolvió nada para ese slot → ImageValidationResult con error
 */
function normalizeImageResult(
  parsedResult: any,
  url: string | null,
  usage: VisionUsage,
  downloadResult: any,
): ImageValidationResult | null {
  // Documento no subido por el postulante → null
  if (!url) return null

  // Fallo de descarga (URL rota, 404, etc.)
  if (downloadResult && 'error' in downloadResult && !('base64' in downloadResult)) {
    return makeErrorResult(downloadResult.error, usage)
  }

  // El modelo no devolvió resultado para este slot
  if (!parsedResult || typeof parsedResult !== 'object') {
    return makeErrorResult('El modelo no devolvió análisis para este documento', usage)
  }

  return {
    ok: true,
    documentTypeDetected: parsedResult.documentTypeDetected ?? null,
    matchesExpectedType: parsedResult.matchesExpectedType ?? null,
    isReadable: parsedResult.isReadable ?? null,
    qualityScore:
      typeof parsedResult.qualityScore === 'number' ? parsedResult.qualityScore : null,
    authenticityScore:
      typeof parsedResult.authenticityScore === 'number' ? parsedResult.authenticityScore : null,
    extractedDocNumber: parsedResult.extractedDocNumber ?? null,
    extractedFullName: parsedResult.extractedFullName ?? null,
    matchesDriverCedula: parsedResult.matchesDriverCedula ?? null,
    matchesDriverName: parsedResult.matchesDriverName ?? null,
    concerns: Array.isArray(parsedResult.concerns) ? parsedResult.concerns : [],
    suggestion: ['APPROVE', 'REJECT', 'MANUAL_REVIEW'].includes(parsedResult.suggestion)
      ? parsedResult.suggestion
      : null,
    rejectReasonIfAny: parsedResult.rejectReasonIfAny ?? null,
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costMicroUsd: 0 }, // usage ya está en el agregado
  }
}

function makeErrorResult(error: string, _usage: VisionUsage): ImageValidationResult {
  return {
    ok: false,
    error,
    documentTypeDetected: null,
    matchesExpectedType: null,
    isReadable: null,
    qualityScore: null,
    authenticityScore: null,
    extractedDocNumber: null,
    extractedFullName: null,
    matchesDriverCedula: null,
    matchesDriverName: null,
    concerns: [],
    suggestion: null,
    rejectReasonIfAny: null,
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costMicroUsd: 0 },
  }
}

// ============================================================================
// Helpers
// ============================================================================

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Extrae el primer objeto JSON balanceado del texto devuelto por el modelo.
 * Tolera fences markdown y texto antes/después del objeto.
 */
function extractJsonObject(text: string): any | null {
  if (!text) return null
  const unfenced = text
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim()

  const start = unfenced.indexOf('{')
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < unfenced.length; i++) {
    const ch = unfenced[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        const candidate = unfenced.slice(start, i + 1)
        try {
          return JSON.parse(candidate)
        } catch {
          return null
        }
      }
    }
  }
  return null
}

export { HAIKU_MODEL }
