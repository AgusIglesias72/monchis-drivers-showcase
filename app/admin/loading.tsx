export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 animate-pulse rounded-[var(--r-md)] bg-muted" />
            <div className="h-4 w-80 animate-pulse rounded-[var(--r-md)] bg-muted" />
          </div>
          <div className="h-9 w-64 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 animate-pulse rounded-[var(--r-lg)] bg-muted" />
          <div className="h-28 animate-pulse rounded-[var(--r-lg)] bg-muted" />
          <div className="h-28 animate-pulse rounded-[var(--r-lg)] bg-muted" />
          <div className="h-28 animate-pulse rounded-[var(--r-lg)] bg-muted" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 animate-pulse rounded-[var(--r-lg)] bg-muted" />
          <div className="h-72 animate-pulse rounded-[var(--r-lg)] bg-muted" />
        </div>
        <div className="h-80 animate-pulse rounded-[var(--r-lg)] bg-muted" />
      </div>
    </div>
  )
}
