// app/postulacion/[token]/loading.tsx
// Loading state del portal

import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-12 w-12 animate-spin text-[#e7243f]" />
      <p className="text-gray-600">Cargando tu información...</p>
    </div>
  )
}
