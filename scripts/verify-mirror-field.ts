// scripts/verify-mirror-field.ts
//
// Verificación rápida del custom field espejo:
//   1. Setea el mirror para un subscriber conocido (Miguel Oviedo / 420853898).
//   2. Lo busca via findByCustomField con ese mismo valor.
//   3. Confirma que el ID resuelto coincide.
// Úselo una sola vez después de configurar MANYCHAT_WHATSAPP_PHONE_FIELD_ID.

import {
  setCustomField,
  findSubscriberByCustomField,
  getSubscriberInfo,
} from '../lib/services/manychat.service'

const TARGET_SUBSCRIBER_ID = '420853898' // Miguel Oviedo
const PHONE_E164 = '+595993357088' // 0993357088 → E.164

async function main() {
  const fieldId = Number(process.env.MANYCHAT_WHATSAPP_PHONE_FIELD_ID)
  if (!Number.isFinite(fieldId)) {
    console.error('MANYCHAT_WHATSAPP_PHONE_FIELD_ID no configurado')
    process.exit(1)
  }
  console.log(`fieldId = ${fieldId}\nphone   = ${PHONE_E164}\nsub     = ${TARGET_SUBSCRIBER_ID}\n`)

  console.log('1. Confirmando que el subscriber existe...')
  const sub = await getSubscriberInfo(TARGET_SUBSCRIBER_ID)
  console.log(`   ✓ ${sub.first_name ?? ''} ${sub.last_name ?? ''} (whatsapp_phone=${sub.whatsapp_phone})\n`)

  console.log('2. Seteando mirror...')
  await setCustomField(TARGET_SUBSCRIBER_ID, { id: fieldId }, PHONE_E164)
  console.log('   ✓ setCustomField ok\n')

  console.log('3. Buscando por mirror...')
  const found = await findSubscriberByCustomField(fieldId, PHONE_E164)
  if (!found) {
    console.error('   ✗ findByCustomField NO devolvió subscriber. Revisar:')
    console.error('     - El field type en ManyChat es Text (no Number)?')
    console.error('     - El field ID es correcto?')
    process.exit(1)
  }
  if (found.id !== TARGET_SUBSCRIBER_ID) {
    console.error(`   ✗ findByCustomField devolvió otro subscriber: ${found.id}`)
    process.exit(1)
  }
  console.log(`   ✓ Resolvió correctamente al subscriber ${found.id}\n`)

  console.log('Mirror field operativo. El backfill puede arrancar.')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
