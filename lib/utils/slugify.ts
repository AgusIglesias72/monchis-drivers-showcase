// lib/utils/slugify.ts
//
// Slugifier conservador, pensado para slugs públicos de capacitaciones.
// Mapea acentos y caracteres no ASCII a equivalentes seguros, y limita largo.

export function slugify(input: string, maxLength = 80): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 80
}
