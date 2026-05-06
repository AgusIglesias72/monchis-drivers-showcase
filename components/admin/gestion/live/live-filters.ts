// Tipos y constantes compartidas entre el embudo y el sidebar.

export type PedidoFilter =
  | "all"
  | "delayed"
  | "PENDING"
  | "ACCEPTED"
  | "WAITING_ORDER"
  | "DELIVERY"
  | "OUTSIDE"
