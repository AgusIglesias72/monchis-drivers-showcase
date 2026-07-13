"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ds"
import { AuthShell } from "@/components/ds/auth-shell"

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium uppercase tracking-[var(--ls-label)] text-ink-subtle">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mockup: sin auth real.
    console.log("login submit")
  }

  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle="Ingresá para gestionar tus pedidos"
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link
            href="/design/screens/signup"
            className="font-semibold text-primary hover:underline"
          >
            Registrate
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => console.log("google sign-in")}
        >
          <GoogleGlyph />
          Continuar con Google
        </Button>

        <Divider label="o continuá con email" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              placeholder="vos@ejemplo.com"
              autoComplete="email"
            />
          </Field>

          <Field label="Contraseña" htmlFor="login-password">
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className={cn(
                  "absolute inset-y-0 right-0 flex items-center pr-3 text-ink-subtle",
                  "transition-colors hover:text-foreground",
                )}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </Field>

          <div className="flex justify-end">
            <Link
              href="/design/screens/reset"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button type="submit" className="h-11 w-full">
            Iniciar sesión
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}
