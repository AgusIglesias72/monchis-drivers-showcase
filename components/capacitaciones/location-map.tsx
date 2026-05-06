'use client'

import { ExternalLink, MapPin } from 'lucide-react'

interface Props {
  address: string
  googleMapsUrl?: string | null
  notes?: string | null
}

/**
 * Mapa público para la pantalla de capacitación.
 * Usa el embed gratuito de Google Maps (no requiere API key) basado en la
 * dirección. El link "Cómo llegar" abre el googleMapsUrl que copió el admin
 * (o cae a una búsqueda por dirección si no hay).
 */
export function LocationMap({ address, googleMapsUrl, notes }: Props) {
  const encoded = encodeURIComponent(address)
  const embedSrc = `https://maps.google.com/maps?q=${encoded}&output=embed`
  const directionsHref =
    googleMapsUrl ||
    `https://www.google.com/maps/dir/?api=1&destination=${encoded}`

  return (
    <div className="space-y-3">
      <div className="h-60 lg:h-80 rounded-xl overflow-hidden border bg-muted">
        <iframe
          src={embedSrc}
          title={`Mapa de ${address}`}
          width="100%"
          height="100%"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block"
        />
      </div>
      <div className="flex items-start gap-2 text-sm">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-foreground/90">{address}</div>
          {notes && <div className="text-xs text-muted-foreground mt-0.5 italic">{notes}</div>}
        </div>
      </div>
      <a
        href={directionsHref}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        Cómo llegar <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}
