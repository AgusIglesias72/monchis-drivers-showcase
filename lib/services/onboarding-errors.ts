// lib/services/onboarding-errors.ts
//
// Custom error classes para el flujo de capacitaciones públicas.
// Cada API endpoint mapea estos a status codes específicos (ver mapOnboardingError).

export class ShareTokenInvalidError extends Error {
  readonly code = 'SHARE_TOKEN_INVALID'
  constructor(message = 'Link inválido o no encontrado') {
    super(message)
    this.name = 'ShareTokenInvalidError'
  }
}

export class ShareTokenExpiredError extends Error {
  readonly code = 'SHARE_TOKEN_EXPIRED'
  constructor(message = 'El link expiró. Solicitá uno nuevo desde tu portal.') {
    super(message)
    this.name = 'ShareTokenExpiredError'
  }
}

export class EventFullError extends Error {
  readonly code = 'EVENT_FULL'
  constructor(message = 'No quedan cupos para esta fecha') {
    super(message)
    this.name = 'EventFullError'
  }
}

export class NotEligibleError extends Error {
  readonly code = 'NOT_ELIGIBLE'
  constructor(
    message = 'Aún no podés agendar capacitación. Asegurate de tener cédula y antecedentes aprobados.',
  ) {
    super(message)
    this.name = 'NotEligibleError'
  }
}

export class BookingNotFoundError extends Error {
  readonly code = 'BOOKING_NOT_FOUND'
  constructor(message = 'Reserva no encontrada') {
    super(message)
    this.name = 'BookingNotFoundError'
  }
}

export class CancelDeadlinePassedError extends Error {
  readonly code = 'CANCEL_DEADLINE_PASSED'
  constructor(message = 'Ya pasó la fecha límite para cancelar o reagendar') {
    super(message)
    this.name = 'CancelDeadlinePassedError'
  }
}

export class AlreadyBookedError extends Error {
  readonly code = 'ALREADY_BOOKED'
  constructor(message = 'Ya tenés una capacitación agendada') {
    super(message)
    this.name = 'AlreadyBookedError'
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION_ERROR'
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export type OnboardingError =
  | ShareTokenInvalidError
  | ShareTokenExpiredError
  | EventFullError
  | NotEligibleError
  | BookingNotFoundError
  | CancelDeadlinePassedError
  | AlreadyBookedError
  | ValidationError

export function mapOnboardingErrorToStatus(err: unknown): { status: number; body: { error: string; code?: string } } {
  if (err instanceof ShareTokenInvalidError) return { status: 401, body: { error: err.message, code: err.code } }
  if (err instanceof ShareTokenExpiredError) return { status: 401, body: { error: err.message, code: err.code } }
  if (err instanceof NotEligibleError) return { status: 403, body: { error: err.message, code: err.code } }
  if (err instanceof BookingNotFoundError) return { status: 404, body: { error: err.message, code: err.code } }
  if (err instanceof EventFullError) return { status: 409, body: { error: err.message, code: err.code } }
  if (err instanceof AlreadyBookedError) return { status: 409, body: { error: err.message, code: err.code } }
  if (err instanceof CancelDeadlinePassedError) return { status: 409, body: { error: err.message, code: err.code } }
  if (err instanceof ValidationError) return { status: 400, body: { error: err.message, code: err.code } }
  const message = err instanceof Error ? err.message : 'Error desconocido'
  return { status: 500, body: { error: message } }
}
