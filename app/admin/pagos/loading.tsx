export default function PagosLoading() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-[var(--r-md)] bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded-[var(--r-md)] bg-muted animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-24 rounded-[var(--r-lg)] bg-muted animate-pulse" />
        <div className="h-24 rounded-[var(--r-lg)] bg-muted animate-pulse" />
        <div className="h-24 rounded-[var(--r-lg)] bg-muted animate-pulse" />
        <div className="h-24 rounded-[var(--r-lg)] bg-muted animate-pulse" />
      </div>
      <div className="rounded-[var(--r-lg)] border border-border overflow-hidden">
        <div className="h-10 bg-muted animate-pulse" />
        <div className="h-12 animate-pulse border-t border-border bg-muted/50" />
        <div className="h-12 animate-pulse border-t border-border bg-muted/30" />
        <div className="h-12 animate-pulse border-t border-border bg-muted/50" />
        <div className="h-12 animate-pulse border-t border-border bg-muted/30" />
        <div className="h-12 animate-pulse border-t border-border bg-muted/50" />
        <div className="h-12 animate-pulse border-t border-border bg-muted/30" />
        <div className="h-12 animate-pulse border-t border-border bg-muted/50" />
        <div className="h-12 animate-pulse border-t border-border bg-muted/30" />
      </div>
    </div>
  )
}
