import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const t = await p.whatsAppTemplate.findUnique({
    where: { key: 'capacitaciones' },
    select: {
      id: true,
      key: true,
      name: true,
      isActive: true,
      manychatFlowId: true,
      content: true,
      usageCount: true,
      lastUsedAt: true,
    },
  })
  console.log('capacitaciones:', JSON.stringify(t, null, 2))

  // Verificar últimos WhatsAppMessage relacionados a manychat para detectar errores
  const recent = await p.whatsAppMessage.findMany({
    where: { botId: 'manychat' },
    orderBy: { sentAt: 'desc' },
    take: 5,
    select: {
      id: true,
      sentAt: true,
      status: true,
      step: true,
      source: true,
      messageType: true,
      metadata: true,
    },
  })
  console.log('\nUltimos WhatsAppMessage manychat:', JSON.stringify(recent, null, 2))

  await p.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await p.$disconnect()
  process.exit(1)
})
