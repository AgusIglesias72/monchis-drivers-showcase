-- 2026-08-03: Idempotencia de recordatorios pre-turno por Intercom.
--
-- El cron `/api/cron/turno-reminders` corre cada 15 min y le manda a cada
-- driver con un turno reservado que arranca en 15-30 min un mensaje 1-1 por
-- Intercom (asignado a Abel Cardozo / Supervisor de Logística). El unique de
-- (shift_id, driver_id) es la garantía dura de "1 mensaje por persona por
-- turno": si el cron corre dos veces sobre la misma ventana (solape, retry),
-- el segundo intento encuentra la fila existente y no reenvía.
--
-- Tras correr este script, regenerar el Prisma Client (`pnpm prisma generate`).

BEGIN;

CREATE TABLE IF NOT EXISTS turno_reminder_sent (
  id         TEXT         NOT NULL PRIMARY KEY,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  shift_id   TEXT         NOT NULL,
  driver_id  TEXT         NOT NULL,
  date_iso   TEXT         NOT NULL,
  from_hour  DOUBLE PRECISION,
  zone_id    TEXT         NOT NULL,
  zone_name  TEXT         NOT NULL,

  -- 'sent' | 'failed' | 'skipped_no_contact'
  status                    TEXT NOT NULL,
  intercom_conversation_id  TEXT,
  error_message             TEXT,

  CONSTRAINT turno_reminder_sent_shift_driver_key UNIQUE (shift_id, driver_id)
);

CREATE INDEX IF NOT EXISTS turno_reminder_sent_date_iso_idx
  ON turno_reminder_sent (date_iso);

COMMIT;
