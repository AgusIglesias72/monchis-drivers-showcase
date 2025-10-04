// app/api/drivers/process-forms/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { driverFormProcessor } from '@/lib/services/drivers-form-processor';

/** 
 * POST /api/drivers/process-forms
 * Procesa y guarda en la base de datos los últimos N registros del formulario
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener parámetros del body (opcional)
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 10;
    
    const spreadsheetId = process.env.DRIVERS_SPREADSHEET_ID;
    const sheetName = 'Respuestas de formulario 1'; // O desde env: process.env.DRIVERS_SHEET_NAME
    
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Spreadsheet ID not configured' },
        { status: 500 }
      );
    }
    
    console.log(`🚀 Procesando últimas ${limit} respuestas del formulario...`);
    
    // Procesar las respuestas y guardar en DB
    const result = await driverFormProcessor.processFormResponses(
      spreadsheetId,
      sheetName,
      limit
    );
    
    return NextResponse.json({
      success: true,
      message: `Procesadas ${result.processed} respuestas`,
      ...result
    });
    
  } catch (error: any) {
    console.error('Error procesando formularios:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error processing forms'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/drivers/process-forms
 * Obtiene y muestra los últimos N registros del formulario SIN guardar en DB
 * Útil para debugging y preview
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const spreadsheetId = process.env.DRIVERS_SPREADSHEET_ID;
    const sheetName = 'Respuestas de formulario 1'; // O desde env: process.env.DRIVERS_SHEET_NAME
    
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Spreadsheet ID not configured' },
        { status: 500 }
      );
    }
    
    console.log(`📊 Obteniendo últimas ${limit} respuestas del formulario...`);
    
    // Solo obtener los datos sin guardar
    const responses = await driverFormProcessor.getLatestFormResponses(
      spreadsheetId,
      sheetName,
      limit
    );
    
    // También obtener las filas raw para debug
    const { rawRows, headers } = await driverFormProcessor.getRawData(
      spreadsheetId,
      sheetName,
      limit
    );
    
    // Resumir la información para no exponer datos sensibles
    const summary = responses.map((r, index) => ({
      timestamp: r.timestamp,
      cedula: r.cedula ? `${r.cedula.substring(0, 3)}***` : null,
      nombre: r.firstName,
      apellido: r.lastName,
      telefono: r.phone ? `${r.phone.substring(0, 7)}***` : null,
      email: r.email,
      hasDocuments: Object.values(r.documents).some(d => d !== null),
      documents: {
        cedulaFront: !!r.documents.cedulaFront,
        cedulaBack: !!r.documents.cedulaBack,
        licenseFront: !!r.documents.licenseFront,
        licenseBack: !!r.documents.licenseBack,
        criminalRecord: !!r.documents.criminalRecord
      },
      city: r.city,
      hasVehicle: r.hasVehicle,
      vehicleInfo: r.vehicleInfo,
      metadata: {
        workZone: r.rawData.workZone,
        trained: r.rawData.trained,
        confirmed: r.rawData.confirmed,
        nationality: r.rawData.nationality
      },
      // Agregar datos raw para debug
      _debug: {
        rowIndex: index,
        rawRowSample: rawRows[index] ? {
          col0: rawRows[index][0], // Botón
          col1: rawRows[index][1], // Marca temporal
          col2: rawRows[index][2], // NOMBRES Y APELLIDOS
          col5: rawRows[index][5], // NUMERO DE CI/PASAPORTE
          col7: rawRows[index][7], // TELEFONO / CELULAR
          col4: rawRows[index][4], // Email
          totalCols: rawRows[index].length
        } : null
      }
    }));
    
    return NextResponse.json({
      success: true,
      total: responses.length,
      spreadsheetId,
      sheetName,
      debug: {
        headersCount: headers.length,
        firstFiveHeaders: headers.slice(0, 5),
        criticalHeadersFound: {
          timestamp: headers[1],
          fullName: headers[2],
          cedula: headers[5],
          phone: headers[7],
          email: headers[4]
        },
        rawRowsCount: rawRows.length,
        firstRowData: rawRows[0] ? {
          timestamp: rawRows[0][1],
          fullName: rawRows[0][2],
          cedula: rawRows[0][5],
          phone: rawRows[0][7]
        } : null
      },
      data: summary
    });
    
  } catch (error: any) {
    console.error('Error obteniendo formularios:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Error fetching forms'
      },
      { status: 500 }
    );
  }
}