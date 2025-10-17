// app/api/form/upload-document/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { DocumentType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId") as string;
    const documentType = formData.get("documentType") as string;

    if (!file || !sessionId || !documentType) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Solo se permiten imágenes (JPG, PNG, WebP) o PDF" },
        { status: 400 }
      );
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo no debe superar 5MB" },
        { status: 400 }
      );
    }

    // Obtener submission para verificar que existe el FormDriver
    const submission = await prisma.formSubmission.findUnique({
      where: { sessionId },
    });

    if (!submission || !submission.formDriverId) {
      return NextResponse.json(
        { error: "Sesión no válida o FormDriver no creado aún" },
        { status: 400 }
      );
    }

    // Subir a Vercel Blob
    const blob = await put(
      `form-documents/${sessionId}/${documentType}-${Date.now()}.${file.name
        .split(".")
        .pop()}`,
      file,
      {
        access: "public",
        addRandomSuffix: false,
      }
    );

    // Mapear documentType del frontend a DocumentType enum de Prisma
    const docTypeMap: Record<string, DocumentType> = {
      cedula: "CEDULA_FRONT",
      license: "CRIMINAL_RECORD",
      vehicle: "VEHICLE_PHOTO_FRONT",
      taxCompliance: "TAX_COMPLIANCE",
      paymentProof: "PAYMENT_PROOF", // ✅ NUEVO
    };

    const enumDocType = docTypeMap[documentType] || "OTHER";

    const formDocument = await prisma.formDocument.create({
      data: {
        formDriverId: submission.formDriverId,
        documentType: enumDocType,
        blobUrl: blob.url,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        status: "PENDING",
        metadata: {
          sessionId,
          uploadedFrom: "web_form",
          originalDocType: documentType,
          ...(documentType === "taxCompliance" && {
            isTaxCompliance: true,
            documentLabel: "Certificado de Cumplimiento Tributario",
          }),
        },
      },
    });

    // Recalcular documentsStatus automáticamente
    await recalculateDocumentsStatus(submission.formDriverId);

    return NextResponse.json({
      success: true,
      url: blob.url,
      documentId: formDocument.id,
      documentType: enumDocType,
    });
  } catch (error: any) {
    console.error("Error en upload-document:", error);
    return NextResponse.json(
      { error: error.message || "Error al subir el documento" },
      { status: 500 }
    );
  }
}

// Helper para recalcular el estado de documentos
async function recalculateDocumentsStatus(formDriverId: string) {
  // ✅ CORREGIDO: Ya no usamos isDeleted, solo traemos todos los documentos del FormDriver
  const documents = await prisma.formDocument.findMany({
    where: {
      formDriverId,
      // isDeleted eliminado - no existe en el schema
    },
  });

  if (documents.length === 0) {
    await prisma.formDriver.update({
      where: { id: formDriverId },
      data: { documentsStatus: "INCOMPLETE" },
    });
    return;
  }

  const hasRejected = documents.some((d) => d.status === "REJECTED");
  const allApproved = documents.every((d) => d.status === "APPROVED");
  const hasInReview = documents.some((d) => d.status === "IN_REVIEW");
  const hasPending = documents.some((d) => d.status === "PENDING");

  let newStatus:
    | "INCOMPLETE"
    | "PENDING"
    | "IN_REVIEW"
    | "CORRECTIONS"
    | "APPROVED";

  if (allApproved) {
    newStatus = "APPROVED";
  } else if (hasRejected) {
    newStatus = "CORRECTIONS";
  } else if (hasInReview) {
    newStatus = "IN_REVIEW";
  } else if (hasPending) {
    newStatus = "PENDING";
  } else {
    newStatus = "INCOMPLETE";
  }

  await prisma.formDriver.update({
    where: { id: formDriverId },
    data: { documentsStatus: newStatus },
  });
}