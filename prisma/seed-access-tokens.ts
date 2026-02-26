// prisma/seed-access-tokens.ts
// Script para generar accessToken en FormDrivers existentes que no tengan uno

import { prisma } from '../lib/prisma'
import { v4 as uuidv4 } from 'uuid'

async function main() {
  console.log('🌱 Iniciando generación de tokens de acceso...')

  // Obtener todos los FormDrivers que no tienen accessToken
  const driversWithoutToken = await prisma.formDriver.findMany({
    where: {
      accessToken: null,
    },
    select: {
      id: true,
      fullName: true,
      cedula: true,
      phoneNumber: true,
    },
  })

  if (driversWithoutToken.length === 0) {
    console.log('✨ Todos los drivers ya tienen token de acceso!')
    return
  }

  console.log(`📊 Encontrados ${driversWithoutToken.length} drivers sin token`)

  let successCount = 0
  let errorCount = 0

  for (const driver of driversWithoutToken) {
    try {
      const accessToken = uuidv4()

      await prisma.formDriver.update({
        where: { id: driver.id },
        data: {
          accessToken,
          accessTokenGeneratedAt: new Date(),
        },
      })

      console.log(
        `✅ Token generado para ${driver.fullName || driver.cedula} (${driver.phoneNumber})`
      )
      successCount++
    } catch (error) {
      console.error(
        `❌ Error generando token para ${driver.fullName || driver.cedula}:`,
        error
      )
      errorCount++
    }
  }

  console.log('\n📈 Resumen:')
  console.log(`  ✅ Tokens generados exitosamente: ${successCount}`)
  if (errorCount > 0) {
    console.log(`  ❌ Errores: ${errorCount}`)
  }
  console.log('✨ Seed de tokens completado!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
