"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"

const DEFAULT_MAX_SIZE_MB = 5

export interface ImageUploadGridProps {
  files: File[]
  onChange: (files: File[]) => void
  /** Máximo de imágenes. */
  max?: number
  /** Tamaño máximo por archivo en MB. */
  maxSizeMB?: number
  label?: string
}

/**
 * Grilla controlada de subida de imágenes: botón dashed + previews cuadrados
 * con quitar en hover. Los blob URLs se crean en efecto y se revocan en
 * cleanup (StrictMode-safe, sin fugas).
 */
export function ImageUploadGrid({
  files,
  onChange,
  max = 5,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  label = "Agregar imágenes",
}: ImageUploadGridProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f))
    setUrls(next)
    return () => next.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  function isAcceptable(f: File) {
    return f.type.startsWith("image/") && f.size <= maxSizeMB * 1024 * 1024
  }

  function add(list: FileList | null) {
    if (!list) return
    const incoming = Array.from(list).filter(isAcceptable)
    onChange([...files, ...incoming].slice(0, max))
    if (inputRef.current) inputRef.current.value = ""
  }

  function remove(idx: number) {
    onChange(files.filter((_, i) => i !== idx))
  }

  const full = files.length >= max

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={full}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-[var(--r-md)] border border-dashed border-input px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-brand-300 hover:text-primary disabled:cursor-not-allowed disabled:opacity-55",
        )}
      >
        <ImagePlus className="size-4" aria-hidden />
        {full ? `Máximo ${max} imágenes` : label}
      </button>
      {files.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-[var(--r-md)] border border-border bg-[var(--surface-2)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {urls[i] && (
                <img src={urls[i]} alt={f.name} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Quitar ${f.name}`}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-[var(--r-pill)] bg-[rgba(0,0,0,0.55)] text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
