// app/reset-password/ResetPasswordContent.tsx
'use client'

import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  AuthShell,
  Callout,
  Field,
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

export default function ResetPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email')

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault()

    if (!isLoaded) return

    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      })

      setSuccessMessage('Te enviamos un código a tu email')
      setStep('code')
    } catch (err: any) {
      console.error('Error al solicitar código:', err)

      if (err.errors?.[0]?.code === 'form_identifier_not_found') {
        setError('No encontramos una cuenta con ese email')
      } else if (err.errors?.[0]?.message) {
        setError(err.errors[0].message)
      } else {
        setError('Error al enviar el código. Intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()

    if (!isLoaded) return

    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        setStep('success')

        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push('/admin')
        }, 2000)
      } else {
        setError('No se pudo completar el cambio de contraseña')
      }
    } catch (err: any) {
      console.error('Error al cambiar contraseña:', err)

      if (err.errors?.[0]?.code === 'form_code_incorrect') {
        setError('Código incorrecto')
      } else if (err.errors?.[0]?.code === 'form_password_pwned') {
        setError('Esta contraseña es muy común. Usa una más segura.')
      } else if (err.errors?.[0]?.code === 'form_password_length_too_short') {
        setError('La contraseña debe tener al menos 8 caracteres')
      } else if (err.errors?.[0]?.message) {
        setError(err.errors[0].message)
      } else {
        setError('Error al cambiar la contraseña. Intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <AuthShell
        title="Contraseña actualizada"
        subtitle="Redirigiendo al panel…"
        tagline={ADMIN_TAGLINE}
        taglineSub={ADMIN_TAGLINE_SUB}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <span className="grid size-14 place-items-center rounded-[var(--r-pill)] bg-success-soft text-success">
            <Check className="size-7" />
          </span>
          <Spinner size="md" className="text-primary" />
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Restablecer contraseña"
      subtitle={
        step === 'email'
          ? 'Te enviaremos un código para cambiar tu contraseña'
          : 'Ingresá el código y tu nueva contraseña'
      }
      tagline={ADMIN_TAGLINE}
      taglineSub={ADMIN_TAGLINE_SUB}
      footer={
        <>
          <p>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Volver al inicio de sesión
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
      {step === 'email' ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@email.com"
              disabled={isLoading}
            />
          </Field>

          {error && <Callout tone="danger">{error}</Callout>}

          <LoadingButton
            type="submit"
            loading={isLoading}
            disabled={!isLoaded}
            className="h-11 w-full"
          >
            {isLoading ? 'Enviando código…' : 'Enviar código'}
          </LoadingButton>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {successMessage && <Callout tone="success">{successMessage}</Callout>}

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

          <Field label="Nueva contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </Field>

          {error && <Callout tone="danger">{error}</Callout>}

          <LoadingButton
            type="submit"
            loading={isLoading}
            disabled={!isLoaded || code.length !== 6}
            className="h-11 w-full"
          >
            {isLoading ? 'Cambiando contraseña…' : 'Cambiar contraseña'}
          </LoadingButton>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setCode('')
                setPassword('')
                setError('')
                setSuccessMessage('')
              }}
              disabled={isLoading}
              className="text-sm font-medium text-primary hover:underline"
            >
              Reenviar código
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
