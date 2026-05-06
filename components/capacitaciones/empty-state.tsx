import Link from 'next/link'
import { Calendar, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState() {
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
        <Button
          asChild
          className="bg-brand text-brand-foreground hover:bg-brand-hover"
        >
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
