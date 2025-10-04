// components/admin/documents-filters.tsx

"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/utils"

interface DocumentsFiltersProps {
  counts: Record<string, number>
  currentStatus?: string
}

const statusConfig = {
  ALL: { label: "Todos", color: "default" },
  MANUAL_REVIEW: { label: "Revisión Manual", color: "orange" },
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

      {/* Revisión Manual */}
      <Link href={`${pathname}?status=MANUAL_REVIEW`}>
        <Button
          variant={currentStatus === "MANUAL_REVIEW" ? "default" : "outline"}
          className={cn(
            "cursor-pointer",
            currentStatus === "MANUAL_REVIEW" && "bg-orange-500 hover:bg-orange-600"
          )}
        >
          Revisión Manual
          <Badge 
            variant="secondary" 
            className="ml-2"
          >
            {counts['MANUAL_REVIEW'] || 0}
          </Badge>
        </Button>
      </Link>

      {/* Pendientes */}
      <Link href={`${pathname}?status=PENDING`}>
        <Button
          variant={currentStatus === "PENDING" ? "default" : "outline"}
          className={cn(
            "cursor-pointer",
            currentStatus === "PENDING" && "bg-blue-500 hover:bg-blue-600"
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
            currentStatus === "REJECTED" && "bg-red-500 hover:bg-red-600"
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
            currentStatus === "APPROVED" && "bg-green-500 hover:bg-green-600"
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