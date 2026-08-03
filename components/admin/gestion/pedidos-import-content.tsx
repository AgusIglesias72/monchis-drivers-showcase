"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { AdminHeader } from "@/components/admin/admin-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  bulkImportPedidos,
  getQueueStats,
  retryFailedImports,
  type BulkImportResult,
} from "@/app/admin/gestion/pedidos/actions"
import { REQUEST_ID_REGEX } from "@/lib/config/pedidos.config"
import type { QueueStats } from "@/lib/types/pedidos-queue.types"

interface ParsedIds {
  valid: string[]
  invalid: string[]
}

function parseInput(text: string): ParsedIds {
  const seen = new Set<string>()
  const valid: string[] = []
  const invalid: string[] = []
  const tokens = text.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)
  for (const t of tokens) {
    const cleaned = t.replace(/^['"]+|['"]+$/g, "").trim()
    if (!cleaned) continue
    if (/^[a-z_]+$/i.test(cleaned)) continue
    if (REQUEST_ID_REGEX.test(cleaned)) {
      if (!seen.has(cleaned)) {
        seen.add(cleaned)
        valid.push(cleaned)
      }
    } else {
      invalid.push(cleaned)
    }
  }
  return { valid, invalid }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  initialQueueStats: QueueStats
}

export function PedidosImportContent({ initialQueueStats }: Props) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isRetrying, startRetryTransition] = useTransition()
  const [enqueueResult, setEnqueueResult] = useState<BulkImportResult | null>(null)
  const [stats, setStats] = useState<QueueStats>(initialQueueStats)
  const [autoRefresh, setAutoRefresh] = useState(initialQueueStats.pending > 0)
  const [enqueueProgress, setEnqueueProgress] = useState<{
    current: number
    total: number
  } | null>(null)

  const sourceText = fileContent ?? text
  const parsed = useMemo(() => parseInput(sourceText), [sourceText])

  // Auto-refresh de stats mientras hay pendientes en cola.
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(async () => {
      try {
        const fresh = await getQueueStats()
        setStats(fresh)
        if (fresh.pending === 0) setAutoRefresh(false)
      } catch {
        /* noop */
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleFile = async (file: File | null) => {
    if (!file) return
    const content = await file.text()
    setFileName(file.name)
    setFileSizeBytes(file.size)
    setFileContent(content)
    setText("")
    setEnqueueResult(null)
  }

  const handleRemoveFile = () => {
    setFileContent(null)
    setFileName(null)
    setFileSizeBytes(null)
    setEnqueueResult(null)
  }

  const handleClearAll = () => {
    setText("")
    setFileContent(null)
    setFileName(null)
    setFileSizeBytes(null)
    setEnqueueResult(null)
  }

  const handleEnqueue = () => {
    if (parsed.valid.length === 0) {
      toast.error("No hay request_ids válidos para encolar")
      return
    }
    // Chunkeamos client-side para no chocar con el límite de 1MB del Server
    // Action body. 5000 IDs × ~30 bytes ≈ 150KB por llamada — holgado.
    const CHUNK_SIZE = 5000
    const chunks: string[][] = []
    for (let i = 0; i < parsed.valid.length; i += CHUNK_SIZE) {
      chunks.push(parsed.valid.slice(i, i + CHUNK_SIZE))
    }

    setEnqueueProgress({ current: 0, total: chunks.length })

    startTransition(async () => {
      const startedAt = Date.now()
      let inserted = 0
      let alreadyEnqueued = 0
      let invalid = 0
      let lastStats: QueueStats = stats
      let lastError: string | null = null

      for (let i = 0; i < chunks.length; i++) {
        setEnqueueProgress({ current: i + 1, total: chunks.length })
        const res = await bulkImportPedidos(chunks[i])
        if (!res.ok) {
          lastError = res.error || `Error en lote ${i + 1}`
          break
        }
        inserted += res.inserted
        alreadyEnqueued += res.alreadyEnqueued
        invalid += res.invalid
        lastStats = res.queueStats
      }

      setEnqueueProgress(null)

      const aggregated: BulkImportResult = {
        ok: lastError === null,
        inserted,
        alreadyEnqueued,
        invalid,
        totalSubmitted: parsed.valid.length,
        durationMs: Date.now() - startedAt,
        queueStats: lastStats,
        error: lastError ?? undefined,
      }
      setEnqueueResult(aggregated)
      setStats(lastStats)

      if (aggregated.ok) {
        toast.success(
          `${inserted.toLocaleString("es-AR")} encolados${
            alreadyEnqueued
              ? ` · ${alreadyEnqueued.toLocaleString("es-AR")} ya estaban`
              : ""
          }`,
        )
        if (lastStats.pending > 0) setAutoRefresh(true)
        router.refresh()
      } else {
        toast.error(lastError || "Error al encolar")
      }
    })
  }

  const handleRefreshStats = async () => {
    const fresh = await getQueueStats()
    setStats(fresh)
    if (fresh.pending > 0) setAutoRefresh(true)
  }

  const handleRetryFailed = () => {
    startRetryTransition(async () => {
      const res = await retryFailedImports()
      const fresh = await getQueueStats()
      setStats(fresh)
      if (fresh.pending > 0) setAutoRefresh(true)
      toast.success(`${res.retried} pedidos re-encolados`)
    })
  }

  const progressPct =
    stats.total > 0 ? ((stats.done + stats.notFound + stats.failed) / stats.total) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        breadcrumbs={[
          { label: "Gestión Admin" },
          { label: "Pedidos", href: "/admin/gestion/pedidos" },
          { label: "Importar" },
        ]}
      />

      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
        <Link
          href="/admin/gestion/pedidos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a pedidos
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Importar pedidos en bloque
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Subí el CSV o pegá una lista de <code>request_id</code> de Mongo. Se
            encolan al instante y un cron los va procesando en background — podés
            cerrar esta pantalla, sigue corriendo solo.
          </p>
        </div>

        <QueueProgress
          stats={stats}
          progressPct={progressPct}
          autoRefresh={autoRefresh}
          onRefresh={handleRefreshStats}
          onRetryFailed={handleRetryFailed}
          isRetrying={isRetrying}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Cargar IDs
            </CardTitle>
            <CardDescription>
              Acepta separadores: nueva línea, coma, punto y coma, tab o espacio.
              Headers de CSV (ej. <code>id_solicitud</code>) y comillas se ignoran
              automáticamente. Sin tope de cantidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fileContent ? (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{fileName}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {fileSizeBytes !== null && formatSize(fileSizeBytes)} ·{" "}
                      <strong>{parsed.valid.length.toLocaleString("es-AR")}</strong> IDs válidos
                      {parsed.invalid.length > 0 && (
                        <> · {parsed.invalid.length.toLocaleString("es-AR")} inválidos</>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="shrink-0"
                >
                  Quitar archivo
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">
                    <Upload className="h-4 w-4" />
                    Subir CSV / TXT
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => handleFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {text && (
                    <Button variant="ghost" size="sm" onClick={handleClearAll}>
                      Limpiar
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    o pegá los IDs abajo
                  </span>
                </div>

                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    setEnqueueResult(null)
                  }}
                  placeholder='"id_solicitud"&#10;"69e98699e29d6ff24d04cad4"&#10;"69ea1234abcdef0123456789"&#10;...'
                  rows={8}
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />

                {text && (
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      <strong className="tabular-nums">
                        {parsed.valid.length.toLocaleString("es-AR")}
                      </strong>
                      <span className="text-muted-foreground">válidos</span>
                    </span>
                    {parsed.invalid.length > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <strong className="tabular-nums">
                          {parsed.invalid.length.toLocaleString("es-AR")}
                        </strong>
                        <span className="text-muted-foreground">inválidos</span>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleEnqueue}
                disabled={isPending || parsed.valid.length === 0}
                className="gap-2"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isPending
                  ? enqueueProgress
                    ? `Encolando lote ${enqueueProgress.current} de ${enqueueProgress.total}...`
                    : "Encolando..."
                  : `Encolar ${parsed.valid.length.toLocaleString("es-AR")} pedido${
                      parsed.valid.length === 1 ? "" : "s"
                    }`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {enqueueResult && (
          <Alert
            className={
              enqueueResult.ok ? "border-success bg-success-soft" : ""
            }
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle>Encolados</AlertTitle>
            <AlertDescription>
              <div className="text-xs space-y-0.5 mt-1">
                <div>
                  <strong>{enqueueResult.inserted.toLocaleString("es-AR")}</strong> nuevos en cola
                </div>
                {enqueueResult.alreadyEnqueued > 0 && (
                  <div>
                    {enqueueResult.alreadyEnqueued.toLocaleString("es-AR")} ya estaban encolados (no se duplicaron)
                  </div>
                )}
                {enqueueResult.invalid > 0 && (
                  <div>
                    {enqueueResult.invalid.toLocaleString("es-AR")} descartados por formato inválido
                  </div>
                )}
                <div className="text-muted-foreground pt-1">
                  El cron los procesa cada 5 min, ~200 por corrida.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

function QueueProgress({
  stats,
  progressPct,
  autoRefresh,
  onRefresh,
  onRetryFailed,
  isRetrying,
}: {
  stats: QueueStats
  progressPct: number
  autoRefresh: boolean
  onRefresh: () => void
  onRetryFailed: () => void
  isRetrying: boolean
}) {
  if (stats.total === 0) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Cola vacía</AlertTitle>
        <AlertDescription>
          No hay pedidos encolados. Subí un archivo o pegá IDs abajo para empezar.
        </AlertDescription>
      </Alert>
    )
  }

  const completed = stats.done + stats.notFound + stats.failed

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>Cola de procesamiento</span>
          <div className="flex items-center gap-2">
            {autoRefresh && (
              <span className="inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Actualizando cada 5s
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="gap-1 text-xs h-7"
            >
              <RefreshCw className="h-3 w-3" />
              Refrescar
            </Button>
          </div>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
          {completed.toLocaleString("es-AR")} de {stats.total.toLocaleString("es-AR")} procesados ({Math.round(progressPct)}%)
          {stats.lastProcessedAt && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span>
                Último{" "}
                {formatDistanceToNow(stats.lastProcessedAt, { addSuffix: true, locale: es })}
              </span>
            </>
          )}
          {stats.oldestPendingAt && stats.pending > 0 && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span>
                Más viejo pendiente: encolado{" "}
                {formatDistanceToNow(stats.oldestPendingAt, { addSuffix: true, locale: es })}
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Barra de progreso segmentada */}
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
          {stats.done > 0 && (
            <div
              className="bg-success"
              style={{ width: `${(stats.done / stats.total) * 100}%` }}
              title={`${stats.done} procesados ok`}
            />
          )}
          {stats.notFound > 0 && (
            <div
              className="bg-warning"
              style={{ width: `${(stats.notFound / stats.total) * 100}%` }}
              title={`${stats.notFound} no encontrados`}
            />
          )}
          {stats.failed > 0 && (
            <div
              className="bg-destructive"
              style={{ width: `${(stats.failed / stats.total) * 100}%` }}
              title={`${stats.failed} con error`}
            />
          )}
        </div>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          <StatPill label="Pendientes" value={stats.pending} variant="muted" />
          <StatPill label="OK" value={stats.done} variant="emerald" />
          <StatPill
            label="No encontrados"
            value={stats.notFound}
            variant={stats.notFound > 0 ? "amber" : "muted"}
          />
          <StatPill
            label="Con error"
            value={stats.failed}
            variant={stats.failed > 0 ? "rose" : "muted"}
            action={
              stats.failed > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetryFailed}
                  disabled={isRetrying}
                  className="h-6 text-[10px] px-2 gap-1"
                >
                  {isRetrying ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-2.5 w-2.5" />
                  )}
                  Reintentar
                </Button>
              ) : undefined
            }
          />
        </div>

        {stats.pending > 200 && (
          <Alert className="border-info bg-info-soft">
            <AlertTriangle className="h-4 w-4 text-info" />
            <AlertDescription className="text-xs">
              Con {stats.pending.toLocaleString("es-AR")} pendientes a 200/lote cada
              5 min, faltan aprox{" "}
              <strong>
                {formatEstimate(Math.ceil(stats.pending / 200) * 5)}
              </strong>{" "}
              para terminar.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const m = minutes % 60
    return m > 0 ? `${hours}h ${m}min` : `${hours}h`
  }
  const days = Math.floor(hours / 24)
  const h = hours % 24
  return h > 0 ? `${days}d ${h}h` : `${days}d`
}

function StatPill({
  label,
  value,
  variant,
  action,
}: {
  label: string
  value: number
  variant: "emerald" | "amber" | "rose" | "muted"
  action?: React.ReactNode
}) {
  const colors =
    variant === "emerald"
      ? "border-success bg-success-soft text-success"
      : variant === "amber"
        ? "border-warning bg-warning-soft text-warning"
        : variant === "rose"
          ? "border-destructive bg-danger-soft text-destructive"
          : "border-border bg-muted/30"

  return (
    <div className={`rounded-md border p-2.5 ${colors}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
        {action}
      </div>
      <div className="text-xl font-bold tabular-nums mt-0.5">
        {value.toLocaleString("es-AR")}
      </div>
    </div>
  )
}
