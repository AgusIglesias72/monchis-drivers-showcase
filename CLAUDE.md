# Monchis Drivers — Contexto para agentes IA

## Stack

- **Next.js 15.5** App Router, TypeScript strict, **pnpm**
- **Tailwind CSS v4** con `@theme inline` — usar tokens CSS, no clases hardcoded
- **shadcn/ui** (Radix primitives) + design system propio en `components/ds/`
- **Prisma** + PostgreSQL (Railway) — schema en `prisma/schema.prisma`
- **Clerk** para autenticación (hooks: `useSignIn`, `useSignUp`, `useClerk`, `getCurrentUser` server-side)
- **Vercel** para deploy production

## Organización de archivos

```
app/
  admin/          # Panel admin (requiere AdminUser activo via getCurrentUser())
    layout.tsx    # SidebarProvider + AdminTopBar + AppSidebar + SidebarInset (pt-[52px])
    [sección]/
      page.tsx    # Server component por defecto
  api/            # Route handlers
  sign-in/        # Auth Clerk
  sign-up/
  reset-password/
components/
  admin/          # Componentes específicos del panel admin
    app-sidebar.tsx
    admin-topbar.tsx   # h-[52px] fija, con SidebarTrigger + breadcrumb automático
  ds/             # 78 componentes del design system (SIEMPRE preferir estos)
    index.ts      # barrel
  ui/             # shadcn/ui generados (no modificar directamente)
lib/
  auth.ts         # getCurrentUser() — gate de roles
  db.ts           # cliente Prisma singleton
  services/       # lógica de negocio
prisma/
  schema.prisma
```

## Design system — tokens y convenciones

### Colores (Tailwind v4 `@theme inline`)
- `bg-background` / `text-foreground` — página y texto principal
- `bg-card` / `bg-muted` — superficies
- `bg-primary` / `text-primary-foreground` — rojo de marca (#E52050), NUNCA neutralizar
- `text-muted-foreground` — texto secundario
- `border-border` — bordes
- `var(--surface-2)`, `var(--surface-3)` — capas de profundidad
- `var(--warning-soft)`, `var(--warning)` — badges de advertencia
- `var(--success)`, `var(--success-soft)` — estados ok
- `bg-destructive` / `text-destructive` — errores

### Tipografía
- Display (headings): `font-[family-name:var(--font-display)]` → Bricolage Grotesque
- Body: Plus Jakarta Sans (default)
- Código/OTP: `font-mono`

### Radios
- `rounded-[var(--r-sm)]`, `rounded-[var(--r-md)]`, `rounded-[var(--r-lg)]`
- Buttons: pill shape con `rounded-full`

### Componentes DS clave
```ts
import { Button, Field, PasswordInput, LoadingButton, Callout, 
         DividerLabel, Spinner, AuthShell, DataTable, Modal,
         Select, Badge, Banner, Tooltip } from '@/components/ds'
```
**Siempre usar DS en lugar de HTML nativo o shadcn directo.**

## Patrones de código

### Server vs Client
- Server components por defecto — datos, DB, auth
- `'use client'` solo para interactividad (hooks, events)
- Datos vía Server Actions o Route Handlers (`app/api/`)

### API Routes
- Siempre `export const runtime = 'nodejs'` si usa Prisma
- Auth: `const adminUser = await getCurrentUser(); if (!adminUser) return NextResponse.json({}, {status: 401})`

### Formularios
- `useState` para campos simples
- `useTransition` + Server Actions para formularios más complejos
- Errores en `Callout` con `variant="danger"`

### Imports
- Path alias `@/` → root del proyecto
- Barrel `@/components/ds` para todo el DS

## Prohibiciones

- NO correr `next build` ni `pnpm build` — el usuario lo hace manualmente
- NO usar Braze — eliminado
- NO hardcodear colores hex en Tailwind cuando existe token equivalente
- NO añadir comentarios obvios en el código
- NO crear archivos README ni documentación extra salvo que se pida
- NO añadir `console.log` de debug en código que va a producción

## Layout del admin (constantes que deben mantenerse sincronizadas)

```
AdminTopBar:    h-[52px]   (fixed inset-x-0 top-0)
AppSidebar:     !top-[52px] !h-[calc(100svh-52px)]
SidebarInset:   pt-[52px]
```

## Workflow Fable + Codex

Este repo usa un pipeline multi-agente:
- **Fable** (`claude-fable-5`) como orquestador — planifica y revisa
- **Codex** (ChatGPT, autenticado) como implementador — ejecuta cambios de código

El workflow está en `.claude/workflows/fable-codex.js`.
Invocar con: `Workflow({ name: 'fable-codex', args: { task: 'descripción de la tarea' } })`
