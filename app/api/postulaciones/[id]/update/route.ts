// app/api/postulaciones/[id]/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await request.json();

    // Validar y sanitizar los datos
    const updateData: any = {};

    // Campos permitidos para actualizar
    const allowedFields = [
      'firstName', 'lastName', 'fullName', 'cedula', 'phoneNumber', 'email',
      'birthDate', 'department', 'city', 'address', 'neighborhood',
      'emergencyName', 'emergencyPhone', 'emergencyRelationship',
      'vehicleBrand', 'vehicleModel', 'vehicleYear', 'vehiclePlate',
      'experience', 'availability', 'whenCanStart', 'workZone',
      'howHeardAboutUs', 'referredBy', 'hasUenoAccount', 'uenoAccountNumber',
      'canInvoice', 'hasVehicle'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        // Manejar birthDate - puede venir en formato dd/mm/yyyy o ISO
        if (field === 'birthDate' && data[field]) {
          const birthDateValue = data[field];
          
          // Si viene en formato dd/mm/yyyy (ej: "19/4/2000")
          if (typeof birthDateValue === 'string' && birthDateValue.includes('/')) {
            const parts = birthDateValue.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // Los meses en JS son 0-indexed
              const year = parseInt(parts[2]);
              const date = new Date(year, month, day);
              
              // Verificar que la fecha sea válida
              if (!isNaN(date.getTime())) {
                updateData[field] = date;
              }
            }
          } 
          // Si viene en formato ISO o como Date
          else {
            const date = new Date(birthDateValue);
            if (!isNaN(date.getTime())) {
              updateData[field] = date;
            }
          }
        } 
        // Convertir vehicleYear a número si es necesario
        else if (field === 'vehicleYear' && data[field]) {
          const year = parseInt(data[field]);
          if (!isNaN(year)) {
            updateData[field] = year;
          }
        }
        // Convertir booleanos - pueden venir como 'si'/'no' o true/false
        else if (field === 'hasVehicle' || field === 'hasUenoAccount' || field === 'canInvoice') {
          updateData[field] = data[field] === 'si' || data[field] === true;
        }
        // Manejar campos vacíos - convertir strings vacíos a null para campos opcionales
        else if (data[field] === '' && [
          'emergencyName', 'emergencyPhone', 'emergencyRelationship',
          'vehicleBrand', 'vehicleModel', 'vehiclePlate', 'referredBy',
          'uenoAccountNumber', 'neighborhood', 'experience', 'whenCanStart'
        ].includes(field)) {
          updateData[field] = null;
        }
        else {
          updateData[field] = data[field];
        }
      }
    });

    // Actualizar fullName si se actualizaron firstName o lastName
    if (data.firstName || data.lastName) {
      const firstName = data.firstName || '';
      const lastName = data.lastName || '';
      updateData.fullName = `${firstName} ${lastName}`.trim();
    }

    console.log('Actualizando FormDriver:', id, updateData);

    // Actualizar en la base de datos
    const updatedFormDriver = await prisma.formDriver.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      formDriver: updatedFormDriver
    });

  } catch (error: any) {
    console.error('Error al actualizar postulación:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar la postulación' },
      { status: 500 }
    );
  }
}