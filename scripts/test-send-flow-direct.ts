// scripts/test-send-flow-direct.ts
// Dispara el flow "capacitaciones" directo a un subscriber ID dado, sin pasar
// por la lógica de FormDriver/messaging. Útil para diagnosticar si el flow en sí
// funciona vs. si el problema es algo del subscriber recién creado.

import { prisma } from '../lib/prisma'
import { sendFlow, getSubscriberInfo } from '../lib/services/manychat.service'

const TARGET_SUBSCRIBER_ID = process.argv[2] || '1210986147'
const TEMPLATE_KEY = 'capacitaciones'

async function main() {
  console.log(`=== Test directo de sendFlow ===`)
  console.log(`Subscriber ID: ${TARGET_SUBSCRIBER_ID}`)
  console.log(`Template key:  ${TEMPLATE_KEY}\n`)

  console.log('1. Obteniendo flow_id del template...')
  const template = await prisma.whatsAppTemplate.findUnique({
    where: { key: TEMPLATE_KEY },
    select: { manychatFlowId: true, isActive: true, name: true },
  })
  if (!template) {
    console.error(`Template "${TEMPLATE_KEY}" no existe en DB`)
    process.exit(1)
  }
  if (!template.manychatFlowId) {
    console.error(`Template "${TEMPLATE_KEY}" no tiene manychatFlowId configurado`)
    process.exit(1)
  }
  console.log(`   Template: "${template.name}"`)
  console.log(`   Active:   ${template.isActive}`)
  console.log(`   FlowId:   ${template.manychatFlowId}\n`)

  console.log('2. Verificando subscriber en ManyChat...')
  try {
    const info = await getSubscriberInfo(TARGET_SUBSCRIBER_ID)
    console.log(`   ID:               ${info.id}`)
    console.log(`   Name:             ${info.name || `${info.first_name ?? ''} ${info.last_name ?? ''}`.trim()}`)
    console.log(`   WhatsApp phone:   ${info.whatsapp_phone || '(none)'}`)
    console.log(`   Phone:            ${info.phone || '(none)'}`)
    console.log(`   Subscribed:       ${info.subscribed || '(none)'}`)
    console.log(`   Last interaction: ${info.last_interaction || '(none)'}`)
    console.log(`   Last seen:        ${info.last_seen || '(none)'}`)
    console.log(`   Optin phone:      ${info.optin_phone}`)
    console.log()
  } catch (err) {
    console.error('   ERROR:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  console.log('3. Disparando sendFlow...')
  try {
    await sendFlow(TARGET_SUBSCRIBER_ID, template.manychatFlowId)
    console.log('   ✓ ManyChat aceptó el sendFlow.')
    console.log('   (recordá: API ok ≠ Meta entregó. Verificá en ManyChat Live Chat.)')
  } catch (err) {
    console.error('   ✗ ERROR:', err)
    if (err && typeof err === 'object' && 'details' in err) {
      console.error('   details:', JSON.stringify((err as { details: unknown }).details, null, 2))
    }
    process.exit(1)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
