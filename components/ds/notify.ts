import { toast, type ExternalToast } from "sonner"

export type NotifyOptions = ExternalToast

type PromiseMessages<T> = {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: unknown) => string)
}

/**
 * Wrapper fino sobre sonner `toast` con defaults del sistema.
 * Usar `notify.success(...)`, `notify.error(...)`, etc.
 */
export const notify = {
  success: (message: string, opts?: NotifyOptions) => toast.success(message, opts),
  error: (message: string, opts?: NotifyOptions) => toast.error(message, opts),
  info: (message: string, opts?: NotifyOptions) => toast.info(message, opts),
  warning: (message: string, opts?: NotifyOptions) => toast.warning(message, opts),
  message: (message: string, opts?: NotifyOptions) => toast.message(message, opts),
  promise: <T>(
    promise: Promise<T>,
    messages: PromiseMessages<T>,
    opts?: NotifyOptions,
  ) => toast.promise(promise, { ...messages, ...opts }),
}
