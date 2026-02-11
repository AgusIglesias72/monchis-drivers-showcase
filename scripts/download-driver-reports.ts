// scripts/download-driver-reports.ts
import 'dotenv/config';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  loginUrl: process.env.APP_LOGIN_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/login',
  reportsUrl: process.env.APP_DRIVERS_URL || 'https://pr-721.durgl9xxo9p82.amplifyapp.com/reports/driverpayment',
  email: process.env.APP_EMAIL || '',
  password: process.env.APP_PASSWORD || '',
  downloadsDir: path.join(process.cwd(), 'downloads', 'reports'),
  headless: false, // Cambia a true para ejecución sin UI
  downloadTimeout: 300000, // 5 minutos para descargas lentas
};

// ============================================================================
// UTILIDADES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDownloadDir(): void {
  if (!fs.existsSync(CONFIG.downloadsDir)) {
    fs.mkdirSync(CONFIG.downloadsDir, { recursive: true });
    console.log(`📁 Carpeta de descargas creada: ${CONFIG.downloadsDir}`);
  }
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

// ============================================================================
// CLASE DE AUTOMATIZACIÓN
// ============================================================================

class ReportDownloader {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private downloadedFiles: string[] = [];

  async initialize(): Promise<void> {
    ensureDownloadDir();
    
    console.log('🚀 Iniciando navegador...');
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: 50,
    });

    this.context = await this.browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1440, height: 900 },
    });

    // Configurar listener de descargas
    this.page = await this.context.newPage();
    
    this.page.on('download', async (download) => {
      const fileName = download.suggestedFilename();
      const filePath = path.join(CONFIG.downloadsDir, fileName);
      
      console.log(`⬇️  Descargando: ${fileName}`);
      await download.saveAs(filePath);
      console.log(`✅ Descargado: ${fileName}`);
      
      this.downloadedFiles.push(filePath);
    });

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
      this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
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
    await fechaDesdeInput.click({ clickCount: 3 }); // Seleccionar todo
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
    await fechaHastaInput.click({ clickCount: 3 }); // Seleccionar todo
    await this.page.keyboard.press('Backspace');
    await sleep(200);
    await fechaHastaInput.type(endDate, { delay: 50 });
    await sleep(300);
    await this.page.keyboard.press('Tab');
    await sleep(500);
    
    console.log('✅ Fechas configuradas');
  }

  async downloadExcelReport(): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');
    
    console.log('📥 Iniciando descarga de Excel...');
    
    // Hacer click en el ícono de Excel
    const excelIcon = await this.page.waitForSelector('.anticon-file-excel', { timeout: 10000 });
    await excelIcon.click();
    console.log('✅ Click en ícono de Excel');
    
    await sleep(1500);
    
    // ✅ FIX: Buscar directamente el span con el texto "Descargar de todos los drivers"
    console.log('🔍 Buscando botón de descarga...');
    
    // Intentar varios selectores para encontrar el botón
    const downloadButton = await this.page.waitForSelector(
      'span:has-text("Descargar de todos los drivers")',
      { timeout: 10000 }
    );
    
    if (!downloadButton) {
      throw new Error('No se encontró el botón de descarga');
    }
    
    console.log('✅ Botón de descarga encontrado');
    console.log('⏳ Haciendo click en "Descargar de todos los drivers"...');
    console.log('⚠️  NOTA: La descarga puede tardar varios minutos...');
    
    // Preparar para capturar la descarga
    const downloadPromise = this.page.waitForEvent('download', { 
      timeout: CONFIG.downloadTimeout 
    });
    
    // Click en el span (que está dentro del botón)
    await downloadButton.click();
    
    // Esperar a que la descarga comience
    try {
      await downloadPromise;
      console.log('✅ Descarga completada');
    } catch (error: any) {
      if (error.message.includes('Timeout')) {
        console.error('❌ Timeout esperando la descarga. El servidor puede estar lento.');
        throw new Error('Timeout en descarga - el servidor tardó más de 5 minutos');
      }
      throw error;
    }
    
    // Esperar un poco más para asegurar que el archivo se guardó
    await sleep(2000);
    
    // Intentar cerrar el modal/popup si existe
    try {
      // Buscar botones de cerrar comunes
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
      // Ignorar si no hay modal para cerrar
      console.log('⚠️  No se pudo cerrar modal (puede que ya esté cerrado)');
    }
  }

  async downloadReportForDateRange(startDate: string, endDate: string): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`📊 PROCESANDO RANGO: ${startDate} → ${endDate}`);
    console.log('═══════════════════════════════════════════════════════');
    
    try {
      await this.setDateRange(startDate, endDate);
      await this.downloadExcelReport();
      console.log(`✅ Rango ${startDate} → ${endDate} completado\n`);
    } catch (error: any) {
      console.error(`❌ Error en rango ${startDate} → ${endDate}:`, error.message);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('🔒 Navegador cerrado');
    }
  }

  getDownloadedFiles(): string[] {
    return this.downloadedFiles;
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     DESCARGADOR DE REPORTES DE DRIVERS               ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('\n');

  // Validar credenciales
  if (!CONFIG.email || !CONFIG.password) {
    console.error('❌ ERROR: Debes configurar APP_EMAIL y APP_PASSWORD en .env');
    process.exit(1);
  }

  // Configurar fechas (puedes cambiar estos valores)
  const START_DATE = '2025-11-08'; // Formato: YYYY-MM-DD
  const END_DATE = '2025-11-09';   // Formato: YYYY-MM-DD (empezamos con 2 días para probar)
  const DAYS_PER_RANGE = 1;        // Días por cada descarga (1 día para empezar)

  console.log('⚙️  CONFIGURACIÓN:');
  console.log(`   📅 Rango total: ${START_DATE} → ${END_DATE}`);
  console.log(`   📊 Días por descarga: ${DAYS_PER_RANGE}`);
  console.log(`   💾 Carpeta de descargas: ${CONFIG.downloadsDir}`);
  console.log('\n');

  const downloader = new ReportDownloader();
  
  try {
    // Generar rangos de fechas
    const dateRanges = generateDateRanges(START_DATE, END_DATE, DAYS_PER_RANGE);
    console.log(`📋 Se procesarán ${dateRanges.length} rangos de fechas\n`);

    // Inicializar navegador y hacer login
    await downloader.initialize();
    await downloader.login();
    await downloader.navigateToReports();

    // Procesar cada rango
    for (let i = 0; i < dateRanges.length; i++) {
      const range = dateRanges[i];
      console.log(`\n[${i + 1}/${dateRanges.length}] Procesando...`);
      
      await downloader.downloadReportForDateRange(range.start, range.end);
      
      // Esperar entre descargas para no saturar el servidor
      if (i < dateRanges.length - 1) {
        console.log('⏳ Esperando antes del próximo rango...');
        await sleep(5000); // 5 segundos entre descargas
      }
    }

    // Resumen final
    const downloadedFiles = downloader.getDownloadedFiles();
    
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║              PROCESO COMPLETADO                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log(`✅ Total de archivos descargados: ${downloadedFiles.length}`);
    console.log(`📁 Ubicación: ${CONFIG.downloadsDir}\n`);
    
    if (downloadedFiles.length > 0) {
      console.log('📄 Archivos descargados:');
      downloadedFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${path.basename(file)}`);
      });
    }
    
  } catch (error: any) {
    console.error('\n❌ ERROR CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await downloader.close();
  }
}

// ============================================================================
// EJECUTAR
// ============================================================================

main().catch((error) => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});