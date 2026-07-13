// components/admin/admin-header.tsx
//
// DEPRECADO: el header por-página fue reemplazado por el top bar GLOBAL
// (`components/admin/admin-topbar.tsx`), que vive en `app/admin/layout.tsx`,
// ocupa todo el ancho arriba del sidebar y deriva el breadcrumb del pathname.
// Se deja este componente como no-op para no tener que tocar las ~28 vistas
// que todavía lo importan/renderizan; sus props se ignoran.

interface AdminHeaderProps {
  breadcrumbs?: {
    label: string
    href?: string
  }[]
}

export function AdminHeader(_props: AdminHeaderProps) {
  return null
}
