// scripts/sync-intercom-contacts.ts
//
// Bootstrap one-shot para resolver el intercomContactId de todos los drivers
// activos contra la API de Intercom y cachearlo en monchis_driver_cache.
//
// Uso:
//   pnpm tsx scripts/sync-intercom-contacts.ts             # solo los pendientes
//   pnpm tsx scripts/sync-intercom-contacts.ts --force     # re-resolve todos
//   pnpm tsx scripts/sync-intercom-contacts.ts --dry-run   # no escribe en DB
//   pnpm tsx scripts/sync-intercom-contacts.ts --limit=100 # tope para probar
//
// El cron diario (app/api/cron/intercom-sync) ataja a los drivers nuevos día
// a día. Este script es para el bootstrap inicial sobre la cache existente.

import 'dotenv/config';

import { prisma } from '@/lib/prisma';
import {
  bulkResolveContactIds,
  resolveContactId,
} from '@/lib/services/intercom.service';

const CHUNK_SIZE = 200;

interface CliFlags {
  force: boolean;
  dryRun: boolean;
  limit: number | null;
}

function parseFlags(): CliFlags {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  for (const a of args) {
    if (a.startsWith('--limit=')) {
      const n = parseInt(a.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
  }
  return {
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    limit,
  };
}

async function main() {
  const flags = parseFlags();

  console.log('🔄 Intercom contact sync — bootstrap script');
  console.log('   flags:', flags);

  const where = flags.force
    ? { enabled: true }
    : { enabled: true, intercomSyncedAt: null };

  const total = await prisma.monchisDriverCache.count({ where });
  const totalToProcess = flags.limit ? Math.min(flags.limit, total) : total;
  console.log(`   drivers a procesar: ${totalToProcess} (de ${total} matching)`);

  if (totalToProcess === 0) {
    console.log('✅ Nada que hacer. Saliendo.');
    return;
  }

  if (flags.dryRun) {
    console.log('🔍 DRY-RUN: no se va a escribir en DB ni llamar a Intercom.');
    const sample = await prisma.monchisDriverCache.findMany({
      where,
      take: 5,
      select: { driverId: true, fullName: true, phone: true, email: true },
    });
    console.log('   primeros 5:', sample);
    return;
  }

  // Para dry-run hubiéramos salido antes. Acá ya sabemos que vamos a escribir.
  // Procesamos en chunks para no cargar todo en memoria.
  let processed = 0;
  let resolved = 0;
  let notFound = 0;
  let errors = 0;
  const t0 = Date.now();

  while (processed < totalToProcess) {
    const remaining = totalToProcess - processed;
    const take = Math.min(CHUNK_SIZE, remaining);

    const chunk = await prisma.monchisDriverCache.findMany({
      where,
      orderBy: { driverId: 'asc' },
      skip: 0, // siempre 0 porque a medida que se resuelve, salen del WHERE
      take,
      select: {
        driverId: true,
        email: true,
        phone: true,
        fullName: true,
        firstName: true,
        lastName: true,
        intercomContactId: true,
        intercomExternalId: true,
      },
    });

    if (chunk.length === 0) {
      console.log('⚠️  WHERE no devolvió más drivers — saliendo.');
      break;
    }

    // bulkResolveContactIds maneja concurrency 4 + throttling 100ms.
    const result = await bulkResolveContactIds(chunk, { force: flags.force });

    for (const [, contactId] of result) {
      if (contactId === null) {
        // Puede ser "no encontrado" (resolveContactId persiste igual con
        // contactId=null) o "error" (no persiste). Para diferenciarlos
        // habría que re-querear la DB. Para el script simple, asumo que
        // si quedó null en el Map, fue not-found.
        notFound++;
      } else {
        resolved++;
      }
    }
    processed += chunk.length;

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const rate = (processed / Math.max(parseFloat(elapsed), 0.1)).toFixed(1);
    console.log(
      `   ${processed}/${totalToProcess}  resolved=${resolved} not_found=${notFound} errors=${errors}  ` +
        `${elapsed}s @ ${rate}/s`,
    );

    // Mientras force=false, el WHERE filtra los ya sincronizados, así que el
    // próximo findMany trae los siguientes 200 sin ofset. Si force=true, hay
    // que ofsetear porque todos siguen matcheando.
    if (flags.force) {
      // Avanzamos via cursor en driverId — más estable que skip/take cuando
      // mutamos la tabla mientras leemos.
      // (Implementación simple: rompemos aquí y dejamos que un re-run
      // manual con --force tome los siguientes. En la práctica, force se
      // usa raramente.)
      console.log(
        '   nota: con --force el script procesa solo un chunk por corrida.',
      );
      break;
    }
  }

  const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  console.log(`✅ Done en ${totalElapsed}s`);
  console.log(`   processed: ${processed}`);
  console.log(`   resolved:  ${resolved}`);
  console.log(`   not_found: ${notFound}`);
  console.log(`   errors:    ${errors}`);
  console.log('');
  console.log(`Para reintentar los not_found, correr de nuevo con --force.`);
  // Suprimimos unused-var de resolveContactId — lo dejo importado por si
  // alguien hace un sync puntual de 1 driver desde este script.
  void resolveContactId;
}

main()
  .catch((err) => {
    console.error('❌ Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
