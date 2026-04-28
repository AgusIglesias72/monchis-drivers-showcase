#!/usr/bin/env bash
# scripts/overnight-monchis-batch.sh
#
# Loop local que dispara ambos crons en paralelo: backfill de attendance de
# drivers + drenado de la cola de pedidos. Cada ciclo espera a que ambos
# terminen y duerme 30s. Mientras el dev server esté levantado, esto va
# avanzando solo. Cancelar con Ctrl+C.
#
# Cuando despliegues a Vercel, este script deja de ser necesario — los cron
# jobs en vercel.json hacen lo mismo automáticamente.
#
# Uso:
#   ./scripts/overnight-monchis-batch.sh
#   BASE_URL=http://otro:3000 ./scripts/overnight-monchis-batch.sh

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ .env no encontrado"
  exit 1
fi

CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d= -f2)
BASE_URL="${BASE_URL:-http://localhost:3000}"

if [ -z "$CRON_SECRET" ]; then
  echo "❌ CRON_SECRET no está seteado en .env"
  exit 1
fi

DRIVER_LIMIT="${DRIVER_LIMIT:-15}"
QUEUE_LIMIT="${QUEUE_LIMIT:-400}"
SLEEP_SEC="${SLEEP_SEC:-30}"

echo "▶  Loop iniciado"
echo "   BASE_URL    = $BASE_URL"
echo "   DRIVER_LIMIT = $DRIVER_LIMIT"
echo "   QUEUE_LIMIT  = $QUEUE_LIMIT"
echo "   SLEEP_SEC    = $SLEEP_SEC"
echo ""

trap 'echo ""; echo "✋ Cancelado"; exit 0' INT

cycle=0
while true; do
  cycle=$((cycle + 1))
  start_ts=$(date +%s)
  echo "===== Ciclo $cycle · $(date '+%Y-%m-%d %H:%M:%S') ====="

  # Drivers
  (curl -s -m 320 -H "Authorization: Bearer $CRON_SECRET" \
      "${BASE_URL}/api/cron/process-driver-attendance-batch?limit=${DRIVER_LIMIT}" \
    | head -c 300 \
    | sed 's/^/    drivers » /') &
  PID_D=$!

  # Pedidos queue
  (curl -s -m 320 -H "Authorization: Bearer $CRON_SECRET" \
      "${BASE_URL}/api/cron/process-pedidos-import-queue?limit=${QUEUE_LIMIT}" \
    | head -c 300 \
    | sed 's/^/    pedidos » /') &
  PID_P=$!

  wait $PID_D 2>/dev/null || true
  wait $PID_P 2>/dev/null || true

  end_ts=$(date +%s)
  elapsed=$((end_ts - start_ts))
  echo ""
  echo "    [ciclo $cycle terminado en ${elapsed}s — sleeping ${SLEEP_SEC}s]"
  sleep "$SLEEP_SEC"
done
