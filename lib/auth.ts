// lib/auth.ts
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  const user = await prisma.adminUser.findUnique({
    where: { clerkId: userId },
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  if (!user.isActive) {
    throw new Error('Tu cuenta está desactivada. Contacta al administrador.')
  }

  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error('No tienes permisos para acceder a este recurso')
  }

  return user
}

// Ejemplo de uso en una Server Action o Route Handler:
// const user = await requireAuth()
// const user = await requireRole(['SUPER_ADMIN', 'ADMIN'])