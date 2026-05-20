// lib/actions/whatsapp-templates.actions.ts
"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { getActiveTemplates } from "@/lib/services/whatsapp-templates.service"
import { revalidatePath } from "next/cache"

/**
 * Obtiene todas las plantillas activas para usar en el UI
 */
export async function getTemplatesForUI() {
  try {
    const templates = await getActiveTemplates()
    return {
      success: true,
      templates
    }
  } catch (error) {
    console.error("Error getting templates:", error)
    return {
      success: false,
      templates: [],
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}

/**
 * Obtiene TODAS las plantillas (activas e inactivas) para administración
 */
export async function getAllTemplates() {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error("No autorizado")

    const templates = await prisma.whatsAppTemplate.findMany({
      include: {
        createdByUser: {
          select: {
            firstName: true,
            fullName: true,
          }
        },
        updatedByUser: {
          select: {
            firstName: true,
            fullName: true,
          }
        }
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return {
      success: true,
      templates
    }
  } catch (error) {
    // No logueamos el error de DB acá — el page muestra un banner consistente
    // cuando `success: false` y el overlay de Next dev se dispara por cualquier
    // console.error en server actions, generando ruido visual durante caídas
    // temporales de Railway. Si necesitás debugging puntual, log explícito.
    return {
      success: false,
      templates: [],
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}

/**
 * Crea una nueva plantilla
 */
export async function createTemplate(data: {
  key: string
  name: string
  description?: string
  content: string
  category?: string
  order?: number
}) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error("No autorizado")

    // Verificar que la key no exista
    const existing = await prisma.whatsAppTemplate.findUnique({
      where: { key: data.key }
    })

    if (existing) {
      return {
        success: false,
        error: "Ya existe una plantilla con ese identificador (key)"
      }
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        ...data,
        createdBy: userId,
        updatedBy: userId,
      }
    })

    revalidatePath('/admin/plantillas-whatsapp')

    return {
      success: true,
      template
    }
  } catch (error) {
    console.error("Error creating template:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}

/**
 * Actualiza una plantilla existente
 */
export async function updateTemplate(id: string, data: {
  name?: string
  description?: string
  content?: string
  category?: string
  order?: number
  isActive?: boolean
}) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error("No autorizado")

    const template = await prisma.whatsAppTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedBy: userId,
      }
    })

    revalidatePath('/admin/plantillas-whatsapp')

    return {
      success: true,
      template
    }
  } catch (error) {
    console.error("Error updating template:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}

/**
 * Elimina una plantilla (soft delete)
 */
export async function deleteTemplate(id: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error("No autorizado")

    await prisma.whatsAppTemplate.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: userId,
      }
    })

    revalidatePath('/admin/plantillas-whatsapp')

    return {
      success: true
    }
  } catch (error) {
    console.error("Error deleting template:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}

/**
 * Duplica una plantilla existente
 */
export async function duplicateTemplate(id: string) {
  try {
    const { userId } = await auth()
    if (!userId) throw new Error("No autorizado")

    const original = await prisma.whatsAppTemplate.findUnique({
      where: { id }
    })

    if (!original) {
      return {
        success: false,
        error: "Plantilla no encontrada"
      }
    }

    // Generar una nueva key única
    let newKey = `${original.key}_copia`
    let counter = 1
    while (await prisma.whatsAppTemplate.findUnique({ where: { key: newKey } })) {
      newKey = `${original.key}_copia_${counter}`
      counter++
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        key: newKey,
        name: `${original.name} (Copia)`,
        description: original.description,
        content: original.content,
        category: original.category,
        order: original.order + 1,
        isActive: false, // Crear como inactiva por defecto
        createdBy: userId,
        updatedBy: userId,
      }
    })

    revalidatePath('/admin/plantillas-whatsapp')

    return {
      success: true,
      template
    }
  } catch (error) {
    console.error("Error duplicating template:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}
