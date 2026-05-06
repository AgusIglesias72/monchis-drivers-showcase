import Link from 'next/link'
import { Calendar, MessageCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  /** Hay rules activas pero ninguna con cupos disponibles cerca. Mostramos
   *  copy distinto al "no hay capacitaciones todavía". */
  noSlots?: boolean
}

export function EmptyState({ noSlots = false }: Props) {
  if (noSlots) {
    return (
      <div className="rounded-2xl border-2 border-dashed bg-muted/30 px-6 py-12 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-warning-soft text-warning flex items-center justify-center mb-4">
          <Clock className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Próximas fechas en preparación</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
          Por ahora no tenemos cupos disponibles, pero abrimos fechas nuevas todas las semanas. Te
          avisamos por WhatsApp cuando salgan.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button asChild variant="outline">
            <a
              href="https://wa.me/15754194027?text=Hola%2C%20quiero%20saber%20cu%C3%A1ndo%20abren%20nuevas%20fechas%20de%20capacitaci%C3%B3n"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Avisame por WhatsApp
            </a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-dashed bg-muted/30 px-6 py-12 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-brand-soft text-brand flex items-center justify-center mb-4">
        <Calendar className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold mb-2">Pronto vamos a abrir nuevas capacitaciones</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
        Te avisamos por WhatsApp apenas haya nuevas fechas disponibles. Mientras tanto, podés
        adelantarte y empezar tu postulación.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
          <Link href="/">Empezar postulación</Link>
        </Button>
        <Button asChild variant="outline">
          <a href="https://wa.me/15754194027" target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-1.5 h-4 w-4" />
            WhatsApp
          </a>
        </Button>
      </div>
    </div>
  )
}
