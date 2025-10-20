// lib/services/form-documents.service.ts
import { prisma } from '@/lib/prisma';
import { DocumentType } from '@prisma/client';

export async function recalculateDocumentsStatus(formDriverId: string) {
  const documents = await prisma.formDocument.findMany({
    where: { formDriverId }
  });

  if (documents.length === 0) {
    await prisma.formDriver.update({
      where: { id: formDriverId },
      data: { documentsStatus: 'INCOMPLETE' }
    });
    return 'INCOMPLETE';
  }

  const hasRejected = documents.some(d => d.status === 'REJECTED');
  const allApproved = documents.every(d => d.status === 'APPROVED');
  const hasInReview = documents.some(d => d.status === 'IN_REVIEW');
  const hasPending = documents.some(d => d.status === 'PENDING');

  let newStatus: 'INCOMPLETE' | 'PENDING' | 'IN_REVIEW' | 'CORRECTIONS' | 'APPROVED';

  if (allApproved) newStatus = 'APPROVED';
  else if (hasRejected) newStatus = 'CORRECTIONS';
  else if (hasInReview) newStatus = 'IN_REVIEW';
  else if (hasPending) newStatus = 'PENDING';
  else newStatus = 'INCOMPLETE';

  await prisma.formDriver.update({
    where: { id: formDriverId },
    data: { documentsStatus: newStatus }
  });

  return newStatus;
}

export const formDocumentsService = {
  recalculateDocumentsStatus,

  /**
   * Valida si un postulante puede pasar a onboarding
   */
  async canProceedToOnboarding(formDriverId: string): Promise<{
    canProceed: boolean;
    reasons: string[];
  }> {
    const formDriver = await prisma.formDriver.findUnique({
      where: { id: formDriverId },
      include: {
        documents: true
      }
    });

    if (!formDriver) {
      return { canProceed: false, reasons: ['Postulante no encontrado'] };
    }

    const reasons: string[] = [];

    // Verificar documentos obligatorios
    const requiredDocs = ['CEDULA_FRONT', 'CRIMINAL_RECORD'];
    const uploadedTypes = formDriver.documents.map(d => d.documentType);
    const missingDocs = requiredDocs.filter((type: string) => !uploadedTypes.includes(type as DocumentType));

    if (missingDocs.length > 0) {
      reasons.push(`Faltan documentos: ${missingDocs.join(', ')}`);
    }

    // Verificar que todos estén aprobados
    const notApproved = formDriver.documents.filter(d => d.status !== 'APPROVED');
    if (notApproved.length > 0) {
      reasons.push(`${notApproved.length} documento(s) sin aprobar`);
    }

    // Verificar datos obligatorios
    if (!formDriver.fullName) reasons.push('Falta nombre completo');
    if (!formDriver.cedula) reasons.push('Falta cédula');
    if (!formDriver.phoneNumber) reasons.push('Falta teléfono');

    return {
      canProceed: reasons.length === 0,
      reasons
    };
  }
};