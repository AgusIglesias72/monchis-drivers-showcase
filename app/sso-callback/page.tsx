// app/sso-callback/page.tsx
import dynamic from 'next/dynamic'

export const metadata = {
  title: 'Completando inicio de sesión - Monchis',
}

// Force dynamic rendering to avoid pre-rendering Clerk components
export const dynamic = 'force-dynamic'

// Dynamically import the client component with no SSR
const SSOCallbackContent = dynamic(() => import('./SSOCallbackContent'), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#e7243f' }}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-white">Completando el inicio de sesión...</p>
      </div>
    </div>
  ),
})

export default function SSOCallbackPage() {
  return <SSOCallbackContent />
}
