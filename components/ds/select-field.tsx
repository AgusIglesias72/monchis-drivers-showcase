import { type LucideIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field } from "./field"

export interface SelectOption {
  value: string
  label: string
  icon?: LucideIcon
}

export interface SelectFieldProps {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  value?: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

/** Select STUDIO envuelto en un Field (label/hint/error). */
export function SelectField({
  label,
  hint,
  error,
  required,
  value,
  onChange,
  options,
  placeholder,
  className,
}: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} icon={o.icon}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
