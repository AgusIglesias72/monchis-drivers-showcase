// validate-xlsx.ts
// Script para validar la estructura del XLSX antes de ejecutar la migración

import * as XLSX from 'xlsx';
import { promises as fs } from 'fs';
import 'dotenv/config'; // 👈 AGREGAR ESTA LÍNEA AL INICIO

const EXPECTED_COLUMNS: Record<string, number> = {
  'LINK P/ CONTACTAR ': 0,
  'Marca temporal': 1,
  'Dirección de correo electrónico': 3,
  'NOMBRES Y APELLIDOS: ': 4,
  'NUMERO DE CI: (Paraguay)': 5,
  'FECHA DE NACIMIENTO:': 6,
  'TELEFONO / CELULAR: ': 9,
  'DEPARTAMENTO:': 11,
  'CIUDAD:': 12,
  'BARRIO:': 13,
  'DIRECCIÓN DOMICILIO:': 14,
  'NOMBRE DE CONTACTO DE EMERGENCIA:': 15,
  'PARENTESCO CON CONTACTO DE EMERGENCIA': 16,
  'NÚMERO DE CONTACTO DE EMERGENCIA:  EJ. 0984111000(SIN ESPACIOS)': 17,
  'CEDULA DE IDENTIDAD O PASAPORTE:': 18,
  'ANTECEDENTE POLICIAL, JUDICIAL O INTERPOL:': 19,
  'SELECCIONE ZONA EN LA QUE TE GUSTARÍA TRABAJAR: ': 22,
  '¿Cómo te enteraste de nosotros?': 23,
  'MARCA DEL RODADO:': 28,
  'MODELO DEL RODADO:': 29,
  'CHAPA DEL RODADO:': 30,
  'AÑO DEL RODADO:': 31,
  '¿Contas con factura a tu nombre?': 33,
  'En caso de contar con Factura Cargar Certificado de cumplimiento tributario': 34,
  '¿Le interesaría nuestro servicio de contabilidad con CONTO? ': 35,
  '¿Tenes una cuenta bancaria con ueno bank? ': 36,
  'Adjunte comprobante de pago: ': 38,
  'FORMA DE PAGO': 39,
  'NRO COMP. DE PAGO': 40,
  'NRO DE FACTURA': 41,
  'MONTO ENTREGA': 42,
  'FECHA DE AGENDAMIENTO': 46,
  'Agendamiento confirmado': 47,
  'Capacitado': 48,
};

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    withEmail: number;
    withCedula: number;
    withDocuments: number;
    withPayment: number;
    withOnboarding: number;
  };
}

function extractDriveIds(content: string | null | undefined): number {
  if (!content) return 0;
  const contentStr = String(content);
  const matches = contentStr.match(/drive\.google\.com|id=/g);
  return matches ? matches.length : 0;
}

async function validateXLSX(filePath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    stats: {
      totalRows: 0,
      withEmail: 0,
      withCedula: 0,
      withDocuments: 0,
      withPayment: 0,
      withOnboarding: 0,
    }
  };

  try {
    console.log('📖 Leyendo archivo XLSX...\n');
    const fileBuffer = await fs.readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];

    if (data.length === 0) {
      result.isValid = false;
      result.errors.push('El archivo está vacío');
      return result;
    }

    const headers = data[0];
    console.log('📋 Validando estructura de columnas...\n');

    // Validar columnas requeridas
    let missingColumns = 0;
    for (const [columnName, expectedIndex] of Object.entries(EXPECTED_COLUMNS)) {
      if (headers[expectedIndex] !== columnName) {
        result.warnings.push(
          `Columna en índice ${expectedIndex} esperada: "${columnName}", encontrada: "${headers[expectedIndex]}"`
        );
        missingColumns++;
      }
    }

    if (missingColumns > 0) {
      console.log(`⚠️  ${missingColumns} columnas no coinciden exactamente con lo esperado\n`);
    } else {
      console.log(`✅ Todas las columnas requeridas están presentes\n`);
    }

    // Analizar datos
    console.log('📊 Analizando datos...\n');
    result.stats.totalRows = data.length - 1; // Excluyendo header

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Email
      if (row[3]) result.stats.withEmail++;

      // Cédula
      if (row[5]) result.stats.withCedula++;

      // Documentos (Cédula o Antecedentes)
      const cedulaDocs = extractDriveIds(row[18]);
      const antecedentes = extractDriveIds(row[19]);
      if (cedulaDocs > 0 || antecedentes > 0) {
        result.stats.withDocuments++;
      }

      // Pago
      if (row[39] || row[42]) result.stats.withPayment++;

      // Onboarding
      if (row[46]) result.stats.withOnboarding++;
    }

    // Validaciones de consistencia
    console.log('🔍 Validando consistencia de datos...\n');

    if (result.stats.withEmail < result.stats.totalRows * 0.9) {
      result.warnings.push(
        `Solo ${result.stats.withEmail}/${result.stats.totalRows} filas tienen email (< 90%)`
      );
    }

    if (result.stats.withCedula < result.stats.totalRows * 0.9) {
      result.warnings.push(
        `Solo ${result.stats.withCedula}/${result.stats.totalRows} filas tienen cédula (< 90%)`
      );
    }

    if (result.stats.withDocuments < result.stats.totalRows * 0.5) {
      result.warnings.push(
        `Solo ${result.stats.withDocuments}/${result.stats.totalRows} filas tienen documentos (< 50%)`
      );
    }

    // Verificar registros de ejemplo
    console.log('📝 Verificando primeros 3 registros...\n');

    for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
      const row = data[i];
      console.log(`Registro ${i}:`);
      console.log(`  Nombre: ${row[4] || 'N/A'}`);
      console.log(`  Cédula: ${row[5] || 'N/A'}`);
      console.log(`  Email: ${row[3] || 'N/A'}`);
      console.log(`  Docs Cédula: ${extractDriveIds(row[18])} URLs`);
      console.log(`  Docs Antecedentes: ${extractDriveIds(row[19])} URLs`);
      console.log(`  Método pago: ${row[39] || 'N/A'}`);
      console.log(`  Onboarding: ${row[46] ? 'Sí' : 'No'}`);
      console.log('');
    }

  } catch (error) {
    result.isValid = false;
    result.errors.push(`Error leyendo archivo: ${error}`);
  }

  return result;
}

async function main() {
    const xlsxPath = './postulacion.xlsx';

  console.log('🔍 VALIDADOR DE XLSX PARA MIGRACIÓN\n');
  console.log('='.repeat(60));
  console.log(`Archivo: ${xlsxPath}`);
  console.log('='.repeat(60) + '\n');

  const result = await validateXLSX(xlsxPath);

  // Mostrar resultados
  console.log('\n' + '='.repeat(60));
  console.log('📊 ESTADÍSTICAS');
  console.log('='.repeat(60));
  console.log(`Total de registros: ${result.stats.totalRows}`);
  console.log(`Con email: ${result.stats.withEmail} (${((result.stats.withEmail / result.stats.totalRows) * 100).toFixed(1)}%)`);
  console.log(`Con cédula: ${result.stats.withCedula} (${((result.stats.withCedula / result.stats.totalRows) * 100).toFixed(1)}%)`);
  console.log(`Con documentos: ${result.stats.withDocuments} (${((result.stats.withDocuments / result.stats.totalRows) * 100).toFixed(1)}%)`);
  console.log(`Con datos de pago: ${result.stats.withPayment} (${((result.stats.withPayment / result.stats.totalRows) * 100).toFixed(1)}%)`);
  console.log(`Con onboarding: ${result.stats.withOnboarding} (${((result.stats.withOnboarding / result.stats.totalRows) * 100).toFixed(1)}%)`);

  if (result.errors.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ ERRORES');
    console.log('='.repeat(60));
    result.errors.forEach((error) => console.log(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  ADVERTENCIAS');
    console.log('='.repeat(60));
    result.warnings.forEach((warning) => console.log(`  - ${warning}`));
  }

  console.log('\n' + '='.repeat(60));
  if (result.isValid && result.errors.length === 0) {
    console.log('✅ VALIDACIÓN EXITOSA');
    console.log('='.repeat(60));
    console.log('\n✅ El archivo está listo para migración!');
    console.log('\n💡 Siguiente paso:');
    console.log('   npm run migrate:drivers\n');
  } else {
    console.log('❌ VALIDACIÓN FALLIDA');
    console.log('='.repeat(60));
    console.log('\n❌ Por favor corrige los errores antes de migrar.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });