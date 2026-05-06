// scripts/onboarding-migration-check.ts
//
// Pre/post checks idempotentes para la migration 2026-05-04-onboarding-refresh.
// Pasale `pre` o `post` como argumento.
//
//   tsx scripts/onboarding-migration-check.ts pre
//   tsx scripts/onboarding-migration-check.ts post
//
// El script imprime conteos críticos para confirmar que la migración no afectó
// data existente.

import { prisma } from '../lib/prisma'

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename=$1) AS exists`,
    name,
  )
  return rows[0]?.exists === true
}

async function typeExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM pg_type WHERE typname=$1`,
    name,
  )
  return Number(rows[0]?.count ?? 0) > 0
}

async function columnExists(table: string, col: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    table,
    col,
  )
  return Number(rows[0]?.count ?? 0) > 0
}

async function countRows(table: string): Promise<number | null> {
  if (!(await tableExists(table))) return null
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM "${table}"`,
  )
  return Number(rows[0]?.count ?? 0)
}

async function pre() {
  console.log('\n=== PRE-MIGRATION SNAPSHOT ===\n')

  const tables = [
    'onboarding_events',
    'onboarding_attendees',
    'form_drivers',
    'admin_users',
    'audit_logs',
  ]
  for (const t of tables) {
    const c = await countRows(t)
    console.log(`  ${t.padEnd(36)} → ${c === null ? 'TABLE MISSING' : c.toString().padStart(8)} rows`)
  }

  console.log('\n  New tables (should NOT exist yet, or be empty if rerun):')
  for (const t of [
    'onboarding_schedule_rules',
    'onboarding_schedule_exceptions',
    'public_booking_sessions',
  ]) {
    const c = await countRows(t)
    console.log(`  ${t.padEnd(36)} → ${c === null ? 'not yet created' : `${c} rows (already migrated?)`}`)
  }

  console.log('\n  New enums (should NOT exist yet):')
  for (const e of [
    'OnboardingModality',
    'OnboardingFrequency',
    'OnboardingExceptionType',
    'OnboardingPaymentMode',
  ]) {
    console.log(`  ${e.padEnd(36)} → ${(await typeExists(e)) ? 'already exists' : 'not yet'}`)
  }

  console.log('\n  New columns on onboarding_events:')
  for (const c of ['schedule_rule_id', 'modality', 'instructions', 'duration_minutes', 'timezone', 'version']) {
    console.log(`  ${c.padEnd(36)} → ${(await columnExists('onboarding_events', c)) ? 'present' : 'missing'}`)
  }
}

async function post() {
  console.log('\n=== POST-MIGRATION VERIFICATION ===\n')

  const expectedNonZero: Record<string, number | null> = {
    onboarding_events: null,
    onboarding_attendees: null,
    form_drivers: null,
    admin_users: null,
    audit_logs: null,
  }
  for (const t of Object.keys(expectedNonZero)) {
    expectedNonZero[t] = await countRows(t)
    console.log(`  ${t.padEnd(36)} → ${expectedNonZero[t]} rows (untouched)`)
  }

  console.log('\n  New tables (must exist, empty initially):')
  for (const t of [
    'onboarding_schedule_rules',
    'onboarding_schedule_exceptions',
    'public_booking_sessions',
  ]) {
    const exists = await tableExists(t)
    const c = exists ? await countRows(t) : null
    console.log(`  ${t.padEnd(36)} → ${exists ? `OK (${c} rows)` : 'MISSING ❌'}`)
  }

  console.log('\n  New enums (must exist):')
  for (const e of [
    'OnboardingModality',
    'OnboardingFrequency',
    'OnboardingExceptionType',
    'OnboardingPaymentMode',
  ]) {
    const ok = await typeExists(e)
    console.log(`  ${e.padEnd(36)} → ${ok ? 'OK' : 'MISSING ❌'}`)
  }

  console.log('\n  New columns on onboarding_events (must be present):')
  for (const c of ['schedule_rule_id', 'modality', 'instructions', 'duration_minutes', 'timezone', 'version']) {
    const ok = await columnExists('onboarding_events', c)
    console.log(`  ${c.padEnd(36)} → ${ok ? 'OK' : 'MISSING ❌'}`)
  }

  console.log('\n  Backfill verification (legacy events should have modality + duration):')
  const nullModality = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM onboarding_events WHERE modality IS NULL`,
  )
  const nullDuration = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM onboarding_events WHERE duration_minutes IS NULL OR duration_minutes <= 0`,
  )
  console.log(`  events with NULL modality        → ${Number(nullModality[0].count)} (expect 0)`)
  console.log(`  events with NULL/0 duration       → ${Number(nullDuration[0].count)} (expect 0)`)

  const modalityDist = await prisma.$queryRawUnsafe<Array<{ modality: string; count: bigint }>>(
    `SELECT modality::text AS modality, COUNT(*)::bigint AS count FROM onboarding_events GROUP BY modality`,
  )
  console.log('\n  Modality distribution:')
  for (const r of modalityDist) {
    console.log(`    ${r.modality} → ${Number(r.count)}`)
  }

  console.log('\n=== ALL CHECKS COMPLETED ===\n')
}

const mode = process.argv[2]
if (mode !== 'pre' && mode !== 'post') {
  console.error('Usage: tsx scripts/onboarding-migration-check.ts [pre|post]')
  process.exit(1)
}

;(async () => {
  try {
    if (mode === 'pre') await pre()
    else await post()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
