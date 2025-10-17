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
        equipmentPayments: true,
        financialService: true,
        onboardingAttendances: {
          include: {
            event: true,
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

      // Información de pago
      const payment = p.equipmentPayments[0]; // Asumimos el primer pago
      const paymentInfo = payment
        ? {
            paymentMethod: payment.paymentMethod || "",
            paymentAmount: payment.amount || 0,
            paymentNumber: payment.paymentNumber || "",
            invoiceNumber: payment.invoiceNumber || "",
            paymentStatus: payment.status,
            paymentProofUrl: payment.paymentProofUrl || "",
          }
        : {
            paymentMethod: "",
            paymentAmount: 0,
            paymentNumber: "",
            invoiceNumber: "",
            paymentStatus: "N/A",
            paymentProofUrl: "",
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

      // Información de onboarding
      const onboarding = p.onboardingAttendances[0];
      const onboardingInfo = onboarding
        ? {
            onboardingStatus: onboarding.status,
            onboardingDate: onboarding.event.scheduledDate.toISOString().split("T")[0],
            onboardingLocation: onboarding.event.location || "",
          }
        : {
            onboardingStatus: p.onboardingStatus || "NOT_READY",
            onboardingDate: "",
            onboardingLocation: "",
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

        // Pago de equipamiento
        "Método de Pago": paymentInfo.paymentMethod,
        "Monto Pagado": paymentInfo.paymentAmount,
        "Nro Comprobante": paymentInfo.paymentNumber,
        "Nro Factura": paymentInfo.invoiceNumber,
        "Estado Pago": paymentInfo.paymentStatus,
        "Comprobante URL": paymentInfo.paymentProofUrl,

        // Onboarding
        "Estado Onboarding": onboardingInfo.onboardingStatus,
        "Fecha Onboarding": onboardingInfo.onboardingDate,
        "Ubicación Onboarding": onboardingInfo.onboardingLocation,

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
      { wch: 15 }, // Método de Pago
      { wch: 12 }, // Monto Pagado
      { wch: 15 }, // Nro Comprobante
      { wch: 15 }, // Nro Factura
      { wch: 12 }, // Estado Pago
      { wch: 50 }, // Comprobante URL
      { wch: 15 }, // Estado Onboarding
      { wch: 12 }, // Fecha Onboarding
      { wch: 20 }, // Ubicación Onboarding
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