import { SkeletonKpi } from "@/components/ds"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PostulacionesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Título + botón exportar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 rounded-[var(--r-md)]" />
            <Skeleton className="h-4 w-80 rounded-[var(--r-md)]" />
          </div>
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonKpi key={i} />
          ))}
        </div>

        {/* Búsqueda + botón filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>

        {/* Solapas de quick filters + tabla adjunta */}
        <div>
          <div className="flex items-end gap-1 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-t-lg rounded-b-none flex-shrink-0" />
            ))}
          </div>
          <Card className="rounded-t-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-4 w-36" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 border-b px-3 py-3 flex gap-6">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-3.5 flex-1" />
                  ))}
                </div>
                <div className="divide-y">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="px-3 py-3 flex items-center gap-6">
                      <Skeleton className="h-4 w-4 flex-shrink-0" />
                      <div className="min-w-[180px] flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-52" />
                      </div>
                      <div className="min-w-[120px] flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-5 w-24 rounded-full flex-1" />
                      <div className="flex gap-2 flex-1 justify-center">
                        {Array.from({ length: 3 }).map((_, j) => (
                          <Skeleton key={j} className="h-8 w-8 rounded-full flex-shrink-0" />
                        ))}
                      </div>
                      <Skeleton className="h-5 w-20 rounded-full flex-1" />
                      <Skeleton className="h-3.5 w-16 flex-1" />
                      <div className="flex gap-2 justify-end w-32">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
