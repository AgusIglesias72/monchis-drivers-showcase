export function RecentActivity() {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">
                Nuevo postulante registrado
              </p>
              <p className="text-sm text-muted-foreground">
                Hace {i + 1}h
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }