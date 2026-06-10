-- 2026-06-10: Detección de salidas sin acción (driver departure events).
--
-- El cron `/api/cron/collect-live-orders` (schedule `* * * * *`) ya recibe la
-- posición de cada driver junto con sus órdenes activas. Con eso:
--   * live_order_sample: muestra por minuto driver↔orden con distancias al
--     comercio y al cliente (solo debug/tuning de umbrales, retención corta).
--   * live_order_tracking: estado de la máquina de proximidad por orden activa
--     (1 fila por request_id, reescrita en cada corrida del cron).
--   * driver_departure_event: evento confirmado — el driver llegó a un lugar y
--     se fue sin marcar la acción esperada (salió del comercio sin marcar
--     DELIVERY / se fue del cliente sin marcar FINALIZED). Se listan en
--     /admin/gestion/anomalias.
--
-- Tras correr este script, regenerar el Prisma Client (`npx prisma generate`).

BEGIN;

CREATE TABLE IF NOT EXISTS live_order_sample (
  id             SERIAL       NOT NULL PRIMARY KEY,
  fetched_at     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_id     TEXT         NOT NULL,
  driver_id      TEXT         NOT NULL,
  state          TEXT         NOT NULL, -- ACCEPTED | WAITING_ORDER | DELIVERY | OUTSIDE
  driver_lat     DOUBLE PRECISION,
  driver_lng     DOUBLE PRECISION,
  dist_origin_m  INTEGER,
  dist_dest_m    INTEGER,
  position_stale BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS live_order_sample_request_id_fetched_at_idx
  ON live_order_sample (request_id, fetched_at);
CREATE INDEX IF NOT EXISTS live_order_sample_fetched_at_idx
  ON live_order_sample (fetched_at);

CREATE TABLE IF NOT EXISTS live_order_tracking (
  request_id                TEXT         NOT NULL PRIMARY KEY,
  driver_id                 TEXT         NOT NULL,
  external_order_id         TEXT,
  driver_name               TEXT,
  branch_name               TEXT,
  dest_address              TEXT,
  zone_name                 TEXT,

  last_state                TEXT         NOT NULL,
  last_seen_at              TIMESTAMP(3) NOT NULL,
  last_driver_lat           DOUBLE PRECISION,
  last_driver_lng           DOUBLE PRECISION,

  origin_near_streak        INTEGER      NOT NULL DEFAULT 0,
  origin_far_streak         INTEGER      NOT NULL DEFAULT 0,
  origin_arrived_at         TIMESTAMP(3),
  origin_left_candidate_at  TIMESTAMP(3),
  origin_event_emitted      BOOLEAN      NOT NULL DEFAULT FALSE,
  origin_resolved           BOOLEAN      NOT NULL DEFAULT FALSE,

  dest_near_streak          INTEGER      NOT NULL DEFAULT 0,
  dest_far_streak           INTEGER      NOT NULL DEFAULT 0,
  dest_arrived_at           TIMESTAMP(3),
  dest_left_candidate_at    TIMESTAMP(3),
  dest_event_emitted        BOOLEAN      NOT NULL DEFAULT FALSE,

  created_at                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS live_order_tracking_last_seen_at_idx
  ON live_order_tracking (last_seen_at);

CREATE TABLE IF NOT EXISTS driver_departure_event (
  id                      SERIAL       NOT NULL PRIMARY KEY,
  type                    TEXT         NOT NULL, -- LEFT_ORIGIN_WITHOUT_DELIVERY | LEFT_DESTINATION_WITHOUT_FINALIZE
  request_id              TEXT         NOT NULL,
  external_order_id       TEXT,
  driver_id               TEXT         NOT NULL,
  driver_name             TEXT,
  branch_name             TEXT,
  place_name              TEXT,
  zone_name               TEXT,
  state_at_event          TEXT         NOT NULL,
  arrived_at              TIMESTAMP(3) NOT NULL,
  left_at                 TIMESTAMP(3) NOT NULL,
  detected_at             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dwell_seconds           INTEGER      NOT NULL,
  distance_at_detection_m INTEGER      NOT NULL,
  other_place_distance_m  INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS driver_departure_event_request_id_type_key
  ON driver_departure_event (request_id, type);
CREATE INDEX IF NOT EXISTS driver_departure_event_detected_at_idx
  ON driver_departure_event (detected_at);
CREATE INDEX IF NOT EXISTS driver_departure_event_driver_id_idx
  ON driver_departure_event (driver_id);
CREATE INDEX IF NOT EXISTS driver_departure_event_type_detected_at_idx
  ON driver_departure_event (type, detected_at);

COMMIT;
