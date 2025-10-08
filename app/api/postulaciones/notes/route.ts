// app/api/postulaciones/notes/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formDriverId, content, createdBy } = body

    // Validar datos requeridos
    if (!formDriverId || !content) {
      return NextResponse.json(
        { error: 'formDriverId y content son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que la postulación existe
    const formDriver = await prisma.formDriver.findUnique({
      where: { id: formDriverId }
    })

    if (!formDriver) {
      return NextResponse.json(
        { error: 'Postulación no encontrada' },
        { status: 404 }
      )
    }

    // Crear la nota
    const note = await prisma.formNote.create({
      data: {
        formDriverId,
        content: content.trim(),
        createdBy: createdBy || 'Admin', // Default si no se provee
      }
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error al crear nota:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Opcional: GET para obtener notas de una postulación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const formDriverId = searchParams.get('formDriverId')

    if (!formDriverId) {
      return NextResponse.json(
        { error: 'formDriverId es requerido' },
        { status: 400 }
      )
    }

    const notes = await prisma.formNote.findMany({
      where: { formDriverId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error al obtener notas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}