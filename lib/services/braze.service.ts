// lib/services/braze.service.ts

import { getBrazeApiKey, getBrazeRestEndpoint, BRAZE_ENDPOINTS } from '@/lib/config/braze.config'

// ==================== TYPES ====================

export interface BrazeCampaignPayload {
  campaign_id: string
  broadcast: boolean
}

export interface BrazeCanvasPayload {
  canvas_id: string
  broadcast: boolean
}

export interface BrazeApiResponse {
  success: boolean
  data?: {
    send_id?: string
    dispatch_id?: string
    message?: string
    [key: string]: any
  }
  error?: {
    status: number
    message: string
    details?: any
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Crea headers comunes para las peticiones a Braze
 */
function getBrazeHeaders(): HeadersInit {
  const apiKey = getBrazeApiKey()

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
}

/**
 * Maneja errores de fetch de Braze
 */
async function handleBrazeError(response: Response, context: string): Promise<never> {
  const errorText = await response.text().catch(() => 'Unknown error')

  let errorDetails
  try {
    errorDetails = JSON.parse(errorText)
  } catch {
    errorDetails = { message: errorText }
  }

  console.error(`Braze ${context} Error:`, {
    status: response.status,
    statusText: response.statusText,
    error: errorDetails,
  })

  throw new Error(`Braze API Error (${response.status}): ${JSON.stringify(errorDetails)}`)
}

// ==================== CAMPAIGN TRIGGER ====================

/**
 * Dispara una campaña de Braze en modo broadcast
 *
 * La audiencia se gestiona directamente en Braze. Esta función
 * simplemente dispara la campaña a todos los usuarios que cumplan
 * con los criterios definidos en la campaña.
 *
 * @param payload - campaign_id y broadcast: true
 * @returns Response de Braze con send_id y dispatch_id
 *
 * @example
 * ```typescript
 * const result = await triggerCampaign({
 *   campaign_id: 'c6801563-d398-4cf5-95cd-1104e5ed5282',
 *   broadcast: true
 * })
 *
 * if (result.success) {
 *   console.log('Send ID:', result.data?.send_id)
 *   console.log('Dispatch ID:', result.data?.dispatch_id)
 * }
 * ```
 */
export async function triggerCampaign(payload: BrazeCampaignPayload): Promise<BrazeApiResponse> {
  try {
    const endpoint = getBrazeRestEndpoint()

    const response = await fetch(`${endpoint}${BRAZE_ENDPOINTS.CAMPAIGNS_TRIGGER_SEND}`, {
      method: 'POST',
      headers: getBrazeHeaders(),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      await handleBrazeError(response, 'triggerCampaign')
    }

    const data = await response.json()

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Error triggering Braze campaign:', error)

    return {
      success: false,
      error: {
        status: 500,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      },
    }
  }
}

// ==================== CANVAS TRIGGER ====================

/**
 * Dispara un canvas de Braze en modo broadcast
 *
 * La audiencia se gestiona directamente en Braze. Esta función
 * simplemente dispara el canvas a todos los usuarios que cumplan
 * con los criterios definidos en el canvas.
 *
 * @param payload - canvas_id y broadcast: true
 * @returns Response de Braze con send_id y dispatch_id
 *
 * @example
 * ```typescript
 * const result = await triggerCanvas({
 *   canvas_id: 'abc-def-123',
 *   broadcast: true
 * })
 *
 * if (result.success) {
 *   console.log('Send ID:', result.data?.send_id)
 *   console.log('Dispatch ID:', result.data?.dispatch_id)
 * }
 * ```
 */
export async function triggerCanvas(payload: BrazeCanvasPayload): Promise<BrazeApiResponse> {
  try {
    const endpoint = getBrazeRestEndpoint()

    const response = await fetch(`${endpoint}${BRAZE_ENDPOINTS.CANVAS_TRIGGER_SEND}`, {
      method: 'POST',
      headers: getBrazeHeaders(),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      await handleBrazeError(response, 'triggerCanvas')
    }

    const data = await response.json()

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Error triggering Braze canvas:', error)

    return {
      success: false,
      error: {
        status: 500,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      },
    }
  }
}

// ==================== VALIDATION ====================

/**
 * Valida la conexión con Braze API
 * Hace una llamada simple para verificar que las credenciales funcionen
 */
export async function validateBrazeConnection(): Promise<BrazeApiResponse> {
  try {
    const endpoint = getBrazeRestEndpoint()
    const apiKey = getBrazeApiKey()

    // Intenta hacer una llamada simple a Braze para validar credenciales
    const response = await fetch(`${endpoint}${BRAZE_ENDPOINTS.USERS_TRACK}`, {
      method: 'POST',
      headers: getBrazeHeaders(),
      body: JSON.stringify({
        attributes: [], // Empty request just to test auth
      }),
    })

    if (response.status === 401) {
      return {
        success: false,
        error: {
          status: 401,
          message: 'API Key inválida o sin permisos',
        },
      }
    }

    if (!response.ok && response.status !== 400) {
      await handleBrazeError(response, 'validateBrazeConnection')
    }

    return {
      success: true,
      data: {
        message: 'Conexión con Braze validada exitosamente',
      },
    }
  } catch (error) {
    console.error('Error validating Braze connection:', error)

    return {
      success: false,
      error: {
        status: 500,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}
