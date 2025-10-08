// app/admin/postulaciones/[id]/page.tsx

import { PostulacionDetailContent } from "@/components/admin/postulacion-detail-content"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

// Mock data para IDs específicos
const MOCK_DATA: Record<string, any> = {
  "1": {
    id: '1',
    cedula: '4.567.890',
    firstName: 'Juan',
    lastName: 'Pérez',
    fullName: 'Juan Pérez',
    birthDate: '15/05/1990',
    phoneNumber: '+595981234567',
    email: 'juan.perez@email.com',
    department: 'Central',
    city: 'Asunción',
    address: 'Av. España 1234',
    hasVehicle: true,
    vehicleBrand: 'Honda',
    vehicleModel: 'Wave',
    vehicleYear: 2020,
    vehiclePlate: 'ABC123',
    status: 'COMPLETED',
    currentStep: 5,
    completedSteps: [1, 2, 3, 4, 5],
    startedAt: new Date('2025-10-01T10:30:00'),
    completedAt: new Date('2025-10-01T11:45:00'),
    workZone: 'Centro,Carmelitas,Lambaré',
    emergencyName: 'María Pérez',
    emergencyPhone: '+595981234568',
    emergencyRelationship: 'Hermana',
    howHeardAboutUs: 'Recomendación',
    referredBy: 'Carlos López',
    experience: '1-3 años',
    availability: ['Mañana', 'Tarde'],
    whenCanStart: 'Inmediatamente',
    hasUenoAccount: 'si',
    uenoAccountNumber: '12345678',
    canInvoice: 'si',
    documents: {
      cedula: {
        files: ['/uploads/cedula-front.jpg', '/uploads/cedula-back.jpg'],
        uploadedAt: new Date('2025-10-01T10:35:00'),
      },
      antecedentes: {
        files: ['/uploads/antecedentes.pdf'],
        uploadedAt: new Date('2025-10-01T11:00:00'),
      },
    },
    notes: [
      {
        id: '1',
        content: 'Candidato muy interesado. Llamó para consultar sobre el proceso.',
        createdAt: new Date('2025-10-02T09:00:00'),
        createdBy: 'Admin User',
      },
    ],
    timeline: [
      { step: 1, name: 'Contacto Básico', completedAt: new Date('2025-10-01T10:32:00') },
      { step: 2, name: 'Datos Personales', completedAt: new Date('2025-10-01T10:35:00') },
      { step: 3, name: 'Trabajo y Vehículo', completedAt: new Date('2025-10-01T10:38:00') },
      { step: 4, name: 'Documentos', completedAt: new Date('2025-10-01T11:25:00') },
      { step: 5, name: 'Información Adicional', completedAt: new Date('2025-10-01T11:35:00') },
    ],
  },
  "2": {
    id: '2',
    cedula: '5.123.456',
    firstName: 'María',
    lastName: 'González',
    fullName: 'María González',
    birthDate: '20/03/1988',
    phoneNumber: '+595982345678',
    email: 'maria.gonzalez@email.com',
    department: 'Central',
    city: 'Lambaré',
    address: 'Calle Principal 567',
    hasVehicle: true,
    vehicleBrand: 'Yamaha',
    vehicleModel: 'Crypton',
    vehicleYear: 2019,
    vehiclePlate: 'XYZ789',
    status: 'IN_PROGRESS',
    currentStep: 3,
    completedSteps: [1, 2, 3],
    startedAt: new Date('2025-10-05T14:20:00'),
    completedAt: null,
    workZone: 'Lambaré,Fernando de la Mora',
    emergencyName: 'Pedro González',
    emergencyPhone: '+595982345679',
    emergencyRelationship: 'Hermano',
    howHeardAboutUs: 'Redes Sociales',
    referredBy: null,
    experience: 'Sin experiencia',
    availability: ['Tarde', 'Noche'],
    whenCanStart: 'La próxima semana',
    hasUenoAccount: 'no',
    uenoAccountNumber: null,
    canInvoice: 'no',
    documents: {
      cedula: {
        files: ['/uploads/cedula-front-2.jpg'],
        uploadedAt: new Date('2025-10-05T14:25:00'),
      },
    },
    notes: [],
    timeline: [
      { step: 1, name: 'Contacto Básico', completedAt: new Date('2025-10-05T14:22:00') },
      { step: 2, name: 'Datos Personales', completedAt: new Date('2025-10-05T14:28:00') },
      { step: 3, name: 'Trabajo y Vehículo', completedAt: new Date('2025-10-05T14:35:00') },
      { step: 4, name: 'Documentos', completedAt: null },
      { step: 5, name: 'Información Adicional', completedAt: null },
    ],
  },
  "3": {
    id: '3',
    cedula: '3.987.654',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    fullName: 'Carlos Rodríguez',
    birthDate: '10/11/1995',
    phoneNumber: '+595983456789',
    email: 'carlos.rodriguez@email.com',
    department: 'Central',
    city: 'San Lorenzo',
    address: 'Barrio Obrero 890',
    hasVehicle: false,
    vehicleBrand: null,
    vehicleModel: null,
    vehicleYear: null,
    vehiclePlate: null,
    status: 'COMPLETED',
    currentStep: 5,
    completedSteps: [1, 2, 3, 4, 5],
    startedAt: new Date('2025-10-03T09:15:00'),
    completedAt: new Date('2025-10-03T10:30:00'),
    workZone: 'Centro,Luque',
    emergencyName: 'Ana Rodríguez',
    emergencyPhone: '+595983456790',
    emergencyRelationship: 'Esposa',
    howHeardAboutUs: 'Recomendación',
    referredBy: 'Juan Pérez',
    experience: 'Menos de 1 año',
    availability: ['Mañana'],
    whenCanStart: 'Esta semana',
    hasUenoAccount: 'si',
    uenoAccountNumber: '87654321',
    canInvoice: 'si',
    documents: {
      cedula: {
        files: ['/uploads/cedula-front-3.jpg', '/uploads/cedula-back-3.jpg'],
        uploadedAt: new Date('2025-10-03T09:20:00'),
      },
      antecedentes: {
        files: ['/uploads/antecedentes-3.pdf'],
        uploadedAt: new Date('2025-10-03T09:45:00'),
      },
    },
    notes: [
      {
        id: '1',
        content: 'Excelente candidato. Muy puntual en las respuestas.',
        createdAt: new Date('2025-10-03T11:00:00'),
        createdBy: 'Admin User',
      },
      {
        id: '2',
        content: 'Listo para OnBoarding. Agendar para esta semana.',
        createdAt: new Date('2025-10-03T11:15:00'),
        createdBy: 'Admin User',
      },
    ],
    timeline: [
      { step: 1, name: 'Contacto Básico', completedAt: new Date('2025-10-03T09:17:00') },
      { step: 2, name: 'Datos Personales', completedAt: new Date('2025-10-03T09:22:00') },
      { step: 3, name: 'Trabajo y Vehículo', completedAt: new Date('2025-10-03T09:28:00') },
      { step: 4, name: 'Documentos', completedAt: new Date('2025-10-03T10:05:00') },
      { step: 5, name: 'Información Adicional', completedAt: new Date('2025-10-03T10:30:00') },
    ],
  },
}

async function getPostulacion(id: string) {
  // Si es un ID de mock (1, 2, o 3), devolver mock data
  if (MOCK_DATA[id]) {
    return MOCK_DATA[id]
  }

  // Para IDs reales, buscar en la base de datos
  try {
    const formDriver = await prisma.formDriver.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!formDriver) {
      return null
    }

    // Transformar los datos de la BD al formato esperado por el componente
    const postulacion = {
      id: formDriver.id,
      cedula: formDriver.cedula,
      firstName: formDriver.firstName,
      lastName: formDriver.lastName,
      fullName: formDriver.fullName,
      birthDate: formDriver.birthDate ? new Date(formDriver.birthDate).toLocaleDateString('es-PY') : null,
      phoneNumber: formDriver.phoneNumber,
      email: formDriver.email,
      department: formDriver.department,
      city: formDriver.city,
      address: formDriver.address,
      hasVehicle: formDriver.hasVehicle,
      vehicleBrand: formDriver.vehicleBrand,
      vehicleModel: formDriver.vehicleModel,
      vehicleYear: formDriver.vehicleYear,
      vehiclePlate: formDriver.vehiclePlate,
      status: formDriver.status,
      currentStep: formDriver.currentStep,
      completedSteps: formDriver.completedSteps,
      startedAt: formDriver.startedAt,
      completedAt: formDriver.completedAt,
      workZone: formDriver.workZone,
      emergencyName: formDriver.emergencyName,
      emergencyPhone: formDriver.emergencyPhone,
      emergencyRelationship: formDriver.emergencyRelationship,
      howHeardAboutUs: formDriver.howHeardAboutUs,
      referredBy: formDriver.referredBy,
      experience: formDriver.experience,
      availability: formDriver.availability,
      whenCanStart: formDriver.whenCanStart,
      hasUenoAccount: formDriver.hasUenoAccount ? 'si' : 'no',
      uenoAccountNumber: formDriver.uenoAccountNumber,
      canInvoice: formDriver.canInvoice ? 'si' : 'no',
      
      // Procesar documentos
      documents: {
        cedula: formDriver.cedulaPhotoUrl ? {
          files: formDriver.cedulaPhotoUrl.split(',').filter(f => f),
          uploadedAt: formDriver.startedAt, // Usar fecha aproximada
        } : undefined,
        antecedentes: formDriver.licensePhotoUrl ? {
          files: formDriver.licensePhotoUrl.split(',').filter(f => f),
          uploadedAt: formDriver.startedAt,
        } : undefined,
      },
      
      // Notas
      notes: formDriver.notes.map(note => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        createdBy: note.createdBy,
      })),
      
      // Timeline basado en los pasos completados
      timeline: [
        { 
          step: 1, 
          name: 'Contacto Básico', 
          completedAt: formDriver.completedSteps.includes(1) ? formDriver.startedAt : null 
        },
        { 
          step: 2, 
          name: 'Datos Personales', 
          completedAt: formDriver.completedSteps.includes(2) ? formDriver.startedAt : null 
        },
        { 
          step: 3, 
          name: 'Trabajo y Vehículo', 
          completedAt: formDriver.completedSteps.includes(3) ? formDriver.startedAt : null 
        },
        { 
          step: 4, 
          name: 'Documentos', 
          completedAt: formDriver.completedSteps.includes(4) ? formDriver.startedAt : null 
        },
        { 
          step: 5, 
          name: 'Información Adicional', 
          completedAt: formDriver.completedSteps.includes(5) ? formDriver.completedAt : null 
        },
      ],
    }

    return postulacion
  } catch (error) {
    console.error('Error al obtener postulación:', error)
    return null
  }
}

export default async function PostulacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const postulacion = await getPostulacion(id)

  if (!postulacion) {
    notFound()
  }

  return <PostulacionDetailContent postulacion={postulacion} />
}