import { ClipboardCheck, CalendarCheck, GraduationCap, Bike } from 'lucide-react'

const STEPS = [
  {
    icon: ClipboardCheck,
    title: 'Postulate online',
    description: 'Subí tus papeles y datos en menos de 10 minutos desde tu celular.',
    accent: 'brand',
  },
  {
    icon: CalendarCheck,
    title: 'Reservá tu fecha',
    description: 'Cuando aprobamos tu postulación recibís el link para elegir día y horario.',
    accent: 'info',
  },
  {
    icon: GraduationCap,
    title: 'Vení a la capacitación',
    description: 'Te enseñamos cómo funciona la app y entregamos tu mochila + remera.',
    accent: 'warning',
  },
  {
    icon: Bike,
    title: 'A entregar',
    description: 'Activamos tu cuenta y empezás a recibir pedidos en tu zona.',
    accent: 'success',
  },
] as const

const ACCENT_CLASSES = {
  brand: 'bg-brand-soft text-brand',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
} as const

export function HowItWorks() {
  return (
    <section className="my-12 lg:my-16">
      <div className="text-center mb-8 lg:mb-10">
        <div className="text-xs uppercase tracking-wider font-semibold text-brand mb-2">
          Cómo funciona
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
          De postulación a tu primer pedido en 4 pasos
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div
              key={step.title}
              className="relative rounded-xl border bg-card p-5 transition-all hover:shadow-md"
            >
              {/* Número en fondo */}
              <div
                aria-hidden
                className="absolute right-3 top-2 text-6xl font-bold text-muted-foreground/[0.07] select-none leading-none"
              >
                {i + 1}
              </div>

              <div
                className={`relative h-11 w-11 rounded-lg flex items-center justify-center mb-4 ${ACCENT_CLASSES[step.accent]}`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <h3 className="relative font-semibold text-base mb-1.5">{step.title}</h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
