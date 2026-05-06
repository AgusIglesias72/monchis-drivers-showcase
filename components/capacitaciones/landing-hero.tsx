import { Sparkles, Clock, Calendar, Zap } from 'lucide-react'

interface Stat {
  icon: typeof Clock
  label: string
  hint: string
}

const STATS: Stat[] = [
  {
    icon: Calendar,
    label: 'Reservá en 1 minuto',
    hint: 'Sin colas, sin llamadas',
  },
  {
    icon: Clock,
    label: 'Duración corta',
    hint: 'En menos de 2 horas estás listo',
  },
  {
    icon: Zap,
    label: 'Empezá esta semana',
    hint: 'Slots todos los días hábiles',
  },
]

export function LandingHero({ availableCount }: { availableCount: number }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card mb-8 lg:mb-10">
      {/* Background gradient sutil */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          background:
            'radial-gradient(circle at 0% 0%, var(--brand) 0%, transparent 45%), radial-gradient(circle at 100% 100%, var(--brand-hover) 0%, transparent 45%)',
        }}
      />
      {/* Línea brand arriba */}
      <div className="h-1.5 bg-gradient-to-r from-brand via-brand-hover to-brand relative" />

      <div className="relative px-5 py-8 lg:px-10 lg:py-12">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-soft text-brand px-3 py-1 text-xs font-semibold mb-4">
          <Sparkles className="h-3 w-3" />
          {availableCount > 0
            ? `${availableCount} ${availableCount === 1 ? 'capacitación disponible' : 'capacitaciones disponibles'}`
            : 'Capacitaciones para drivers Monchis'}
        </div>

        <h1 className="text-3xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
          Capacitaciones para
          <span className="block text-brand">Monchis Drivers</span>
        </h1>

        <p className="text-muted-foreground mt-4 text-base lg:text-lg max-w-xl leading-relaxed">
          Agendá tu capacitación, aprendé cómo funciona la app y arrancá a entregar con tu mochila
          y remera Monchis.
        </p>

        {/* Stats / beneficios inline */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          {STATS.map(({ icon: Icon, label, hint }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-lg border bg-background/60 backdrop-blur px-3.5 py-3"
            >
              <div className="shrink-0 h-9 w-9 rounded-md bg-brand-soft text-brand flex items-center justify-center">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
