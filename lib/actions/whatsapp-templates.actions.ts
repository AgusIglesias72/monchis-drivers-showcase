// lib/actions/whatsapp-templates.actions.ts
"use server"

import { getActiveTemplates } from "@/lib/services/whatsapp-templates.service"

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
