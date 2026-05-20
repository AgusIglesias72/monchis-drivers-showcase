-- 2026-05-20: Índice de conversaciones de Intercom + log de webhooks.
--
-- intercom_conversation: una fila por contact (driver). Es el ÍNDICE para la
-- vista de conversaciones — la lista sale de acá; el contenido del hilo se
-- trae on-demand de la API (getConversationThread). El webhook la mantiene
-- actualizada (unread, estado, última actividad).
--
-- intercom_webhook_event: dedup + auditoría de los webhooks entrantes.
-- Intercom reintenta si no respondemos 200, así que deduplicamos por event id.
--
-- Tras correr este script, regenerar el Prisma Client.

BEGIN;

CREATE TABLE IF NOT EXISTS intercom_conversation (
  id                       TEXT         NOT NULL PRIMARY KEY,
  -- Un contact = una conversación lógica en nuestra vista (agrupamos el hilo).
  intercom_contact_id      TEXT         NOT NULL,
  driver_id                TEXT, -- FK lógico a monchis_driver_cache.driver_id
  -- Último conversation_id conocido (para linkear / traer el hilo).
  intercom_conversation_id TEXT,
  -- 'open' | 'closed' | 'snoozed'
  state                    TEXT,
  unread                   BOOLEAN      NOT NULL DEFAULT false,
  last_outbound_at         TIMESTAMP(3),
  last_reply_at            TIMESTAMP(3),
  -- Para ordenar la lista por actividad reciente.
  last_message_at          TIMESTAMP(3),
  created_at               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS intercom_conversation_contact_id_key
  ON intercom_conversation (intercom_contact_id);
CREATE INDEX IF NOT EXISTS intercom_conversation_driver_id_idx
  ON intercom_conversation (driver_id);
CREATE INDEX IF NOT EXISTS intercom_conversation_unread_idx
  ON intercom_conversation (unread);
CREATE INDEX IF NOT EXISTS intercom_conversation_last_message_at_idx
  ON intercom_conversation (last_message_at);

CREATE TABLE IF NOT EXISTS intercom_webhook_event (
  id                 TEXT         NOT NULL PRIMARY KEY,
  -- id de la notificación que manda Intercom; unique para deduplicar reintentos.
  intercom_event_id  TEXT         NOT NULL,
  topic              TEXT         NOT NULL,
  payload            JSONB        NOT NULL,
  -- 'processed' | 'ignored' | 'error'
  status             TEXT         NOT NULL,
  error_message      TEXT,
  processed_at       TIMESTAMP(3),
  created_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS intercom_webhook_event_event_id_key
  ON intercom_webhook_event (intercom_event_id);
CREATE INDEX IF NOT EXISTS intercom_webhook_event_topic_idx
  ON intercom_webhook_event (topic);
CREATE INDEX IF NOT EXISTS intercom_webhook_event_created_at_idx
  ON intercom_webhook_event (created_at);

COMMIT;
