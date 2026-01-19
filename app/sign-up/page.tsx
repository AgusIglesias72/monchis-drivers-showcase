// app/sign-up/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone } from 'lucide-react'

const MONCHIS_RED = '#e7243f'

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50 px-4 py-12">
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
            Crear Cuenta
          </h1>
          <p className="text-gray-600">
            Registrate para acceder al panel
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {!pendingVerification ? (
            <>
              {/* Google Sign Up Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading || isLoading || !isLoaded}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 mb-6"
                style={{ 
                  ['--tw-ring-color' as any]: MONCHIS_RED 
                }}
              >
                {isGoogleLoading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continuar con Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">O registrate con email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors outline-none"
                      style={{
                        ['--tw-ring-color' as any]: MONCHIS_RED
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = MONCHIS_RED}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      placeholder="Juan"
                      disabled={isLoading || isGoogleLoading}
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors outline-none"
                      style={{
                        ['--tw-ring-color' as any]: MONCHIS_RED
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = MONCHIS_RED}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      placeholder="Pérez"
                      disabled={isLoading || isGoogleLoading}
                    />
                  </div>
                </div>

                {/* Email */}
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
                      disabled={isLoading || isGoogleLoading}
                    />
                  </div>
                </div>

                {/* Phone (Optional) */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors outline-none"
                      style={{
                        ['--tw-ring-color' as any]: MONCHIS_RED
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = MONCHIS_RED}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      placeholder="+54 9 11 1234-5678"
                      disabled={isLoading || isGoogleLoading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
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
                      disabled={isLoading || isGoogleLoading}
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={isLoading || isGoogleLoading}
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
                  disabled={isLoading || isGoogleLoading || !isLoaded}
                  className="w-full text-white py-2.5 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  style={{ 
                    backgroundColor: MONCHIS_RED,
                    ['--tw-ring-color' as any]: MONCHIS_RED
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading && !isGoogleLoading) {
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
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear Cuenta'
                  )}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              {/* Verification Message */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-3">
                  <Mail className="w-6 h-6" style={{ color: MONCHIS_RED }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Verifica tu email
                </h3>
                <p className="text-sm text-gray-600">
                  Te enviamos un código de 6 dígitos a <strong>{email}</strong>
                </p>
              </div>

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

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Verify Button */}
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
                    Verificando...
                  </>
                ) : (
                  'Verificar Email'
                )}
              </button>

              {/* Resend Code */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => signUp?.prepareEmailAddressVerification({ strategy: 'email_code' })}
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

          {/* Footer Links */}
          {!pendingVerification && (
            <div className="mt-6 text-center text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/sign-in"
                className="font-medium transition-colors"
                style={{ color: MONCHIS_RED }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#c51d35'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = MONCHIS_RED
                }}
              >
                Inicia sesión
              </Link>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}