import { Fragment } from 'react'

interface ReasoningTextProps {
  text: string
  className?: string
}

/**
 * Renderiza un string del razonamiento del agente convirtiendo `**X**` en <strong>.
 * Preserva saltos de línea y espacios (whitespace-pre-wrap).
 *
 * Parser simple (no Markdown completo):
 * - `**texto**` → <strong>texto</strong>
 * - Todo el resto se renderiza como texto plano.
 */
export function ReasoningText({ text, className }: ReasoningTextProps) {
  return (
    <pre
      className={
        className ??
        'text-xs whitespace-pre-wrap break-words text-muted-foreground bg-muted/30 border rounded-md p-3 leading-relaxed font-sans'
      }
    >
      {renderWithBold(text)}
    </pre>
  )
}

function renderWithBold(text: string): React.ReactNode {
  if (!text) return null
  // Split por **...**; capturamos el contenido entre asteriscos
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}
