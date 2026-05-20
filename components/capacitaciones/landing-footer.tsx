import Link from 'next/link'
import { ArrowRight, MessageCircle, FileEdit, UserCheck } from 'lucide-react'
import { WHATSAPP_ACQUISITION_URL } from '@/lib/constants/contact'

const ACTIONS = [
  {
    icon: FileEdit,
    title: '¿Aún no postulaste?',
    description: 'Empezá tu postulación online, te toma menos de 10 minutos.',
    href: '/',
    cta: 'Postularme',
    external: false,
  },
  {
    icon: UserCheck,
    title: '¿Ya tenés cuenta?',
    description: 'Ingresá a tu portal de driver para ver el estado de tu postulación.',
    href: '/postulacion',
    cta: 'Ver mi portal',
    external: false,
  },
  {
    icon: MessageCircle,
    title: '¿Necesitás ayuda?',
    description: 'Escribinos por WhatsApp y te respondemos en menos de 1 hora hábil.',
    href: WHATSAPP_ACQUISITION_URL,
    cta: 'WhatsApp',
    external: true,
  },
]

export function LandingFooter() {
  return (
    <section className="my-12 lg:my-16">
      <div className="rounded-2xl border bg-muted/30 px-5 py-8 lg:px-10 lg:py-10">
        <div className="text-center mb-7">
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight">¿Tenés dudas?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Estamos para ayudarte en cada paso del proceso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ACTIONS.map((a) => {
            const Icon = a.icon
            return (
              <Link
                key={a.title}
                href={a.href}
                target={a.external ? '_blank' : undefined}
                rel={a.external ? 'noopener noreferrer' : undefined}
                className="group rounded-xl border bg-card p-5 transition-all hover:border-brand/40 hover:shadow-md"
              >
                <div className="h-10 w-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center mb-3">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="font-semibold text-sm mb-1">{a.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {a.description}
                </div>
                <div className="text-sm font-semibold text-brand inline-flex items-center gap-1">
                  {a.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
