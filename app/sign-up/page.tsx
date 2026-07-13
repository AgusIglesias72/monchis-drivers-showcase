// app/sign-up/page.tsx
'use client'

import { Suspense } from 'react'
import { ClerkPageWrapper } from '@/components/ClerkPageWrapper'
import { Spinner } from '@/components/ds'
import SignUpContent from './SignUpContent'

export default function SignUpPage() {
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
        <SignUpContent />
      </Suspense>
    </ClerkPageWrapper>
  )
}
