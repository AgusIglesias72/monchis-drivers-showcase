"use client"

import { motion } from "framer-motion"
import { Trophy } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BonusSummary } from "@/lib/services/dashboard-drivers.service"

const formatGs = (n: number) =>
  new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(n) + " Gs"

export function DriversTopBonus({ bonus }: { bonus: BonusSummary }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Top 5 drivers por bonos
          </CardTitle>
          <CardDescription>
            Últimos 30 días · {bonus.topDrivers.length === 0 ? "sin asignaciones" : `${bonus.topDrivers.length} drivers`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bonus.topDrivers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay bonos asignados en el período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead className="text-right">Bono total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonus.topDrivers.map((d, i) => (
                  <TableRow key={d.driverId}>
                    <TableCell className="font-medium text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {d.name || "Sin nombre"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {d.driverId}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatGs(d.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
