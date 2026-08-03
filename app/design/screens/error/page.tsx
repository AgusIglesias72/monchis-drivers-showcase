import Link from "next/link"
import Image from "next/image"
import { Compass, Home } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function ErrorScreen() {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center px-4 py-10 text-center"
      style={{ backgroundImage: "var(--grad-page)" }}
    >
      <Image
        src="/monchis-logo-red.png"
        alt="Monchis"
        width={132}
        height={40}
        priority
        className="h-8 w-auto"
      />

      <div className="mt-12 flex size-20 items-center justify-center rounded-[var(--radius-2xl)] bg-brand-soft text-primary shadow-[var(--shadow-2)]">
        <Compass className="size-9" />
      </div>

      <h1 className="mt-8 font-[family-name:var(--font-display)] text-7xl font-bold tracking-[var(--ls-tight)] text-foreground sm:text-8xl">
        404
      </h1>

      <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-[var(--ls-tight)] text-foreground">
        Esta página se fue a repartir
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground sm:text-base">
        No encontramos lo que buscabas. Puede que el enlace esté roto o que la
        página se haya movido.
      </p>

      <Button asChild className="mt-8 h-11 px-6">
        <Link href="/design/screens">
          <Home className="size-4" />
          Volver al inicio
        </Link>
      </Button>
    </div>
  )
}
