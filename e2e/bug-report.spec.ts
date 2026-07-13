import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { PrismaClient } from '@prisma/client'
import { E2E_TITLE_PREFIX } from './support/test-user'

const runId = `${E2E_TITLE_PREFIX} bug-report ${Math.random().toString(36).slice(2, 8)}`

test.afterAll(async () => {
  const prisma = new PrismaClient()
  try {
    await prisma.bugReport.deleteMany({
      where: { title: { startsWith: E2E_TITLE_PREFIX } },
    })
  } finally {
    await prisma.$disconnect()
  }
})

test.describe('Reporte de bugs desde el topbar', () => {
  test('flujo completo: abrir, validar, adjuntar y enviar', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/admin')

    const trigger = page.getByTestId('bug-report-trigger')
    await expect(trigger).toBeVisible()
    await trigger.click()

    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('Reportar un problema')).toBeVisible()

    const submit = page.getByTestId('bug-report-submit')
    await expect(submit).toBeDisabled()

    await drawer.getByRole('radio', { name: 'Mejora' }).click()

    await page.getByTestId('bug-report-title').fill(runId)
    await expect(submit).toBeDisabled()

    await page
      .getByTestId('bug-report-description')
      .fill('Reporte generado por el test E2E: pasos, resultado esperado y observado.')
    await expect(submit).toBeEnabled()

    await drawer.getByRole('button', { name: 'Adjuntar archivo' }).click()
    const fileInput = drawer.locator('input[type="file"]')
    await fileInput.setInputFiles('e2e/fixtures/screenshot.png')
    await expect(drawer.getByText('screenshot.png')).toBeVisible()
    await expect(submit).toBeEnabled({ timeout: 20_000 })

    const createResponse = page.waitForResponse(
      (res) => res.url().includes('/api/admin/bug-reports') && res.request().method() === 'POST',
    )
    await submit.click()
    const response = await createResponse
    expect(response.ok()).toBeTruthy()

    await expect(page.getByText('Reporte enviado. Gracias por avisar.')).toBeVisible()
    await expect(drawer).not.toBeVisible()

    const { id } = (await response.json()) as { id: string }
    const prisma = new PrismaClient()
    try {
      const report = await prisma.bugReport.findUnique({ where: { id } })
      expect(report).not.toBeNull()
      expect(report?.title).toBe(runId)
      expect(report?.type).toBe('MEJORA')
      expect(report?.pageUrl).toBe('/admin')
      expect(Array.isArray(report?.attachments)).toBeTruthy()
    } finally {
      await prisma.$disconnect()
    }
  })

  test('cerrar con Escape no envía nada', async ({ page }) => {
    await setupClerkTestingToken({ page })
    await page.goto('/admin')

    await page.getByTestId('bug-report-trigger').click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).not.toBeVisible()
  })
})
