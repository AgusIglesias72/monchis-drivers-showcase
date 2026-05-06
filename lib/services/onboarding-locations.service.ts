// lib/services/onboarding-locations.service.ts
//
// Ubicaciones físicas reusables para capacitaciones presenciales.
// El admin las guarda una vez (HUB Asunción, sucursal X) y las elige desde
// el form de evento.

import { prisma } from '@/lib/prisma'
import { ValidationError } from './onboarding-errors'
import type {
  SavedLocation,
  LocationCreateInput,
  LocationUpdateInput,
} from '@/lib/types/onboarding-rules.types'
import type { OnboardingLocation } from '@prisma/client'

function toSavedLocation(loc: OnboardingLocation): SavedLocation {
  return {
    id: loc.id,
    name: loc.name,
    address: loc.address,
    googleMapsUrl: loc.googleMapsUrl,
    notes: loc.notes,
    isActive: loc.isActive,
    createdAt: loc.createdAt.toISOString(),
    updatedAt: loc.updatedAt.toISOString(),
  }
}

function validateInput(input: LocationCreateInput | LocationUpdateInput): void {
  if ('name' in input && input.name !== undefined) {
    const trimmed = input.name.trim()
    if (trimmed.length < 2 || trimmed.length > 80) {
      throw new ValidationError('El nombre debe tener entre 2 y 80 caracteres')
    }
  }
  if ('address' in input && input.address !== undefined) {
    if (input.address.trim().length < 5) {
      throw new ValidationError('La dirección es muy corta')
    }
  }
  if ('googleMapsUrl' in input && input.googleMapsUrl !== undefined) {
    const url = input.googleMapsUrl.trim()
    try {
      const parsed = new URL(url)
      const valid =
        parsed.hostname === 'maps.app.goo.gl' ||
        parsed.hostname === 'goo.gl' ||
        parsed.hostname.endsWith('google.com') ||
        parsed.hostname.endsWith('google.com.py')
      if (!valid) {
        throw new ValidationError('La URL no parece ser de Google Maps')
      }
    } catch {
      throw new ValidationError('Link de Google Maps inválido')
    }
  }
}

export async function listLocations(opts?: { includeInactive?: boolean }): Promise<SavedLocation[]> {
  const locations = await prisma.onboardingLocation.findMany({
    where: opts?.includeInactive ? undefined : { isActive: true },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  })
  return locations.map(toSavedLocation)
}

export async function getLocationById(id: string): Promise<SavedLocation | null> {
  const loc = await prisma.onboardingLocation.findUnique({ where: { id } })
  return loc ? toSavedLocation(loc) : null
}

export async function createLocation(
  input: LocationCreateInput,
  createdBy: string,
): Promise<SavedLocation> {
  validateInput(input)
  const name = input.name.trim()
  const existing = await prisma.onboardingLocation.findUnique({ where: { name } })
  if (existing) throw new ValidationError(`Ya existe una ubicación con nombre "${name}"`)

  const created = await prisma.onboardingLocation.create({
    data: {
      name,
      address: input.address.trim(),
      googleMapsUrl: input.googleMapsUrl.trim(),
      notes: input.notes?.trim() || null,
      createdBy,
    },
  })
  return toSavedLocation(created)
}

export async function updateLocation(
  id: string,
  input: LocationUpdateInput,
): Promise<SavedLocation> {
  validateInput(input)
  const current = await prisma.onboardingLocation.findUnique({ where: { id } })
  if (!current) throw new ValidationError('Ubicación no encontrada')

  const updated = await prisma.onboardingLocation.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? undefined,
      address: input.address?.trim() ?? undefined,
      googleMapsUrl: input.googleMapsUrl?.trim() ?? undefined,
      notes: input.notes !== undefined ? (input.notes?.trim() || null) : undefined,
      isActive: input.isActive ?? undefined,
    },
  })
  return toSavedLocation(updated)
}

export async function deactivateLocation(id: string): Promise<void> {
  await prisma.onboardingLocation.update({
    where: { id },
    data: { isActive: false },
  })
}
