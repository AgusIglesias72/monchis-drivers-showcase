export const PEDIDOS_CONFIG = {
  detailUrl:
    process.env.MONCHIS_DRIVERS_API_URL_REQUEST_HISTORIES ||
    "https://api.monchis-drivers.com/dashboard/request_histories",
  driverAttendanceUrl:
    process.env.MONCHIS_DRIVERS_API_URL_DRIVER_ATTENDANCE ||
    "https://api.monchis-drivers.com/reports/driver_attendance_request_history",
  token: process.env.MONCHIS_DRIVERS_API_TOKEN || "",
  // Estados terminales: una vez en cualquiera de éstos, el pedido es inmutable
  // y servimos siempre desde cache (excepto si forceRefresh=true).
  terminalStates: new Set(["FINALIZED", "CANCELLED"] as string[]),
} as const

export const REQUEST_ID_REGEX = /^[a-f0-9]{24}$/i
