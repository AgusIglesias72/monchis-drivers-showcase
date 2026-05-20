// app/api/cron/intercom-sync/route.ts
//
// Cron diario que resuelve el intercomContactId de drivers que todavía no
// lo tienen. Mantiene actualizada la cache para que aparezcan en el sandbox
// y otros flujos sin tener que correr el script manual cada vez.
//
// El bootstrap inicial se hace una sola vez con scripts/sync-intercom-contacts.ts.
// Este cron solo engancha drivers nuevos (los que se dieron de alta en el día).

import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { bulkResolveContactIds } from '@/lib/services/intercom.service';

// Tope alto porque procesa hasta MAX_PER_RUN drivers. En la práctica los
// nuevos por día son pocos, pero dejamos margen.
export const maxDuration = 300;

// Si por algún motivo se acumulan muchos pendientes (cron fallido + acumulación
// de nuevos), procesamos hasta este tope por corrida. Los restantes los
// engancha el cron del día siguiente.
const MAX_PER_RUN = 1000;

export async function GET(request: NextRequest) {
  const cronError = requireCronAuth(request);
  if (cronError) {
    console.error('❌ [CRON intercom-sync] Unauthorized');
    return cronError;
  }

  const t0 = Date.now();
  console.log('🔄 [CRON intercom-sync] starting');

  const pending = await prisma.monchisDriverCache.findMany({
    where: {
      enabled: true,
      intercomSyncedAt: null,
    },
    orderBy: { driverId: 'asc' },
    take: MAX_PER_RUN,
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

  if (pending.length === 0) {
    console.log('✅ [CRON intercom-sync] nothing to do');
    return NextResponse.json({
      success: true,
      processed: 0,
      resolved: 0,
      notFound: 0,
      durationMs: Date.now() - t0,
      timestamp: new Date().toISOString(),
    });
  }

  console.log(`   processing ${pending.length} pending drivers`);

  const result = await bulkResolveContactIds(pending);

  let resolved = 0;
  let notFound = 0;
  for (const [, contactId] of result) {
    if (contactId) resolved++;
    else notFound++;
  }

  const durationMs = Date.now() - t0;
  console.log(
    `✅ [CRON intercom-sync] done: resolved=${resolved} not_found=${notFound} in ${durationMs}ms`,
  );

  return NextResponse.json({
    success: true,
    processed: pending.length,
    resolved,
    notFound,
    cappedAt: pending.length === MAX_PER_RUN ? MAX_PER_RUN : null,
    durationMs,
    timestamp: new Date().toISOString(),
  });
}
