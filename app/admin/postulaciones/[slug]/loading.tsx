import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

function FieldRowSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-3.5 w-24 flex-shrink-0" />
      <Skeleton className="h-3.5 flex-1" />
    </div>
  )
}

function FichaBlockSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-28" />
      <FieldRowSkeleton />
      <FieldRowSkeleton />
      <FieldRowSkeleton />
    </div>
  )
}

export default function PostulacionDetailLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Header compacto: identidad + metadata/badges vs. acciones */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56 rounded-[var(--r-md)]" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-4 w-40 rounded-[var(--r-md)]" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-36 rounded-full" />
            </div>
          </div>
          <div className="flex flex-wrap justify-end items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-40 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>

        {/* Barra de pill tabs */}
        <div className="flex flex-wrap items-center gap-1">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>

        {/* Panel Ficha (default): card con grilla interna 2-col */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-x-8 gap-y-4 items-start lg:grid-cols-2">
              <FichaBlockSkeleton />
              <FichaBlockSkeleton />
              <FichaBlockSkeleton />
              <FichaBlockSkeleton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
