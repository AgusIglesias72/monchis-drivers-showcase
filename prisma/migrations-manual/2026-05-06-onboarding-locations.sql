-- Migration: ubicaciones reusables + googleMapsUrl
-- Fecha: 2026-05-06
-- Idempotente: usa IF NOT EXISTS / DO blocks
--
-- Cambios:
--   1. Crea tabla onboarding_locations (ubicaciones guardadas)
--   2. Agrega columna location_id en onboarding_schedule_rules (FK opcional)
--   3. Agrega columna google_maps_url en onboarding_schedule_rules
--   4. NO borra location_lat/location_lng (deprecados pero mantenidos por compat)

BEGIN;

-- 1. Tabla de ubicaciones reusables
CREATE TABLE IF NOT EXISTS onboarding_locations (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  address         TEXT NOT NULL,
  google_maps_url TEXT NOT NULL,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS onboarding_locations_is_active_idx
  ON onboarding_locations (is_active);

-- 2. location_id en rules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_schedule_rules' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE onboarding_schedule_rules
      ADD COLUMN location_id TEXT;

    ALTER TABLE onboarding_schedule_rules
      ADD CONSTRAINT onboarding_schedule_rules_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES onboarding_locations(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. google_maps_url en rules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_schedule_rules' AND column_name = 'google_maps_url'
  ) THEN
    ALTER TABLE onboarding_schedule_rules
      ADD COLUMN google_maps_url TEXT;
  END IF;
END $$;

-- 4. Backfill: si una regla tiene lat/lng, generamos un googleMapsUrl pin a esas coords
--    Solo si googleMapsUrl está vacío. El admin lo puede editar después.
UPDATE onboarding_schedule_rules
SET google_maps_url = 'https://www.google.com/maps?q=' || location_lat::text || ',' || location_lng::text
WHERE google_maps_url IS NULL
  AND location_lat IS NOT NULL
  AND location_lng IS NOT NULL;

COMMIT;
