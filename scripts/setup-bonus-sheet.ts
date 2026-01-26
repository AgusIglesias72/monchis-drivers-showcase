// scripts/setup-bonus-sheet.ts
// Script para inicializar el Google Sheet de Bonos con tabs y headers

import 'dotenv/config';
import { google } from 'googleapis';

const SHEET_ID = '1fL14KKH7hxx659QfJYRrJ1NFFGWYT8FooKJ5bVQKzSg';

async function setupBonusSheet() {
  console.log('🚀 Iniciando configuración del Google Sheet de Bonos...\n');

  // Autenticación (usando las credenciales del service account)
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // 1. ELIMINAR SHEETS EXISTENTES (excepto la primera)
    console.log('📋 Paso 1: Limpiando sheets existentes...');

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    const existingSheets = spreadsheet.data.sheets || [];
    console.log(`   Encontradas ${existingSheets.length} sheets existentes`);

    // Eliminar todas excepto la primera (que renombraremos)
    const deleteRequests = existingSheets.slice(1).map((sheet) => ({
      deleteSheet: {
        sheetId: sheet.properties?.sheetId,
      },
    }));

    if (deleteRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { requests: deleteRequests },
      });
      console.log(`   ✅ ${deleteRequests.length} sheets eliminadas`);
    }

    // 2. RENOMBRAR LA PRIMERA SHEET A "Bonus Rules"
    console.log('\n📋 Paso 2: Creando tabs...');

    const firstSheetId = existingSheets[0]?.properties?.sheetId || 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          // Renombrar primera sheet
          {
            updateSheetProperties: {
              properties: {
                sheetId: firstSheetId,
                title: 'Bonus Rules',
                gridProperties: {
                  frozenRowCount: 1, // Congelar header
                },
              },
              fields: 'title,gridProperties.frozenRowCount',
            },
          },
          // Crear "Bonus Assignments"
          {
            addSheet: {
              properties: {
                title: 'Bonus Assignments',
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          },
          // Crear "Execution Summary"
          {
            addSheet: {
              properties: {
                title: 'Execution Summary',
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      },
    });

    console.log('   ✅ Tabs creadas:');
    console.log('      - Bonus Rules');
    console.log('      - Bonus Assignments');
    console.log('      - Execution Summary');

    // 3. AGREGAR HEADERS
    console.log('\n📋 Paso 3: Agregando headers...');

    // Headers para "Bonus Rules"
    const rulesHeaders = [
      [
        'Fecha',
        'Hora Inicio',
        'Hora Fin',
        'Zonas',
        'Monto por Pedido',
        'Activo',
        'Descripción',
      ],
    ];

    // Headers para "Bonus Assignments"
    const assignmentsHeaders = [
      [
        'Timestamp Ejecución',
        'Fecha Bono',
        'Cédula',
        'Nombre Driver',
        'Pedidos Calificados',
        'Monto por Pedido',
        'Bono Total',
        'Extra Asignado',
        'Regla Aplicada',
        'Modo Ejecución',
        'Estado',
        'Error',
      ],
    ];

    // Headers para "Execution Summary"
    const summaryHeaders = [
      [
        'Timestamp',
        'Fecha Bono',
        'Modo',
        'Total Pedidos',
        'Conductores Beneficiados',
        'Extras Creados',
        'Asignaciones Exitosas',
        'Asignaciones Fallidas',
        'Monto Total Gs',
      ],
    ];

    // Escribir headers
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: [
          {
            range: 'Bonus Rules!A1:G1',
            values: rulesHeaders,
          },
          {
            range: 'Bonus Assignments!A1:L1',
            values: assignmentsHeaders,
          },
          {
            range: 'Execution Summary!A1:I1',
            values: summaryHeaders,
          },
        ],
      },
    });

    console.log('   ✅ Headers agregados en las 3 tabs');

    // 4. FORMATEAR HEADERS (negrita, fondo gris)
    console.log('\n📋 Paso 4: Formateando headers...');

    const updatedSpreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    const sheetIds = updatedSpreadsheet.data.sheets?.reduce((acc, sheet) => {
      const title = sheet.properties?.title;
      const id = sheet.properties?.sheetId;
      if (title && id !== undefined && id !== null) {
        acc[title] = id;
      }
      return acc;
    }, {} as Record<string, number>);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          // Formatear "Bonus Rules"
          {
            repeatCell: {
              range: {
                sheetId: sheetIds?.['Bonus Rules'],
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // Formatear "Bonus Assignments"
          {
            repeatCell: {
              range: {
                sheetId: sheetIds?.['Bonus Assignments'],
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // Formatear "Execution Summary"
          {
            repeatCell: {
              range: {
                sheetId: sheetIds?.['Execution Summary'],
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          // Auto-resize columnas
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetIds?.['Bonus Rules'],
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 7,
              },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetIds?.['Bonus Assignments'],
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 12,
              },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetIds?.['Execution Summary'],
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 9,
              },
            },
          },
        ],
      },
    });

    console.log('   ✅ Headers formateados (negrita, fondo gris)');
    console.log('   ✅ Columnas auto-redimensionadas');

    // 5. AGREGAR DATOS DE EJEMPLO (OPCIONAL)
    console.log('\n📋 Paso 5: Agregando datos de ejemplo...');

    const exampleRules = [
      [
        '2026-01-18',
        '14:00',
        '18:00',
        'Centro,Villa Morra',
        '3000',
        'TRUE',
        'Bono hora pico zona centro',
      ],
      [
        '2026-01-18',
        '19:00',
        '23:00',
        'TODAS',
        '5000',
        'TRUE',
        'Bono noche todas las zonas',
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Bonus Rules!A2',
      valueInputOption: 'RAW',
      requestBody: {
        values: exampleRules,
      },
    });

    console.log('   ✅ 2 reglas de ejemplo agregadas en "Bonus Rules"');

    // 6. RESUMEN FINAL
    console.log('\n✅ ¡Configuración completada exitosamente!\n');
    console.log('📊 Google Sheet configurado:');
    console.log(`   ID: ${SHEET_ID}`);
    console.log(`   URL: https://docs.google.com/spreadsheets/d/${SHEET_ID}`);
    console.log('\n📋 Tabs creadas:');
    console.log('   1. Bonus Rules - Configuración de reglas (7 columnas)');
    console.log('   2. Bonus Assignments - Registro por conductor (12 columnas)');
    console.log('   3. Execution Summary - Resumen por ejecución (9 columnas)');
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Agregar BONUS_RULES_SHEET_ID al .env');
    console.log('   2. Verificar reglas de ejemplo en "Bonus Rules"');
    console.log('   3. Ejecutar migración de Prisma');
    console.log('   4. Comenzar implementación del sistema de bonos\n');

  } catch (error: any) {
    console.error('\n❌ Error al configurar el Google Sheet:');
    console.error(error.message);
    if (error.response?.data?.error) {
      console.error('Detalles:', error.response.data.error);
    }
    process.exit(1);
  }
}

// Ejecutar
setupBonusSheet()
  .then(() => {
    console.log('✨ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  });
