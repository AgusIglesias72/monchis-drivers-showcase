-- 2026-05-19: Eliminar campos de ManyChat y renombrar approval lock.
--
-- Cambios:
--  1. FormDriver.manychat_approval_sent_at → approval_notified_at (rename)
--  2. FormDriver.manychat_subscriber_id → DROP
--  3. WhatsAppTemplate.manychat_flow_id → DROP
--
-- Asume que ya NO hay código en prod usando manychat_*. Tras correr este script,
-- regenerar el Prisma Client (`pnpm prisma generate`) para que los tipos
-- coincidan con el nuevo schema.
--
-- Ejecutar dentro de una transacción para que sea reversible si algo falla.

BEGIN;

-- 1) Renombrar campo de lock idempotente del approve.
ALTER TABLE form_drivers
  RENAME COLUMN manychat_approval_sent_at TO approval_notified_at;

-- 2) Drop subscriberId + su índice. CASCADE no aplica porque no hay FKs.
DROP INDEX IF EXISTS form_drivers_manychat_subscriber_id_idx;
ALTER TABLE form_drivers
  DROP COLUMN IF EXISTS manychat_subscriber_id;

-- 3) Drop flowId de templates.
ALTER TABLE whatsapp_templates
  DROP COLUMN IF EXISTS manychat_flow_id;

COMMIT;
