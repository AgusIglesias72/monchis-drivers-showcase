-- 2026-05-20: Snapshots horarios de planificación de turnos.
--
-- Un cron (`/api/cron/snapshot-turnos`, schedule `0 * * * *`) consulta la API
-- externa de turnos SIN caché y persiste la foto completa de reservas por
-- zona/hora. A partir de estas fotos se derivan métricas hora-a-hora
-- (más/menos drivers por zona) y deserciones (bajas en un mismo turno), y se
-- postea un resumen a Slack vía SLACK_WEBHOOK_URL.
--
-- NO toca la vista on-the-fly de /admin/gestion/turnos (sigue leyendo la API
-- cacheada 10 min). Estas tablas son solo el registro histórico.
--
-- Tras correr este script, regenerar el Prisma Client (`npx prisma generate`).

BEGIN;

CREATE TABLE IF NOT EXISTS turnos_snapshot (
  id              TEXT         NOT NULL PRIMARY KEY,
  captured_at     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Hora local (Asunción) que esta foto representa, para queries por hora.
  local_date      TEXT         NOT NULL, -- "YYYY-MM-DD"
  local_hour      INTEGER      NOT NULL, -- 0-23

  -- Totales del slot activo a la hora de captura (todas las zonas).
  active_assigned INTEGER      NOT NULL DEFAULT 0,
  active_max      INTEGER      NOT NULL DEFAULT 0,
  shift_count     INTEGER      NOT NULL DEFAULT 0,

  -- { zoneName: { zoneId, assigned, max, driverIds[] } } del slot activo.
  active_by_zone  JSONB,

  -- [{ zoneId, message }] si alguna zona falló al consultar la API.
  errors          JSONB
);

CREATE INDEX IF NOT EXISTS turnos_snapshot_captured_at_idx
  ON turnos_snapshot (captured_at);
CREATE INDEX IF NOT EXISTS turnos_snapshot_local_date_hour_idx
  ON turnos_snapshot (local_date, local_hour);

CREATE TABLE IF NOT EXISTS turnos_shift_snapshot (
  id               TEXT             NOT NULL PRIMARY KEY,
  snapshot_id      TEXT             NOT NULL REFERENCES turnos_snapshot(id) ON DELETE CASCADE,

  shift_id           TEXT             NOT NULL,
  zone_id            TEXT             NOT NULL,
  zone_name          TEXT             NOT NULL,
  shift_name         TEXT             NOT NULL DEFAULT '',
  date_iso           TEXT             NOT NULL, -- "YYYY-MM-DD" del turno (puede ser futuro)
  from_hour          DOUBLE PRECISION,
  to_hour            DOUBLE PRECISION,
  drivers_assigned   INTEGER          NOT NULL DEFAULT 0,
  max_drivers        INTEGER          NOT NULL DEFAULT 0,
  occupancy_pct      DOUBLE PRECISION NOT NULL DEFAULT 0,
  payment_type       TEXT             NOT NULL,
  pct_hour_compliance DOUBLE PRECISION NOT NULL DEFAULT 0,
  enabled            BOOLEAN          NOT NULL DEFAULT FALSE,

  -- Reservas del turno en esta foto.
  driver_ids       JSONB            NOT NULL,
  driver_names     JSONB            NOT NULL
);

CREATE INDEX IF NOT EXISTS turnos_shift_snapshot_snapshot_id_idx
  ON turnos_shift_snapshot (snapshot_id);
CREATE INDEX IF NOT EXISTS turnos_shift_snapshot_shift_id_idx
  ON turnos_shift_snapshot (shift_id);
CREATE INDEX IF NOT EXISTS turnos_shift_snapshot_zone_date_idx
  ON turnos_shift_snapshot (zone_id, date_iso);

-- Eventos de alta/baja por turno (el "motor de variaciones"): se llenan en el
-- cron diffeando cada foto contra la anterior.
CREATE TABLE IF NOT EXISTS turnos_shift_event (
  id          TEXT         NOT NULL PRIMARY KEY,
  snapshot_id TEXT         NOT NULL REFERENCES turnos_snapshot(id) ON DELETE CASCADE,
  detected_at TIMESTAMP(3) NOT NULL,
  shift_id    TEXT         NOT NULL,
  zone_id     TEXT         NOT NULL,
  zone_name   TEXT         NOT NULL,
  date_iso    TEXT         NOT NULL, -- día del turno
  from_hour   DOUBLE PRECISION,
  to_hour     DOUBLE PRECISION,
  event_type  TEXT         NOT NULL, -- "join" | "leave"
  driver_id   TEXT         NOT NULL,
  driver_name TEXT
);

CREATE INDEX IF NOT EXISTS turnos_shift_event_detected_at_idx
  ON turnos_shift_event (detected_at);
CREATE INDEX IF NOT EXISTS turnos_shift_event_date_hour_idx
  ON turnos_shift_event (date_iso, from_hour);
CREATE INDEX IF NOT EXISTS turnos_shift_event_zone_date_idx
  ON turnos_shift_event (zone_id, date_iso);
CREATE INDEX IF NOT EXISTS turnos_shift_event_shift_id_idx
  ON turnos_shift_event (shift_id);
CREATE INDEX IF NOT EXISTS turnos_shift_event_driver_id_idx
  ON turnos_shift_event (driver_id);

COMMIT;
