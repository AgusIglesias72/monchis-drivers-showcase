#!/usr/bin/env bash
#
# Purga `google-drive-token.json` y `postulacion.xlsx` de TODA la historia git.
# Esto reescribe los commits — TODO el equipo va a tener que reclonar después.
#
# Pre-requisitos:
#   - brew install git-filter-repo  (o equivalente)
#   - Estás en una copia clonada FRESCA del repo (no uses tu working copy
#     "activa" — git-filter-repo bloquea por seguridad si el clon no es fresh).
#
# Antes de correr:
#   1. Revocar el refresh_token de Google en https://myaccount.google.com/permissions
#   2. Rotar credenciales relacionadas (POSTULACIONES_API_KEY, etc.)
#   3. Avisar al equipo del force-push para que reclonen
#   4. Hacer backup de los commits actuales:
#        git push --mirror git@github.com:tu-org/monchis-drivers-backup.git
#
# Ejecutar:
#   ./scripts/security/purge-secrets-from-history.sh
#
# Después:
#   git push --force --all
#   git push --force --tags

set -euo pipefail

if ! command -v git-filter-repo > /dev/null 2>&1; then
  echo "❌ git-filter-repo no está instalado."
  echo "   brew install git-filter-repo   (macOS)"
  echo "   pip install git-filter-repo    (otros)"
  exit 1
fi

if [ ! -d .git ]; then
  echo "❌ Este script debe ejecutarse desde la raíz del repo."
  exit 1
fi

echo "⚠️  Esto va a reescribir TODA la historia de git."
echo "   Archivos a purgar:"
echo "     - google-drive-token.json"
echo "     - postulacion.xlsx"
echo "     - .claude/settings.local.json  (DATABASE_URL Railway leaked)"
echo ""
echo "   ¿Hiciste backup del repo en otro remote? (git push --mirror ...)"
read -p "   Continuar? (yes/N): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Abortado."
  exit 0
fi

git filter-repo --invert-paths \
  --path google-drive-token.json \
  --path postulacion.xlsx \
  --path .claude/settings.local.json

echo ""
echo "✅ Historia reescrita."
echo ""
echo "Siguiente paso (manual):"
echo "  git remote add origin <url-original>     # filter-repo elimina remotes"
echo "  git push --force --all origin"
echo "  git push --force --tags origin"
echo ""
echo "Y avisá al equipo que tienen que:"
echo "  rm -rf monchis-drivers && git clone <url>"
