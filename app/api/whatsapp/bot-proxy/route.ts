// app/api/whatsapp/bot-proxy/route.ts
//
// Proxy server-side para componentes admin que necesitan hablar con el bot de
// WhatsApp (Railway). El cliente nunca debe ver WHATSAPP_BOT_API_KEY: pasa por
// acá, este handler le inyecta la API key server-side y reenvía.
//
// Llamadas autenticadas requireen AdminUser activo.
//
// Allowlists (defensivo contra SSRF):
//  - paths del bot (logout, qr-status, etc)
//  - hosts base permitidos: construidos desde env vars de bots configurados.
//    El cliente puede pedir uno de esos hosts, pero NO un host arbitrario.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth'

const ALLOWED_PATHS = new Set<string>(['/logout', '/qr-status', '/connection-info'])

// URLs de bots reconocidas. Cualquier botUrl que llegue del cliente debe
// matchear EXACTAMENTE alguna de estas (después de normalizar trailing slash).
function buildBotUrlAllowlist(): Set<string> {
  const candidates = [
    process.env.WHATSAPP_BOT_URL,
    process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL,
    process.env.NEXT_PUBLIC_WHATSAPP_BOT_ADQUISICION_URL,
    process.env.NEXT_PUBLIC_WHATSAPP_BOT_REACTIVACION_URL,
  ]
  return new Set(
    candidates
      .filter((u): u is string => typeof u === 'string' && u.length > 0)
      .map(u => u.replace(/\/$/, '')),
  )
}

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
  // Bloqueá traversals en el path aunque empiece con "/" (ej "/logout/../admin").
  if (payload.path.includes('..') || payload.path.includes('//')) {
    return NextResponse.json({ error: 'path inválido' }, { status: 400 })
  }

  const method = payload.method === 'POST' ? 'POST' : 'GET'

  const allowedBotUrls = buildBotUrlAllowlist()
  const defaultBotUrl = process.env.WHATSAPP_BOT_URL || process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || ''
  const requestedBase = (payload.botUrl ?? defaultBotUrl).replace(/\/$/, '')

  if (!requestedBase) {
    return NextResponse.json({ error: 'WHATSAPP_BOT_URL no configurado' }, { status: 500 })
  }
  if (!allowedBotUrls.has(requestedBase)) {
    // Defensa contra SSRF: el cliente NO puede mandar a un host arbitrario.
    console.warn('[BOT_PROXY] botUrl rechazada (no está en allowlist)', { requestedBase })
    return NextResponse.json({ error: 'botUrl no permitida' }, { status: 400 })
  }
  const targetBase = requestedBase

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
