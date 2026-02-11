// app/api/admin/postulaciones/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const { status, searchTerm } = await request.json();

    // Construir filtros
    const where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (searchTerm) {
      where.OR = [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { cedula: { contains: searchTerm } },
        { phoneNumber: { contains: searchTerm } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Obtener todas las postulaciones con sus relaciones
    const postulaciones = await prisma.formDriver.findMany({
      where,
      include: {
        documents: true,
        equipmentPayments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        financialService: true,
        onboardingAttendances: {
          include: {
            event: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Preparar datos para Excel
    const excelData = postulaciones.map((p) => {
      // URLs de documentos separadas por comas
      const documentUrls = p.documents
        .map((d) => `${d.documentType}: ${d.blobUrl}`)
        .join(", ");

      // Información de pago (el más reciente)
      const payment = p.equipmentPayments[0];
      const paymentInfo = payment
        ? {
            paymentMethod: payment.paymentMethod || "",
            paymentAmount: payment.amount || 0,
            paymentNumber: payment.paymentNumber || "",
            invoiceNumber: payment.invoiceNumber || "",
            paymentStatus: payment.status,
            paymentProofUrl: payment.paymentProofUrl || "",
            paymentDate: payment.paymentDate
              ? payment.paymentDate.toISOString().split("T")[0]
              : "",
            hasPayment: "Sí",
            paymentVerified: payment.status === "VERIFIED" ? "Sí" : "No",
          }
        : {
            paymentMethod: "",
            paymentAmount: 0,
            paymentNumber: "",
            invoiceNumber: "",
            paymentStatus: "SIN PAGO",
            paymentProofUrl: "",
            paymentDate: "",
            hasPayment: "No",
            paymentVerified: "No",
          };

      // Información financiera
      const financial = p.financialService;
      const financialInfo = financial
        ? {
            canInvoice: p.canInvoice ? "Sí" : "No",
            interestedInConto: financial.interestedInConto ? "Sí" : "No",
            taxComplianceUrl: financial.taxComplianceUrl || "",
          }
        : {
            canInvoice: p.canInvoice ? "Sí" : "No",
            interestedInConto: "N/A",
            taxComplianceUrl: "",
          };

      // ===== INFORMACIÓN DETALLADA DE CAPACITACIONES =====
      const attendances = p.onboardingAttendances || [];
      const totalCapacitaciones = attendances.length;

      // Última capacitación asignada (la más reciente)
      const ultimaCapacitacion = attendances[0];

      // Verificar asistencias
      const asistenciasConfirmadas = attendances.filter(
        (a) => a.status === "ATTENDED" || a.status === "CONFIRMED"
      );
      const noShows = attendances.filter((a) => a.status === "NO_SHOW");
      const agendadas = attendances.filter(
        (a) => a.status === "SCHEDULED" || a.status === "INVITED"
      );

      // Determinar estado de asistencia resumido
      let resumenAsistencia = "Sin capacitación asignada";
      if (totalCapacitaciones > 0) {
        if (asistenciasConfirmadas.length > 0) {
          resumenAsistencia = "Asistió";
        } else if (noShows.length > 0 && agendadas.length === 0) {
          resumenAsistencia = "No Asistió";
        } else if (agendadas.length > 0) {
          resumenAsistencia = "Agendado - Pendiente";
        } else {
          resumenAsistencia = ultimaCapacitacion?.status || "Pendiente";
        }
      }

      // Información de onboarding detallada
      const onboardingInfo = ultimaCapacitacion
        ? {
            onboardingStatus: ultimaCapacitacion.status,
            onboardingDate: ultimaCapacitacion.event?.scheduledDate
              ? ultimaCapacitacion.event.scheduledDate.toISOString().split("T")[0]
              : "",
            onboardingLocation: ultimaCapacitacion.event?.location || "",
            onboardingEventTitle: ultimaCapacitacion.event?.title || "",
          }
        : {
            onboardingStatus: p.onboardingStatus || "NOT_READY",
            onboardingDate: "",
            onboardingLocation: "",
            onboardingEventTitle: "",
          };

      // Campos adicionales de capacitación
      const capacitacionInfo = {
        tieneCapacitacionAsignada: totalCapacitaciones > 0 ? "Sí" : "No",
        totalCapacitacionesAsignadas: totalCapacitaciones,
        fechaUltimaCapacitacion: onboardingInfo.onboardingDate,
        estadoUltimaCapacitacion: onboardingInfo.onboardingStatus,
        asistioCapacitacion: asistenciasConfirmadas.length > 0 ? "Sí" : "No",
        noAsistioCapacitacion: noShows.length > 0 ? "Sí" : "No",
        cantidadNoShows: noShows.length,
        resumenAsistencia: resumenAsistencia,
        fechaCheckIn: ultimaCapacitacion?.checkedInAt
          ? ultimaCapacitacion.checkedInAt.toISOString().split("T")[0]
          : "",
        onboardingCompletado: p.onboardingStatus === "COMPLETED" ? "Sí" : "No",
        fechaOnboardingCompletado: p.onboardingCompletedAt
          ? p.onboardingCompletedAt.toISOString().split("T")[0]
          : "",
      };

      return {
        // Datos personales
        ID: p.id,
        Nombre: p.firstName || "",
        Apellido: p.lastName || "",
        "Nombre Completo": p.fullName || "",
        Cédula: p.cedula,
        Teléfono: p.phoneNumber,
        Email: p.email || "",
        "Fecha de Nacimiento": p.birthDate
          ? p.birthDate.toISOString().split("T")[0]
          : "",

        // Ubicación
        Departamento: p.department || "",
        Ciudad: p.city || "",
        Barrio: p.neighborhood || "",
        Dirección: p.address || "",

        // Vehículo
        "Tiene Vehículo": p.hasVehicle ? "Sí" : "No",
        "Marca Vehículo": p.vehicleBrand || "",
        "Modelo Vehículo": p.vehicleModel || "",
        "Año Vehículo": p.vehicleYear || "",
        "Placa Vehículo": p.vehiclePlate || "",

        // Contacto de emergencia
        "Contacto Emergencia": p.emergencyName || "",
        "Relación Emergencia": p.emergencyRelationship || "",
        "Teléfono Emergencia": p.emergencyPhone || "",

        // Trabajo
        "Zona de Trabajo": p.workZone || "",
        "Cómo se enteró": p.howHeardAboutUs || "",
        "Referido por": p.referredBy || "",
        Experiencia: p.experience || "",
        Disponibilidad: p.availability.join(", "),
        "Cuándo puede empezar": p.whenCanStart || "",

        // Servicios financieros
        "Tiene cuenta Ueno": p.hasUenoAccount ? "Sí" : "No",
        "Número cuenta Ueno": p.uenoAccountNumber || "",
        "Puede facturar": financialInfo.canInvoice,
        "Interesado en Conto": financialInfo.interestedInConto,
        "Certificado Tributario": financialInfo.taxComplianceUrl,

        // ===== PAGO DE EQUIPAMIENTO (MEJORADO) =====
        "Realizó Pago": paymentInfo.hasPayment,
        "Pago Verificado": paymentInfo.paymentVerified,
        "Método de Pago": paymentInfo.paymentMethod,
        "Monto Pagado": paymentInfo.paymentAmount,
        "Fecha de Pago": paymentInfo.paymentDate,
        "Nro Comprobante": paymentInfo.paymentNumber,
        "Nro Factura": paymentInfo.invoiceNumber,
        "Estado Pago": paymentInfo.paymentStatus,
        "Comprobante URL": paymentInfo.paymentProofUrl,

        // ===== CAPACITACIONES (NUEVO - DETALLADO) =====
        "Tiene Capacitación Asignada": capacitacionInfo.tieneCapacitacionAsignada,
        "Total Capacitaciones Asignadas": capacitacionInfo.totalCapacitacionesAsignadas,
        "Fecha Última Capacitación": capacitacionInfo.fechaUltimaCapacitacion,
        "Estado Última Capacitación": capacitacionInfo.estadoUltimaCapacitacion,
        "Asistió a Capacitación": capacitacionInfo.asistioCapacitacion,
        "No Asistió (No Show)": capacitacionInfo.noAsistioCapacitacion,
        "Cantidad No Shows": capacitacionInfo.cantidadNoShows,
        "Resumen Asistencia": capacitacionInfo.resumenAsistencia,
        "Fecha Check-In": capacitacionInfo.fechaCheckIn,
        "Onboarding Completado": capacitacionInfo.onboardingCompletado,
        "Fecha Onboarding Completado": capacitacionInfo.fechaOnboardingCompletado,
        "Ubicación Capacitación": onboardingInfo.onboardingLocation,
        "Título Evento": onboardingInfo.onboardingEventTitle,

        // Estado del formulario
        Estado: p.status,
        "Paso Actual": p.currentStep,
        "Pasos Completados": p.completedSteps.join(", "),
        "Estado Documentos": p.documentsStatus,

        // Documentos
        "URLs Documentos": documentUrls,

        // Timestamps
        "Fecha de Inicio": p.startedAt.toISOString(),
        "Última Actividad": p.lastActivityAt.toISOString(),
        "Fecha Completado": p.completedAt
          ? p.completedAt.toISOString()
          : "",
        "Fecha de Creación": p.createdAt.toISOString(),
      };
    });

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Postulaciones");

    // Ajustar anchos de columna
    const columnWidths = [
      { wch: 25 }, // ID
      { wch: 15 }, // Nombre
      { wch: 15 }, // Apellido
      { wch: 25 }, // Nombre Completo
      { wch: 12 }, // Cédula
      { wch: 15 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 12 }, // Fecha de Nacimiento
      { wch: 15 }, // Departamento
      { wch: 15 }, // Ciudad
      { wch: 15 }, // Barrio
      { wch: 30 }, // Dirección
      { wch: 12 }, // Tiene Vehículo
      { wch: 15 }, // Marca Vehículo
      { wch: 15 }, // Modelo Vehículo
      { wch: 10 }, // Año Vehículo
      { wch: 12 }, // Placa Vehículo
      { wch: 20 }, // Contacto Emergencia
      { wch: 15 }, // Relación Emergencia
      { wch: 15 }, // Teléfono Emergencia
      { wch: 20 }, // Zona de Trabajo
      { wch: 20 }, // Cómo se enteró
      { wch: 20 }, // Referido por
      { wch: 15 }, // Experiencia
      { wch: 20 }, // Disponibilidad
      { wch: 15 }, // Cuándo puede empezar
      { wch: 15 }, // Tiene cuenta Ueno
      { wch: 15 }, // Número cuenta Ueno
      { wch: 12 }, // Puede facturar
      { wch: 15 }, // Interesado en Conto
      { wch: 50 }, // Certificado Tributario
      // PAGO DE EQUIPAMIENTO
      { wch: 12 }, // Realizó Pago
      { wch: 15 }, // Pago Verificado
      { wch: 15 }, // Método de Pago
      { wch: 12 }, // Monto Pagado
      { wch: 12 }, // Fecha de Pago
      { wch: 15 }, // Nro Comprobante
      { wch: 15 }, // Nro Factura
      { wch: 15 }, // Estado Pago
      { wch: 50 }, // Comprobante URL
      // CAPACITACIONES
      { wch: 20 }, // Tiene Capacitación Asignada
      { wch: 15 }, // Total Capacitaciones Asignadas
      { wch: 18 }, // Fecha Última Capacitación
      { wch: 20 }, // Estado Última Capacitación
      { wch: 18 }, // Asistió a Capacitación
      { wch: 18 }, // No Asistió (No Show)
      { wch: 15 }, // Cantidad No Shows
      { wch: 25 }, // Resumen Asistencia
      { wch: 15 }, // Fecha Check-In
      { wch: 18 }, // Onboarding Completado
      { wch: 22 }, // Fecha Onboarding Completado
      { wch: 20 }, // Ubicación Capacitación
      { wch: 25 }, // Título Evento
      // ESTADO FORMULARIO
      { wch: 15 }, // Estado
      { wch: 10 }, // Paso Actual
      { wch: 15 }, // Pasos Completados
      { wch: 15 }, // Estado Documentos
      { wch: 100 }, // URLs Documentos
      { wch: 20 }, // Fecha de Inicio
      { wch: 20 }, // Última Actividad
      { wch: 20 }, // Fecha Completado
      { wch: 20 }, // Fecha de Creación
    ];
    ws["!cols"] = columnWidths;

    // Generar buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Retornar archivo
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="postulaciones_${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Error al exportar postulaciones:", error);
    return NextResponse.json(
      { error: error.message || "Error al exportar datos" },
      { status: 500 }
    );
  }
}