import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  label: React.ReactNode
  description?: React.ReactNode
}

export interface StepperProps {
  steps: Step[]
  /** Índice (0-based) del paso actual. Los anteriores se marcan como hechos. */
  current: number
  orientation?: "horizontal" | "vertical"
  className?: string
  "aria-label"?: string
}

type StepState = "done" | "current" | "upcoming"

function stateOf(index: number, current: number): StepState {
  if (index < current) return "done"
  if (index === current) return "current"
  return "upcoming"
}

const NODE: Record<StepState, string> = {
  done: "bg-success text-white border-success",
  current:
    "bg-card text-primary border-brand-300 ring-[3px] ring-ring/30 font-bold",
  upcoming: "bg-muted text-ink-subtle border-border",
}

const LABEL: Record<StepState, string> = {
  done: "text-foreground",
  current: "text-primary font-semibold",
  upcoming: "text-ink-subtle",
}

/**
 * Indicador de pasos STUDIO. Hechos = `bg-success` con check; actual = anillo
 * brand + bold; pendientes = `bg-muted`. Conectores `border-border` rellenos
 * hasta el paso actual.
 */
export function Stepper({
  steps,
  current,
  orientation = "horizontal",
  className,
  ...aria
}: StepperProps) {
  const vertical = orientation === "vertical"

  return (
    <ol
      aria-label={aria["aria-label"]}
      className={cn(
        "flex",
        vertical ? "flex-col" : "items-start",
        className,
      )}
    >
      {steps.map((step, i) => {
        const state = stateOf(i, current)
        const isLast = i === steps.length - 1
        // Conector "relleno" cuando el paso ya fue superado.
        const connectorFilled = i < current

        return (
          <li
            key={i}
            className={cn(
              "relative",
              vertical ? "flex gap-3 pb-6 last:pb-0" : "flex flex-1 last:flex-none",
            )}
          >
            {vertical ? (
              <>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border font-[family-name:var(--font-mono)] text-xs transition-colors",
                      NODE[state],
                    )}
                  >
                    {state === "done" ? <Check className="size-4" /> : i + 1}
                  </span>
                  {!isLast && (
                    <span
                      className={cn(
                        "mt-1 w-px flex-1",
                        connectorFilled ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </div>
                <div className="min-w-0 pt-0.5 pb-1">
                  <div className={cn("text-sm", LABEL[state])}>{step.label}</div>
                  {step.description && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border font-[family-name:var(--font-mono)] text-xs transition-colors",
                      NODE[state],
                    )}
                  >
                    {state === "done" ? <Check className="size-4" /> : i + 1}
                  </span>
                  <div className="mt-1.5 max-w-[9rem] text-center">
                    <div className={cn("text-xs", LABEL[state])}>{step.label}</div>
                    {step.description && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>
                {!isLast && (
                  <span
                    className={cn(
                      "mx-2 mt-3.5 h-px flex-1",
                      connectorFilled ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}
