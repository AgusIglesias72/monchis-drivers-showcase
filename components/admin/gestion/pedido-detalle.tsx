"use client"

import { CreditCard, FileText, Phone, ShoppingBag, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { RawOrder } from "@/lib/types/pedidos.types"

interface Props {
  order: RawOrder
}

export function PedidoDetalle({ order }: Props) {
  const items = order.items || []
  const origin = order.data_origin
  const dest = order.data_destination

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <Section
            icon={<ShoppingBag className="h-3.5 w-3.5" />}
            title="Items"
          >
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin items.</p>
            ) : (
              <ul className="space-y-1">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <span className="leading-tight">{item.name}</span>
                    <Badge
                      variant="outline"
                      className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums"
                    >
                      ×{item.quantity}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            icon={<ShoppingBag className="h-3.5 w-3.5" />}
            title="Comercio"
          >
            <Line strong>{origin?.name || "—"}</Line>
            <Line muted>{origin?.address || "—"}</Line>
            {origin?.phone_number && (
              <PhoneLink phone={origin.phone_number} />
            )}
            {typeof origin?.preptime === "number" && (
              <Line muted>Prep estimada: {origin.preptime} min</Line>
            )}
          </Section>

          <Section icon={<User className="h-3.5 w-3.5" />} title="Cliente">
            <Line strong>{dest?.name || "—"}</Line>
            <Line muted>{dest?.address || "—"}</Line>
            {dest?.phone_number && <PhoneLink phone={dest.phone_number} />}
            {dest?.reference && <Line muted>Ref: {dest.reference}</Line>}
          </Section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-muted/30 px-4 py-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Pago:</span>
            <strong className="font-medium text-foreground">
              {order.payment_type || "—"}
            </strong>
          </span>
          {(order.invoice?.ruc || order.invoice?.razon_social) && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>
                {order.invoice.razon_social || "—"}
                {order.invoice.ruc ? ` · RUC ${order.invoice.ruc}` : ""}
              </span>
            </span>
          )}
          <span className="ml-auto inline-flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Total</span>
            <strong className="text-base font-semibold tabular-nums">
              {order.total_order ? `${order.total_order} Gs` : "—"}
            </strong>
          </span>
        </div>

        {order.order_comment && order.order_comment !== "Sin comentarios" && (
          <div className="border-t bg-muted/10 px-4 py-2 text-xs">
            <span className="font-medium text-muted-foreground">Comentario: </span>
            {order.order_comment}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5 p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Line({
  children,
  strong,
  muted,
}: {
  children: React.ReactNode
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={
        strong
          ? "text-sm font-medium leading-tight"
          : muted
            ? "text-xs text-muted-foreground leading-tight"
            : "text-sm leading-tight"
      }
    >
      {children}
    </div>
  )
}

function PhoneLink({ phone }: { phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <Phone className="h-3 w-3" />
      {phone}
    </a>
  )
}
