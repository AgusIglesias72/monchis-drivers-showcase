// app/reset-password/ResetPasswordContent.tsx
'use client'

import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft } from 'lucide-react'

const MONCHIS_RED = '#e7243f'

export default function ResetPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const router = useRouter()
  
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <Image 
              src="/monchis-logo-red.png" 
              alt="Monchis" 
              width={180} 
              height={60}
              className="h-16 w-auto"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 'success' ? '¡Listo!' : 'Restablecer Contraseña'}
          </h1>
          <p className="text-gray-600">
            {step === 'email' && 'Te enviaremos un código para cambiar tu contraseña'}
            {step === 'code' && 'Ingresa el código y tu nueva contraseña'}
            {step === 'success' && 'Tu contraseña fue cambiada exitosamente'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {step === 'email' && (
            <form onSubmit={handleRequestCode} className="space-y-6">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors outline-none"
                    style={{
                      ['--tw-ring-color' as any]: MONCHIS_RED
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = MONCHIS_RED}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="tu@email.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isLoaded}
                className="w-full text-white py-2.5 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                style={{ 
                  backgroundColor: MONCHIS_RED,
                  ['--tw-ring-color' as any]: MONCHIS_RED
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#c51d35'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = MONCHIS_RED
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Enviando código...
                  </>
                ) : (
                  'Enviar Código'
                )}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {successMessage}
                </div>
              )}

              {/* Verification Code */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de verificación
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors text-center text-2xl tracking-widest outline-none"
                  style={{
                    ['--tw-ring-color' as any]: MONCHIS_RED
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = MONCHIS_RED}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                />
              </div>

              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors outline-none"
                    style={{
                      ['--tw-ring-color' as any]: MONCHIS_RED
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = MONCHIS_RED}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    placeholder="••••••••"
                    disabled={isLoading}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo 8 caracteres
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isLoaded || code.length !== 6}
                className="w-full text-white py-2.5 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                style={{ 
                  backgroundColor: MONCHIS_RED,
                  ['--tw-ring-color' as any]: MONCHIS_RED
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && code.length === 6) {
                    e.currentTarget.style.backgroundColor = '#c51d35'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = MONCHIS_RED
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Cambiando contraseña...
                  </>
                ) : (
                  'Cambiar Contraseña'
                )}
              </button>

              {/* Resend Code */}
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
                  className="text-sm font-medium transition-colors"
                  style={{ color: MONCHIS_RED }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#c51d35'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = MONCHIS_RED
                  }}
                  disabled={isLoading}
                >
                  Reenviar código
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Contraseña actualizada
              </h3>
              <p className="text-gray-600 mb-4">
                Redirigiendo al panel...
              </p>
              <Loader2 className="animate-spin h-6 w-6 mx-auto" style={{ color: MONCHIS_RED }} />
            </div>
          )}

          {/* Back to Sign In */}
          {step !== 'success' && (
            <div className="mt-6 text-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>

        {/* Back to Home */}
        {step !== 'success' && (
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Volver al inicio
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}