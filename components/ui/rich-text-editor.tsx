'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Pilcrow,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  ariaLabel,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors',
        'text-foreground/70 hover:text-foreground hover:bg-muted',
        active && 'bg-foreground text-background hover:bg-foreground hover:text-background',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null
  return (
    <div className="flex items-center gap-0.5 border-b px-2 py-1.5 bg-muted/30">
      <ToolbarButton
        ariaLabel="Negrita"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Itálica"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        ariaLabel="Párrafo"
        active={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <Pilcrow className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Subtítulo"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Sub-subtítulo"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        ariaLabel="Lista con viñetas"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        ariaLabel="Lista numerada"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = '8rem',
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none px-3 py-2.5',
          'prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2',
          'prose-h2:text-base prose-h2:font-semibold',
          'prose-h3:text-sm prose-h3:font-semibold',
          'prose-strong:text-foreground prose-strong:font-semibold',
          'prose-li:my-0',
        ),
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Tiptap representa contenido vacío como '<p></p>' — devolvemos string vacío
      onChange(html === '<p></p>' ? '' : html)
    },
  })

  return (
    <div
      className={cn(
        'rounded-md border bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring',
        className,
      )}
    >
      <Toolbar editor={editor} />
      <div style={{ minHeight }} className="text-sm">
        <EditorContent editor={editor} />
      </div>
      {placeholder && editor && editor.isEmpty && (
        <style jsx>{`
          :global(.ProseMirror p.is-editor-empty:first-child::before) {
            content: attr(data-placeholder);
            color: var(--muted-foreground);
            float: left;
            height: 0;
            pointer-events: none;
          }
        `}</style>
      )}
    </div>
  )
}

/**
 * Para renderizar HTML guardado en server components.
 * El HTML viene de Tiptap StarterKit (sanitizado por defecto: no permite scripts).
 */
export function RichTextDisplay({
  html,
  className,
}: {
  html: string | null | undefined
  className?: string
}) {
  if (!html || html === '<p></p>') return null
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        'prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2',
        'prose-h2:text-lg prose-h2:font-semibold prose-h2:text-foreground',
        'prose-h3:text-base prose-h3:font-semibold prose-h3:text-foreground',
        'prose-strong:text-foreground prose-strong:font-semibold',
        'prose-a:text-brand prose-a:no-underline hover:prose-a:underline',
        'prose-li:my-0.5',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
