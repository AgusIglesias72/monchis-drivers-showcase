// app/sign-up/SignUpContent.tsx
'use client'

import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AuthShell,
  Callout,
  DividerLabel,
  Field,
  FieldRow,
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

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Para el flujo de verificación de email
  const [pendingVerification, setPendingVerification] = useState(false)
  const [code, setCode] = useState('')

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return

    setError('')
    setIsGoogleLoading(true)

    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/admin',
      })
    } catch (err: any) {
      console.error('Error con Google Sign Up:', err)
      setError('Error al registrarse con Google')
      setIsGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!isLoaded) return

    setError('')
    setIsLoading(true)

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
        ...(phoneNumber && { phoneNumber }),
      })

      // Enviar código de verificación al email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      // Mostrar formulario de verificación
      setPendingVerification(true)
    } catch (err: any) {
      console.error('Error al registrarse:', err)

      if (err.errors?.[0]?.code === 'form_identifier_exists') {
        setError('Este email ya está registrado')
      } else if (err.errors?.[0]?.code === 'form_password_pwned') {
        setError('Esta contraseña es muy común. Usa una más segura.')
      } else if (err.errors?.[0]?.code === 'form_password_length_too_short') {
        setError('La contraseña debe tener al menos 8 caracteres')
      } else if (err.errors?.[0]?.message) {
        setError(err.errors[0].message)
      } else {
        setError('Error al registrarse. Intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()

    if (!isLoaded) return

    setError('')
    setIsLoading(true)

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId })
        router.push('/admin')
      } else {
        setError('No se pudo completar la verificación')
      }
    } catch (err: any) {
      console.error('Error al verificar:', err)

      if (err.errors?.[0]?.code === 'form_code_incorrect') {
        setError('Código incorrecto')
      } else if (err.errors?.[0]?.message) {
        setError(err.errors[0].message)
      } else {
        setError('Error al verificar. Intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (pendingVerification) {
    return (
      <AuthShell
        title="Verificá tu email"
        subtitle={
          <>
            Te enviamos un código de 6 dígitos a <strong>{email}</strong>
          </>
        }
        tagline={ADMIN_TAGLINE}
        taglineSub={ADMIN_TAGLINE_SUB}
      >
        <form onSubmit={handleVerify} className="space-y-5">
          <div className="flex justify-center">
            <span className="grid size-12 place-items-center rounded-[var(--r-pill)] bg-brand-soft text-primary">
              <Mail className="size-5" />
            </span>
          </div>

          <Field label="Código de verificación" htmlFor="code">
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              placeholder="000000"
              disabled={isLoading}
              className="text-center font-[family-name:var(--font-mono)] !text-2xl tracking-[0.3em]"
            />
          </Field>

          {error && <Callout tone="danger">{error}</Callout>}

          <LoadingButton
            type="submit"
            loading={isLoading}
            disabled={!isLoaded || code.length !== 6}
            className="h-11 w-full"
          >
            {isLoading ? 'Verificando…' : 'Verificar email'}
          </LoadingButton>

          <div className="text-center">
            <button
              type="button"
              onClick={() =>
                signUp?.prepareEmailAddressVerification({ strategy: 'email_code' })
              }
              disabled={isLoading}
              className="text-sm font-medium text-primary hover:underline"
            >
              Reenviar código
            </button>
          </div>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Creá tu cuenta"
      subtitle="Registrate para acceder al panel"
      tagline={ADMIN_TAGLINE}
      taglineSub={ADMIN_TAGLINE_SUB}
      footer={
        <>
          <p>
            ¿Ya tenés cuenta?{' '}
            <Link
              href="/sign-in"
              className="font-semibold text-primary hover:underline"
            >
              Iniciá sesión
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
          onClick={handleGoogleSignUp}
          disabled={isGoogleLoading || isLoading || !isLoaded}
        >
          {isGoogleLoading ? <Spinner size="sm" /> : <GoogleIcon />}
          Continuar con Google
        </Button>

        <DividerLabel>o registrate con email</DividerLabel>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldRow>
            <Field label="Nombre" htmlFor="firstName" className="flex-1">
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                placeholder="Juan"
                disabled={isLoading || isGoogleLoading}
              />
            </Field>
            <Field label="Apellido" htmlFor="lastName" className="flex-1">
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
                placeholder="Pérez"
                disabled={isLoading || isGoogleLoading}
              />
            </Field>
          </FieldRow>

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

          <Field
            label={
              <>
                Teléfono <span className="normal-case text-ink-subtle">(opcional)</span>
              </>
            }
            htmlFor="phone"
          >
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              autoComplete="tel"
              placeholder="+595 981 123 456"
              disabled={isLoading || isGoogleLoading}
            />
          </Field>

          <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              disabled={isLoading || isGoogleLoading}
            />
          </Field>

          {error && <Callout tone="danger">{error}</Callout>}

          <LoadingButton
            type="submit"
            loading={isLoading}
            disabled={isGoogleLoading || !isLoaded}
            className="h-11 w-full"
          >
            {isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
          </LoadingButton>
        </form>
      </div>
    </AuthShell>
  )
}
