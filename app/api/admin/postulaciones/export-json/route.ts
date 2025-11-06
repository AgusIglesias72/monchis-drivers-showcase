// app/api/admin/postulaciones/export-json/route.ts
/**
 * Endpoint para exportar postulaciones en formato JSON
 * Consultable desde Google Apps Script u otros servicios externos
 * 
 * GET /api/admin/postulaciones/export-json
 * 
 * Query params:
 * - apiKey: REQUERIDO - API Key para autenticación
 * - status: Filtrar por estado del formulario (pending, in_review, approved, rejected)
 * - onboardingStatus: Filtrar por estado de onboarding
 * - searchTerm: Buscar por nombre, email, cédula, teléfono
 * - startDate: Filtrar por fecha de inicio (ISO format: 2025-01-01)
 * - endDate: Filtrar por fecha de fin (ISO format: 2025-12-31)
 * - page: Número de página (default: 1)
 * - pageSize: Cantidad de registros por página (default: 100, max: 500)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Configuración de paginación
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

export async function GET(request: NextRequest) {
  try {
    // ============================================================================
    // 1. AUTENTICACIÓN VÍA API KEY
    // ============================================================================
    const apiKey = request.nextUrl.searchParams.get('apiKey');
    const expectedApiKey = process.env.POSTULACIONES_API_KEY;

    if (!expectedApiKey) {
      return NextResponse.json(
        { error: 'API key not configured on server' },
        { status: 500 }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing API key' },
        { status: 401 }
      );
    }

    // ============================================================================
    // 2. OBTENER Y VALIDAR PARÁMETROS
    // ============================================================================
    const status = request.nextUrl.searchParams.get('status');
    const onboardingStatus = request.nextUrl.searchParams.get('onboardingStatus');
    const searchTerm = request.nextUrl.searchParams.get('searchTerm');
    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');
    
    // Paginación
    const pageParam = request.nextUrl.searchParams.get('page');
    const pageSizeParam = request.nextUrl.searchParams.get('pageSize');
    
    const page = pageParam ? Math.max(1, parseInt(pageParam)) : 1;
    const pageSize = pageSizeParam 
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSizeParam)))
      : DEFAULT_PAGE_SIZE;
    
    const skip = (page - 1) * pageSize;

    // ============================================================================
    // 3. CONSTRUIR FILTROS
    // ============================================================================
    const where: any = {};

    // Filtro por estado
    if (status && status !== 'all') {
      where.status = status;
    }

    // Filtro por búsqueda
    if (searchTerm) {
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { cedula: { contains: searchTerm } },
        { phoneNumber: { contains: searchTerm } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Filtro por rango de fechas
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) {
        where.startedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.startedAt.lte = new Date(endDate);
      }
    }

    // Filtro de onboarding
    if (onboardingStatus && onboardingStatus !== 'all') {
      if (onboardingStatus === 'none') {
        where.onboardingAttendances = { none: {} };
      } else {
        where.onboardingAttendances = {
          some: {
            status: onboardingStatus,
          },
        };
      }
    }

    // ============================================================================
    // 4. OBTENER TOTAL DE REGISTROS (para paginación)
    // ============================================================================
    const totalCount = await prisma.formDriver.count({ where });
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // ============================================================================
    // 5. CONSULTAR POSTULACIONES CON PAGINACIÓN
    // ============================================================================
    const postulaciones = await prisma.formDriver.findMany({
      where,
      include: {
        documents: {
          select: {
            id: true,
            documentType: true,
            blobUrl: true,
            status: true,
            rejectionReason: true,
            uploadedAt: true,
          },
        },
        equipmentPayments: {
          select: {
            id: true,
            paymentMethod: true,
            amount: true,
            paymentNumber: true,
            invoiceNumber: true,
            status: true,
            paymentProofUrl: true,
            createdAt: true,
          },
        },
        financialService: {
          select: {
            id: true,
            interestedInConto: true,
            taxComplianceUrl: true,
          },
        },
        onboardingAttendances: {
          include: {
            event: {
              select: {
                id: true,
                scheduledDate: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      skip,
      take: pageSize,
    });

    // ============================================================================
    // 6. TRANSFORMAR DATOS A FORMATO LIMPIO
    // ============================================================================
    const data = postulaciones.map((p) => {
      // Transformar documentos a array simple
      const documents = p.documents.map(doc => ({
        id: doc.id,
        type: doc.documentType,
        url: doc.blobUrl,
        status: doc.status,
        rejectionReason: doc.rejectionReason,
        uploadedAt: doc.uploadedAt.toISOString(),
      }));

      // Pago de equipamiento (primero si existe)
      const payment = p.equipmentPayments[0];

      // Servicio financiero
      const financial = p.financialService;

      // Onboarding (primero si existe)
      const onboarding = p.onboardingAttendances[0];

      return {
        // ===== IDENTIFICACIÓN =====
        id: p.id,
        fullName: p.fullName || '',
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        cedula: p.cedula,
        email: p.email || '',
        phoneNumber: p.phoneNumber,
        birthDate: p.birthDate?.toISOString() || null,

        // ===== UBICACIÓN =====
        department: p.department || '',
        city: p.city || '',
        neighborhood: p.neighborhood || '',
        address: p.address || '',

        // ===== VEHÍCULO =====
        hasVehicle: p.hasVehicle,
        vehicleBrand: p.vehicleBrand || '',
        vehicleModel: p.vehicleModel || '',
        vehicleYear: p.vehicleYear || '',
        vehiclePlate: p.vehiclePlate || '',

        // ===== CONTACTO DE EMERGENCIA =====
        emergencyName: p.emergencyName || '',
        emergencyRelationship: p.emergencyRelationship || '',
        emergencyPhone: p.emergencyPhone || '',

        // ===== INFORMACIÓN LABORAL =====
        workZone: p.workZone || '',
        howHeardAboutUs: p.howHeardAboutUs || '',
        referredBy: p.referredBy || '',
        experience: p.experience || '',
        availability: p.availability || [],
        whenCanStart: p.whenCanStart || '',

        // ===== INFORMACIÓN BANCARIA =====
        hasUenoAccount: p.hasUenoAccount,
        uenoAccountNumber: p.uenoAccountNumber || '',
        canInvoice: p.canInvoice,

        // ===== SERVICIO FINANCIERO (CONTO) =====
        financialService: financial
          ? {
              id: financial.id,
              interestedInConto: financial.interestedInConto,
              taxComplianceUrl: financial.taxComplianceUrl || '',
            }
          : null,

        // ===== PAGO DE EQUIPAMIENTO =====
        payment: payment
          ? {
              id: payment.id,
              paymentMethod: payment.paymentMethod || '',
              amount: payment.amount,
              paymentNumber: payment.paymentNumber || '',
              invoiceNumber: payment.invoiceNumber || '',
              status: payment.status,
              paymentProofUrl: payment.paymentProofUrl || '',
              createdAt: payment.createdAt.toISOString(),
            }
          : null,

        // ===== ONBOARDING =====
        onboarding: onboarding
          ? {
              id: onboarding.id,
              status: onboarding.status,
              scheduledDate: onboarding.event?.scheduledDate?.toISOString() || null,
              location: onboarding.event?.location || '',
            }
          : {
              status: p.onboardingStatus || 'NOT_READY',
              scheduledDate: null,
              location: '',
              completedAt: null,
            },

        // ===== ESTADO DEL FORMULARIO =====
        status: p.status,
        currentStep: p.currentStep,
        completedSteps: p.completedSteps || [],
        documentsStatus: p.documentsStatus,

        // ===== DOCUMENTOS (ARRAY) =====
        documents,

        // ===== FECHAS =====
        startedAt: p.startedAt.toISOString(),
        lastActivityAt: p.lastActivityAt?.toISOString() || null,
        completedAt: p.completedAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
      };
    });

    // ============================================================================
    // 7. RETORNAR RESPUESTA CON PAGINACIÓN
    // ============================================================================
    return NextResponse.json({
      success: true,
      
      // Metadata de la respuesta
      timestamp: new Date().toISOString(),
      
      // Filtros aplicados
      filters: {
        status: status || 'all',
        onboardingStatus: onboardingStatus || 'all',
        searchTerm: searchTerm || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      
      // Paginación
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        itemsInPage: data.length,
      },
      
      // Datos
      data,
    });
  } catch (error: any) {
    console.error('Error al exportar postulaciones en JSON:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al exportar datos',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}