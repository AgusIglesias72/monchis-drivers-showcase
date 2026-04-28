// scripts/manychat-set-template-flow.ts
//
// Setea el manychatFlowId de un WhatsAppTemplate existente.
//
// Uso:
//   npx tsx scripts/manychat-set-template-flow.ts <templateKey> <flowNs>
//
// Ejemplo:
//   npx tsx scripts/manychat-set-template-flow.ts capacitaciones content20260428012329_238521
//
// Si el template no existe en DB, el script falla con un mensaje claro — correr
// el seed primero (npm run db:seed) o crearlo desde el panel admin.

import 'dotenv/config';
import { prisma } from '../lib/prisma';

const templateKey = process.argv[2];
const flowNs = process.argv[3];

if (!templateKey || !flowNs) {
  console.error('Uso: npx tsx scripts/manychat-set-template-flow.ts <templateKey> <flowNs>');
  process.exit(1);
}

async function main() {
  const existing = await prisma.whatsAppTemplate.findUnique({
    where: { key: templateKey },
  });

  if (!existing) {
    console.error(`No existe WhatsAppTemplate con key="${templateKey}".`);
    console.error('Corré el seed (npm run db:seed) o creá el template desde admin antes de este script.');
    process.exit(1);
  }

  const updated = await prisma.whatsAppTemplate.update({
    where: { key: templateKey },
    data: { manychatFlowId: flowNs },
  });

  console.log(`✓ Template "${templateKey}" actualizado`);
  console.log(`  id:             ${updated.id}`);
  console.log(`  name:           ${updated.name}`);
  console.log(`  isActive:       ${updated.isActive}`);
  console.log(`  manychatFlowId: ${updated.manychatFlowId}`);
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
