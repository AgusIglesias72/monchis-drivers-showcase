// app/admin/postulaciones/page.tsx

import { postulacionesStatsService } from "@/lib/services/postulaciones-stats.service"
import { PostulacionesPageContent } from "@/components/admin/postulaciones-page-content"

export const revalidate = 30 // Revalidar cada 30 segundos

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    onboardingStatus?: string
    hasVehicle?: string
    startDate?: string
    endDate?: string
    page?: string
  }>
}

export default async function PostulacionesPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  // Convertir page a número
  const page = params.page ? parseInt(params.page) : 1
  
  const [stats, result] = await Promise.all([
    postulacionesStatsService.getStats(),
    postulacionesStatsService.getPostulaciones({
      status: params.status || 'all',
      searchTerm: params.search,
      onboardingStatus: params.onboardingStatus || 'all',
      hasVehicle: params.hasVehicle || 'all',
      startDate: params.startDate,
      endDate: params.endDate,
      page,
      limit: 20,
    })
  ])

  return (
    <PostulacionesPageContent
      stats={stats}
      postulaciones={result.postulaciones}
      total={result.total}
      currentPage={result.page}
      totalPages={result.totalPages}
      hasMore={result.hasMore}
      currentFilters={{
        status: params.status,
        search: params.search,
        onboardingStatus: params.onboardingStatus,
        hasVehicle: params.hasVehicle,
        startDate: params.startDate,
        endDate: params.endDate,
      }}
    />
  )
}