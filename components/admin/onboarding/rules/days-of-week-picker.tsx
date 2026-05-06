'use client'

import { DAY_NAMES_ES } from '@/lib/types/onboarding-rules.types'

interface Props {
  value: number[]
  onChange: (next: number[]) => void
  disabled?: boolean
}

const ORDER = [1, 2, 3, 4, 5, 6, 0] // Lun..Sáb, Dom

export function DaysOfWeekPicker({ value, onChange, disabled }: Props) {
  function toggle(d: number) {
    if (disabled) return
    if (value.includes(d)) onChange(value.filter((x) => x !== d))
    else onChange([...value, d].sort())
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {ORDER.map((d) => {
        const active = value.includes(d)
        return (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            disabled={disabled}
            className={`h-10 w-12 rounded-md border text-sm font-medium transition-colors disabled:opacity-50 ${
              active
                ? 'bg-brand text-brand-foreground border-brand hover:bg-brand-hover'
                : 'hover:bg-muted'
            }`}
            aria-pressed={active}
          >
            {DAY_NAMES_ES[d]}
          </button>
        )
      })}
    </div>
  )
}
