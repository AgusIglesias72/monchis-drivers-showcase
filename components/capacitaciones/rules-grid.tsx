'use client'

import { useState, useMemo } from 'react'
import { RuleCard } from './rule-card'
import type { OnboardingModality } from '@prisma/client'
import type { RuleSummary, SlotResponse } from '@/lib/types/onboarding-rules.types'

interface RuleWithSlots extends RuleSummary {
  nextSlots: SlotResponse[]
}

type Filter = 'ALL' | OnboardingModality

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'IN_PERSON', label: 'Presenciales' },
  { value: 'VIRTUAL', label: 'Virtuales' },
  { value: 'HYBRID', label: 'Híbridas' },
]

export function RulesGrid({
  rules,
  sessionToken,
}: {
  rules: RuleWithSlots[]
  sessionToken?: string
}) {
  const [filter, setFilter] = useState<Filter>('ALL')

  // Mostramos los chips solo si hay 4+ capacitaciones y al menos 2 modalidades distintas
  const showFilters = useMemo(() => {
    if (rules.length < 4) return false
    const modalities = new Set(rules.map((r) => r.modality))
    return modalities.size >= 2
  }, [rules])

  const filteredRules = useMemo(() => {
    if (filter === 'ALL') return rules
    return rules.filter((r) => r.modality === filter)
  }, [rules, filter])

  // Conteos por modalidad para mostrar al lado del chip
  const counts = useMemo(() => {
    const map: Record<Filter, number> = {
      ALL: rules.length,
      IN_PERSON: 0,
      VIRTUAL: 0,
      HYBRID: 0,
    }
    for (const r of rules) map[r.modality]++
    return map
  }, [rules])

  return (
    <div>
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-5">
          {FILTERS.map((f) => {
            const count = counts[f.value]
            if (f.value !== 'ALL' && count === 0) return null
            const active = filter === f.value
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand text-brand-foreground border-brand'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {f.label}
                <span
                  className={`text-xs tabular-nums ${
                    active ? 'text-brand-foreground/80' : 'text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {filteredRules.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No hay capacitaciones con ese filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {filteredRules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} sessionToken={sessionToken} />
          ))}
        </div>
      )}
    </div>
  )
}
