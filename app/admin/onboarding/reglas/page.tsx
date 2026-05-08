// app/admin/onboarding/reglas/page.tsx
//
// Redirect a la vista unificada en /admin/onboarding. Mantenemos la URL viva
// porque el sidebar viejo y links externos pueden seguir apuntando acá.

import { redirect } from 'next/navigation'

export default function ReglasRedirectPage() {
  redirect('/admin/onboarding?tab=capacitaciones')
}
