// app/sign-in/SignInContent.tsx
'use client'

import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AuthShell,
  Callout,
  DividerLabel,
  Field,
  GoogleIcon,
  LoadingButton,
  PasswordInput,
  Spinner,
} from '@/components/ds'

const ADMIN_TAGLINE = (
  <>
    Toda la operación, <em className="not-italic text-[#FFB3C2]">en un solo panel</em>.
  </>
)
const ADMIN_TAGLINE_SUB =
  'Turnos, pedidos en vivo, drivers y comunicaciones del equipo Monchis.'

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return

    setError('')
    setIsGoogleLoading(true)

    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/admin',
      })
    } catch (err: any) {
      console.error('Error con Google Sign In:', err)
      setError('Error al iniciar sesión con Google')
      setIsGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!isLoaded) return

    setError('')
    setIsLoading(true)

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.push('/admin')
      } else {
        setError('No se pudo completar el inicio de sesión')
      }
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err)

      if (err.errors?.[0]?.code === 'form_identifier_not_found') {
        setError('Email no encontrado')
      } else if (err.errors?.[0]?.code === 'form_password_incorrect') {
        setError('Contraseña incorrecta')
      } else if (err.errors?.[0]?.message) {
        setError(err.errors[0].message)
      } else {
        setError('Error al iniciar sesión. Intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Panel de Administración"
      subtitle="Ingresá con tu cuenta autorizada"
      tagline={ADMIN_TAGLINE}
      taglineSub={ADMIN_TAGLINE_SUB}
      footer={
        <>
          <p>
            ¿No tenés cuenta?{' '}
            <Link
              href="/sign-up"
              className="font-semibold text-primary hover:underline"
            >
              Registrate
            </Link>
          </p>
          <p className="mt-2">
            <Link href="/" className="hover:text-foreground">
              ← Volver al inicio
            </Link>
          </p>
        </>
      }
    >
      <div className="space-y-5">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading || !isLoaded}
        >
          {isGoogleLoading ? <Spinner size="sm" /> : <GoogleIcon />}
          Continuar con Google
        </Button>

        <DividerLabel>o continuá con email</DividerLabel>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@email.com"
              disabled={isLoading || isGoogleLoading}
            />
          </Field>

          <Field label="Contraseña" htmlFor="password">
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isLoading || isGoogleLoading}
            />
          </Field>

          <div className="flex justify-end">
            <Link
              href="/reset-password"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {error && <Callout tone="danger">{error}</Callout>}

          <LoadingButton
            type="submit"
            loading={isLoading}
            disabled={isGoogleLoading || !isLoaded}
            className="h-11 w-full"
          >
            {isLoading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </LoadingButton>
        </form>
      </div>
    </AuthShell>
  )
}
