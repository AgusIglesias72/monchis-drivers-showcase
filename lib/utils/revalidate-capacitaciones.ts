import { revalidateTag } from 'next/cache'

// Invalida el cache de las vistas públicas de capacitaciones tras mutar una
// regla / sus eventos. Sin esto, una capacitación recién publicada o editada
// no aparece hasta que vence el revalidate (60s) o un nuevo deploy.
//
// Tags consumidos por las páginas públicas:
//   /capacitaciones        → 'capacitaciones-rules' + 'capacitaciones-combined-slots'
//   /capacitaciones/[slug] → `capacitaciones-rule-${slug}` + `capacitaciones-slots-${slug}`
export function revalidateCapacitacionesPublic(slug?: string | null) {
  revalidateTag('capacitaciones-rules')
  revalidateTag('capacitaciones-combined-slots')
  if (slug) {
    revalidateTag(`capacitaciones-rule-${slug}`)
    revalidateTag(`capacitaciones-slots-${slug}`)
  }
}
