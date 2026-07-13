"use client"

import { useEffect, useRef, useState } from "react"
import { Check, CheckCheck, Paperclip, Search, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar } from "./avatar"

export interface ChatMessage {
  id: string
  dir: "in" | "out"
  text: string
  time: string
  /** Doble tick (solo salientes). */
  read?: boolean
}

export interface ChatConversation {
  id: string
  name: string
  lastMessage: string
  lastTime: string
  unread?: number
  /** Chip mono junto al nombre en el header (ID de driver, código…). */
  metaCode?: string
  /** Texto secundario del header y de la fila (zona, teléfono…). */
  meta?: string
  messages: ChatMessage[]
  /** Separador de fecha arriba del hilo (ej: "Hoy"). */
  dateSeparator?: string
}

/** Fila de la lista de conversaciones. */
export function ConversationItem({
  conversation: conv,
  active,
  onClick,
}: {
  conversation: ChatConversation
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 border-r-2 px-4 py-3 text-left transition-colors duration-100",
        active
          ? "border-primary bg-brand-50"
          : "border-transparent hover:bg-[var(--surface-2)]",
      )}
    >
      <Avatar name={conv.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              active ? "text-primary" : "text-foreground",
            )}
          >
            {conv.name}
          </span>
          <span className="shrink-0 font-[family-name:var(--font-mono)] text-[10px] text-ink-subtle">
            {conv.lastTime}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
          {(conv.unread ?? 0) > 0 && (
            <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-[var(--r-pill)] bg-primary px-1.5 font-[family-name:var(--font-mono)] text-[10px] font-bold text-primary-foreground">
              {conv.unread}
            </span>
          )}
        </div>
        {conv.meta && (
          <p className="mt-0.5 truncate text-[10px] text-ink-subtle">{conv.meta}</p>
        )}
      </div>
    </button>
  )
}

/** Burbuja de mensaje estilo WhatsApp con ticks de leído. */
export function ChatBubble({ message: msg }: { message: ChatMessage }) {
  const isOut = msg.dir === "out"
  return (
    <div className={cn("flex", isOut ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[72%] rounded-[var(--r-lg)] px-4 py-2.5 shadow-[var(--shadow-soft)]",
          isOut
            ? "rounded-br-[var(--r-xs)] bg-primary text-primary-foreground"
            : "rounded-bl-[var(--r-xs)] bg-[var(--surface-2)] text-foreground",
        )}
      >
        <p className="text-sm leading-snug">{msg.text}</p>
        <div
          className={cn(
            "mt-1 flex items-center gap-1",
            isOut ? "justify-end" : "justify-start",
          )}
        >
          <span
            className={cn(
              "font-[family-name:var(--font-mono)] text-[10px]",
              isOut ? "text-primary-foreground/70" : "text-ink-subtle",
            )}
          >
            {msg.time}
          </span>
          {isOut && (
            <span className="text-primary-foreground/70">
              {msg.read ? <CheckCheck className="size-3" /> : <Check className="size-3" />}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export interface ChatPanelProps {
  conversations: ChatConversation[]
  initialActiveId?: string
  /** Se dispara al enviar; el mensaje también se agrega localmente al hilo. */
  onSend?: (conversationId: string, text: string) => void
  /** Muestra el botón de adjuntar en el composer. */
  onAttach?: () => void
  /** Acciones extra en el header del hilo (llamar, WhatsApp…). */
  headerActions?: React.ReactNode
  listTitle?: string
  height?: number
  className?: string
}

/**
 * Chat de dos columnas estilo WhatsApp: lista de conversaciones con no-leídos
 * + hilo con burbujas y composer. El estado del draft y los mensajes enviados
 * se manejan localmente; persistilos con `onSend`.
 */
export function ChatPanel({
  conversations,
  initialActiveId,
  onSend,
  onAttach,
  headerActions,
  listTitle = "Mensajes",
  height = 520,
  className,
}: ChatPanelProps) {
  const [activeId, setActiveId] = useState<string>(
    initialActiveId ?? conversations[0]?.id ?? "",
  )
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [extraMessages, setExtraMessages] = useState<Record<string, ChatMessage[]>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConv =
    conversations.find((c) => c.id === activeId) ?? conversations[0]
  const allMessages = activeConv
    ? [...activeConv.messages, ...(extraMessages[activeConv.id] ?? [])]
    : []
  const draftText = drafts[activeId] ?? ""

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeId, extraMessages])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = draftText.trim()
    if (!text || !activeConv) return
    const newMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      dir: "out",
      text,
      time: new Date().toLocaleTimeString("es-PY", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: false,
    }
    setExtraMessages((prev) => ({
      ...prev,
      [activeConv.id]: [...(prev[activeConv.id] ?? []), newMsg],
    }))
    setDrafts((prev) => ({ ...prev, [activeId]: "" }))
    onSend?.(activeConv.id, text)
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--shadow-1)]",
        className,
      )}
      style={{ height }}
    >
      {/* Lista de conversaciones */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
            {listTitle}
          </span>
          <span className="grid size-7 cursor-pointer place-items-center rounded-[var(--r-pill)] text-ink-subtle transition-colors hover:bg-[var(--surface-2)] hover:text-foreground">
            <Search className="size-4" />
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              active={conv.id === activeConv?.id}
              onClick={() => setActiveId(conv.id)}
            />
          ))}
        </div>
      </aside>

      {/* Hilo de chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        {activeConv && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={activeConv.name} size="md" />
              <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
                  {activeConv.name}
                </p>
                {(activeConv.metaCode || activeConv.meta) && (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {activeConv.metaCode && (
                      <span className="truncate rounded-[var(--r-sm)] bg-brand-50 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold text-primary">
                        {activeConv.metaCode}
                      </span>
                    )}
                    {activeConv.meta && (
                      <span className="truncate text-[10px] text-ink-subtle">
                        {activeConv.meta}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {headerActions && (
              <div className="flex shrink-0 items-center gap-1">{headerActions}</div>
            )}
          </div>
        )}

        <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
          {activeConv?.dateSeparator && (
            <div className="flex justify-center">
              <span className="rounded-[var(--r-pill)] bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold text-ink-subtle">
                {activeConv.dateSeparator}
              </span>
            </div>
          )}
          {allMessages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-border px-4 py-3"
        >
          {onAttach && (
            <button
              type="button"
              title="Adjuntar archivo"
              onClick={onAttach}
              className="grid size-9 shrink-0 place-items-center rounded-[var(--r-pill)] text-ink-subtle transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
            >
              <Paperclip className="size-4" />
            </button>
          )}
          <input
            type="text"
            value={draftText}
            onChange={(e) => {
              const val = e.target.value
              setDrafts((prev) => ({ ...prev, [activeId]: val }))
            }}
            placeholder="Escribí tu mensaje…"
            className="min-w-0 flex-1 rounded-[var(--r-pill)] border border-input bg-[var(--surface-2)] px-4 py-2 text-sm text-foreground transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-ink-subtle focus:border-brand-300 focus:bg-card focus:outline-none focus:ring-[3px] focus:ring-ring/20"
          />
          <button
            type="submit"
            disabled={!draftText.trim()}
            title="Enviar"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-[var(--r-pill)] transition-all duration-150 active:scale-[0.97]",
              draftText.trim()
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-brand-hover"
                : "cursor-not-allowed bg-[var(--surface-2)] text-ink-subtle",
            )}
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
