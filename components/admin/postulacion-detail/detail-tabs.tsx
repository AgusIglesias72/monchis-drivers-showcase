// components/admin/postulacion-detail/detail-tabs.tsx
"use client"

import { useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { PillTabs } from "@/components/ds"

export type DetailTab = 'ficha' | 'documentos' | 'capacitacion' | 'actividad'

const DETAIL_TABS: DetailTab[] = ['ficha', 'documentos', 'capacitacion', 'actividad']

export function useDetailTab(): [DetailTab, (tab: DetailTab) => void] {
  const searchParams = useSearchParams()
  const raw = searchParams.get('tab')
  const tab: DetailTab = DETAIL_TABS.includes(raw as DetailTab) ? (raw as DetailTab) : 'ficha'

  const setTab = useCallback((next: DetailTab) => {
    const params = new URLSearchParams(window.location.search)
    if (next === 'ficha') {
      params.delete('tab')
    } else {
      params.set('tab', next)
    }
    const query = params.toString()
    window.history.replaceState(
      null,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    )
  }, [])

  return [tab, setTab]
}

interface DetailTabsBarProps {
  value: DetailTab
  onChange: (tab: DetailTab) => void
  counts: { documentos: number; actividad: number }
}

export function DetailTabsBar({ value, onChange, counts }: DetailTabsBarProps) {
  return (
    <PillTabs
      size="md"
      aria-label="Secciones de la postulación"
      value={value}
      onChange={(next) => onChange(next as DetailTab)}
      tabs={[
        { value: 'ficha', label: 'Ficha' },
        { value: 'documentos', label: 'Documentos', count: counts.documentos > 0 ? counts.documentos : undefined },
        { value: 'capacitacion', label: 'Capacitación y Pago' },
        { value: 'actividad', label: 'Actividad', count: counts.actividad > 0 ? counts.actividad : undefined },
      ]}
    />
  )
}
