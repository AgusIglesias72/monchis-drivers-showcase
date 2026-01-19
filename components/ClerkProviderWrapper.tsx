// components/ClerkProviderWrapper.tsx
'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { esES } from '@clerk/localizations'
import { ReactNode } from 'react'

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  // En Railway, deshabilitar Clerk completamente (solo necesitamos los endpoints de Playwright)
  const isRailway = process.env.NEXT_PUBLIC_DISABLE_CLERK === 'true'

  if (isRailway) {
    // Sin Clerk - solo renderizar children
    return <>{children}</>
  }

  // Con Clerk - para Vercel y desarrollo
  return (
    <ClerkProvider localization={esES}>
      {children}
    </ClerkProvider>
  )
}
