import {
  Bell,
  Bike,
  CheckCircle2,
  ChefHat,
  Flag,
  Handshake,
  Navigation,
  Receipt,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react"

import type { RawHistoryEntry } from "@/lib/types/pedidos.types"

export interface StateStyle {
  /** Etiqueta legible */
  label: string
  /** Icono de lucide-react */
  icon: LucideIcon
  /** Tailwind bg class para fondo del dot */
  bgClass: string
  /** Hex color matching bgClass — para el mapa Google */
  hex: string
}

export const PENDING_NO_DRIVER_STYLE: StateStyle = {
  label: "Buscando driver",
  icon: Search,
  bgClass: "bg-amber-500",
  hex: "#f59e0b",
}

export const CONFIRMED_STYLE: StateStyle = {
  label: "Pedido confirmado",
  icon: Receipt,
  bgClass: "bg-orange-500",
  hex: "#f97316",
}

const STATE_STYLES: Record<string, StateStyle> = {
  PENDING: {
    label: "Oferta enviada",
    icon: Bell,
    bgClass: "bg-amber-500",
    hex: "#f59e0b",
  },
  ACCEPTED: {
    label: "Aceptado",
    icon: Handshake,
    bgClass: "bg-violet-500",
    hex: "#8b5cf6",
  },
  WAITING_ORDER: {
    label: "En el comercio",
    icon: ChefHat,
    bgClass: "bg-sky-500",
    hex: "#0ea5e9",
  },
  DELIVERY: {
    label: "En camino",
    icon: Bike,
    bgClass: "bg-blue-600",
    hex: "#2563eb",
  },
  OUTSIDE: {
    label: "Llegando al cliente",
    icon: Navigation,
    bgClass: "bg-cyan-600",
    hex: "#0891b2",
  },
  FINALIZED: {
    label: "Entregado",
    icon: CheckCircle2,
    bgClass: "bg-emerald-600",
    hex: "#059669",
  },
  CANCELLED: {
    label: "Cancelado",
    icon: X,
    bgClass: "bg-red-500",
    hex: "#ef4444",
  },
  ASSIGNED_DELIVERY: {
    label: "Asignado por admin",
    icon: ShieldCheck,
    bgClass: "bg-fuchsia-600",
    hex: "#c026d3",
  },
  ASSIGNED_PICKUP: {
    label: "Pickup forzado por admin",
    icon: ShieldCheck,
    bgClass: "bg-fuchsia-500",
    hex: "#d946ef",
  },
}

const FALLBACK_STYLE: StateStyle = {
  label: "Estado",
  icon: Flag,
  bgClass: "bg-muted-foreground",
  hex: "#71717a",
}

export function styleForHistory(h: RawHistoryEntry): StateStyle {
  if (h.request_state === "PENDING" && (h.drivers_by_id || []).length === 0) {
    return PENDING_NO_DRIVER_STYLE
  }
  return STATE_STYLES[h.request_state as string] || FALLBACK_STYLE
}

export function styleForState(state: string, hasDriver = true): StateStyle {
  if (state === "PENDING" && !hasDriver) return PENDING_NO_DRIVER_STYLE
  return STATE_STYLES[state] || FALLBACK_STYLE
}
