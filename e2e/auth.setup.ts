import { test as setup, expect } from '@playwright/test'
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { createClerkClient } from '@clerk/backend'
import { PrismaClient } from '@prisma/client'
import { E2E_USER_EMAIL, e2eUserPassword } from './support/test-user'

const AUTH_FILE = 'e2e/.auth/admin.json'

// Aprovisiona (idempotente) el usuario E2E: en Clerk (instancia dev) y como
// AdminUser activo en la DB, igual que lo haría el webhook de Clerk.
async function ensureE2eUser(): Promise<void> {
  if (process.env.E2E_CLERK_USER_EMAIL) return

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) throw new Error('CLERK_SECRET_KEY no está seteada')
  if (!secretKey.startsWith('sk_test_')) {
    throw new Error(
      'CLERK_SECRET_KEY no es de una instancia de desarrollo (sk_test_). ' +
        'No aprovisiono usuarios E2E contra una instancia live; seteá E2E_CLERK_USER_EMAIL/PASSWORD.',
    )
  }

  const clerkClient = createClerkClient({ secretKey })
  const existing = await clerkClient.users.getUserList({ emailAddress: [E2E_USER_EMAIL] })

  let clerkUser = existing.data[0]
  if (!clerkUser) {
    clerkUser = await clerkClient.users.createUser({
      emailAddress: [E2E_USER_EMAIL],
      password: e2eUserPassword(),
      firstName: 'E2E',
      lastName: 'Admin',
      skipPasswordChecks: true,
    })
  }

  const prisma = new PrismaClient()
  try {
    await prisma.adminUser.upsert({
      where: { clerkId: clerkUser.id },
      create: {
        id: clerkUser.id,
        clerkId: clerkUser.id,
        email: E2E_USER_EMAIL,
        firstName: 'E2E',
        lastName: 'Admin',
        fullName: 'E2E Admin',
        role: 'ADMIN',
        isActive: true,
      },
      update: { isActive: true },
    })
  } finally {
    await prisma.$disconnect()
  }
}

setup('autenticar admin E2E', async ({ page }) => {
  await ensureE2eUser()

  await setupClerkTestingToken({ page })
  await page.goto('/sign-in')
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: E2E_USER_EMAIL,
      password: e2eUserPassword(),
    },
  })

  await page.goto('/admin')
  await expect(page.getByTestId('bug-report-trigger')).toBeVisible({ timeout: 30_000 })

  await page.context().storageState({ path: AUTH_FILE })
})
