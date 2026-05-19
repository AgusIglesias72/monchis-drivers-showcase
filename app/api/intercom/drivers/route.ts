// app/api/intercom/drivers/route.ts
// GET — lista drivers con intercomContactId resuelto, para el select del sandbox.
// Acepta ?q=search (filtra por nombre / phone / email / driverId).

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const MAX_RESULTS = 50;

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  const where: Prisma.MonchisDriverCacheWhereInput = {
    enabled: true,
    intercomContactId: { not: null },
  };

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { email: { contains: q, mode: 'insensitive' } },
      { documentNumber: { contains: q } },
      { driverId: { contains: q } },
    ];
  }

  const drivers = await prisma.monchisDriverCache.findMany({
    where,
    select: {
      driverId: true,
      fullName: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      documentNumber: true,
      intercomContactId: true,
      intercomExternalId: true,
      primaryZone30d: true,
    },
    orderBy: { fullName: 'asc' },
    take: MAX_RESULTS,
  });

  return NextResponse.json({
    drivers: drivers.map((d) => ({
      driverId: d.driverId,
      fullName:
        d.fullName ??
        ([d.firstName, d.lastName].filter(Boolean).join(' ').trim() ||
          '(sin nombre)'),
      phone: d.phone,
      email: d.email,
      documentNumber: d.documentNumber,
      intercomContactId: d.intercomContactId,
      intercomExternalId: d.intercomExternalId,
      primaryZone: d.primaryZone30d,
    })),
    truncated: drivers.length === MAX_RESULTS,
  });
}
