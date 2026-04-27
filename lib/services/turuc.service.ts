import { TURUC_CONFIG, TURUC_ENDPOINTS, RUC_STATUS } from '@/lib/config/turuc.config'

export interface TurucContribuyenteData {
  doc: number
  razonSocial: string
  dv: number
  ruc: string
  estado: string
  esPersonaJuridica: boolean
  esEntidadPublica: boolean
}

export interface TurucApiResponse {
  data: TurucContribuyenteData | null
  message: string
}

export interface RucCheckResult {
  status: string
  name: string | null
  dv: number | null
  isLegalEntity: boolean | null
  isPublicEntity: boolean | null
  raw: unknown
  normalizedDoc: string
  httpStatus: number | null
  error?: string
}

export function normalizeCedula(input: string | null | undefined): string {
  if (!input) return ''
  return String(input).replace(/\D+/g, '')
}

/**
 * Detecta si la cédula es de un extranjero (no paraguayo).
 * Las cédulas paraguayas son solo dígitos; si tiene letras (ej. "M371660"
 * para cubanos, "V12345..." para venezolanos, etc.) no aplica consulta al SET.
 */
export function isForeignCedula(input: string | null | undefined): boolean {
  if (!input) return false
  return /[A-Za-z]/.test(String(input).trim())
}

const RATE_LIMIT_RETRY_DELAYS_MS = [1000, 2500, 5000] // backoff incremental ante 429

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function checkRucStatus(cedula: string | number): Promise<RucCheckResult> {
  const normalizedDoc = normalizeCedula(String(cedula))

  if (!normalizedDoc) {
    return {
      status: RUC_STATUS.ERROR,
      name: null,
      dv: null,
      isLegalEntity: null,
      isPublicEntity: null,
      raw: null,
      normalizedDoc,
      httpStatus: null,
      error: 'Cédula vacía o inválida tras normalización',
    }
  }

  let last: RucCheckResult | null = null
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt++) {
    last = await doCheckRucRequest(normalizedDoc)
    if (last.httpStatus !== 429) return last
    const wait = RATE_LIMIT_RETRY_DELAYS_MS[attempt]
    if (wait == null) return last
    await sleep(wait)
  }

  return last!
}

async function doCheckRucRequest(normalizedDoc: string): Promise<RucCheckResult> {
  const base: RucCheckResult = {
    status: RUC_STATUS.ERROR,
    name: null,
    dv: null,
    isLegalEntity: null,
    isPublicEntity: null,
    raw: null,
    normalizedDoc,
    httpStatus: null,
  }

  const url = `${TURUC_CONFIG.baseUrl}${TURUC_ENDPOINTS.CONTRIBUYENTE}?ruc=${normalizedDoc}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TURUC_CONFIG.timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; MonchisDriversBot/1.0)',
      },
    })

    base.httpStatus = res.status

    const text = await res.text()
    let body: TurucApiResponse | null = null
    try {
      body = text ? (JSON.parse(text) as TurucApiResponse) : null
    } catch {
      return { ...base, status: RUC_STATUS.ERROR, raw: text, error: `Respuesta no-JSON (HTTP ${res.status})` }
    }

    base.raw = body

    // La API devuelve "no encontrado" tanto con 200+data:null como con 400 + mensaje.
    const notFoundByMessage = !!body?.message && /no se encontraron registros/i.test(body.message)
    if (body?.data === null || notFoundByMessage) {
      return { ...base, status: RUC_STATUS.NO_ENCONTRADO }
    }

    if (!res.ok) {
      return { ...base, status: RUC_STATUS.ERROR, error: `HTTP ${res.status}: ${body?.message || 'sin detalle'}` }
    }

    if (!body) {
      return { ...base, status: RUC_STATUS.ERROR, error: 'Respuesta vacía' }
    }

    const { razonSocial, dv, estado, esPersonaJuridica, esEntidadPublica } = body.data

    return {
      ...base,
      status: estado || RUC_STATUS.ERROR,
      name: razonSocial ?? null,
      dv: typeof dv === 'number' ? dv : null,
      isLegalEntity: typeof esPersonaJuridica === 'boolean' ? esPersonaJuridica : null,
      isPublicEntity: typeof esEntidadPublica === 'boolean' ? esEntidadPublica : null,
    }
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError'
    return {
      ...base,
      status: RUC_STATUS.ERROR,
      error: isAbort ? `Timeout tras ${TURUC_CONFIG.timeoutMs}ms` : err?.message || 'Error desconocido',
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

// ============================================================================
// Helpers de persistencia
// ============================================================================

/**
 * Consulta turuc para el driver y persiste el resultado en DB.
 * Sincrónico: devuelve el resultado para quien quiera usarlo.
 * Captura errores internamente y los loguea; nunca lanza excepciones.
 */
export async function refreshRucForDriver(
  driverId: string,
): Promise<RucCheckResult | null> {
  const { prisma } = await import('@/lib/prisma')

  try {
    const driver = await prisma.formDriver.findUnique({
      where: { id: driverId },
      select: { id: true, cedula: true },
    })
    if (!driver) {
      console.warn(`[refreshRucForDriver] Driver ${driverId} no encontrado`)
      return null
    }
    if (!driver.cedula || driver.cedula.trim() === '') {
      console.warn(`[refreshRucForDriver] Driver ${driverId} sin cédula, skip`)
      return null
    }

    // Cédula extranjera (contiene letras) → no consultar SET paraguayo.
    // Marcamos como NOT_APPLICABLE para que el pipeline lo maneje como "N/A".
    if (isForeignCedula(driver.cedula)) {
      console.log(
        `[refreshRucForDriver] Driver ${driverId} con cédula extranjera ${driver.cedula}, skip turuc`,
      )
      await prisma.formDriver.update({
        where: { id: driverId },
        data: {
          rucStatus: 'NOT_APPLICABLE',
          rucName: null,
          rucDv: null,
          rucIsLegalEntity: null,
          rucIsPublicEntity: null,
          rucLastCheckedAt: new Date(),
          rucApiRawResponse: { reason: 'foreign_cedula', cedula: driver.cedula } as any,
        },
      })
      return {
        status: 'NOT_APPLICABLE',
        name: null,
        dv: null,
        isLegalEntity: null,
        isPublicEntity: null,
        raw: { reason: 'foreign_cedula' },
        normalizedDoc: driver.cedula,
        httpStatus: null,
      }
    }

    const result = await checkRucStatus(driver.cedula)

    await prisma.formDriver.update({
      where: { id: driverId },
      data: {
        rucStatus: result.status,
        rucName: result.name,
        rucDv: result.dv,
        rucIsLegalEntity: result.isLegalEntity,
        rucIsPublicEntity: result.isPublicEntity,
        rucLastCheckedAt: new Date(),
        rucApiRawResponse: result.raw as any,
      },
    })

    return result
  } catch (err: any) {
    console.error(`[refreshRucForDriver] Error para driver ${driverId}:`, err?.message ?? err)
    return null
  }
}

/**
 * Versión fire-and-forget: útil para disparar desde endpoints sin bloquear la
 * respuesta al usuario. Captura errores internamente.
 *
 * Uso típico:
 *   refreshRucForDriverAsync(driverId)  // sin await
 *   return NextResponse.json({ success: true })
 */
export function refreshRucForDriverAsync(driverId: string): void {
  refreshRucForDriver(driverId).catch((err) => {
    console.error(`[refreshRucForDriverAsync] Error async para ${driverId}:`, err?.message ?? err)
  })
}
