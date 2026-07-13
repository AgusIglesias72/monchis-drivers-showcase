"use client"

import { Fragment } from "react"
import { MoreHorizontal, type LucideIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ActionMenuItem {
  label: React.ReactNode
  icon?: LucideIcon
  onSelect: () => void
  tone?: "default" | "danger"
  /** Inserta un separador antes de este item. */
  separatorBefore?: boolean
}

export interface ActionMenuProps {
  /** Trigger custom. Por defecto, un icon-button ghost con "···". */
  trigger?: React.ReactNode
  items: ActionMenuItem[]
  /** Alineación del menú respecto al trigger. */
  align?: "start" | "center" | "end"
  className?: string
}

/** Menú de acciones STUDIO sobre `DropdownMenu`. Items `danger` en destructive. */
export function ActionMenu({
  trigger,
  items,
  align = "end",
  className,
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Acciones"
          >
            <MoreHorizontal />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("min-w-40 rounded-[var(--radius-md)]", className)}
      >
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <Fragment key={i}>
              {item.separatorBefore && i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant={item.tone === "danger" ? "destructive" : "default"}
                onSelect={item.onSelect}
              >
                {Icon && <Icon />}
                {item.label}
              </DropdownMenuItem>
            </Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
