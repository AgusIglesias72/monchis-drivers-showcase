// components/admin/dashboard-filters.tsx
"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

type FilterType = 'created' | 'completed' | 'event'
type GroupByType = 'day' | 'week' | 'month'

interface DashboardFiltersProps {
  currentStartDate?: string
  currentEndDate?: string
  currentFilterType?: FilterType
  currentGroupBy?: GroupByType
}

export function DashboardFilters({
  currentStartDate,
  currentEndDate,
  currentFilterType = 'created',
  currentGroupBy = 'week',
}: DashboardFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [startDate, setStartDate] = useState<Date | undefined>(
    currentStartDate ? new Date(currentStartDate) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentEndDate ? new Date(currentEndDate) : undefined
  )
  const [filterType, setFilterType] = useState<FilterType>(currentFilterType)
  const [groupBy, setGroupBy] = useState<GroupByType>(currentGroupBy)

  const handleQuickFilter = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('startDate', format(start, 'yyyy-MM-dd'))
    params.set('endDate', format(end, 'yyyy-MM-dd'))
    params.set('filterType', filterType)
    params.set('groupBy', groupBy)

    router.push(`/admin?${params.toString()}`)
  }

  const handleCustomFilter = () => {
    if (!startDate || !endDate) return

    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('startDate', format(startDate, 'yyyy-MM-dd'))
    params.set('endDate', format(endDate, 'yyyy-MM-dd'))
    params.set('filterType', filterType)
    params.set('groupBy', groupBy)

    router.push(`/admin?${params.toString()}`)
  }

  const handleClearFilters = () => {
    router.push('/admin')
  }

  const hasActiveFilters = currentStartDate || currentEndDate

  return (
    <div className="space-y-4">
      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(0)}
        >
          Hoy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(7)}
        >
          Últimos 7 días
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(30)}
        >
          Últimos 30 días
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter(90)}
        >
          Últimos 90 días
        </Button>
      </div>

      {/* Filtros personalizados */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Tipo de filtro */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Filtrar por</label>
          <Select
            value={filterType}
            onValueChange={(value) => setFilterType(value as FilterType)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Fecha de inicio</SelectItem>
              <SelectItem value="completed">Fecha de finalización</SelectItem>
              <SelectItem value="event">Fecha de evento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fecha inicio */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Desde</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Fecha fin */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Hasta</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP", { locale: es }) : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Agrupación */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Agrupar por</label>
          <Select
            value={groupBy}
            onValueChange={(value) => setGroupBy(value as GroupByType)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Día</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            onClick={handleCustomFilter}
            disabled={!startDate || !endDate}
          >
            Aplicar
          </Button>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
