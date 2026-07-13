// components/admin/documents-filters.tsx

"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DocumentsFiltersProps {
  counts: Record<string, number>
  currentStatus?: string
}

const statusConfig = {
  ALL: { label: "Todos", color: "default" },
  IN_REVIEW: { label: "En Revisión", color: "orange" },
  PENDING: { label: "Pendientes", color: "blue" },
  REJECTED: { label: "Rechazados", color: "red" },
  APPROVED: { label: "Aprobados", color: "green" },
} as const

export function DocumentsFilters({ counts, currentStatus }: DocumentsFiltersProps) {
  const pathname = usePathname()

  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="mb-6 flex gap-2 flex-wrap">
      {/* Todos */}
      <Link href={pathname}>
        <Button
          variant={!currentStatus ? "default" : "outline"}
          className="cursor-pointer"
        >
          Todos
          <Badge 
            variant="secondary" 
            className="ml-2"
          >
            {totalCount}
          </Badge>
        </Button>
      </Link>

      {/* En Revisión */}
      <Link href={`${pathname}?status=IN_REVIEW`}>
        <Button
          variant={currentStatus === "IN_REVIEW" ? "default" : "outline"}
          className={cn(
            "cursor-pointer",
            currentStatus === "IN_REVIEW" && "bg-info hover:bg-info/90"
          )}
        >
          En Revisión
          <Badge 
            variant="secondary" 
            className="ml-2"
          >
            {counts['IN_REVIEW'] || 0}
          </Badge>
        </Button>
      </Link>

      {/* Pendientes */}
      <Link href={`${pathname}?status=PENDING`}>
        <Button
          variant={currentStatus === "PENDING" ? "default" : "outline"}
          className={cn(
            "cursor-pointer",
            currentStatus === "PENDING" && "bg-warning hover:bg-warning/90"
          )}
        >
          Pendientes
          <Badge 
            variant="secondary" 
            className="ml-2"
          >
            {counts['PENDING'] || 0}
          </Badge>
        </Button>
      </Link>

      {/* Rechazados */}
      <Link href={`${pathname}?status=REJECTED`}>
        <Button
          variant={currentStatus === "REJECTED" ? "default" : "outline"}
          className={cn(
            "cursor-pointer",
            currentStatus === "REJECTED" && "bg-destructive hover:bg-destructive/90"
          )}
        >
          Rechazados
          <Badge 
            variant="secondary" 
            className="ml-2"
          >
            {counts['REJECTED'] || 0}
          </Badge>
        </Button>
      </Link>

      {/* Aprobados */}
      <Link href={`${pathname}?status=APPROVED`}>
        <Button
          variant={currentStatus === "APPROVED" ? "default" : "outline"}
          className={cn(
            "cursor-pointer",
            currentStatus === "APPROVED" && "bg-success hover:bg-success/90"
          )}
        >
          Aprobados
          <Badge 
            variant="secondary" 
            className="ml-2"
          >
            {counts['APPROVED'] || 0}
          </Badge>
        </Button>
      </Link>
    </div>
  )
}