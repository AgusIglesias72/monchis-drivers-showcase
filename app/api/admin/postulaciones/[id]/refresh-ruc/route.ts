// app/api/admin/postulaciones/[id]/refresh-ruc/route.ts

import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRucStatus } from '@/lib/services/turuc.service'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi()
    if (!guard.ok) return guard.response

    const { id } = await params

    const driver = await prisma.formDriver.findUnique({
      where: { id },
      select: { id: true, cedula: true, firstName: true, lastName: true },
    })

    if (!driver) {
      return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })
    }

    const result = await checkRucStatus(driver.cedula)

    const updated = await prisma.formDriver.update({
      where: { id },
      data: {
        rucStatus: result.status,
        rucName: result.name,
        rucDv: result.dv,
        rucIsLegalEntity: result.isLegalEntity,
        rucIsPublicEntity: result.isPublicEntity,
        rucLastCheckedAt: new Date(),
        rucApiRawResponse: result.raw as any,
      },
      select: {
        id: true,
        rucStatus: true,
        rucName: true,
        rucDv: true,
        rucLastCheckedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      driver: updated,
      check: { status: result.status, name: result.name, error: result.error ?? null },
    })
  } catch (err: any) {
    console.error('[refresh-ruc] Error:', err)
    return NextResponse.json(
      { error: 'Error al consultar RUC', detail: err?.message ?? 'unknown' },
      { status: 500 },
    )
  }
}
