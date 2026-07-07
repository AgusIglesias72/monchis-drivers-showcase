// app/api/form/submit-step/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhatsAppMessageType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Schemas Zod por paso. .strict() rechaza campos extra para cerrar
// mass-assignment hacia FormDriver (un cliente no debe poder pasar role,
// status, isActive, accessToken, etc).
const Step1Schema = z.object({
  cedula: z.string().min(1).max(20),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phoneNumber: z.string().min(1).max(30),
  email: z.string().email().max(150).optional().nullable(),
  birthDate: z.string().max(30).optional().nullable(),
}).strict();

const Step2Schema = z.object({
  department: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  neighborhood: z.string().max(100).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  addressLat: z.union([z.string(), z.number()]).optional().nullable(),
  addressLng: z.union([z.string(), z.number()]).optional().nullable(),
  emergencyName: z.string().max(150).optional().nullable(),
  emergencyRelationship: z.string().max(80).optional().nullable(),
  emergencyPhone: z.string().max(30).optional().nullable(),
}).strict();

const Step3Schema = z.object({
  workZone: z.string().max(150).optional().nullable(),
  howHeardAboutUs: z.string().max(200).optional().nullable(),
  referredBy: z.string().max(150).optional().nullable(),
  hasVehicle: z.enum(['si', 'no']).optional(),
  vehicleBrand: z.string().max(80).optional().nullable(),
  vehicleModel: z.string().max(80).optional().nullable(),
  vehicleYear: z.union([z.string(), z.number()]).optional().nullable(),
  vehiclePlate: z.string().max(20).optional().nullable(),
}).strict();

// Step 4 no actualiza FormDriver — los uploads van por otro endpoint —
// pero validamos el shape igual.
const Step4Schema = z.object({
  vehicleDocsConfirmed: z.boolean().optional(),
}).strict().passthrough();

const Step5Schema = z.object({
  experience: z.string().max(2000).optional().nullable(),
  availability: z.array(z.string().max(50)).max(20).optional(),
  whenCanStart: z.string().max(100).optional().nullable(),
  hasUenoAccount: z.enum(['si', 'no']).optional(),
  uenoAccountNumber: z.string().max(50).optional().nullable(),
  canInvoice: z.enum(['si', 'no']).optional(),
  // taxCompliancePhotoUrl / interestedInConto se guardan solo en formData JSON
  // y los lee /api/form/complete para crear FinancialService al cerrar.
  taxCompliancePhotoUrl: z.string().max(2000).optional().nullable(),
  interestedInConto: z.enum(['si', 'no']).optional(),
}).strict();

// Step 6: método de pago del equipo. Se persiste en formData JSON; complete()
// crea el EquipmentPayment al finalizar el formulario.
const Step6Schema = z.object({
  paymentMethod: z.enum(['TRANSFERENCIA', 'POS', 'OTROS']).optional(),
  paymentProofUrl: z.string().max(2000).optional().nullable(),
}).strict();

const STEP_SCHEMAS: Record<number, z.ZodType> = {
  1: Step1Schema,
  2: Step2Schema,
  3: Step3Schema,
  4: Step4Schema,
  5: Step5Schema,
  6: Step6Schema,
};

function validateStepData(step: number, stepData: unknown):
  | { ok: true; data: any }
  | { ok: false; error: string } {
  const schema = STEP_SCHEMAS[step];
  if (!schema) return { ok: false, error: `step ${step} no soportado` };
  const result = schema.safeParse(stepData);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }
  return { ok: true, data: result.data };
}

// parseInt seguro: devuelve null si NaN o fuera de rango.
function safeInt(v: unknown, opts: { min: number; max: number }): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < opts.min || n > opts.max) return null;
  return Math.floor(n);
}

function safeFloat(v: unknown, opts: { min: number; max: number }): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n) || n < opts.min || n > opts.max) return null;
  return n;
}

// Función para parsear fecha de formato dd/MM/yyyy a Date, validando NaN y rangos.
function parseBirthDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  try {
    if (dateStr.includes('-')) {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return d;
    }

    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (
      !Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year) ||
      day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100
    ) {
      return null;
    }
    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, step, stepData: rawStepData } = body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
      return NextResponse.json({ error: 'sessionId inválido' }, { status: 400 });
    }
    if (typeof step !== 'number' || !Number.isInteger(step) || step < 1 || step > 6) {
      return NextResponse.json({ error: 'step inválido' }, { status: 400 });
    }
    if (!rawStepData || typeof rawStepData !== 'object') {
      return NextResponse.json({ error: 'stepData inválido' }, { status: 400 });
    }

    // Zod (.strict) descarta campos extra: bloquea mass-assignment hacia
    // FormDriver desde el cliente (role, status, isActive, accessToken, etc).
    const validation = validateStepData(step, rawStepData);
    if (!validation.ok) {
      return NextResponse.json({ error: `stepData: ${validation.error}` }, { status: 400 });
    }
    const stepData = validation.data;

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
            accessToken: randomUUID(), // ← Generar token automáticamente
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
          updateData.accessToken = randomUUID();
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

      // Decisión de producto: NO mandamos bienvenida por WhatsApp. El cliente
      // acaba de completar la postulación y ya vio la confirmación inline en el
      // form. El único toque outbound del bot es "capacitaciones" cuando se
      // aprueban los documentos.
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
    const { sessionId, step, stepData: rawStepData } = body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
      return NextResponse.json({ error: 'sessionId inválido' }, { status: 400 });
    }
    if (typeof step !== 'number' || !Number.isInteger(step) || step < 1 || step > 6) {
      return NextResponse.json({ error: 'step inválido' }, { status: 400 });
    }
    if (!rawStepData || typeof rawStepData !== 'object') {
      return NextResponse.json({ error: 'stepData inválido' }, { status: 400 });
    }

    const validation = validateStepData(step, rawStepData);
    if (!validation.ok) {
      return NextResponse.json({ error: `stepData: ${validation.error}` }, { status: 400 });
    }
    const stepData = validation.data;

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

    // Anti-salto de pasos: permitir editar pasos ya completados (step <= current)
    // o avanzar exactamente al siguiente (step == current + 1). Saltar más
    // adelante deja el form en estado inconsistente y se rechaza.
    if (submission.formDriverId) {
      const fd = await prisma.formDriver.findUnique({
        where: { id: submission.formDriverId },
        select: { currentStep: true },
      });
      const maxAllowed = (fd?.currentStep ?? 0) + 1;
      if (step > maxAllowed) {
        return NextResponse.json(
          { error: `No podés saltar al step ${step} estando en step ${fd?.currentStep ?? 0}` },
          { status: 400 }
        );
      }
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
        updateData.addressLat = safeFloat(stepData.addressLat, { min: -90, max: 90 });
        updateData.addressLng = safeFloat(stepData.addressLng, { min: -180, max: 180 });
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
          updateData.vehicleYear = safeInt(stepData.vehicleYear, { min: 1900, max: 2100 });
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
    5: 'additional_info',
    6: 'equipment_payment'
  };
  return stepNames[step] || 'unknown';
}