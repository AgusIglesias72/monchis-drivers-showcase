export const TURNOS_CONFIG = {
  apiUrl:
    process.env.MONCHIS_DRIVERS_API_URL ||
    "https://api.monchis-drivers.com/dashboard/get_all_driver_zone_date_from_zone",
  token: process.env.MONCHIS_DRIVERS_API_TOKEN || "",
  cacheTag: "monchis-turnos",
  revalidateSeconds: 600,
  timezone: "America/Asuncion",
} as const

// IDs de las zonas que consultamos al API de turnos. El nombre legible viene
// en cada response (`zone_name`), no lo cableamos acá — los comentarios sirven
// solo de referencia para identificar la zona al leer/agregar.
export const TURNOS_ZONE_IDS = [
  "5fd8b03985c2e20008de3a7d",
  "659d82cae4e2a700082ec0b8",
  "618a77883dc4e40009d6ea26",
  "69ea55e01e02a9cdf19e2e24",
  "6017e0d8cfe5910008449544",
  "5ffda05415f492000810dd52",
  "67ee7bd3eadac7d84ab73b7c",
  "6243265a4e0dce0009b2353f",
  "6a2965fa91a91ef8d2218bfb", // San Lorenzo (split de Fdo/San Lorenzo)
  "6a296adbb3d14bbb342567ae", // Fdo de la Mora (split de Fdo/San Lorenzo)
  "67b3dc2b3d48d4f3e322f189", // Encarnación
  "67db00e442f00c678d2faf48", // Kennedy Encarnación
] as const

export const TURNOS_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] as const

// Config del registro histórico (cron `/api/cron/snapshot-turnos`).
export const TURNOS_SNAPSHOT = {
  // Caída de drivers en una zona (vs la hora anterior) a partir de la cual
  // marcamos la línea con ⚠️ en el resumen de Slack.
  dropAlertThreshold: 3,
  // Días de fotos que retenemos; el cron borra las más viejas en cada corrida.
  retentionDays: 90,
} as const
