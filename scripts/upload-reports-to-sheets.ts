// scripts/upload-reports-to-sheets.ts
import 'dotenv/config';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { writeToSheet, clearSheet, appendToSheet } from './utils/sheet-connection';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  spreadsheetId: '1EvjPf4TUzu7qxMWUy1cjUDGY4FBbCgO8tMYlcOUOt2M',
  sheetName: 'Reporte Pagos',
  downloadsDir: path.join(process.cwd(), 'downloads', 'reports'),
};

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Lee un archivo Excel y devuelve los datos como matriz
 */
function readExcelFile(filePath: string): any[][] {
  console.log(`📖 Leyendo archivo: ${path.basename(filePath)}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Tomar la primera hoja
  const worksheet = workbook.Sheets[sheetName];
  
  // Convertir a JSON (matriz de matrices)
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  console.log(`✅ Leídas ${data.length} filas del Excel`);
  return data;
}

/**
 * Filtra filas vacías o que contienen "Total"
 */
function filterInvalidRows(data: any[][]): any[][] {
  return data.filter((row, index) => {
    // Siempre mantener los headers (primera fila)
    if (index === 0) return true;
    
    // Verificar si la fila está vacía (todos los valores son null/undefined/empty)
    const isEmpty = row.every(cell => 
      cell === null || 
      cell === undefined || 
      cell === '' || 
      (typeof cell === 'string' && cell.trim() === '')
    );
    
    if (isEmpty) {
      console.log(`   🗑️  Fila ${index + 1} eliminada: vacía`);
      return false;
    }
    
    // Verificar si contiene "Total" en alguna celda
    const hasTotal = row.some(cell => 
      typeof cell === 'string' && 
      cell.toLowerCase().includes('total')
    );
    
    if (hasTotal) {
      console.log(`   🗑️  Fila ${index + 1} eliminada: contiene "Total"`);
      return false;
    }
    
    // Verificar si la mayoría de las celdas están vacías (fila semi-vacía)
    const nonEmptyCells = row.filter(cell => 
      cell !== null && 
      cell !== undefined && 
      cell !== '' && 
      !(typeof cell === 'string' && cell.trim() === '')
    ).length;
    
    const emptinessThreshold = 0.5; // Si más del 50% está vacío
    const isMostlyEmpty = nonEmptyCells < (row.length * emptinessThreshold);
    
    if (isMostlyEmpty) {
      console.log(`   🗑️  Fila ${index + 1} eliminada: semi-vacía (${nonEmptyCells}/${row.length} celdas con datos)`);
      return false;
    }
    
    return true;
  });
}

/**
 * Obtiene todos los archivos Excel del directorio de descargas
 */
function getExcelFiles(): string[] {
  if (!fs.existsSync(CONFIG.downloadsDir)) {
    console.warn(`⚠️  Directorio no encontrado: ${CONFIG.downloadsDir}`);
    return [];
  }
  
  const files = fs.readdirSync(CONFIG.downloadsDir)
    .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
    .map(file => path.join(CONFIG.downloadsDir, file));
  
  return files;
}

/**
 * Extrae la fecha del nombre del archivo
 * Asume formato: "reporte_2025-11-08.xlsx" o similar
 */
function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Ordena archivos por fecha (del más antiguo al más reciente)
 */
function sortFilesByDate(files: string[]): string[] {
  return files.sort((a, b) => {
    const dateA = extractDateFromFilename(path.basename(a)) || '';
    const dateB = extractDateFromFilename(path.basename(b)) || '';
    return dateA.localeCompare(dateB);
  });
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     SUBIR REPORTES EXCEL A GOOGLE SHEETS             ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('\n');
  
  console.log('⚙️  CONFIGURACIÓN:');
  console.log(`   📊 Spreadsheet ID: ${CONFIG.spreadsheetId}`);
  console.log(`   📄 Hoja destino: ${CONFIG.sheetName}`);
  console.log(`   📁 Directorio: ${CONFIG.downloadsDir}`);
  console.log('\n');
  
  try {
    // 1. Obtener archivos Excel
    console.log('🔍 Buscando archivos Excel...');
    const excelFiles = getExcelFiles();
    
    if (excelFiles.length === 0) {
      console.log('⚠️  No se encontraron archivos Excel para procesar');
      console.log('💡 Ejecuta primero: npx tsx scripts/download-driver-reports.ts');
      return;
    }
    
    console.log(`✅ Encontrados ${excelFiles.length} archivos Excel`);
    excelFiles.forEach((file, i) => {
      console.log(`   ${i + 1}. ${path.basename(file)}`);
    });
    console.log('\n');
    
    // 2. Ordenar archivos por fecha
    const sortedFiles = sortFilesByDate(excelFiles);
    
    // 3. Consolidar todos los datos
    console.log('📚 Consolidando datos de todos los archivos...\n');
    let allData: any[][] = [];
    let headersAdded = false;
    let totalRowsRemoved = 0;
    
    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      console.log(`[${i + 1}/${sortedFiles.length}] Procesando: ${path.basename(file)}`);
      
      const rawData = readExcelFile(file);
      
      if (rawData.length === 0) {
        console.log(`   ⚠️  Archivo vacío, saltando...`);
        continue;
      }
      
      // Filtrar filas inválidas
      console.log(`   🧹 Limpiando filas inválidas...`);
      const cleanData = filterInvalidRows(rawData);
      const removedCount = rawData.length - cleanData.length;
      totalRowsRemoved += removedCount;
      
      if (removedCount > 0) {
        console.log(`   ✅ ${removedCount} fila(s) removida(s)`);
      }
      
      // Agregar headers solo la primera vez
      if (!headersAdded && cleanData.length > 0) {
        allData.push(cleanData[0]); // Headers
        headersAdded = true;
        console.log(`   ✅ Headers agregados`);
      }
      
      // Agregar datos (sin headers)
      const dataRows = cleanData.slice(1);
      allData = allData.concat(dataRows);
      console.log(`   ✅ ${dataRows.length} filas agregadas\n`);
    }
    
    console.log(`📊 Total de filas consolidadas: ${allData.length}`);
    console.log(`   (1 fila de headers + ${allData.length - 1} filas de datos)`);
    console.log(`🗑️  Total de filas removidas: ${totalRowsRemoved}\n`);
    
    // 4. Limpiar la hoja existente
    console.log('═══════════════════════════════════════════════════════');
    console.log('🧹 LIMPIANDO HOJA DE GOOGLE SHEETS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    await clearSheet(CONFIG.spreadsheetId, CONFIG.sheetName, false); // Limpiar todo incluyendo headers
    
    // 5. Escribir todos los datos
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 ESCRIBIENDO DATOS EN GOOGLE SHEETS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    await writeToSheet(
      CONFIG.spreadsheetId,
      CONFIG.sheetName,
      allData,
      'A1'
    );
    
    // 6. Resumen final
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║              PROCESO COMPLETADO                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('✅ Datos subidos exitosamente a Google Sheets');
    console.log(`📊 Total de filas escritas: ${allData.length}`);
    console.log(`📄 Archivos procesados: ${sortedFiles.length}`);
    console.log(`🗑️  Filas filtradas: ${totalRowsRemoved}`);
    console.log(`🔗 Ver en: https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}`);
    console.log('\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// ============================================================================
// EJECUTAR
// ============================================================================

main().catch((error) => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});