export interface TurucConfig {
  baseUrl: string
  timeoutMs: number
}

export const TURUC_CONFIG: TurucConfig = {
  baseUrl: process.env.TURUC_API_URL || 'https://turuc.com.py/api',
  timeoutMs: Number(process.env.TURUC_TIMEOUT_MS) || 10000,
}

export const TURUC_ENDPOINTS = {
  CONTRIBUYENTE: '/contribuyente',
} as const

export const RUC_STATUS = {
  NOT_CHECKED: 'NOT_CHECKED',
  NO_ENCONTRADO: 'NO_ENCONTRADO',
  ERROR: 'ERROR',
  ACTIVO: 'ACTIVO',
} as const
