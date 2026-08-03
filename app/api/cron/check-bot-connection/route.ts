// app/api/cron/check-bot-connection/route.ts
//
// Poller del estado de conexión del bot de WhatsApp. Cada ~10 min consulta el
// bot y registra en BotConnectionLog SOLO los cambios de estado (transición
// conectado <-> desconectado), de modo que la tabla queda como un timeline
// compacto de "de qué hora a qué hora estuvo conectado".
//
// Esto es clave: nuestros WhatsAppMessage marcan SENT según lo que dice el bot,
// que puede aceptar envíos aunque la sesión esté caída. Este log es la fuente de
// verdad de la conectividad real.

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { whatsappBotService } from '@/lib/services/whatsapp-bot.service'

export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request)
  if (cronError) return cronError

  try {
    const [status, info] = await Promise.all([
      whatsappBotService.getStatus(),
      whatsappBotService.getConnectionInfo().catch(() => ({ connected: false })),
    ])
    const connected = status.connected === true

    const last = await prisma.botConnectionLog.findFirst({
      orderBy: { checkedAt: 'desc' },
      select: { connected: true },
    })

    // Registrar solo en el primer check o cuando cambia el estado (transición).
    const isTransition = !last || last.connected !== connected
    let logged = false
    if (isTransition) {
      await prisma.botConnectionLog.create({
        data: {
          connected,
          status: status.status,
          phoneNumber: 'phoneNumber' in info ? (info.phoneNumber ?? null) : null,
          message: status.message ?? null,
          source: 'cron',
        },
      })
      logged = true
      console.log(`[BOT CONNECTION] transición → ${connected ? 'CONECTADO' : 'DESCONECTADO'} (status=${status.status})`)
    }

    return NextResponse.json({ success: true, connected, status: status.status, transition: logged })
  } catch (error) {
    console.error('[BOT CONNECTION] error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
