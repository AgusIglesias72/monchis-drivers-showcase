// components/ClerkProviderWrapper.tsx
'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { esES } from '@clerk/localizations'
import { ReactNode } from 'react'

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider localization={esES}>
      {children}
    </ClerkProvider>
  )
}
