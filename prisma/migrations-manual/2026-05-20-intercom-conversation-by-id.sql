-- 2026-05-20: Cambiar intercom_conversation de índice por-contact a por-conversación.
--
-- Antes: una fila por contact (driver), mostraba "la última conversación del
-- driver". Ahora: una fila por CONVERSACIÓN que iniciamos nosotros, identificada
-- por su intercom_conversation_id (que ahora obtenemos del POST /messages con
-- create_conversation_without_contact_reply). Un driver puede tener varias.
--
-- Limpiamos los datos viejos (eran del modelo por-contact, con conv_id null).

BEGIN;

-- Borrar datos del modelo anterior.
DELETE FROM intercom_conversation;

-- Quitar el unique por contact.
DROP INDEX IF EXISTS intercom_conversation_contact_id_key;

-- conversation_id pasa a ser obligatorio y único.
ALTER TABLE intercom_conversation
  ALTER COLUMN intercom_conversation_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS intercom_conversation_conversation_id_key
  ON intercom_conversation (intercom_conversation_id);

-- contact_id sigue indexado pero sin unique (un contact = varias conversaciones).
CREATE INDEX IF NOT EXISTS intercom_conversation_contact_id_idx
  ON intercom_conversation (intercom_contact_id);

COMMIT;
