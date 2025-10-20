// app/api/postulaciones/notes/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // 🔐 Autenticación con Clerk
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario admin existe en nuestra DB
    const adminUser = await prisma.adminUser.findUnique({
      where: { clerkId: userId }
    })

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Usuario admin no encontrado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { formDriverId, content } = body

    // Validar datos requeridos
    if (!formDriverId || !content || typeof content !== 'string' || content.trim() === '') {
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

    // Crear la nota con el ID del admin user (no el clerkId)
    const note = await prisma.formNote.create({
      data: {
        formDriverId,
        content: content.trim(),
        createdBy: adminUser.id, // 🔑 Usar el ID interno, no el clerkId
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            fullName: true,
            role: true,
          }
        }
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

export async function GET(request: NextRequest) {
  try {
    // 🔐 Autenticación con Clerk
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const formDriverId = searchParams.get('formDriverId')

    if (!formDriverId) {
      return NextResponse.json(
        { error: 'formDriverId es requerido' },
        { status: 400 }
      )
    }

    // Verificar que la postulación existe
    const formDriver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      select: { id: true }
    })

    if (!formDriver) {
      return NextResponse.json(
        { error: 'Postulación no encontrada' },
        { status: 404 }
      )
    }

    // Obtener notas con información del creador
    const notes = await prisma.formNote.findMany({
      where: { formDriverId },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            fullName: true,
            role: true,
            profileImageUrl: true,
          }
        }
      },
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

export async function DELETE(request: NextRequest) {
  try {
    // 🔐 Autenticación con Clerk
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario admin existe
    const adminUser = await prisma.adminUser.findUnique({
      where: { clerkId: userId }
    })

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Usuario admin no encontrado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('id')

    if (!noteId) {
      return NextResponse.json(
        { error: 'ID de nota es requerido' },
        { status: 400 }
      )
    }

    // Verificar que la nota existe
    const note = await prisma.formNote.findUnique({
      where: { id: noteId }
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Nota no encontrada' },
        { status: 404 }
      )
    }

    // Solo el creador o un SUPER_ADMIN puede eliminar
    if (note.createdBy !== adminUser.id && adminUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta nota' },
        { status: 403 }
      )
    }

    // Eliminar la nota
    await prisma.formNote.delete({
      where: { id: noteId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar nota:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}