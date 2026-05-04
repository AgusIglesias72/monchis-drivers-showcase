-- prisma/migrations-manual/2026-05-04-unify-cedula-document-type.sql
--
-- Unifica los tipos CEDULA_FRONT y CEDULA_BACK del enum DocumentType en un único
-- valor CEDULA. Razón: el form público hoy ya guarda todo lo que el postulante
-- sube como "cédula" en una sola categoría — la distinción frente/dorso era
-- artificial y confundía al agente IA.
--
-- ⚠️ CORRER ESTE SQL EN POSTGRES ANTES DE HACER `prisma db push` Y ANTES DE
-- DEPLOY A PROD. Si se hace al revés, Prisma se va a quejar porque el enum
-- ya no incluirá CEDULA_FRONT/BACK pero los rows todavía sí.
--
-- Cómo correrlo:
--   psql $DATABASE_URL -f prisma/migrations-manual/2026-05-04-unify-cedula-document-type.sql
--
-- Es idempotente: si ya se corrió, las operaciones son no-ops o fallan limpio.

-- ============================================================================
-- Paso 1: Agregar CEDULA al enum (no destructivo, no requiere downtime)
-- Esta operación NO puede ir en la misma transacción que el UPDATE siguiente,
-- por eso se usa COMMIT explícito.
-- ============================================================================

BEGIN;
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'CEDULA';
COMMIT;

-- ============================================================================
-- Paso 2: Migrar rows existentes y recrear enum sin los valores legacy
-- ============================================================================

BEGIN;

-- 2.1 Migrar todos los CEDULA_FRONT y CEDULA_BACK existentes a CEDULA
UPDATE form_documents
SET document_type = 'CEDULA'
WHERE document_type IN ('CEDULA_FRONT', 'CEDULA_BACK');

-- 2.2 Crear nuevo enum sin los valores legacy
-- IMPORTANTE: si en el futuro se agregan más valores al enum DocumentType en
-- schema.prisma, mantener esta lista alineada antes de correr migraciones.
CREATE TYPE "DocumentType_new" AS ENUM (
  'CEDULA',
  'LICENSE_FRONT',
  'LICENSE_BACK',
  'CRIMINAL_RECORD',
  'VEHICLE_INSURANCE',
  'VEHICLE_REGISTRATION',
  'VEHICLE_PHOTO_FRONT',
  'VEHICLE_PHOTO_BACK',
  'VEHICLE_PHOTO_SIDE',
  'TAX_COMPLIANCE',
  'PAYMENT_PROOF',
  'SELFIE',
  'OTHER'
);

-- 2.3 Cambiar la columna a usar el nuevo enum
ALTER TABLE form_documents
  ALTER COLUMN document_type TYPE "DocumentType_new"
  USING document_type::text::"DocumentType_new";

-- 2.4 Drop del enum viejo y renombrar el nuevo
DROP TYPE "DocumentType";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";

COMMIT;

-- ============================================================================
-- Verificación post-migración (correr a mano si querés confirmar)
-- ============================================================================
-- SELECT document_type, COUNT(*) FROM form_documents GROUP BY 1 ORDER BY 1;
-- SELECT enum_range(NULL::"DocumentType");
