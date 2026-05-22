// lib/utils/phone.ts
//
// Normaliza teléfonos al formato internacional que espera el bot WhatsApp.
// Los teléfonos en la DB suelen venir en formato local paraguayo ("0982398492")
// o argentino; el bot necesita el código de país (595..., 549...) para poder
// resolver el chat. Esta es la lógica única de formateo — usarla en TODOS los
// puntos que mandan al bot.

export function formatPhoneNumber(phone: string): string {
  const cleanPhone = String(phone).replace(/\D/g, '')

  // Ya tiene código de país.
  if (cleanPhone.startsWith('595')) return cleanPhone
  if (cleanPhone.startsWith('54') && cleanPhone.length >= 12) return cleanPhone

  // Paraguay sin código: 9 dígitos (981234567) → 595981234567
  if (cleanPhone.length === 9) return '595' + cleanPhone

  // Paraguay local con 0: 0982398492 (10 díg) → 595982398492
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    return '595' + cleanPhone.substring(1)
  }

  // Argentina sin código (10 díg sin 0) → 549...
  if (cleanPhone.length === 10 && !cleanPhone.startsWith('0')) {
    return '549' + cleanPhone
  }

  // Ya viene largo (con código): dejarlo.
  if (cleanPhone.length >= 12) return cleanPhone

  // Fallback: asumir Paraguay.
  return '595' + cleanPhone
}
