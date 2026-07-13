export default function AgentRunsLoading() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-[var(--r-md)] bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded-[var(--r-md)] bg-muted animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-[var(--r-lg)] bg-muted" />
        <div className="h-20 animate-pulse rounded-[var(--r-lg)] bg-muted" />
        <div className="h-20 animate-pulse rounded-[var(--r-lg)] bg-muted" />
        <div className="h-20 animate-pulse rounded-[var(--r-lg)] bg-muted" />
        <div className="h-20 animate-pulse rounded-[var(--r-lg)] bg-muted" />
        <div className="h-20 animate-pulse rounded-[var(--r-lg)] bg-muted" />
      </div>
    </div>
  )
}
