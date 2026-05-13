// app/api/whatsapp/bot-proxy/route.ts
//
// Proxy server-side para componentes admin que necesitan hablar con el bot de
// WhatsApp (Railway). El cliente nunca debe ver WHATSAPP_BOT_API_KEY: pasa por
// acá, este handler le inyecta la API key server-side y reenvía.
//
// Llamadas autenticadas requireen AdminUser activo.
//
// Permite endpoints específicos del bot (logout, etc) en su path interno.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth'

const DEFAULT_BOT_URL = process.env.WHATSAPP_BOT_URL || process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || ''

// Allowlist de paths que el proxy puede invocar. Cualquier otro se rechaza.
const ALLOWED_PATHS = new Set<string>(['/logout', '/qr-status', '/connection-info'])

interface ProxyBody {
  path: string
  method?: 'GET' | 'POST'
  botUrl?: string
  body?: unknown
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi()
  if (!guard.ok) return guard.response

  let payload: ProxyBody
  try {
    payload = (await req.json()) as ProxyBody
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!payload.path || typeof payload.path !== 'string' || !payload.path.startsWith('/')) {
    return NextResponse.json({ error: 'path inválido' }, { status: 400 })
  }
  if (!ALLOWED_PATHS.has(payload.path)) {
    return NextResponse.json({ error: 'path no permitido' }, { status: 400 })
  }

  const method = payload.method === 'POST' ? 'POST' : 'GET'
  const targetBase = (payload.botUrl || DEFAULT_BOT_URL).replace(/\/$/, '')
  if (!targetBase) {
    return NextResponse.json({ error: 'WHATSAPP_BOT_URL no configurado' }, { status: 500 })
  }

  const apiKey = process.env.WHATSAPP_BOT_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json({ error: 'WHATSAPP_BOT_API_KEY no configurado' }, { status: 500 })
  }

  const headers: Record<string, string> = { 'X-API-Key': apiKey }
  let body: BodyInit | undefined
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(payload.body ?? {})
  }

  try {
    const upstream = await fetch(`${targetBase}${payload.path}`, { method, headers, body })
    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Upstream error', detail: err?.message ?? 'unknown' },
      { status: 502 },
    )
  }
}
