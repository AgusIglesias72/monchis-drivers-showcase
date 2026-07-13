"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  GraduationCap,
  PartyPopper,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Stepper,
  SectionCard,
  Field,
  FieldRow,
  Combobox,
  Callout,
  Chip,
} from "@/components/ds"

function ScreenFrame({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh" style={{ backgroundImage: "var(--grad-page)" }}>
      <div className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-2.5">
          <Link
            href="/design/screens"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Pantallas
          </Link>
          <span className="h-4 w-px bg-border" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-6">{children}</div>
    </div>
  )
}

const STEPS = [
  { label: "Datos", description: "Información básica" },
  { label: "Documentos", description: "Identidad y vehículo" },
  { label: "Capacitación", description: "Onboarding inicial" },
  { label: "Alta", description: "Activación" },
]

const ZONES = [
  { value: "asuncion", label: "Asunción" },
  { value: "fdo-mora", label: "Fernando de la Mora" },
  { value: "san-lorenzo", label: "San Lorenzo" },
  { value: "luque", label: "Luque" },
]

const DOC_CHECKLIST = [
  "Cédula de identidad (frente y dorso)",
  "Licencia de conducir vigente",
  "Cédula verde del vehículo",
  "Selfie de verificación",
]

const TRAINING_CHECKLIST = [
  "Video de bienvenida (8 min)",
  "Uso de la app del repartidor",
  "Protocolo de entregas y seguridad",
  "Evaluación final (10 preguntas)",
]

export default function WizardScreen() {
  const [current, setCurrent] = useState(0)

  const [name, setName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [docId, setDocId] = useState("")
  const [zone, setZone] = useState<string | undefined>(undefined)

  const isFirst = current === 0
  const isLast = current === STEPS.length - 1

  const back = () => setCurrent((c) => Math.max(0, c - 1))
  const next = () => setCurrent((c) => Math.min(STEPS.length - 1, c + 1))

  return (
    <ScreenFrame title="Alta de repartidor">
      <div className="mb-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-[var(--ls-tight)] sm:text-3xl">
          Alta de repartidor
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Completá los pasos para incorporar un nuevo repartidor a la flota.
        </p>
      </div>

      <div className="mt-6 rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <Stepper steps={STEPS} current={current} aria-label="Progreso del alta" />
      </div>

      <div className="mt-5">
        {current === 0 && (
          <SectionCard
            title="Datos del repartidor"
            description="Información de contacto y zona operativa."
          >
            <div className="space-y-4">
              <FieldRow>
                <Field label="Nombre" htmlFor="w-name" required className="flex-1">
                  <Input
                    id="w-name"
                    placeholder="Ricardo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Apellido" htmlFor="w-last" required className="flex-1">
                  <Input
                    id="w-last"
                    placeholder="Benítez"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Field>
              </FieldRow>

              <FieldRow>
                <Field
                  label="Teléfono"
                  htmlFor="w-phone"
                  required
                  hint="Con código de país."
                  className="flex-1"
                >
                  <Input
                    id="w-phone"
                    placeholder="+595 981 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </Field>
                <Field label="Cédula" htmlFor="w-doc" className="flex-1">
                  <Input
                    id="w-doc"
                    placeholder="1.234.567"
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                  />
                </Field>
              </FieldRow>

              <Field label="Zona operativa" hint="Se usará para asignar pedidos cercanos.">
                <Combobox
                  options={ZONES}
                  value={zone}
                  onChange={setZone}
                  placeholder="Elegí una zona"
                  searchPlaceholder="Buscar zona…"
                  className="w-full"
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {current === 1 && (
          <SectionCard
            title="Documentos"
            description="Verificación de identidad y del vehículo."
          >
            <div className="space-y-4">
              <Callout tone="info" title="Antes de continuar" icon={FileCheck2}>
                Cargá los siguientes documentos. La verificación puede tardar
                hasta 24 horas hábiles.
              </Callout>
              <ul className="space-y-2.5">
                {DOC_CHECKLIST.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-primary">
                      <Check className="size-3.5" />
                    </span>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        )}

        {current === 2 && (
          <SectionCard
            title="Capacitación"
            description="Módulos de onboarding obligatorios."
          >
            <div className="space-y-4">
              <Callout tone="warning" title="Capacitación pendiente" icon={GraduationCap}>
                El repartidor debe completar los módulos antes del alta. Podés
                enviarle el enlace por WhatsApp.
              </Callout>
              <ul className="space-y-2.5">
                {TRAINING_CHECKLIST.map((item, i) => (
                  <li
                    key={item}
                    className="flex items-center justify-between gap-2.5 text-sm"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-[family-name:var(--font-mono)] text-[11px]">
                        {i + 1}
                      </span>
                      <span className="text-foreground">{item}</span>
                    </span>
                    <Chip tone={i === 0 ? "success" : "neutral"}>
                      {i === 0 ? "Completo" : "Pendiente"}
                    </Chip>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        )}

        {current === 3 && (
          <SectionCard
            title="Alta"
            description="Revisá y activá al repartidor en la flota."
          >
            <div className="space-y-4">
              <Callout tone="success" title="Todo listo" icon={PartyPopper}>
                Los datos, documentos y la capacitación están completos. Al
                finalizar, el repartidor quedará activo y podrá recibir pedidos.
              </Callout>
              <ul className="space-y-2.5">
                {["Datos verificados", "Documentos aprobados", "Capacitación completa"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
                        <Check className="size-3.5" />
                      </span>
                      <span className="text-foreground">{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Footer nav */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={back} disabled={isFirst}>
          <ArrowLeft className="size-4" />
          Atrás
        </Button>
        <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
          Paso {current + 1} de {STEPS.length}
        </span>
        {isLast ? (
          <Button onClick={() => {}}>
            <Check className="size-4" />
            Finalizar
          </Button>
        ) : (
          <Button onClick={next}>
            Siguiente
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </ScreenFrame>
  )
}
