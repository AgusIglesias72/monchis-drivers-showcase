// app/admin/postulaciones/[slug]/not-found.tsx

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion, ArrowLeft, Search } from "lucide-react"

export default function PostulacionNotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icono */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
            <div className="relative bg-muted rounded-full p-6">
              <FileQuestion className="h-16 w-16 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Postulación no encontrada
          </h1>
          <p className="text-muted-foreground">
            La postulación que buscas no existe o ha sido eliminada.
          </p>
        </div>

        {/* Sugerencias */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-2">
          <p className="font-medium text-foreground">Posibles razones:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>El ID de la postulación es incorrecto</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>La postulación fue eliminada del sistema</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>El enlace está desactualizado o roto</span>
            </li>
          </ul>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/admin/postulaciones">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Postulaciones
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/admin/postulaciones">
              <Search className="h-4 w-4 mr-2" />
              Buscar Postulaciones
            </Link>
          </Button>
        </div>

        {/* Ayuda adicional */}
        <p className="text-xs text-muted-foreground pt-4">
          Si crees que esto es un error, contacta al administrador del sistema
        </p>
      </div>
    </div>
  )
}