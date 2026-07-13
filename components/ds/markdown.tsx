import { Fragment, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Solo http(s), mailto o rutas relativas — todo lo demás queda como texto plano. */
function safeHref(url: string): string | null {
  const u = url.trim()
  if (/^(https?:\/\/|mailto:)/i.test(u)) return u
  if (u.startsWith("/")) return u
  return null
}

const INLINE =
  /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  let k = 0
  while (rest.length) {
    const m = INLINE.exec(rest)
    if (!m || m.index === undefined) {
      out.push(rest)
      break
    }
    if (m.index > 0) out.push(rest.slice(0, m.index))
    const tok = m[0]
    if (m[2] != null) out.push(<strong key={k}>{m[2]}</strong>)
    else if (m[3] != null) out.push(<strong key={k}>{m[3]}</strong>)
    else if (m[4] != null) out.push(<em key={k}>{m[4]}</em>)
    else if (m[5] != null) out.push(<em key={k}>{m[5]}</em>)
    else if (m[6] != null)
      out.push(
        <code
          key={k}
          className="rounded bg-muted px-1 py-0.5 font-[family-name:var(--font-mono)] text-[0.9em] text-foreground"
        >
          {m[6]}
        </code>,
      )
    else if (m[7] != null && m[8] != null) {
      const href = safeHref(m[8])
      out.push(
        href ? (
          <a
            key={k}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-2 hover:opacity-80"
          >
            {m[7]}
          </a>
        ) : (
          tok
        ),
      )
    }
    k++
    rest = rest.slice(m.index + tok.length)
  }
  return out
}

function renderParagraphLines(lines: string[]): ReactNode[] {
  return lines.flatMap((line, i) => [
    ...(i > 0 ? [<br key={`br-${i}`} />] : []),
    <Fragment key={`ln-${i}`}>{renderInline(line)}</Fragment>,
  ])
}

const H = ["text-lg", "text-base", "text-sm"]

/**
 * Renderer de Markdown mínimo y seguro: sin dependencias ni
 * `dangerouslySetInnerHTML`. Cubre #/##/###, listas, citas,
 * **bold**, *italic*, `code` y [links] (filtrados a http(s)/mailto/relativos).
 */
export function Markdown({
  source,
  className,
}: {
  source: string
  className?: string
}) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/)
  const nodes: ReactNode[] = []

  blocks.forEach((raw, bi) => {
    const block = raw.replace(/\s+$/, "")
    if (!block.trim()) return
    const lines = block.split("\n")

    const h = /^(#{1,3})\s+(.*)$/.exec(lines[0]!)
    if (h && lines.length === 1) {
      const level = h[1]!.length
      const cls = cn(
        "mt-2 font-[family-name:var(--font-display)] font-bold text-foreground",
        H[level - 1],
      )
      nodes.push(
        level === 1 ? (
          <h3 key={bi} className={cls}>{renderInline(h[2]!)}</h3>
        ) : level === 2 ? (
          <h4 key={bi} className={cls}>{renderInline(h[2]!)}</h4>
        ) : (
          <h5 key={bi} className={cls}>{renderInline(h[2]!)}</h5>
        ),
      )
      return
    }

    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      nodes.push(
        <ul key={bi} className="ml-5 list-disc space-y-1">
          {lines.map((l, i) => (
            <li key={i}>{renderInline(l.replace(/^\s*[-*]\s+/, ""))}</li>
          ))}
        </ul>,
      )
      return
    }

    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      nodes.push(
        <ol key={bi} className="ml-5 list-decimal space-y-1">
          {lines.map((l, i) => (
            <li key={i}>{renderInline(l.replace(/^\s*\d+\.\s+/, ""))}</li>
          ))}
        </ol>,
      )
      return
    }

    if (lines.every((l) => /^\s*>\s?/.test(l))) {
      nodes.push(
        <blockquote
          key={bi}
          className="border-l-2 border-primary pl-3 italic text-muted-foreground"
        >
          {renderParagraphLines(lines.map((l) => l.replace(/^\s*>\s?/, "")))}
        </blockquote>,
      )
      return
    }

    nodes.push(<p key={bi}>{renderParagraphLines(lines)}</p>)
  })

  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {nodes}
    </div>
  )
}
