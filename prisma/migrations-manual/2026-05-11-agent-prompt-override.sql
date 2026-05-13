-- Migration: configuración runtime del agente (singleton)
-- Fecha: 2026-05-11
-- Idempotente: usa IF NOT EXISTS
--
-- Cambios:
--   1. Crea tabla agent_prompt_overrides (singleton para system prompt + constantes)
--   2. Inserta fila inicial con isActive=true (todos los campos null = usa defaults de código)

BEGIN;

CREATE TABLE IF NOT EXISTS agent_prompt_overrides (
  id                       TEXT PRIMARY KEY,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  system_prompt_addendum   TEXT,
  pipeline_notes           TEXT,
  tools_notes              TEXT,
  max_cedula_images        INTEGER,
  target_image_bytes       INTEGER,
  ruc_refresh_max_age_days INTEGER,
  haiku_model_override     TEXT,
  updated_at               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by               TEXT
);

CREATE INDEX IF NOT EXISTS agent_prompt_overrides_is_active_idx
  ON agent_prompt_overrides (is_active);

-- Seed singleton: una fila activa con todos los campos null → el agente usa los
-- defaults del código. La UI editará esta misma fila.
INSERT INTO agent_prompt_overrides (id, is_active, updated_at, updated_by)
SELECT 'agent-prompt-singleton', TRUE, CURRENT_TIMESTAMP, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM agent_prompt_overrides WHERE is_active = TRUE);

COMMIT;
