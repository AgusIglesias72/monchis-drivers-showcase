// types/postulacion-filters.types.ts

export type PostulacionStatusFilter = 'all' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'REJECTED' | 'ASISTIDA'

export type OnboardingStatusFilter = 'all' | 'pending' | 'scheduled' | 'completed'

export type CurrentStepFilter = 'all' | '1' | '2' | '3' | '4' | '5' | '6'

export type ContactStatusFilter = 'all' | 'contacted' | 'pending' | 'not-applicable'

export type DocumentStatusFilter = 'all' | 'completos' | 'en-revision' | 'pendientes'

export type PaymentStatusFilter = 'all' | 'verificado' | 'en-verificacion' | 'pendiente'

export type InvoiceStatusFilter = 'all' | 'completa' | 'pendiente' | 'na'

export type SortByFilter = 'createdAt' | 'fullName' | 'city' | 'currentStep'

export type SortOrderFilter = 'asc' | 'desc'

export interface PostulacionFilters {
  status?: PostulacionStatusFilter
  search?: string
  onboardingStatus?: OnboardingStatusFilter
  hasVehicle?: string
  startDate?: string
  endDate?: string
  currentStep?: CurrentStepFilter
  contactStatus?: ContactStatusFilter
  documentStatus?: DocumentStatusFilter
  paymentStatus?: PaymentStatusFilter
  invoiceStatus?: InvoiceStatusFilter
  sortBy?: SortByFilter
  sortOrder?: SortOrderFilter
  page?: string
}

export interface FilterOption {
  value: string
  label: string
  icon?: string
  color?: string
}

export const CURRENT_STEP_OPTIONS: FilterOption[] = [
  { value: 'all', label: '📋 Todos los pasos' },
  { value: '1', label: '1️⃣ Paso 1/6' },
  { value: '2', label: '2️⃣ Paso 2/6' },
  { value: '3', label: '3️⃣ Paso 3/6' },
  { value: '4', label: '4️⃣ Paso 4/6' },
  { value: '5', label: '5️⃣ Paso 5/6' },
  { value: '6', label: '6️⃣ Paso 6/6' },
]

export const CONTACT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: '📞 Todos' },
  { value: 'contacted', label: '✅ Contactado', color: 'green' },
  { value: 'pending', label: '⏰ Pendiente', color: 'orange' },
  { value: 'not-applicable', label: '➖ No aplica', color: 'gray' },
]

export const DOCUMENT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: '📄 Todos' },
  { value: 'completos', label: '✅ Completos', color: 'green' },
  { value: 'en-revision', label: '⏳ En Revisión', color: 'yellow' },
  { value: 'pendientes', label: '❌ Pendientes', color: 'red' },
]

export const PAYMENT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: '💳 Todos' },
  { value: 'verificado', label: '✅ Verificado', color: 'green' },
  { value: 'en-verificacion', label: '⏳ En Verificación', color: 'yellow' },
  { value: 'pendiente', label: '❌ Pendiente', color: 'red' },
]

export const INVOICE_STATUS_OPTIONS: FilterOption[] = [
  { value: 'all', label: '🧾 Todos' },
  { value: 'completa', label: '✅ Completa', color: 'green' },
  { value: 'pendiente', label: '⏳ Pendiente', color: 'orange' },
  { value: 'na', label: '➖ No Aplica', color: 'gray' },
]