// app/admin/adquisicion/postulantes/page.tsx

export default function PostulantesPage() {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Postulantes</h1>
          <p className="text-muted-foreground">
            Gestión de drivers en proceso de adquisición
          </p>
        </div>
  
        {/* Aquí irá la tabla de postulantes */}
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Próximamente: Tabla con todos los postulantes
          </p>
        </div>
      </div>
    )
  }