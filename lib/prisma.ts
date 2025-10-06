// lib/prisma.ts

import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Cliente singleton de Prisma
 * 
 * En desarrollo, guardamos el cliente en global para evitar
 * crear múltiples instancias con hot reload.
 * En producción, siempre creamos una nueva instancia.
 */
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
