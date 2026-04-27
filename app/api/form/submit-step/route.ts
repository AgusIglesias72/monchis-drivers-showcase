// app/api/form/submit-step/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhatsAppMessageType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Función para parsear fecha de formato dd/MM/yyyy a Date
function parseBirthDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  try {
    // Si ya es una fecha válida ISO
    if (dateStr.includes('-')) {
      return new Date(dateStr);
    }
    
    // Si es formato dd/MM/yyyy
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Los meses en JS son 0-indexed
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, step, stepData } = body;

    if (!sessionId || !step || !stepData) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Buscar o crear FormSubmission
    let submission = await prisma.formSubmission.findUnique({
      where: { sessionId }
    });

    if (!submission) {
      // Primera vez - crear submission
      submission = await prisma.formSubmission.create({
        data: {
          sessionId,
          currentStep: step,
          formData: stepData,
          userAgent: request.headers.get('user-agent') || undefined,
          ipAddress: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || undefined,
        }
      });
    } else {
      // Actualizar submission existente
      submission = await prisma.formSubmission.update({
        where: { sessionId },
        data: {
          currentStep: step,
          formData: {
            ...(submission.formData as object),
            ...stepData
          },
          lastActivityAt: new Date()
        }
      });
    }

    // Si es el Step 1, crear o actualizar FormDriver
    if (step === 1 && stepData.cedula && stepData.phoneNumber) {
      let formDriver = await prisma.formDriver.findFirst({
        where: {
          OR: [
            { cedula: stepData.cedula },
            { phoneNumber: stepData.phoneNumber }
          ]
        }
      });

      const birthDate = parseBirthDate(stepData.birthDate);

      if (!formDriver) {
        // Crear nuevo FormDriver con accessToken
        formDriver = await prisma.formDriver.create({
          data: {
            cedula: stepData.cedula,
            firstName: stepData.firstName,
            lastName: stepData.lastName,
            fullName: `${stepData.firstName || ''} ${stepData.lastName || ''}`.trim(),
            phoneNumber: stepData.phoneNumber,
            email: stepData.email || null,
            birthDate: birthDate,
            currentStep: 1,
            completedSteps: [1],
            status: 'IN_PROGRESS',
            accessToken: uuidv4(), // ← Generar token automáticamente
            accessTokenGeneratedAt: new Date()
          }
        });
      } else {
        // Actualizar FormDriver existente y generar token si no tiene
        const updateData: any = {
          firstName: stepData.firstName,
          lastName: stepData.lastName,
          fullName: `${stepData.firstName || ''} ${stepData.lastName || ''}`.trim(),
          phoneNumber: stepData.phoneNumber,
          email: stepData.email || null,
          birthDate: birthDate,
          currentStep: Math.max(formDriver.currentStep, 1),
          completedSteps: Array.from(new Set([...formDriver.completedSteps, 1])),
          lastActivityAt: new Date()
        };

        // Generar token si no tiene
        if (!formDriver.accessToken) {
          updateData.accessToken = uuidv4();
          updateData.accessTokenGeneratedAt = new Date();
        }

        formDriver = await prisma.formDriver.update({
          where: { id: formDriver.id },
          data: updateData
        });
      }

      // Vincular submission con formDriver
      await prisma.formSubmission.update({
        where: { sessionId },
        data: { formDriverId: formDriver.id }
      });

      submission = await prisma.formSubmission.findUnique({
        where: { sessionId }
      });

      // TODO: migrar a WhatsApp multi-bot — mensaje de bienvenida PORTAL_ACCESS (solo primera vez con accessToken)
    }

    // Registrar el step completion
    await prisma.formStepCompletion.upsert({
      where: {
        submissionId_step: {
          submissionId: submission!.id,
          step
        }
      },
      create: {
        submissionId: submission!.id,
        step,
        stepName: getStepName(step),
        stepData,
        completedAt: new Date()
      },
      update: {
        stepData,
        completedAt: new Date(),
        wasEdited: true,
        editCount: { increment: 1 }
      }
    });

    // ✨ RESET CONTADOR: Si el conductor avanza en el formulario,
    // resetear contador de recordatorios eliminando mensajes FORM_INCOMPLETE previos
    if (submission!.formDriverId && step > 1) {
      // Eliminar solo mensajes FORM_INCOMPLETE para resetear el contador
      // Los otros mensajes (APPLICATION_RECEIVED, etc.) se mantienen
      await prisma.whatsAppMessage.deleteMany({
        where: {
          formDriverId: submission!.formDriverId,
          messageType: WhatsAppMessageType.FORM_INCOMPLETE
        }
      });

      console.log(`🔄 [FORM] Reset reminder counter for driver ${submission!.formDriverId} (step ${step} completed)`);
    }

    return NextResponse.json({
      success: true,
      submissionId: submission!.id,
      formDriverId: submission!.formDriverId,
      currentStep: submission!.currentStep
    });

  } catch (error: any) {
    console.error('Error en submit-step:', error);
    return NextResponse.json(
      { error: error.message || 'Error al guardar el paso' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, step, stepData } = body;

    // Buscar submission
    const submission = await prisma.formSubmission.findUnique({
      where: { sessionId }
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar datos del step
    const updatedSubmission = await prisma.formSubmission.update({
      where: { sessionId },
      data: {
        currentStep: step,
        formData: {
          ...(submission.formData as object),
          ...stepData
        },
        lastActivityAt: new Date()
      }
    });

    // Actualizar FormDriver si existe y es un step relevante
    if (submission.formDriverId) {
      const updateData: any = {
        lastActivityAt: new Date(),
        currentStep: Math.max(step, (await prisma.formDriver.findUnique({ 
          where: { id: submission.formDriverId } 
        }))?.currentStep || 0)
      };

      // Step 2: Ubicación + Contacto de emergencia
      if (step === 2) {
        updateData.department = stepData.department;
        updateData.city = stepData.city;
        updateData.neighborhood = stepData.neighborhood;
        updateData.address = stepData.address;
        updateData.addressLat = stepData.addressLat ? parseFloat(stepData.addressLat) : null;
        updateData.addressLng = stepData.addressLng ? parseFloat(stepData.addressLng) : null;
        updateData.emergencyName = stepData.emergencyName;
        updateData.emergencyRelationship = stepData.emergencyRelationship;
        updateData.emergencyPhone = stepData.emergencyPhone;
      }

      // Step 3: Zona de trabajo + Vehículo
      if (step === 3) {
        updateData.workZone = stepData.workZone;
        updateData.howHeardAboutUs = stepData.howHeardAboutUs;
        updateData.referredBy = stepData.referredBy;
        updateData.hasVehicle = stepData.hasVehicle === 'si';
        if (stepData.hasVehicle === 'si') {
          updateData.vehicleBrand = stepData.vehicleBrand;
          updateData.vehicleModel = stepData.vehicleModel;
          updateData.vehicleYear = stepData.vehicleYear ? parseInt(stepData.vehicleYear) : null;
          updateData.vehiclePlate = stepData.vehiclePlate;
        }
      }

      // Step 4: Documentos - no hay campos que guardar directamente en FormDriver
      // Los URLs ya se guardan via upload-document

      // Step 5: Info adicional
      if (step === 5) {
        updateData.experience = stepData.experience;
        updateData.availability = stepData.availability || [];
        updateData.whenCanStart = stepData.whenCanStart;
        updateData.hasUenoAccount = stepData.hasUenoAccount === 'si';
        updateData.uenoAccountNumber = stepData.uenoAccountNumber || null;
        updateData.canInvoice = stepData.canInvoice === 'si';
      }

      // Agregar step a completedSteps
      const formDriver = await prisma.formDriver.findUnique({
        where: { id: submission.formDriverId }
      });
      
      updateData.completedSteps = Array.from(
        new Set([...(formDriver?.completedSteps || []), step])
      );

      await prisma.formDriver.update({
        where: { id: submission.formDriverId },
        data: updateData
      });
    }

    // Actualizar step completion
    await prisma.formStepCompletion.upsert({
      where: {
        submissionId_step: {
          submissionId: submission.id,
          step
        }
      },
      create: {
        submissionId: submission.id,
        step,
        stepName: getStepName(step),
        stepData,
        completedAt: new Date()
      },
      update: {
        stepData,
        completedAt: new Date(),
        wasEdited: true,
        editCount: { increment: 1 }
      }
    });

    // ✨ RESET CONTADOR: Si el conductor avanza en el formulario,
    // resetear contador de recordatorios eliminando mensajes FORM_INCOMPLETE previos
    if (submission.formDriverId && step > 1) {
      await prisma.whatsAppMessage.deleteMany({
        where: {
          formDriverId: submission.formDriverId,
          messageType: WhatsAppMessageType.FORM_INCOMPLETE
        }
      });

      console.log(`🔄 [FORM] Reset reminder counter for driver ${submission.formDriverId} (step ${step} updated)`);
    }

    return NextResponse.json({
      success: true,
      submissionId: updatedSubmission.id
    });

  } catch (error: any) {
    console.error('Error en PATCH submit-step:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar el paso' },
      { status: 500 }
    );
  }
}

function getStepName(step: number): string {
  const stepNames: Record<number, string> = {
    1: 'contact_info',
    2: 'personal_data',
    3: 'work_vehicle',
    4: 'documents',
    5: 'additional_info'
  };
  return stepNames[step] || 'unknown';
}