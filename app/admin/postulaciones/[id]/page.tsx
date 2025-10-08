// app/admin/postulaciones/[id]/page.tsx

import { PostulacionDetailContent } from "@/components/admin/postulacion-detail-content"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

// Mock data para IDs específicos (mantenemos para desarrollo)
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
    documentsStatus: 'APPROVED',
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
    documents: [
      {
        id: 'doc1',
        documentType: 'CEDULA_FRONT',
        fileName: 'cedula-frente.jpg',
        blobUrl: '/uploads/cedula-front.jpg',
        status: 'APPROVED',
        uploadedAt: new Date('2025-10-01T10:35:00'),
        fileSize: 245000,
        mimeType: 'image/jpeg',
      },
      {
        id: 'doc2',
        documentType: 'CEDULA_BACK',
        fileName: 'cedula-dorso.jpg',
        blobUrl: '/uploads/cedula-back.jpg',
        status: 'APPROVED',
        uploadedAt: new Date('2025-10-01T10:35:00'),
        fileSize: 238000,
        mimeType: 'image/jpeg',
      },
      {
        id: 'doc3',
        documentType: 'CRIMINAL_RECORD',
        fileName: 'antecedentes-penales.pdf',
        blobUrl: '/uploads/antecedentes.pdf',
        status: 'PENDING',
        uploadedAt: new Date('2025-10-01T11:00:00'),
        fileSize: 1200000,
        mimeType: 'application/pdf',
      },
    ],
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
    documentsStatus: 'INCOMPLETE',
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
    documents: [
      {
        id: 'doc4',
        documentType: 'CEDULA_FRONT',
        fileName: 'cedula-maria.jpg',
        blobUrl: '/uploads/cedula-front-2.jpg',
        status: 'PENDING',
        uploadedAt: new Date('2025-10-05T14:25:00'),
        fileSize: 280000,
        mimeType: 'image/jpeg',
      },
    ],
    notes: [],
    timeline: [
      { step: 1, name: 'Contacto Básico', completedAt: new Date('2025-10-05T14:22:00') },
      { step: 2, name: 'Datos Personales', completedAt: new Date('2025-10-05T14:28:00') },
      { step: 3, name: 'Trabajo y Vehículo', completedAt: new Date('2025-10-05T14:35:00') },
      { step: 4, name: 'Documentos', completedAt: null },
      { step: 5, name: 'Información Adicional', completedAt: null },
    ],
  },
}

async function getPostulacion(id: string) {
  // Si es un ID de mock (1, 2), devolver mock data
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
        },
        documents: {
          where: {
            isDeleted: false
          },
          orderBy: {
            uploadedAt: 'desc'
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
      documentsStatus: formDriver.documentsStatus,
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
      
      // ✅ NUEVO: Documentos desde la tabla FormDocument
      documents: formDriver.documents.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        blobUrl: doc.blobUrl,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        reviewedAt: doc.reviewedAt,
        reviewedBy: doc.reviewedBy,
        rejectionReason: doc.rejectionReason,
        adminNotes: doc.adminNotes,
      })),
      
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