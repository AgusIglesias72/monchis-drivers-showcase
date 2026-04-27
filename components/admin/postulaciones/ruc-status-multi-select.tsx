'use client'

import { ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import type { RucStatusSlug } from '@/types/postulacion-filters.types'

interface RucStatusOption {
  slug: RucStatusSlug
  label: string
}

const OPTIONS: RucStatusOption[] = [
  { slug: 'activo', label: 'Activo' },
  { slug: 'cancelado', label: 'Cancelado' },
  { slug: 'suspension-temporal', label: 'Suspensión Temporal' },
  { slug: 'bloqueado', label: 'Bloqueado' },
  { slug: 'no-encontrado', label: 'No encontrado' },
  { slug: 'no-consultado', label: 'No consultado' },
  { slug: 'error', label: 'Error de consulta' },
]

interface RucStatusMultiSelectProps {
  value: RucStatusSlug[]
  onChange: (next: RucStatusSlug[]) => void
  id?: string
}

export function RucStatusMultiSelect({ value, onChange, id }: RucStatusMultiSelectProps) {
  const toggle = (slug: RucStatusSlug) => {
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug))
    } else {
      onChange([...value, slug])
    }
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const triggerLabel =
    value.length === 0
      ? 'Todos los estados'
      : value.length === 1
        ? OPTIONS.find((o) => o.slug === value[0])?.label ?? value[0]
        : `${value.length} seleccionados`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-9 w-full justify-between px-3 text-sm font-normal"
        >
          <span className={value.length === 0 ? 'text-muted-foreground' : ''}>{triggerLabel}</span>
          <div className="flex items-center gap-1">
            {value.length > 0 && (
              <span
                role="button"
                onClick={clearAll}
                className="rounded hover:bg-muted p-0.5"
                aria-label="Limpiar selección"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="max-h-72 overflow-y-auto">
          {OPTIONS.map((opt) => {
            const checked = value.includes(opt.slug)
            return (
              <label
                key={opt.slug}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(opt.slug)}
                />
                <span className="flex-1">{opt.label}</span>
              </label>
            )
          })}
        </div>
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t pt-2 mt-1 px-1">
            {value.map((slug) => {
              const label = OPTIONS.find((o) => o.slug === slug)?.label ?? slug
              return (
                <Badge
                  key={slug}
                  variant="secondary"
                  className="gap-1 cursor-pointer"
                  onClick={() => toggle(slug)}
                >
                  {label}
                  <X className="h-3 w-3" />
                </Badge>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
