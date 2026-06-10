import type { RawAdminChangedState } from "@/lib/types/pedidos.types"

// Convierte admin_changed_state (objeto {admin, reason, admin_id} en los datos
// reales; string por tolerancia) a un label renderizable: "Sin combustible —
// rojas@monchis.com.py". Nunca devolver el objeto crudo a JSX.
export function formatAdminChangedState(
  value: RawAdminChangedState | null | undefined,
): string | null {
  if (!value) return null
  if (typeof value === "string") return value
  const parts = [value.reason, value.admin].filter(
    (s): s is string => typeof s === "string" && s.trim() !== "",
  )
  return parts.length > 0 ? parts.join(" — ") : "sí"
}
