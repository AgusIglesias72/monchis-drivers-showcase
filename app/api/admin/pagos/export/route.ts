// app/api/admin/pagos/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const { status, searchTerm } = await request.json();

    // Construir filtros
    const where: Parameters<typeof prisma.equipmentPayment.findMany>[0]["where"] = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (searchTerm) {
      where.OR = [
        { formDriver: { fullName: { contains: searchTerm, mode: "insensitive" } } },
        { formDriver: { cedula: { contains: searchTerm } } },
        { invoiceNumber: { contains: searchTerm, mode: "insensitive" } },
        { paymentNumber: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    // Obtener pagos con información del conductor
    const pagos = await prisma.equipmentPayment.findMany({
      where,
      take: 2000,
      include: {
        formDriver: {
          select: {
            id: true,
            fullName: true,
            firstName: true,
            lastName: true,
            cedula: true,
            phoneNumber: true,
            email: true,
            status: true,
            city: true,
            department: true,
            workZone: true,
          },
        },
        verifiedByUser: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Preparar datos para Excel
    const excelData = pagos.map((p) => {
      // Método de pago
      const getPaymentMethodLabel = (method: string | null) => {
        switch (method) {
          case "TRANSFERENCIA":
            return "Transferencia";
          case "POS":
            return "POS";
          case "OTROS":
            return "Otros";
          default:
            return method || "N/A";
        }
      };

      // Estado
      const getStatusLabel = (status: string) => {
        switch (status) {
          case "VERIFIED":
            return "Verificado";
          case "PENDING":
            return "Pendiente";
          case "REJECTED":
            return "Rechazado";
          case "PARTIAL":
            return "Parcial";
          default:
            return status;
        }
      };

      return {
        // Información del pago
        "ID Pago": p.id,
        "Método de Pago": getPaymentMethodLabel(p.paymentMethod),
        "Número de Comprobante": p.paymentNumber || "",
        "Número de Factura": p.invoiceNumber || "",
        "Monto (Gs.)": p.amount || 0,
        "Fecha de Pago": p.paymentDate
          ? p.paymentDate.toISOString().split("T")[0]
          : "",

        // Estado
        Estado: getStatusLabel(p.status),
        "Fecha de Verificación": p.verifiedAt
          ? p.verifiedAt.toISOString().split("T")[0]
          : "",
        "Verificado por": p.verifiedByUser?.fullName || "",

        // Comprobante
        "URL Comprobante": p.paymentProofUrl || "",

        // Información del conductor
        "Nombre Conductor": p.formDriver?.fullName ||
          `${p.formDriver?.firstName || ""} ${p.formDriver?.lastName || ""}`.trim() ||
          "",
        "Cédula": p.formDriver?.cedula || "",
        Teléfono: p.formDriver?.phoneNumber || "",
        Email: p.formDriver?.email || "",
        Departamento: p.formDriver?.department || "",
        Ciudad: p.formDriver?.city || "",
        "Zona de Trabajo": p.formDriver?.workZone || "",
        "Estado Postulación": p.formDriver?.status || "",

        // Notas y razones
        "Notas Administrativas": p.adminNotes || "",
        "Razón de Rechazo": p.rejectionReason || "",

        // Metadata
        "ID Conductor": p.formDriverId,

        // Timestamps
        "Fecha de Creación": p.createdAt.toISOString(),
        "Última Actualización": p.updatedAt.toISOString(),
      };
    });

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");

    // Ajustar anchos de columna
    const columnWidths = [
      { wch: 25 }, // ID Pago
      { wch: 15 }, // Método de Pago
      { wch: 18 }, // Número de Comprobante
      { wch: 18 }, // Número de Factura
      { wch: 15 }, // Monto
      { wch: 12 }, // Fecha de Pago
      { wch: 12 }, // Estado
      { wch: 15 }, // Fecha de Verificación
      { wch: 20 }, // Verificado por
      { wch: 60 }, // URL Comprobante
      { wch: 25 }, // Nombre Conductor
      { wch: 12 }, // Cédula
      { wch: 15 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 15 }, // Departamento
      { wch: 15 }, // Ciudad
      { wch: 20 }, // Zona de Trabajo
      { wch: 15 }, // Estado Postulación
      { wch: 40 }, // Notas Administrativas
      { wch: 40 }, // Razón de Rechazo
      { wch: 25 }, // ID Conductor
      { wch: 20 }, // Fecha de Creación
      { wch: 20 }, // Última Actualización
    ];
    ws["!cols"] = columnWidths;

    // Generar buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Retornar archivo
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="pagos_${
          new Date().toISOString().split("T")[0]
        }.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Error al exportar pagos:", error);
    return NextResponse.json(
      { error: error.message || "Error al exportar datos" },
      { status: 500 }
    );
  }
}
