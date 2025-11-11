// scripts/process-and-upload-reports.ts
import 'dotenv/config';
import { chromium, Browser, Page, BrowserContext, Download } from 'playwright';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { writeToSheet, clearSheet, appendToSheet } from './utils/sheet-connection';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  // Autenticación
  loginUrl: process.env.APP_LOGIN_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/login',
  reportsUrl: process.env.APP_DRIVERS_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/reports/driverpayment',
  email: process.env.APP_EMAIL || '',
  password: process.env.APP_PASSWORD || '',
  
  // Google Sheets
  spreadsheetId: '1EvjPf4TUzu7qxMWUy1cjUDGY4FBbCgO8tMYlcOUOt2M',
  sheetName: 'Reporte Pagos',
  
  // Configuración de descarga
  headless: false,
  downloadTimeout: 300000, // 5 minutos
  
  // Configuración de fechas
  startDate: '2025-10-01', // YYYY-MM-DD
  endDate: '2025-10-02',   // YYYY-MM-DD
  daysPerRange: 1,         // Días por cada descarga
};

// ============================================================================
// UTILIDADES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateDateRanges(startDate: string, endDate: string, daysPerRange: number = 2): Array<{ start: string; end: string }> {
  const ranges: Array<{ start: string; end: string }> = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let currentStart = new Date(start);
  
  while (currentStart <= end) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + daysPerRange - 1);
    
    if (currentEnd > end) {
      currentEnd.setTime(end.getTime());
    }
    
    ranges.push({
      start: formatDate(currentStart),
      end: formatDate(currentEnd),
    });
    
    currentStart.setDate(currentStart.getDate() + daysPerRange);
  }
  
  return ranges;
}

/**
 * Filtra filas vacías o que contienen "Total"
 */
function filterInvalidRows(data: any[][], isFirstFile: boolean): any[][] {
  return data.filter((row, index) => {
    // Siempre mantener los headers en el primer archivo
    if (index === 0 && isFirstFile) return true;
    
    // Saltar headers en archivos subsecuentes
    if (index === 0 && !isFirstFile) return false;
    
    // Verificar si la fila está vacía
    const isEmpty = row.every(cell => 
      cell === null || 
      cell === undefined || 
      cell === '' || 
      (typeof cell === 'string' && cell.trim() === '')
    );
    
    if (isEmpty) return false;
    
    // Verificar si contiene "Total"
    const hasTotal = row.some(cell => 
      typeof cell === 'string' && 
      cell.toLowerCase().includes('total')
    );
    
    if (hasTotal) return false;
    
    // Verificar si la mayoría de las celdas están vacías
    const nonEmptyCells = row.filter(cell => 
      cell !== null && 
      cell !== undefined && 
      cell !== '' && 
      !(typeof cell === 'string' && cell.trim() === '')
    ).length;
    
    const emptinessThreshold = 0.5;
    const isMostlyEmpty = nonEmptyCells < (row.length * emptinessThreshold);
    
    if (isMostlyEmpty) return false;
    
    return true;
  });
}

/**
 * Lee un buffer de Excel y devuelve los datos como matriz
 */
function readExcelFromBuffer(buffer: Buffer): any[][] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  return data;
}

// ============================================================================
// CLASE DE AUTOMATIZACIÓN Y PROCESAMIENTO
// ============================================================================

class ReportProcessorAndUploader {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private allData: any[][] = [];
  private processedRanges: number = 0;
  private totalRowsFiltered: number = 0;

  async initialize(): Promise<void> {
    console.log('🚀 Iniciando navegador...');
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: 50,
    });

    this.context = await this.browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1920, height: 1080 },
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(60000);
    
    console.log('✅ Navegador inicializado');
  }

  async login(): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');
    
    console.log('🔐 Iniciando sesión...');
    
    await this.page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle' });
    
    await this.page.fill('#basic_email', CONFIG.email);
    await this.page.fill('#basic_password', CONFIG.password);
    
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      this.page.click('button[type="submit"]')
    ]);
    
    await sleep(2000);
    
    console.log('✅ Sesión iniciada');
  }

  async navigateToReports(): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');
    
    console.log('📊 Navegando a reportes...');
    await this.page.goto(CONFIG.reportsUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await this.page.waitForSelector('input[placeholder="Fecha desde"]', { timeout: 10000 });
    console.log('✅ Página de reportes cargada');
  }

  async setDateRange(startDate: string, endDate: string): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');
    
    console.log(`📅 Configurando rango: ${startDate} a ${endDate}`);
    
    // Limpiar y llenar "Fecha desde"
    const fechaDesdeInput = await this.page.waitForSelector('input[placeholder="Fecha desde"]', { timeout: 10000 });
    await fechaDesdeInput.click();
    await sleep(300);
    await fechaDesdeInput.click({ clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    await sleep(200);
    await fechaDesdeInput.type(startDate, { delay: 50 });
    await sleep(300);
    await this.page.keyboard.press('Tab');
    await sleep(300);
    
    // Limpiar y llenar "Fecha hasta"
    const fechaHastaInput = await this.page.waitForSelector('input[placeholder="Fecha hasta"]', { timeout: 10000 });
    await fechaHastaInput.click();
    await sleep(300);
    await fechaHastaInput.click({ clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    await sleep(200);
    await fechaHastaInput.type(endDate, { delay: 50 });
    await sleep(300);
    await this.page.keyboard.press('Tab');
    await sleep(500);
    
    console.log('✅ Fechas configuradas');
  }

  async downloadAndProcessExcel(): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');
    
    console.log('📥 Iniciando descarga y procesamiento...');
    
    // Hacer click en el ícono de Excel
    const excelIcon = await this.page.waitForSelector('.anticon-file-excel', { timeout: 10000 });
    await excelIcon.click();
    console.log('✅ Click en ícono de Excel');
    
    await sleep(1500);
    
    // Buscar el botón de descarga
    const downloadButton = await this.page.waitForSelector(
      'span:has-text("Descargar de todos los drivers")',
      { timeout: 10000 }
    );
    
    if (!downloadButton) {
      throw new Error('No se encontró el botón de descarga');
    }
    
    console.log('⏳ Descargando Excel en memoria...');
    
    // Preparar para capturar la descarga
    const downloadPromise = this.page.waitForEvent('download', { 
      timeout: CONFIG.downloadTimeout 
    });
    
    // Click en el botón
    await downloadButton.click();
    
    // Esperar a que la descarga comience
    let download: Download;
    try {
      download = await downloadPromise;
      console.log('✅ Descarga iniciada');
    } catch (error: any) {
      if (error.message.includes('Timeout')) {
        throw new Error('Timeout en descarga - el servidor tardó más de 5 minutos');
      }
      throw error;
    }
    
    // Leer el archivo en memoria (sin guardarlo)
    console.log('📖 Leyendo Excel en memoria...');
    const buffer = await download.createReadStream().then(stream => {
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    });
    
    console.log('✅ Excel leído en memoria');
    
    // Procesar el Excel
    console.log('🔄 Procesando datos...');
    const rawData = readExcelFromBuffer(buffer);
    console.log(`   📊 ${rawData.length} filas leídas`);
    
    // Filtrar filas inválidas
    const isFirstFile = this.allData.length === 0;
    const cleanData = filterInvalidRows(rawData, isFirstFile);
    const removedCount = rawData.length - cleanData.length;
    this.totalRowsFiltered += removedCount;
    
    if (removedCount > 0) {
      console.log(`   🗑️  ${removedCount} fila(s) filtrada(s)`);
    }
    
    // Agregar datos consolidados
    if (isFirstFile) {
      // Primer archivo: agregar todo (incluyendo headers)
      this.allData = cleanData;
      console.log(`   ✅ ${cleanData.length} filas agregadas (incluyendo headers)`);
    } else {
      // Archivos subsecuentes: agregar solo datos (sin headers)
      const dataRows = cleanData.slice(1);
      this.allData = this.allData.concat(dataRows);
      console.log(`   ✅ ${dataRows.length} filas de datos agregadas`);
    }
    
    this.processedRanges++;
    
    await sleep(2000);
    
    // Cerrar modal si existe
    try {
      const closeSelectors = [
        '.ant-modal-close',
        'button:has-text("Cerrar")',
        'button:has-text("Cancelar")',
        '[aria-label="Close"]'
      ];
      
      for (const selector of closeSelectors) {
        const closeButton = await this.page.$(selector);
        if (closeButton) {
          await closeButton.click();
          await sleep(500);
          break;
        }
      }
    } catch (error) {
      // Ignorar
    }
  }

  async processDateRange(startDate: string, endDate: string): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`📊 PROCESANDO RANGO: ${startDate} → ${endDate}`);
    console.log('═══════════════════════════════════════════════════════');
    
    try {
      await this.setDateRange(startDate, endDate);
      await this.downloadAndProcessExcel();
      console.log(`✅ Rango ${startDate} → ${endDate} procesado\n`);
    } catch (error: any) {
      console.error(`❌ Error en rango ${startDate} → ${endDate}:`, error.message);
      throw error;
    }
  }

  async uploadToSheets(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📝 SUBIENDO DATOS A GOOGLE SHEETS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log(`📊 Total de filas a subir: ${this.allData.length}`);
    console.log(`   (1 fila de headers + ${this.allData.length - 1} filas de datos)\n`);
    
    // Limpiar la hoja
    console.log('🧹 Limpiando hoja...');
    await clearSheet(CONFIG.spreadsheetId, CONFIG.sheetName, false);
    console.log('✅ Hoja limpiada\n');
    
    // Escribir datos
    console.log('📝 Escribiendo datos...');
    await writeToSheet(
      CONFIG.spreadsheetId,
      CONFIG.sheetName,
      this.allData,
      'A1'
    );
    console.log('✅ Datos escritos exitosamente');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Navegador cerrado');
    }
  }

  getStats() {
    return {
      totalRows: this.allData.length,
      dataRows: this.allData.length - 1,
      processedRanges: this.processedRanges,
      filteredRows: this.totalRowsFiltered,
    };
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   DESCARGA Y CARGA AUTOMÁTICA DE REPORTES            ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('\n');

  // Validar credenciales
  if (!CONFIG.email || !CONFIG.password) {
    console.error('❌ ERROR: Debes configurar APP_EMAIL y APP_PASSWORD en .env');
    process.exit(1);
  }

  console.log('⚙️  CONFIGURACIÓN:');
  console.log(`   📅 Rango total: ${CONFIG.startDate} → ${CONFIG.endDate}`);
  console.log(`   📊 Días por descarga: ${CONFIG.daysPerRange}`);
  console.log(`   📄 Google Sheets: ${CONFIG.spreadsheetId}`);
  console.log(`   📋 Hoja: ${CONFIG.sheetName}`);
  console.log('\n');

  const processor = new ReportProcessorAndUploader();
  
  try {
    // Generar rangos de fechas
    const dateRanges = generateDateRanges(CONFIG.startDate, CONFIG.endDate, CONFIG.daysPerRange);
    console.log(`📋 Se procesarán ${dateRanges.length} rangos de fechas\n`);

    // Inicializar navegador y hacer login
    await processor.initialize();
    await processor.login();
    await processor.navigateToReports();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔄 PROCESANDO RANGOS DE FECHAS');
    console.log('═══════════════════════════════════════════════════════\n');

    // Procesar cada rango
    for (let i = 0; i < dateRanges.length; i++) {
      const range = dateRanges[i];
      console.log(`[${i + 1}/${dateRanges.length}]`);
      
      await processor.processDateRange(range.start, range.end);
      
      // Esperar entre descargas
      if (i < dateRanges.length - 1) {
        console.log('⏳ Esperando antes del próximo rango...');
        await sleep(5000);
      }
    }

    // Subir todo a Google Sheets
    await processor.uploadToSheets();

    // Estadísticas finales
    const stats = processor.getStats();
    
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║              PROCESO COMPLETADO                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('📊 ESTADÍSTICAS:');
    console.log(`   ✅ Rangos procesados: ${stats.processedRanges}`);
    console.log(`   📝 Total de filas subidas: ${stats.totalRows}`);
    console.log(`   📋 Filas de datos: ${stats.dataRows}`);
    console.log(`   🗑️  Filas filtradas: ${stats.filteredRows}`);
    console.log(`\n🔗 Ver en: https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}\n`);
    
  } catch (error: any) {
    console.error('\n❌ ERROR CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await processor.close();
  }
}

// ============================================================================
// EJECUTAR
// ============================================================================

main().catch((error) => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});