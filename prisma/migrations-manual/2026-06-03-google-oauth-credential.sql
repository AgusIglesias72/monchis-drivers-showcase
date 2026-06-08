-- 2026-06-03: Persistir el refresh_token de Google OAuth en DB.
--
-- Contexto: la app OAuth está en modo Testing en GCP, así que los refresh
-- tokens caducan a los 7 días. Hasta ahora había que correr el script
-- `npm run auth:google` y pegar el token en `.env` de cada entorno
-- (Vercel + Railway). Esta tabla guarda el token vigente para que el script
-- lo POSTee a `/api/admin/google-oauth/refresh-token` una sola vez y todos
-- los entornos lo lean desde DB. Sigue habiendo fallback a
-- `GOOGLE_OAUTH_REFRESH_TOKEN` por si la DB no está disponible.
--
-- Es un singleton: una sola fila (`id = 'default'`). Si en algún momento
-- hubiera varias apps OAuth, se puede agregar `client_id` al PK.
--
-- Tras correr este script, regenerar el Prisma Client (`npx prisma generate`).

BEGIN;

CREATE TABLE IF NOT EXISTS google_oauth_credential (
  id              TEXT         NOT NULL PRIMARY KEY DEFAULT 'default',

  refresh_token   TEXT         NOT NULL,

  -- Cuándo lo subió el script (= fecha del consent flow).
  rotated_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Última vez que el cron `/api/cron/refresh-google-token` o cualquier
  -- consumidor lo usó con éxito. Sirve para alertar si lleva días sin éxito.
  last_used_at    TIMESTAMP(3),

  -- Último error de Google al refrescar (si lo hubo). Se limpia en éxito.
  last_error      TEXT,
  last_error_at   TIMESTAMP(3),

  -- Quién lo subió (email del admin desde el script, o "cron"). Solo informativo.
  rotated_by      TEXT
);

COMMIT;
