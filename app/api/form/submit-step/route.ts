// app/api/form/submit-step/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

      if (!formDriver) {
        // Crear nuevo FormDriver
        formDriver = await prisma.formDriver.create({
          data: {
            cedula: stepData.cedula,
            firstName: stepData.firstName,
            lastName: stepData.lastName,
            fullName: `${stepData.firstName || ''} ${stepData.lastName || ''}`.trim(),
            phoneNumber: stepData.phoneNumber,
            email: stepData.email,
            currentStep: 1,
            completedSteps: [1],
            status: 'IN_PROGRESS'
          }
        });
      } else {
        // Actualizar FormDriver existente
        formDriver = await prisma.formDriver.update({
          where: { id: formDriver.id },
          data: {
            firstName: stepData.firstName,
            lastName: stepData.lastName,
            fullName: `${stepData.firstName || ''} ${stepData.lastName || ''}`.trim(),
            phoneNumber: stepData.phoneNumber,
            email: stepData.email,
            currentStep: Math.max(formDriver.currentStep, 1),
            completedSteps: Array.from(new Set([...formDriver.completedSteps, 1])),
            lastActivityAt: new Date()
          }
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

      // Step 2: Ubicación
      if (step === 2) {
        updateData.department = stepData.department;
        updateData.city = stepData.city;
        updateData.neighborhood = stepData.neighborhood;
        updateData.address = stepData.address;
      }

      // Step 3: Vehículo
      if (step === 3) {
        updateData.hasVehicle = stepData.hasVehicle === 'si';
        if (stepData.hasVehicle === 'si') {
          updateData.vehicleBrand = stepData.vehicleBrand;
          updateData.vehicleModel = stepData.vehicleModel;
          updateData.vehicleYear = stepData.vehicleYear ? parseInt(stepData.vehicleYear) : null;
          updateData.vehiclePlate = stepData.vehiclePlate;
        }
      }

      // Step 5: Contacto de emergencia
      if (step === 5) {
        updateData.emergencyName = stepData.emergencyName;
        updateData.emergencyRelationship = stepData.emergencyRelationship;
        updateData.emergencyPhone = stepData.emergencyPhone;
      }

      // Step 6: Zona de trabajo
      if (step === 6) {
        updateData.workZone = stepData.workZone;
        updateData.howHeardAboutUs = stepData.howHeardAboutUs;
        updateData.referredBy = stepData.referredBy;
      }

      // Step 7: Info adicional
      if (step === 7) {
        updateData.experience = stepData.experience;
        updateData.availability = stepData.availability || [];
        updateData.whenCanStart = stepData.whenCanStart;
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
    2: 'location',
    3: 'vehicle',
    4: 'documents',
    5: 'emergency_contact',
    6: 'work_zone',
    7: 'additional_info'
  };
  return stepNames[step] || 'unknown';
}