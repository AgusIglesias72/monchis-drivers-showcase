import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha para mostrar solo la fecha sin problemas de zona horaria
 * @param dateString - String de fecha en formato ISO o Date object
 * @returns String formateado en formato dd/mm/yyyy
 */
export function formatDateOnly(dateString: string | Date): string {
  if (!dateString) return ''
  
  try {
    let date: Date
    
    // Si ya es un objeto Date, usarlo directamente
    if (dateString instanceof Date) {
      date = dateString
    } else {
      // Si es string, crear Date object
      date = new Date(dateString)
    }
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString)
      return ''
    }
    
    // Para fechas que están en UTC con hora 00:00:00, extraer solo la parte de fecha
    // y crear una nueva fecha en UTC para evitar problemas de zona horaria
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1 // getUTCMonth() devuelve 0-11
    const day = date.getUTCDate()
    
    // Crear fecha en formato local sin problemas de zona horaria
    const localDate = new Date(year, month - 1, day)
    
    // Formatear usando toLocaleDateString
    const formatted = localDate.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    
    return formatted
  } catch (error) {
    console.error('Error formatting date:', dateString, error)
    return ''
  }
}

/**
 * Formatea una fecha de manera segura evitando problemas de zona horaria
 * @param dateString - String de fecha en formato ISO o Date object
 * @param options - Opciones de formateo
 * @returns String formateado
 */
export function formatDateSafe(dateString: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return ''
  
  try {
    let date: Date
    
    if (dateString instanceof Date) {
      date = dateString
    } else {
      date = new Date(dateString)
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString)
      return ''
    }
    
    // Usar UTC para evitar problemas de zona horaria
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    const day = date.getUTCDate()
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    
    const localDate = new Date(year, month - 1, day, hours, minutes)
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options
    }
    
    return localDate.toLocaleDateString('es-PY', defaultOptions)
  } catch (error) {
    console.error('Error formatting date:', dateString, error)
    return ''
  }
}

/**
 * Calcula la edad basada en una fecha de nacimiento
 * @param birthDate - Fecha de nacimiento
 * @returns Edad en años
 */
export function calculateAge(birthDate: string | Date): number {
  if (!birthDate) return 0
  
  try {
    let date: Date
    
    if (birthDate instanceof Date) {
      date = birthDate
    } else {
      date = new Date(birthDate)
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid birth date:', birthDate)
      return 0
    }
    
    const today = new Date()
    const birth = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    let age = current.getFullYear() - birth.getFullYear()
    const monthDiff = current.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && current.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  } catch (error) {
    console.error('Error calculating age:', birthDate, error)
    return 0
  }
}

/**
 * Convierte una fecha formateada (dd/mm/yyyy) a objeto Date
 * @param formattedDate - Fecha en formato dd/mm/yyyy
 * @returns Objeto Date o null si no se puede parsear
 */
function parseFormattedDate(formattedDate: string): Date | null {
  try {
    // Detectar si es formato dd/mm/yyyy
    const dateMatch = formattedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dateMatch) {
      const [, day, month, year] = dateMatch
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    return null
  } catch (error) {
    console.error('Error parsing formatted date:', error)
    return null
  }
}

/**
 * Formatea una fecha de nacimiento con la edad
 * @param birthDate - Fecha de nacimiento (puede ser string formateado, ISO string, o Date)
 * @returns String formateado con fecha y edad
 */
export function formatBirthDateWithAge(birthDate: string | Date): string {
  console.log('birthDate', birthDate)
  if (!birthDate) return ''
  
  try {
    let dateToUse: Date
    let displayDate: string
    
    // Si ya es un objeto Date, usarlo directamente
    if (birthDate instanceof Date) {
      dateToUse = birthDate
      displayDate = formatDateOnly(birthDate)
    } else {
      // Si es string, verificar si ya está formateado
      const stringDate = String(birthDate)
      
      // Si parece ser una fecha formateada (dd/mm/yyyy), parsearla
      if (stringDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parsedDate = parseFormattedDate(stringDate)
        if (parsedDate) {
          dateToUse = parsedDate
          displayDate = stringDate // Usar la fecha ya formateada
        } else {
          // Si no se puede parsear, usar la fecha original
          return stringDate
        }
      } else {
        // Si es un string ISO o similar, intentar crear Date
        dateToUse = new Date(birthDate)
        displayDate = formatDateOnly(birthDate)
      }
    }
    
    // Si no se pudo obtener una fecha válida
    if (!dateToUse || isNaN(dateToUse.getTime())) {
      console.warn('Could not parse birth date:', birthDate)
      return String(birthDate)
    }
    
    // Calcular la edad
    const age = calculateAge(dateToUse)
    
    // Si la edad es válida, agregarla
    if (age > 0) {
      return `${displayDate} (${age} años)`
    }
    
    // Si no se puede calcular la edad, devolver solo la fecha
    return displayDate || String(birthDate)
  } catch (error) {
    console.error('Error in formatBirthDateWithAge:', error)
    return String(birthDate)
  }
}