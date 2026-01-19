// app/sso-callback/page.tsx
'use client'

import { Suspense } from 'react'
import { ClerkPageWrapper } from '@/components/ClerkPageWrapper'
import SSOCallbackContent from './SSOCallbackContent'

export default function SSOCallbackPage() {
  return (
    <ClerkPageWrapper>
      <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#e7243f' }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-white">Completando el inicio de sesión...</p>
          </div>
        </div>
      }
    >
      <SSOCallbackContent />
    </Suspense>
    </ClerkPageWrapper>
  )
}
