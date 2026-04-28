"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { REQUEST_ID_REGEX } from "@/lib/config/pedidos.config"

export function PedidoSearchForm() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = value.trim()
    if (!REQUEST_ID_REGEX.test(id)) {
      toast.error("ID inválido. Tiene que ser un Mongo ObjectId (24 caracteres hex)")
      return
    }
    setIsPending(true)
    router.push(`/admin/gestion/pedidos/${id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Pegá el request_id del pedido (ej: 69e98699e29d6ff24d04cad4)"
        className="font-mono text-sm sm:max-w-[480px]"
        autoComplete="off"
      />
      <Button type="submit" disabled={isPending || !value.trim()} className="gap-2">
        <Search className="h-4 w-4" />
        Buscar pedido
      </Button>
    </form>
  )
}
