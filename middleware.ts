// middleware.ts (en la raíz del proyecto)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Rutas públicas (formulario, landing, sign-in y sign-up)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in',
  '/sign-up',
  '/reset-password',
  '/sso-callback',
  '/postulacion(.*)', // ← Portal de autogestión (rutas públicas con token)
  '/capacitaciones(.*)', // ← Pantalla pública de capacitaciones (gating al reservar)
  '/api/public(.*)', // ← APIs públicas (capacitaciones, auth via shareToken)
  '/api/form(.*)',
  '/api/postulacion/(.*)', // ← APIs del portal (generate-token tiene auth interna)
  '/api/webhooks(.*)',
  '/api/cron(.*)',
  '/api/admin/postulaciones/export-json(.*)',
  '/api/reports/external-drivers(.*)',
  '/api/reports/process-all(.*)',
  '/api/reports/upload-only(.*)',
  '/api/bonuses(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Solo protegemos las rutas que NO son públicas
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Incluir todas las rutas excepto archivos estáticos y Next.js internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}