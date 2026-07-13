// components/admin/internal-notes-card.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Edit2, Trash2, Check, X } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface InternalNotesCardProps {
  notes: any[]
  onAddNote: (content: string) => Promise<void>
  onEditNote: (noteId: string, content: string) => Promise<void>
  onDeleteNote: (noteId: string) => Promise<void>
  isLoading: boolean
}

export function InternalNotesCard({
  notes,
  onAddNote,
  onEditNote,
  onDeleteNote,
  isLoading
}: InternalNotesCardProps) {
  const [newNote, setNewNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newNote.trim()) return
    await onAddNote(newNote)
    setNewNote('')
  }

  const handleEdit = async (noteId: string) => {
    if (!editContent.trim()) return
    await onEditNote(noteId, editContent)
    setEditingNoteId(null)
    setEditContent('')
  }

  const handleDelete = async () => {
    if (!deleteNoteId) return
    await onDeleteNote(deleteNoteId)
    setDeleteNoteId(null)
  }

  const startEdit = (note: any) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const cancelEdit = () => {
    setEditingNoteId(null)
    setEditContent('')
  }

  // Ordenar notas con la más reciente primero
  const sortedNotes = [...notes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <>
      <div className="space-y-3">
        {/* Lista de notas - AHORA VA PRIMERO */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay notas aún
            </p>
          ) : (
            sortedNotes.map((note: any) => (
              <div key={note.id} className="bg-muted/30 rounded-lg p-3 group">
                {editingNoteId === note.id ? (
                  // Modo edición
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                      disabled={isLoading}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(note.id)}
                        disabled={!editContent.trim() || isLoading}
                        className="flex-1 cursor-pointer"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                        disabled={isLoading}
                        className="flex-1 cursor-pointer"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Modo vista
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{note.content}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(note)}
                          className="h-7 w-7 cursor-pointer"
                          disabled={isLoading}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteNoteId(note.id)}
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-danger-soft cursor-pointer"
                          disabled={isLoading}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">
                        {note.createdByUser?.firstName || note.createdByUser?.fullName || 'Admin'}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(note.createdAt).toLocaleDateString('es-PY', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Agregar nueva nota - AHORA VA AL FINAL */}
        <div className="space-y-2 pt-3 border-t">
          <Textarea
            placeholder="Añadir una nota interna..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="text-sm resize-none"
            disabled={isLoading}
          />
          <Button 
            onClick={handleAdd} 
            size="sm"   
            className="w-full cursor-pointer"
            disabled={!newNote.trim() || isLoading}
          >
            Añadir Nota
          </Button>
        </div>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La nota será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}