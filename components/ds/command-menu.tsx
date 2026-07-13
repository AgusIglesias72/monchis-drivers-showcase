"use client"

import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Kbd } from "./kbd"

export interface CommandMenuItem {
  label: string
  icon?: LucideIcon
  shortcut?: string
  onSelect: () => void
}

export interface CommandMenuGroup {
  heading?: string
  items: CommandMenuItem[]
}

export interface CommandMenuProps {
  groups: CommandMenuGroup[]
  placeholder?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Paleta de comandos (⌘/Ctrl + K). Controlado u autónomo. */
export function CommandMenu({
  groups,
  placeholder = "Buscar acción…",
  open,
  onOpenChange,
}: CommandMenuProps) {
  const [internal, setInternal] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internal
  const setOpen = (o: boolean) => {
    if (!isControlled) setInternal(o)
    onOpenChange?.(o)
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!isOpen)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        {groups.map((g, gi) => (
          <div key={g.heading ?? gi}>
            {gi > 0 && <CommandSeparator />}
            <CommandGroup heading={g.heading}>
              {g.items.map((it) => {
                const Icon = it.icon
                return (
                  <CommandItem
                    key={it.label}
                    onSelect={() => {
                      setOpen(false)
                      it.onSelect()
                    }}
                  >
                    {Icon && <Icon className="size-4" />}
                    <span>{it.label}</span>
                    {it.shortcut && <CommandShortcut>{it.shortcut}</CommandShortcut>}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  )
}

/** Botón visual que dispara la paleta (usar en modo controlado). */
export function CommandMenuTrigger({
  onClick,
  className,
}: {
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:border-brand-300 hover:text-foreground",
        className,
      )}
    >
      <span>Buscar…</span>
      <Kbd>⌘K</Kbd>
    </button>
  )
}
