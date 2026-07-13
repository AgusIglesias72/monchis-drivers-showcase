"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-[rgba(23,63,58,0.35)] backdrop-blur-[2px] animate-[studio-fade_.2s_ease-out] data-[state=closed]:animate-[studio-fade_.15s_ease-in_reverse]",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "bg-card fixed z-50 flex flex-col shadow-[var(--shadow-3)]",
          side === "right" &&
            "inset-y-0 right-0 h-full w-full sm:max-w-md rounded-l-[var(--r-xl)] border-l border-border data-[state=open]:animate-[studio-slide-left_.3s_cubic-bezier(.2,.9,.3,1)] data-[state=closed]:animate-[studio-slide-left_.2s_ease-in_reverse]",
          side === "left" &&
            "inset-y-0 left-0 h-full w-full sm:max-w-md rounded-r-[var(--r-xl)] border-r border-border data-[state=open]:animate-[studio-slide-left_.3s_cubic-bezier(.2,.9,.3,1)_reverse] data-[state=closed]:animate-[studio-slide-left_.2s_ease-in]",
          side === "top" &&
            "inset-x-0 top-0 h-auto rounded-b-[var(--r-xl)] border-b border-border data-[state=open]:animate-[studio-slide-up_.3s_cubic-bezier(.2,.9,.3,1)_reverse] data-[state=closed]:animate-[studio-slide-up_.2s_ease-in]",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto rounded-t-[var(--r-xl)] border-t border-border data-[state=open]:animate-[studio-slide-up_.3s_cubic-bezier(.2,.9,.3,1)] data-[state=closed]:animate-[studio-slide-up_.2s_ease-in_reverse]",
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-4 right-4 grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-pill)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground focus:outline-none disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">Cerrar</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex items-start justify-between gap-3 border-b border-border p-5", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto border-t border-border p-5", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-[family-name:var(--font-display)] text-base font-bold leading-tight tracking-[-0.01em] text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
