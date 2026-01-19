// app/sign-in/page.tsx
import dynamic from 'next/dynamic'

export const metadata = {
  title: 'Iniciar Sesión - Monchis',
}

// Force dynamic rendering to avoid pre-rendering Clerk components
export const dynamic = 'force-dynamic'

// Dynamically import the client component with no SSR
const SignInContent = dynamic(() => import('./SignInContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando...</p>
      </div>
    </div>
  ),
})

export default function SignInPage() {
  return <SignInContent />
}
