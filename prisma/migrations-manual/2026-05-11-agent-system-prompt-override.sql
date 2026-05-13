-- Migration: agrega columna system_prompt_override
-- Fecha: 2026-05-11
-- Idempotente: usa IF NOT EXISTS
--
-- Permite reemplazar el SYSTEM_PROMPT del código sin deploy. El addendum se sigue
-- concatenando al final (sea el de código o el override).

BEGIN;

ALTER TABLE agent_prompt_overrides
  ADD COLUMN IF NOT EXISTS system_prompt_override TEXT;

COMMIT;
