-- 2026-05-19: Mapeo de drivers <-> contacts de Intercom.
--
-- Agrega 3 columnas a monchis_driver_cache para cachear el resultado del
-- search de Intercom y evitar 1 request por operación.
--
--  - intercom_contact_id: el id de Intercom (ej. "67462ff436e29544809472e0").
--    UNIQUE: un contact de Intercom mapea a un driver y viceversa.
--  - intercom_external_id: el external_id legacy que Intercom tiene cargado
--    (ej. "7072107"). No es nuestro driver_id (Mongo ObjectId de 24 chars);
--    es un identificador del sistema anterior de Monchis. Lo guardamos por
--    si en el futuro queremos resolver por ahí en vez de por name.
--  - intercom_synced_at: cuándo fue el último resolve exitoso. Si queda
--    NULL, todavía no se intentó. Útil para reintentar lookups fallidos.
--
-- Tras correr este script, regenerar el Prisma Client (`pnpm prisma generate`).

BEGIN;

ALTER TABLE monchis_driver_cache
  ADD COLUMN IF NOT EXISTS intercom_contact_id   TEXT,
  ADD COLUMN IF NOT EXISTS intercom_external_id  TEXT,
  ADD COLUMN IF NOT EXISTS intercom_synced_at    TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS monchis_driver_cache_intercom_contact_id_key
  ON monchis_driver_cache (intercom_contact_id);

COMMIT;
