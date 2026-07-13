// app/sign-in/page.tsx
'use client'

import { Suspense } from 'react'
import { ClerkPageWrapper } from '@/components/ClerkPageWrapper'
import { Spinner } from '@/components/ds'
import SignInContent from './SignInContent'

export default function SignInPage() {
  return (
    <ClerkPageWrapper>
      <Suspense
        fallback={
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
            <Spinner size="lg" className="text-primary" />
            <p className="text-sm text-muted-foreground">Cargando…</p>
          </div>
        }
      >
        <SignInContent />
      </Suspense>
    </ClerkPageWrapper>
  )
}
