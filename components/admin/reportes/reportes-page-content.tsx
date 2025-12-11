// components/admin/reportes/reportes-page-content.tsx
"use client"

import { motion } from "framer-motion"
import { AdminHeader } from "@/components/admin/admin-header"
import { ProcessAllReportCard } from "./process-all-report-card"
import { UploadOnlyReportCard } from "./upload-only-report-card"
import { ExternalDriversReportCard } from "./external-drivers-report-card"

export function ReportesPageContent() {
  return (
    <div className="flex flex-1 flex-col container mx-auto">
      <AdminHeader
        breadcrumbs={[
          { label: "Reportes" }
        ]}
      />

      <div className="flex-1 p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reportes Automatizados</h1>
            <p className="text-muted-foreground mt-1">
              Genera reportes automáticos del sistema. Recibirás un email cuando finalice el procesamiento.
            </p>
          </div>
        </div>

        {/* Reportes Disponibles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <ProcessAllReportCard />
          <UploadOnlyReportCard />
          <ExternalDriversReportCard />

          {/* Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center"
          >
            <p className="text-muted-foreground text-sm">
              Más reportes próximamente...
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}