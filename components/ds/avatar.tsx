import * as React from "react"
import {
  Avatar as UIAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type AvatarSize = "sm" | "md" | "lg"

const SIZE: Record<AvatarSize, string> = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-12 text-base",
}

/** Iniciales a partir de un nombre (máx 2). */
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export interface AvatarProps {
  src?: string
  /** Nombre para el fallback de iniciales (y alt de la imagen). */
  name: string
  size?: AvatarSize
  className?: string
}

/** Avatar STUDIO: imagen con fallback de iniciales en `bg-brand-soft`. */
export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  return (
    <UIAvatar className={cn(SIZE[size], className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className="bg-brand-soft font-[family-name:var(--font-display)] font-bold text-primary">
        {initialsFrom(name)}
      </AvatarFallback>
    </UIAvatar>
  )
}

export interface AvatarGroupItem {
  src?: string
  name: string
}

export interface AvatarGroupProps {
  /** Items a renderizar como Avatares (alternativa a `children`). */
  items?: AvatarGroupItem[]
  /** Avatares como children (alternativa a `items`). */
  children?: React.ReactNode
  /** Máximo visible; el resto se colapsa en un +N. */
  max?: number
  size?: AvatarSize
  className?: string
}

/** Grupo de avatares solapados con anillo `ring-card`. Colapsa el excedente en +N. */
export function AvatarGroup({
  items,
  children,
  max,
  size = "md",
  className,
}: AvatarGroupProps) {
  const all: React.ReactNode[] = items
    ? items.map((it, i) => (
        <Avatar key={i} src={it.src} name={it.name} size={size} />
      ))
    : (React.Children.toArray(children) as React.ReactNode[])

  const limit = max ?? all.length
  const visible = all.slice(0, limit)
  const overflow = all.length - visible.length

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visible.map((node, i) => (
        <div
          key={i}
          className="rounded-full ring-2 ring-card"
          style={{ zIndex: visible.length - i }}
        >
          {node}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted font-[family-name:var(--font-mono)] font-medium text-muted-foreground ring-2 ring-card",
            SIZE[size],
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
