"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/ds"
import { AuthShell } from "@/components/ds/auth-shell"

export default function SignupScreen() {
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mockup: sin auth real.
    console.log("signup submit")
  }

  return (
    <AuthShell
      title="Creá tu cuenta"
      subtitle="Empezá a repartir con Monchis"
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/design/screens/login"
            className="font-semibold text-primary hover:underline"
          >
            Iniciá sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre" htmlFor="signup-name">
          <Input
            id="signup-name"
            type="text"
            placeholder="Tu nombre completo"
            autoComplete="name"
          />
        </Field>

        <Field label="Email" htmlFor="signup-email">
          <Input
            id="signup-email"
            type="email"
            placeholder="vos@ejemplo.com"
            autoComplete="email"
          />
        </Field>

        <Field
          label="Contraseña"
          htmlFor="signup-password"
          hint="Mínimo 8 caracteres."
        >
          <div className="relative">
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
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

        <Field label="Confirmar contraseña" htmlFor="signup-confirm">
          <Input
            id="signup-confirm"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>

        <Button type="submit" className="mt-1 h-11 w-full">
          Crear cuenta
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Al continuar aceptás los Términos y la Política de privacidad.
        </p>
      </form>
    </AuthShell>
  )
}
