// app/admin/reportes/page.tsx
import { ReportesPageContent } from '@/components/admin/reportes/reportes-page-content'

export const revalidate = 60

export default async function ReportesPage() {
  return <ReportesPageContent />
}