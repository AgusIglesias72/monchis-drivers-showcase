// app/api/admin/postulaciones/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const EXPORT_GROUPS = [
  "personal",
  "vehiculo",
  "trabajo",
  "financiero",
  "pagos",
  "capacitaciones",
  "ruc",
  "estado",
] as const;

type ExportGroup = (typeof EXPORT_GROUPS)[number];

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const body = await request.json();
    const scope: "filtered" | "all" = body.scope === "all" ? "all" : "filtered";
    const includeArchived = body.includeArchived === true;
    const requestedGroups: ExportGroup[] = Array.isArray(body.groups)
      ? body.groups.filter((g: string) => (EXPORT_GROUPS as readonly string[]).includes(g))
      : [...EXPORT_GROUPS];
    const groups = new Set<ExportGroup>(
      requestedGroups.length > 0 ? requestedGroups : [...EXPORT_GROUPS],
    );
    const { status, searchTerm } = body;

    const where: any = {};

    if (scope === "filtered") {
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
    }

    if (!includeArchived) {
      where.archivedAt = null;
    }

    const EXPORT_LIMIT = 2000;

    const postulaciones = await prisma.formDriver.findMany({
      where,
      take: EXPORT_LIMIT + 1,
      omit: { rucApiRawResponse: true, metadata: true },
      include: {
        ...(groups.has("vehiculo") && {
          documents: {
            select: {
              id: true,
              documentType: true,
              blobUrl: true,
              status: true,
            },
          },
        }),
        ...(groups.has("pagos") && {
          equipmentPayments: {
            orderBy: { createdAt: "desc" as const },
          },
        }),
        ...(groups.has("financiero") && { financialService: true }),
        ...(groups.has("capacitaciones") && {
          onboardingAttendances: {
            include: { event: true },
            orderBy: { createdAt: "desc" as const },
          },
        }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const truncated = postulaciones.length > EXPORT_LIMIT;
    if (truncated) postulaciones.splice(EXPORT_LIMIT);

    const excelData = postulaciones.map((p: any) => {
      const row: Record<string, unknown> = {
        ID: p.id,
        Nombre: p.firstName || "",
        Apellido: p.lastName || "",
        "Nombre Completo": p.fullName || "",
        Cédula: p.cedula,
        Teléfono: p.phoneNumber,
        Email: p.email || "",
      };

      if (groups.has("personal")) {
        Object.assign(row, {
          "Fecha de Nacimiento": p.birthDate
            ? p.birthDate.toISOString().split("T")[0]
            : "",
          Departamento: p.department || "",
          Ciudad: p.city || "",
          Barrio: p.neighborhood || "",
          Dirección: p.address || "",
          "Contacto Emergencia": p.emergencyName || "",
          "Relación Emergencia": p.emergencyRelationship || "",
          "Teléfono Emergencia": p.emergencyPhone || "",
        });
      }

      if (groups.has("vehiculo")) {
        const documentUrls = (p.documents ?? [])
          .map((d: any) => `${d.documentType}: ${d.blobUrl}`)
          .join(", ");
        Object.assign(row, {
          "Tiene Vehículo": p.hasVehicle ? "Sí" : "No",
          "Marca Vehículo": p.vehicleBrand || "",
          "Modelo Vehículo": p.vehicleModel || "",
          "Año Vehículo": p.vehicleYear || "",
          "Placa Vehículo": p.vehiclePlate || "",
          "URLs Documentos": documentUrls,
        });
      }

      if (groups.has("trabajo")) {
        Object.assign(row, {
          "Zona de Trabajo": p.workZone || "",
          "Cómo se enteró": p.howHeardAboutUs || "",
          "Referido por": p.referredBy || "",
          Experiencia: p.experience || "",
          Disponibilidad: p.availability.join(", "),
          "Cuándo puede empezar": p.whenCanStart || "",
        });
      }

      if (groups.has("financiero")) {
        const financial = p.financialService;
        Object.assign(row, {
          "Tiene cuenta Ueno": p.hasUenoAccount ? "Sí" : "No",
          "Número cuenta Ueno": p.uenoAccountNumber || "",
          "Puede facturar": p.canInvoice ? "Sí" : "No",
          "Interesado en Conto": financial
            ? financial.interestedInConto
              ? "Sí"
              : "No"
            : "N/A",
          "Certificado Tributario": financial?.taxComplianceUrl || "",
        });
      }

      if (groups.has("pagos")) {
        const payment = (p.equipmentPayments ?? [])[0];
        Object.assign(row, {
          "Realizó Pago": payment ? "Sí" : "No",
          "Pago Verificado": payment?.status === "VERIFIED" ? "Sí" : "No",
          "Método de Pago": payment?.paymentMethod || "",
          "Monto Pagado": payment?.amount || 0,
          "Fecha de Pago": payment?.paymentDate
            ? payment.paymentDate.toISOString().split("T")[0]
            : "",
          "Nro Comprobante": payment?.paymentNumber || "",
          "Nro Factura": payment?.invoiceNumber || "",
          "Estado Pago": payment?.status ?? "SIN PAGO",
          "Comprobante URL": payment?.paymentProofUrl || "",
        });
      }

      if (groups.has("capacitaciones")) {
        const attendances = p.onboardingAttendances ?? [];
        const totalCapacitaciones = attendances.length;
        const ultimaCapacitacion = attendances[0];
        const asistenciasConfirmadas = attendances.filter(
          (a: any) => a.status === "ATTENDED" || a.status === "CONFIRMED",
        );
        const noShows = attendances.filter((a: any) => a.status === "NO_SHOW");
        const agendadas = attendances.filter(
          (a: any) => a.status === "SCHEDULED" || a.status === "INVITED",
        );

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

        const onboardingDate = ultimaCapacitacion?.event?.scheduledDate
          ? ultimaCapacitacion.event.scheduledDate.toISOString().split("T")[0]
          : "";

        Object.assign(row, {
          "Tiene Capacitación Asignada": totalCapacitaciones > 0 ? "Sí" : "No",
          "Total Capacitaciones Asignadas": totalCapacitaciones,
          "Fecha Última Capacitación": onboardingDate,
          "Estado Última Capacitación":
            ultimaCapacitacion?.status ?? p.onboardingStatus ?? "NOT_READY",
          "Asistió a Capacitación": asistenciasConfirmadas.length > 0 ? "Sí" : "No",
          "No Asistió (No Show)": noShows.length > 0 ? "Sí" : "No",
          "Cantidad No Shows": noShows.length,
          "Resumen Asistencia": resumenAsistencia,
          "Fecha Check-In": ultimaCapacitacion?.checkedInAt
            ? ultimaCapacitacion.checkedInAt.toISOString().split("T")[0]
            : "",
          "Onboarding Completado": p.onboardingStatus === "COMPLETED" ? "Sí" : "No",
          "Fecha Onboarding Completado": p.onboardingCompletedAt
            ? p.onboardingCompletedAt.toISOString().split("T")[0]
            : "",
          "Ubicación Capacitación": ultimaCapacitacion?.event?.location || "",
          "Título Evento": ultimaCapacitacion?.event?.title || "",
        });
      }

      if (groups.has("ruc")) {
        Object.assign(row, {
          "Estado RUC": p.rucStatus || "NOT_CHECKED",
          "Razón Social RUC": p.rucName || "",
          "RUC Verificado el": p.rucLastCheckedAt
            ? p.rucLastCheckedAt.toISOString().split("T")[0]
            : "",
          "RUC Inactivo Salvado": p.rucInactiveWaived ? "Sí" : "No",
        });
      }

      if (groups.has("estado")) {
        Object.assign(row, {
          Estado: p.status,
          Archivada: p.archivedAt ? "Sí" : "No",
          "Fecha Archivado": p.archivedAt
            ? p.archivedAt.toISOString().split("T")[0]
            : "",
          "Paso Actual": p.currentStep,
          "Pasos Completados": p.completedSteps.join(", "),
          "Estado Documentos": p.documentsStatus,
          "Fecha de Inicio": p.startedAt.toISOString(),
          "Última Actividad": p.lastActivityAt.toISOString(),
          "Fecha Completado": p.completedAt ? p.completedAt.toISOString() : "",
          "Fecha de Creación": p.createdAt.toISOString(),
        });
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Postulaciones");

    if (excelData.length > 0) {
      ws["!cols"] = Object.keys(excelData[0]).map((header) => ({
        wch: /URL|Certificado|Comprobante|Documentos/.test(header)
          ? 50
          : Math.max(12, Math.min(30, header.length + 4)),
      }));
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const responseHeaders: Record<string, string> = {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="postulaciones_${
        new Date().toISOString().split("T")[0]
      }.xlsx"`,
    };
    if (truncated) {
      responseHeaders["X-Truncated"] = `true; limit=${EXPORT_LIMIT}`;
    }

    return new NextResponse(buffer, { headers: responseHeaders });
  } catch (error: any) {
    console.error("Error al exportar postulaciones:", error);
    return NextResponse.json(
      { error: error.message || "Error al exportar datos" },
      { status: 500 }
    );
  }
}
