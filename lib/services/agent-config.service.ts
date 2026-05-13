// lib/services/agent-config.service.ts
//
// Configuración runtime del agente IA. Permite iterar sobre system prompt y
// constantes operativas sin deploy. Lee la fila singleton `AgentPromptOverride`
// con isActive=true y cachea ~30s in-memory para no pegarle a la DB en cada run.

import { prisma } from '@/lib/prisma'

export interface AgentOverride {
  id: string
  systemPromptOverride: string | null
  systemPromptAddendum: string | null
  pipelineNotes: string | null
  toolsNotes: string | null
  maxCedulaImages: number | null
  targetImageBytes: number | null
  rucRefreshMaxAgeDays: number | null
  haikuModelOverride: string | null
  updatedAt: Date
  updatedBy: string | null
}

const CACHE_TTL_MS = 30_000

let cached: { value: AgentOverride | null; loadedAt: number } | null = null

export async function getActiveOverride(): Promise<AgentOverride | null> {
  const now = Date.now()
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) return cached.value

  const row = await prisma.agentPromptOverride.findFirst({ where: { isActive: true } })
  cached = { value: row, loadedAt: now }
  return row
}

/** Invalida el cache. Llamado después de un PUT desde la API. */
export function invalidateOverrideCache(): void {
  cached = null
}

export interface UpdateOverrideInput {
  systemPromptOverride?: string | null
  systemPromptAddendum?: string | null
  pipelineNotes?: string | null
  toolsNotes?: string | null
  maxCedulaImages?: number | null
  targetImageBytes?: number | null
  rucRefreshMaxAgeDays?: number | null
  haikuModelOverride?: string | null
}

/**
 * Actualiza el singleton activo. Si no existe, lo crea. updatedBy debería
 * ser el clerkId del admin que editó.
 */
export async function updateActiveOverride(
  input: UpdateOverrideInput,
  updatedBy: string,
): Promise<AgentOverride> {
  const existing = await prisma.agentPromptOverride.findFirst({ where: { isActive: true } })

  const normalized = {
    systemPromptOverride: emptyToNull(input.systemPromptOverride),
    systemPromptAddendum: emptyToNull(input.systemPromptAddendum),
    pipelineNotes: emptyToNull(input.pipelineNotes),
    toolsNotes: emptyToNull(input.toolsNotes),
    maxCedulaImages: input.maxCedulaImages ?? null,
    targetImageBytes: input.targetImageBytes ?? null,
    rucRefreshMaxAgeDays: input.rucRefreshMaxAgeDays ?? null,
    haikuModelOverride: emptyToNull(input.haikuModelOverride),
  }

  const row = existing
    ? await prisma.agentPromptOverride.update({
        where: { id: existing.id },
        data: { ...normalized, updatedBy },
      })
    : await prisma.agentPromptOverride.create({
        data: { ...normalized, updatedBy, isActive: true },
      })

  invalidateOverrideCache()
  return row
}

function emptyToNull(s: string | null | undefined): string | null {
  if (s == null) return null
  const trimmed = s.trim()
  return trimmed === '' ? null : trimmed
}
