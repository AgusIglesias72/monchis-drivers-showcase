"use client"

import { useRef, useState } from "react"
import { UploadCloud, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FileUploadProps {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  hint?: React.ReactNode
  className?: string
}

/** Dropzone STUDIO: arrastrar o click; lista los seleccionados con quitar. */
export function FileUpload({
  onFiles,
  accept,
  multiple,
  hint,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const handle = (list: FileList | null) => {
    if (!list) return
    const arr = Array.from(list)
    const next = multiple ? [...files, ...arr] : arr
    setFiles(next)
    onFiles(next)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          handle(e.dataTransfer.files)
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed p-6 text-center transition-colors",
          drag
            ? "border-brand-300 bg-brand-soft/50"
            : "border-border bg-card hover:border-brand-300 hover:bg-brand-soft/30",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-primary">
          <UploadCloud className="size-5" />
        </span>
        <span className="text-sm font-medium">Arrastrá archivos o hacé click</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-3 px-2.5 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-mono)]">
                {f.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = files.filter((_, j) => j !== i)
                  setFiles(next)
                  onFiles(next)
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Quitar"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
