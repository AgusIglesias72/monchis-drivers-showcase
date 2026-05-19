-- 2026-05-19: Auditoría de mensajes enviados via Intercom desde el panel.
--
-- Cada vez que un admin manda un mensaje 1-1 a un driver desde el sandbox
-- (o un trigger automático lo dispara), se escribe una fila acá. Sirve para:
--  - Auditoría: quién mandó qué a quién y cuándo.
--  - Debugging: si Intercom devuelve error, queda el body de respuesta.
--  - Métricas: cuántos mensajes por sender, por día, etc.
--
-- Tras correr este script, regenerar el Prisma Client (`pnpm prisma generate`).

BEGIN;

CREATE TABLE IF NOT EXISTS intercom_message_log (
  id                       TEXT         NOT NULL PRIMARY KEY,
  created_at               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Quién dispara el envío (admin de Monchis logueado en el panel).
  clerk_user_id            TEXT         NOT NULL,

  -- Driver destinatario (FK lógico a monchis_driver_cache.driver_id).
  driver_id                TEXT,

  -- Identificadores de Intercom para la conversación.
  intercom_contact_id      TEXT         NOT NULL,
  intercom_sender_admin_id TEXT         NOT NULL,
  intercom_assignee_admin_id TEXT,
  intercom_conversation_id TEXT,

  -- Contenido enviado (HTML que aceptó Intercom).
  body                     TEXT         NOT NULL,

  -- Estado del envío. 'sent' si la API respondió 200 y devolvió conv_id;
  -- 'failed' si tiró error.
  status                   TEXT         NOT NULL,
  error_message            TEXT,
  error_status_code        INTEGER,

  -- Metadata opcional (variables resueltas, template id, etc.). JSON libre.
  metadata                 JSONB
);

CREATE INDEX IF NOT EXISTS intercom_message_log_driver_id_idx
  ON intercom_message_log (driver_id);
CREATE INDEX IF NOT EXISTS intercom_message_log_clerk_user_id_idx
  ON intercom_message_log (clerk_user_id);
CREATE INDEX IF NOT EXISTS intercom_message_log_created_at_idx
  ON intercom_message_log (created_at);
CREATE INDEX IF NOT EXISTS intercom_message_log_status_idx
  ON intercom_message_log (status);

COMMIT;
