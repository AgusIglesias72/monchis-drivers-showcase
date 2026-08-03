"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bike, Car, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  PageHeader,
  SectionCard,
  Field,
  FieldRow,
  DatePicker,
  CheckboxField,
  SwitchField,
  TextareaField,
  RadioCards,
  Combobox,
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

const ZONES = [
  { value: "asuncion", label: "Asunción" },
  { value: "fdo-mora", label: "Fernando de la Mora" },
  { value: "san-lorenzo", label: "San Lorenzo" },
  { value: "luque", label: "Luque" },
  { value: "lambare", label: "Lambaré" },
]

export default function SettingsScreen() {
  const [firstName, setFirstName] = useState("Ricardo")
  const [lastName, setLastName] = useState("Benítez")
  const [email, setEmail] = useState("ricardo.benitez@monchis.com")
  const [birthday, setBirthday] = useState<Date | undefined>(
    new Date(1994, 6, 18),
  )

  const [notifyOrders, setNotifyOrders] = useState(true)
  const [notifyShifts, setNotifyShifts] = useState(true)
  const [notifyPromos, setNotifyPromos] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [whatsappEnabled, setWhatsappEnabled] = useState(true)

  const [vehicle, setVehicle] = useState("moto")
  const [zone, setZone] = useState<string | undefined>("fdo-mora")

  const [note, setNote] = useState("")

  return (
    <ScreenFrame title="Configuración">
      <PageHeader
        title="Configuración"
        description="Ajustá tu perfil, notificaciones y preferencias de reparto."
      />

      <div className="mt-6 space-y-5 pb-24">
        <SectionCard title="Perfil" description="Datos personales visibles para el equipo.">
          <div className="space-y-4">
            <FieldRow>
              <Field label="Nombre" htmlFor="first-name" className="flex-1">
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Field>
              <Field label="Apellido" htmlFor="last-name" className="flex-1">
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field
                label="Email"
                htmlFor="email"
                hint="Usado para el inicio de sesión."
                className="flex-1"
              >
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Fecha de nacimiento" className="flex-1">
                <DatePicker
                  value={birthday}
                  onChange={setBirthday}
                  className="w-full"
                />
              </Field>
            </FieldRow>
          </div>
        </SectionCard>

        <SectionCard
          title="Notificaciones"
          description="Elegí qué avisos querés recibir y por qué canal."
        >
          <div className="space-y-5">
            <div className="space-y-3">
              <CheckboxField
                label="Nuevos pedidos"
                description="Avisos en tiempo real cuando hay un pedido para tomar."
                checked={notifyOrders}
                onCheckedChange={(v) => setNotifyOrders(v === true)}
              />
              <CheckboxField
                label="Recordatorios de turno"
                description="Te avisamos 30 minutos antes de tu bloque."
                checked={notifyShifts}
                onCheckedChange={(v) => setNotifyShifts(v === true)}
              />
              <CheckboxField
                label="Promociones y bonos"
                description="Campañas de incentivos y bonos por objetivos."
                checked={notifyPromos}
                onCheckedChange={(v) => setNotifyPromos(v === true)}
              />
            </div>

            <div className="space-y-4 border-t border-border pt-4">
              <SwitchField
                label="Notificaciones push"
                description="En la app del repartidor."
                checked={pushEnabled}
                onCheckedChange={setPushEnabled}
              />
              <SwitchField
                label="WhatsApp"
                description="Avisos operativos al +595 981 275 311."
                checked={whatsappEnabled}
                onCheckedChange={setWhatsappEnabled}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Preferencias"
          description="Vehículo y zona operativa por defecto."
        >
          <div className="space-y-4">
            <Field label="Vehículo">
              <RadioCards
                aria-label="Vehículo"
                value={vehicle}
                onChange={setVehicle}
                columns={3}
                options={[
                  { value: "moto", label: "Moto", description: "Ágil en centro", icon: Bike },
                  { value: "auto", label: "Auto", description: "Pedidos grandes", icon: Car },
                  { value: "utilitario", label: "Utilitario", description: "Cargas de comercio", icon: Truck },
                ]}
              />
            </Field>

            <Field label="Zona operativa" hint="Se usa para asignarte pedidos cercanos.">
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

        <SectionCard title="Nota" description="Observaciones internas del equipo.">
          <TextareaField
            label="Comentario"
            hint="Solo visible para administradores."
            placeholder="Ej. prefiere turnos de mañana, conoce bien zona sur…"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </SectionCard>
      </div>

      {/* Sticky bottom toolbar */}
      <div className="sticky bottom-0 z-20 -mx-6 border-t border-border bg-card/80 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Cambios sin guardar
          </p>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button>Guardar cambios</Button>
          </div>
        </div>
      </div>
    </ScreenFrame>
  )
}
