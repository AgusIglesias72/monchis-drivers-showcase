// app/admin/postulaciones/page.tsx

import { postulacionesStatsService } from "@/lib/services/postulaciones-stats.service"
import { PostulacionesPageContent } from "@/components/admin/postulaciones-page-content"

export const revalidate = 60

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
  }>
}

export default async function PostulacionesPage({ searchParams }: PageProps) {
  const params = await searchParams
  
  const stats = await postulacionesStatsService.getStats()
  const { postulaciones, total } = await postulacionesStatsService.getPostulaciones({
    status: params.status || 'all',
    searchTerm: params.search,
    limit: 50,
  })

  return (
    <PostulacionesPageContent
      stats={stats}
      postulaciones={postulaciones}
      total={total}
      currentStatus={params.status}
      currentSearch={params.search}
    />
  )
}