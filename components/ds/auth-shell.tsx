"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

export interface AuthShellProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  footer?: React.ReactNode
  /** Tagline grande del panel de marca (izquierda). */
  tagline?: React.ReactNode
  /** Texto secundario debajo del tagline. */
  taglineSub?: React.ReactNode
  children: React.ReactNode
  className?: string
}

// Foto de fondo del panel de marca.
const FONDO_AUTH =
  "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=1400&q=75"

function BrandPanel({
  tagline,
  taglineSub,
}: {
  tagline: React.ReactNode
  taglineSub: React.ReactNode
}) {
  return (
    <aside className="relative hidden flex-col overflow-hidden p-10 text-white md:flex">
      {/* Foto */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${FONDO_AUTH})` }}
        aria-hidden
      />
      {/* Velo de marca rojo */}
      <div
        className="absolute inset-0 opacity-82"
        style={{
          backgroundImage:
            "linear-gradient(150deg, #B00E2C 0%, #E52050 50%, #7A0820 100%)",
        }}
        aria-hidden
      />
      {/* Gradiente oscuro para legibilidad */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05) 55%)",
        }}
        aria-hidden
      />

      {/* Logo */}
      <div className="relative mb-auto">
        <Image
          src="/monchis-logo-white.png"
          alt="Monchis"
          width={132}
          height={40}
          priority
          className="h-9 w-auto"
        />
      </div>

      {/* Tagline — posicionado en el tercio inferior */}
      <div className="relative mt-auto max-w-md pb-4 pt-16">
        <p
          className="font-[family-name:var(--font-display)] font-extrabold leading-[1.08] tracking-[-0.02em]"
          style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)" }}
        >
          {tagline}
        </p>
        <p className="mt-3 max-w-sm text-[0.9rem] leading-relaxed text-white/70">
          {taglineSub}
        </p>

        {/* Dots + copyright */}
        <div className="mt-8 flex items-center gap-2">
          <span className="h-2 w-8 rounded-full bg-white" aria-hidden />
          <span className="h-2 w-2 rounded-full bg-white/40" aria-hidden />
          <span className="h-2 w-2 rounded-full bg-white/40" aria-hidden />
          <span className="ml-auto text-sm text-white/60">© 2026 Monchis</span>
        </div>
      </div>
    </aside>
  )
}

export function AuthShell({
  title,
  subtitle,
  footer,
  tagline = (
    <>
      Repartí con Monchis, <em className="not-italic text-[#FFB3C2]">ganás más</em>.
    </>
  ),
  taglineSub = "Manejá tus turnos, seguí tus pedidos y cobrá con seguridad.",
  children,
  className,
}: AuthShellProps) {
  return (
    <div className="grid h-full min-h-screen grid-cols-1 bg-card md:grid-cols-[1.05fr_1fr]">
      <BrandPanel tagline={tagline} taglineSub={taglineSub} />

      <main className="flex min-h-screen items-center justify-center overflow-y-auto p-8 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Logo móvil (solo visible sin el panel de marca) */}
          <div className="mb-8 flex justify-center md:hidden">
            <Image
              src="/monchis-logo-red.png"
              alt="Monchis"
              width={120}
              height={36}
              className="h-8 w-auto"
            />
          </div>

          <div className={cn("", className)}>
            <div className="mb-7">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[-0.02em] text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>

            {children}
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
