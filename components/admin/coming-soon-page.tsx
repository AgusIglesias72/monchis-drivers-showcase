// components/admin/coming-soon-page.tsx

import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Construction } from "lucide-react"

interface ComingSoonPageProps {
  title: string
  description?: string
  breadcrumbs?: {
    label: string
    href?: string
  }[]
}

export function ComingSoonPage({ 
  title, 
  description,
  breadcrumbs = []
}: ComingSoonPageProps) {
  return (
    <>
      <AdminHeader breadcrumbs={breadcrumbs} />
      
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-muted rounded-full">
                  <Construction className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              {description && (
                <CardDescription className="text-base mt-2">
                  {description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              <p className="text-sm">
                Esta sección está en desarrollo y estará disponible próximamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}