"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Tag } from "./tag"

export interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
}

/** Entrada de tags: escribir + Enter agrega, Backspace borra el último. */
export function TagInput({
  value,
  onChange,
  placeholder = "Agregar y Enter…",
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const t = draft.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setDraft("")
  }
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface-3 px-2 py-1.5 focus-within:ring-[3px] focus-within:ring-ring/30",
        className,
      )}
    >
      {value.map((t) => (
        <Tag key={t} label={t} onRemove={() => onChange(value.filter((x) => x !== t))} />
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            add()
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-ink-subtle"
      />
    </div>
  )
}
