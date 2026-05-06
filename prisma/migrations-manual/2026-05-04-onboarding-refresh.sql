-- prisma/migrations-manual/2026-05-04-onboarding-refresh.sql
--
-- Refresh total de capacitaciones (onboarding) tipo Calendly.
-- Crea OnboardingScheduleRule (reglas recurrentes), OnboardingScheduleException
-- (feriados/overrides), PublicBookingSession (gating sin OTP). Modifica
-- onboarding_events agregando snapshot de modality/instructions/duration/timezone
-- + version (OCC) + scheduleRuleId (link a la regla que lo materializó).
--
-- ⚠️ CORRER ESTE SQL EN POSTGRES ANTES DE HACER `prisma db push` Y ANTES DE
-- DEPLOY A PROD. Razón: introducimos enums nuevos que Prisma no puede crear
-- via `db push` cuando ya hay rows que requieren backfill de los nuevos campos.
--
-- Cómo correrlo:
--   psql $DATABASE_URL -f prisma/migrations-manual/2026-05-04-onboarding-refresh.sql
--
-- Es idempotente: si ya se corrió, las operaciones son no-ops o fallan limpio.

-- ============================================================================
-- Paso 1: Crear los enums nuevos
-- ============================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE "OnboardingModality" AS ENUM ('IN_PERSON', 'VIRTUAL', 'HYBRID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OnboardingFrequency" AS ENUM ('WEEKLY', 'ONE_OFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OnboardingExceptionType" AS ENUM ('CANCELLED', 'OVERRIDE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OnboardingPaymentMode" AS ENUM ('POST_EVENT', 'PRE_BOOKING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- ============================================================================
-- Paso 2: Tabla onboarding_schedule_rules (reglas recurrentes tipo Event Type)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "onboarding_schedule_rules" (
  "id"                    TEXT PRIMARY KEY,
  "slug"                  TEXT NOT NULL UNIQUE,
  "title"                 TEXT NOT NULL,
  "description"           TEXT,
  "instructions"          TEXT,

  "modality"              "OnboardingModality" NOT NULL,
  "location"              TEXT,
  "location_address"      TEXT,
  "location_lat"          DOUBLE PRECISION,
  "location_lng"          DOUBLE PRECISION,
  "meeting_link"          TEXT,
  "meeting_platform"      TEXT,

  "frequency"             "OnboardingFrequency" NOT NULL DEFAULT 'WEEKLY',
  "days_of_week"          INTEGER[] NOT NULL DEFAULT '{}',
  "start_time"            TEXT NOT NULL,
  "duration_minutes"      INTEGER NOT NULL DEFAULT 120,
  "timezone"              TEXT NOT NULL DEFAULT 'America/Asuncion',

  "valid_from"            TIMESTAMP(3) NOT NULL,
  "valid_to"              TIMESTAMP(3),

  "max_capacity"          INTEGER NOT NULL DEFAULT 20,
  "min_notice_hours"      INTEGER NOT NULL DEFAULT 2,
  "max_future_days"       INTEGER NOT NULL DEFAULT 60,
  "buffer_before_min"     INTEGER NOT NULL DEFAULT 0,
  "buffer_after_min"      INTEGER NOT NULL DEFAULT 0,
  "cancel_deadline_hours" INTEGER NOT NULL DEFAULT 4,
  "payment_mode"          "OnboardingPaymentMode" NOT NULL DEFAULT 'POST_EVENT',

  "is_active"             BOOLEAN NOT NULL DEFAULT true,
  "is_public"             BOOLEAN NOT NULL DEFAULT true,

  "default_organizer"     TEXT NOT NULL,
  "created_by"            TEXT NOT NULL,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "onboarding_schedule_rules_default_organizer_fkey"
    FOREIGN KEY ("default_organizer") REFERENCES "admin_users"("id") ON DELETE RESTRICT,
  CONSTRAINT "onboarding_schedule_rules_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "admin_users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "onboarding_schedule_rules_slug_idx"
  ON "onboarding_schedule_rules"("slug");
CREATE INDEX IF NOT EXISTS "onboarding_schedule_rules_active_public_idx"
  ON "onboarding_schedule_rules"("is_active", "is_public");
CREATE INDEX IF NOT EXISTS "onboarding_schedule_rules_modality_idx"
  ON "onboarding_schedule_rules"("modality");

COMMIT;

-- ============================================================================
-- Paso 3: Tabla onboarding_schedule_exceptions (feriados / overrides puntuales)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "onboarding_schedule_exceptions" (
  "id"                     TEXT PRIMARY KEY,
  "rule_id"                TEXT NOT NULL,
  "date"                   TIMESTAMP(3) NOT NULL,
  "type"                   "OnboardingExceptionType" NOT NULL,

  "override_start_time"    TEXT,
  "override_duration_min"  INTEGER,
  "override_max_capacity"  INTEGER,
  "override_meeting_link"  TEXT,

  "reason"                 TEXT,
  "created_by"             TEXT NOT NULL,
  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "onboarding_schedule_exceptions_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "onboarding_schedule_rules"("id") ON DELETE CASCADE,
  CONSTRAINT "onboarding_schedule_exceptions_rule_date_unique"
    UNIQUE ("rule_id", "date")
);

CREATE INDEX IF NOT EXISTS "onboarding_schedule_exceptions_date_idx"
  ON "onboarding_schedule_exceptions"("date");

COMMIT;

-- ============================================================================
-- Paso 4: Tabla public_booking_sessions (gating sin OTP)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "public_booking_sessions" (
  "id"             TEXT PRIMARY KEY,
  "form_driver_id" TEXT NOT NULL,
  "share_token"    TEXT NOT NULL UNIQUE,
  "expires_at"     TIMESTAMP(3) NOT NULL,
  "used_at"        TIMESTAMP(3),
  "ip_address"     TEXT,
  "user_agent"     TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "public_booking_sessions_form_driver_id_fkey"
    FOREIGN KEY ("form_driver_id") REFERENCES "form_drivers"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "public_booking_sessions_share_token_idx"
  ON "public_booking_sessions"("share_token");
CREATE INDEX IF NOT EXISTS "public_booking_sessions_form_driver_id_idx"
  ON "public_booking_sessions"("form_driver_id");
CREATE INDEX IF NOT EXISTS "public_booking_sessions_expires_at_idx"
  ON "public_booking_sessions"("expires_at");

COMMIT;

-- ============================================================================
-- Paso 5: Modificar onboarding_events — agregar snapshot fields + OCC + FK
-- ============================================================================

BEGIN;

-- 5.1 Agregar columnas (idempotente con IF NOT EXISTS)
ALTER TABLE "onboarding_events"
  ADD COLUMN IF NOT EXISTS "schedule_rule_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "modality"          "OnboardingModality",
  ADD COLUMN IF NOT EXISTS "instructions"      TEXT,
  ADD COLUMN IF NOT EXISTS "duration_minutes"  INTEGER,
  ADD COLUMN IF NOT EXISTS "timezone"          TEXT NOT NULL DEFAULT 'America/Asuncion',
  ADD COLUMN IF NOT EXISTS "version"           INTEGER NOT NULL DEFAULT 0;

-- 5.2 FK a la rule (SET NULL para no perder eventos si la rule se borra)
DO $$ BEGIN
  ALTER TABLE "onboarding_events"
    ADD CONSTRAINT "onboarding_events_schedule_rule_id_fkey"
    FOREIGN KEY ("schedule_rule_id") REFERENCES "onboarding_schedule_rules"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5.3 Backfill: eventos legacy se asumen presenciales y se les calcula la duración
--      desde startTime/endTime cuando ambos están presentes y son parseables.
UPDATE "onboarding_events"
SET "modality" = 'IN_PERSON'
WHERE "modality" IS NULL;

-- Cálculo defensivo: solo updatea si endTime y startTime tienen formato HH:MM válido.
UPDATE "onboarding_events"
SET "duration_minutes" = (
  (SUBSTRING("end_time" FROM 1 FOR 2)::INT * 60 + SUBSTRING("end_time" FROM 4 FOR 2)::INT)
  - (SUBSTRING("start_time" FROM 1 FOR 2)::INT * 60 + SUBSTRING("start_time" FROM 4 FOR 2)::INT)
)
WHERE "duration_minutes" IS NULL
  AND "start_time" ~ '^[0-9]{2}:[0-9]{2}$'
  AND "end_time" IS NOT NULL
  AND "end_time" ~ '^[0-9]{2}:[0-9]{2}$';

-- Default conservador para los que no tienen endTime parseable
UPDATE "onboarding_events"
SET "duration_minutes" = 120
WHERE "duration_minutes" IS NULL OR "duration_minutes" <= 0;

-- 5.4 Índices nuevos
CREATE INDEX IF NOT EXISTS "onboarding_events_schedule_rule_id_idx"
  ON "onboarding_events"("schedule_rule_id");
CREATE INDEX IF NOT EXISTS "onboarding_events_scheduled_status_idx"
  ON "onboarding_events"("scheduled_date", "status");

COMMIT;

-- ============================================================================
-- Verificación post-migración (correr a mano si querés confirmar)
-- ============================================================================
-- SELECT typname FROM pg_type WHERE typname IN
--   ('OnboardingModality','OnboardingFrequency','OnboardingExceptionType','OnboardingPaymentMode');
-- SELECT COUNT(*) FROM onboarding_schedule_rules;
-- SELECT COUNT(*) FROM onboarding_schedule_exceptions;
-- SELECT COUNT(*) FROM public_booking_sessions;
-- SELECT modality, COUNT(*) FROM onboarding_events GROUP BY 1;
-- SELECT COUNT(*) FROM onboarding_events WHERE duration_minutes IS NULL;  -- debe ser 0
