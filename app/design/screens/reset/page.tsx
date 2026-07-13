"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Callout, Field } from "@/components/ds"
import { AuthShell } from "@/components/ds/auth-shell"

export default function ResetScreen() {
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mockup: sin auth real. Mostramos el estado de éxito.
    setSent(true)
    console.log("reset submit")
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle={
        sent
          ? undefined
          : "Te enviamos un enlace para restablecerla"
      }
      footer={
        <Link
          href="/design/screens/login"
          className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Volver a iniciar sesión
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <Callout tone="success" title="Revisá tu correo">
            Si existe una cuenta asociada a ese email, vas a recibir
            instrucciones para restablecer tu contraseña en unos minutos.
          </Callout>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => setSent(false)}
          >
            Enviar de nuevo
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Email"
            htmlFor="reset-email"
            hint="Usá el email con el que te registraste."
          >
            <Input
              id="reset-email"
              type="email"
              placeholder="vos@ejemplo.com"
              autoComplete="email"
            />
          </Field>

          <Button type="submit" className="mt-1 h-11 w-full">
            Enviar instrucciones
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
