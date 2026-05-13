// app/api/admin/postulaciones/[id]/waive-ruc-inactive/route.ts

import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Body {
  waived: boolean
  note?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const guard = await requireAdminApi()
    if (!guard.ok) return guard.response
    const adminUser = guard.user

    const { id } = await params
    const body = (await request.json()) as Body

    if (typeof body?.waived !== 'boolean') {
      return NextResponse.json({ error: 'El campo "waived" es requerido (boolean)' }, { status: 400 })
    }

    const driver = await prisma.formDriver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 })
    }

    const updated = await prisma.formDriver.update({
      where: { id },
      data: body.waived
        ? {
            rucInactiveWaived: true,
            rucInactiveWaivedBy: adminUser.clerkId,
            rucInactiveWaivedAt: new Date(),
            rucInactiveWaivedNote: body.note ?? null,
          }
        : {
            rucInactiveWaived: false,
            rucInactiveWaivedBy: null,
            rucInactiveWaivedAt: null,
            rucInactiveWaivedNote: null,
          },
      select: {
        id: true,
        rucInactiveWaived: true,
        rucInactiveWaivedBy: true,
        rucInactiveWaivedAt: true,
        rucInactiveWaivedNote: true,
      },
    })

    return NextResponse.json({ success: true, driver: updated })
  } catch (err: any) {
    console.error('[waive-ruc-inactive] Error:', err)
    return NextResponse.json(
      { error: 'Error al marcar RUC Inactivo', detail: err?.message ?? 'unknown' },
      { status: 500 },
    )
  }
}
