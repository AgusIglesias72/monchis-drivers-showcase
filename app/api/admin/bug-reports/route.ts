// app/api/admin/bug-reports/route.ts
//
// Reportes internos de bugs/mejoras desde el panel admin.
// POST crea el reporte (los adjuntos ya fueron subidos a Blob vía /upload).
// GET lista los últimos reportes (sin UI todavía; útil para revisión rápida).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminApi } from '@/lib/auth'
import { sendSlackMessage } from '@/lib/services/slack.service'
import { BugReportType, BugReportStatus } from '@prisma/client'

export const runtime = 'nodejs'

const TYPE_LABEL: Record<BugReportType, string> = {
  BUG: 'Bug',
  MEJORA: 'Mejora',
  IDEA: 'Idea',
  OTRO: 'Otro',
}

interface AttachmentInput {
  url: string
  name: string
  contentType: string
  size: number
}

const MAX_ATTACHMENTS = 5

function parseAttachments(input: unknown): AttachmentInput[] | null {
  if (input == null) return []
  if (!Array.isArray(input) || input.length > MAX_ATTACHMENTS) return null
  const out: AttachmentInput[] = []
  for (const item of input) {
    if (typeof item !== 'object' || item === null) return null
    const { url, name, contentType, size } = item as Record<string, unknown>
    if (typeof url !== 'string' || typeof name !== 'string') return null
    let host: string
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') return null
      host = parsed.hostname
    } catch {
      return null
    }
    if (!host.endsWith('.blob.vercel-storage.com')) return null
    out.push({
      url,
      name: name.slice(0, 200),
      contentType: typeof contentType === 'string' ? contentType : 'application/octet-stream',
      size: typeof size === 'number' ? size : 0,
    })
  }
  return out
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response
  const adminUser = guard.user

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const type =
    typeof body.type === 'string' && body.type in TYPE_LABEL
      ? (body.type as BugReportType)
      : null
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 150) : ''
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : ''
  const pageUrl =
    typeof body.pageUrl === 'string' && body.pageUrl.startsWith('/')
      ? body.pageUrl.slice(0, 300)
      : null
  const attachments = parseAttachments(body.attachments)

  if (!type) {
    return NextResponse.json({ error: 'Tipo de reporte inválido' }, { status: 400 })
  }
  if (!title || !description) {
    return NextResponse.json(
      { error: 'El título y la descripción son obligatorios' },
      { status: 400 },
    )
  }
  if (attachments === null) {
    return NextResponse.json({ error: 'Adjuntos inválidos' }, { status: 400 })
  }

  const report = await prisma.bugReport.create({
    data: {
      type,
      title,
      description,
      pageUrl,
      attachments: attachments.length > 0 ? (attachments as object[]) : undefined,
      reportedBy: adminUser.clerkId,
    },
  })

  const reporter = adminUser.fullName || adminUser.email
  const slackLines = [
    `*Nuevo reporte interno · ${TYPE_LABEL[type]}*`,
    `*${title}*`,
    description.length > 500 ? `${description.slice(0, 500)}…` : description,
    pageUrl ? `Página: \`${pageUrl}\`` : null,
    attachments.length > 0
      ? `Adjuntos: ${attachments.map((a) => `<${a.url}|${a.name}>`).join(', ')}`
      : null,
    `Reportado por ${reporter}`,
  ].filter(Boolean)
  const slack = await sendSlackMessage(slackLines.join('\n'))
  if (!slack.ok) {
    console.error('No se pudo notificar el bug report a Slack:', slack.error)
  }

  return NextResponse.json({ id: report.id })
}

export async function GET(request: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  const statusParam = request.nextUrl.searchParams.get('status')
  const status =
    statusParam && statusParam in BugReportStatus ? (statusParam as BugReportStatus) : undefined

  const reports = await prisma.bugReport.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ reports })
}
