// lib/services/whatsapp-templates.service.ts

import { prisma } from '@/lib/prisma'

export interface WhatsAppTemplate {
  id: string
  key: string
  name: string
  description: string | null
  content: string
  category: string | null
  order: number
  usageCount: number
}

/**
 * Obtiene todas las plantillas activas ordenadas
 */
export async function getActiveTemplates(): Promise<WhatsAppTemplate[]> {
  const templates = await prisma.whatsAppTemplate.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      content: true,
      category: true,
      order: true,
      usageCount: true,
    },
    orderBy: {
      order: 'asc',
    },
  })

  return templates
}

/**
 * Obtiene una plantilla por su key
 */
export async function getTemplateByKey(key: string) {
  return await prisma.whatsAppTemplate.findUnique({
    where: { key },
  })
}

/**
 * Incrementa el contador de uso de una plantilla
 */
export async function incrementTemplateUsage(templateId: string) {
  await prisma.whatsAppTemplate.update({
    where: { id: templateId },
    data: {
      usageCount: {
        increment: 1,
      },
      lastUsedAt: new Date(),
    },
  })
}

/**
 * Reemplaza los placeholders en el contenido de la plantilla
 */
export function replaceTemplatePlaceholders(
  content: string,
  data: { name?: string; [key: string]: any }
): string {
  let result = content

  // Reemplazar {name}
  if (data.name) {
    result = result.replace(/{name}/g, data.name)
  }

  // Puedes agregar más placeholders aquí en el futuro
  // Por ejemplo: {phone}, {fecha}, etc.

  return result
}
