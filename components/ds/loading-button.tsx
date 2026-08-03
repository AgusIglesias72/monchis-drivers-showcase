"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "./spinner"

export type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  loading?: boolean
}

/** Botón con estado de carga (spinner + disabled). */
export function LoadingButton({
  loading,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} {...props}>
      {loading && <Spinner size="sm" className="text-current" />}
      {children}
    </Button>
  )
}
