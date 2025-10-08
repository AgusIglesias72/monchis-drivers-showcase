// app/admin/onboarding/page.tsx

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Phone,
  Mail,
} from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"

// Tipos
interface OnBoardingSession {
  id: string
  date: Date
  time: string
  location: string
  capacity: number
  registered: number
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  instructor: string
  notes?: string
}

interface Driver {
  id: string
  name: string
  email: string
  phone: string
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED'
  registeredAt: Date
  attended?: boolean
}

// Datos de ejemplo
const mockSessions: OnBoardingSession[] = [
  {
    id: '1',
    date: new Date('2025-10-15'),
    time: '09:00',
    location: 'Oficina Central - Asunción',
    capacity: 20,
    registered: 15,
    status: 'SCHEDULED',
    instructor: 'Juan Pérez',
    notes: 'Traer cédula y licencia original',
  },
  {
    id: '2',
    date: new Date('2025-10-18'),
    time: '14:00',
    location: 'Sede Ciudad del Este',
    capacity: 15,
    registered: 15,
    status: 'SCHEDULED',
    instructor: 'María González',
  },
  {
    id: '3',
    date: new Date('2025-10-08'),
    time: '10:00',
    location: 'Oficina Central - Asunción',
    capacity: 20,
    registered: 18,
    status: 'COMPLETED',
    instructor: 'Juan Pérez',
  },
]

const mockDrivers: Record<string, Driver[]> = {
  '1': [
    {
      id: '1',
      name: 'Carlos Méndez',
      email: 'carlos@example.com',
      phone: '0981-234-567',
      status: 'CONFIRMED',
      registeredAt: new Date('2025-10-01'),
    },
    {
      id: '2',
      name: 'Ana Silva',
      email: 'ana@example.com',
      phone: '0982-345-678',
      status: 'CONFIRMED',
      registeredAt: new Date('2025-10-02'),
    },
    {
      id: '3',
      name: 'Roberto Gómez',
      email: 'roberto@example.com',
      phone: '0983-456-789',
      status: 'PENDING',
      registeredAt: new Date('2025-10-03'),
    },
  ],
}

type SortField = 'date' | 'location' | 'instructor' | 'capacity' | 'status'
type SortDirection = 'asc' | 'desc'

export default function OnBoardingPage() {
  const [sessions, setSessions] = useState<OnBoardingSession[]>(mockSessions)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedSession, setSelectedSession] = useState<OnBoardingSession | null>(null)
  const [showDrivers, setShowDrivers] = useState(false)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Función para manejar el ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Si es el mismo campo, cambiar dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Si es un campo nuevo, ordenar ascendente
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filtrar y ordenar sesiones
  const filteredAndSortedSessions = sessions
    .filter(session => {
      const matchesSearch = 
        session.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.instructor.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterStatus === 'all' || session.status === filterStatus

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'location':
          comparison = a.location.localeCompare(b.location)
          break
        case 'instructor':
          comparison = a.instructor.localeCompare(b.instructor)
          break
        case 'capacity':
          comparison = (a.registered / a.capacity) - (b.registered / b.capacity)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

  // Componente para el header de tabla ordenable
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field
    
    return (
      <TableHead 
        className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          {children}
          <div className="flex flex-col">
            <svg
              className={`h-3 w-3 transition-colors ${isActive && sortDirection === 'asc' ? 'text-foreground' : 'text-muted-foreground/30'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M7 14l5-5 5 5z" />
            </svg>
            <svg
              className={`h-3 w-3 -mt-1 transition-colors ${isActive && sortDirection === 'desc' ? 'text-foreground' : 'text-muted-foreground/30'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </div>
      </TableHead>
    )
  }

  const getStatusBadge = (status: OnBoardingSession['status']) => {
    const config = {
      SCHEDULED: {
        label: 'Programado',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Calendar className="h-3 w-3" />,
      },
      IN_PROGRESS: {
        label: 'En Curso',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock className="h-3 w-3" />,
      },
      COMPLETED: {
        label: 'Completado',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle className="h-3 w-3" />,
      },
      CANCELLED: {
        label: 'Cancelado',
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: <XCircle className="h-3 w-3" />,
      },
    }

    const { label, className, icon } = config[status]

    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        {icon}
        {label}
      </Badge>
    )
  }

  const getDriverStatusBadge = (status: Driver['status']) => {
    const config = {
      CONFIRMED: { label: 'Confirmado', className: 'bg-green-100 text-green-800' },
      PENDING: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800' },
      CANCELLED: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
      COMPLETED: { label: 'Completado', className: 'bg-blue-100 text-blue-800' },
    }

    const { label, className } = config[status]

    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    )
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-PY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="flex flex-1 flex-col container mx-auto">
      <AdminHeader
        breadcrumbs={[
          { label: "On Boarding" }
        ]}
      />

      <div className="flex-1 p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">On Boarding</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las sesiones de incorporación de nuevos drivers
            </p>
          </div>
          <Button className="gap-2 md:mt-0">
            <Plus className="h-4 w-4" />
            Nueva Sesión
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Sesiones de On Boarding</CardTitle>
            <CardDescription>
              Visualiza y gestiona todas las sesiones programadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ubicación o instructor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="SCHEDULED">Programados</SelectItem>
                  <SelectItem value="IN_PROGRESS">En Curso</SelectItem>
                  <SelectItem value="COMPLETED">Completados</SelectItem>
                  <SelectItem value="CANCELLED">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="date">Fecha y Hora</SortableHeader>
                  <SortableHeader field="location">Ubicación</SortableHeader>
                  <SortableHeader field="instructor">Instructor</SortableHeader>
                  <SortableHeader field="capacity">Capacidad</SortableHeader>
                  <SortableHeader field="status">Estado</SortableHeader>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se encontraron sesiones
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatDate(session.date)}
                          </span>
                          <span className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {session.time}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {session.location}
                        </div>
                      </TableCell>
                      <TableCell>{session.instructor}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className={session.registered >= session.capacity ? 'text-red-600 font-semibold' : ''}>
                            {session.registered}/{session.capacity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedSession(session)
                              setShowDrivers(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog de Drivers */}
        <Dialog open={showDrivers} onOpenChange={setShowDrivers}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Drivers Registrados</DialogTitle>
              <DialogDescription>
                {selectedSession && (
                  <>
                    {formatDate(selectedSession.date)} - {selectedSession.time} | {selectedSession.location}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedSession && (
              <div className="space-y-4">
                {/* Info de la sesión */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Capacidad</div>
                    <div className="text-2xl font-bold">
                      {selectedSession.registered}/{selectedSession.capacity}
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Instructor</div>
                    <div className="text-lg font-semibold">{selectedSession.instructor}</div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Estado</div>
                    <div>{getStatusBadge(selectedSession.status)}</div>
                  </div>
                </div>

                {selectedSession.notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Notas:</p>
                        <p className="text-sm text-blue-800">{selectedSession.notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón agregar driver */}
                <Button className="w-full gap-2" variant="outline">
                  <UserPlus className="h-4 w-4" />
                  Agregar Driver a esta Sesión
                </Button>

                {/* Lista de drivers */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Registrado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDrivers[selectedSession.id]?.map((driver) => (
                        <TableRow key={driver.id}>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {driver.email}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {driver.phone}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getDriverStatusBadge(driver.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(driver.registeredAt).toLocaleDateString('es-PY')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No hay drivers registrados en esta sesión
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}