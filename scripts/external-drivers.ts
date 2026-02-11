// scripts/external-drivers.ts
// Script de automatización para descargar PDFs de pagos de conductores externos
// CON CONCURRENCIA

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import {
  getExternalDrivers,
  getOrCreateWeekFolder,
  uploadFileToDrive,
  createDriveFolder,
  ExternalDriver,
} from './utils/sheet-connection';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

interface ScriptConfig {
  spreadsheetsId: string;
  sheetName: string;
  driveFolderId: string;
  startDate: string;
  endDate: string;
  loginUrl: string;
  driversPageUrl: string;
  email: string;
  password: string;
  ownerEmail: string;
  headless: boolean;
  downloadDir: string;
  delayBetweenDownloads: number;
  maxDriversToProcess: number | null;
  concurrency: number; // Cuántos navegadores en paralelo
}

const CONFIG: ScriptConfig = {
  spreadsheetsId: process.env.GOOGLE_SHEETS_DRIVERS_EXTERNOS || '',
  sheetName: 'Drivers Externos',
  driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  
  // MODIFICAR ESTAS FECHAS SEGÚN LA SEMANA
  startDate: '2025-11-03',
  endDate: '2025-11-09',
  
  loginUrl: 'https://pr-721.durgl9xxo9p82.amplifyapp.com/auth/login',
  driversPageUrl: 'https://pr-721.durgl9xxo9p82.amplifyapp.com/reports/driverpayment',
  
  email: process.env.APP_EMAIL || '',
  password: process.env.APP_PASSWORD || '',
  ownerEmail: process.env.OWNER_EMAIL || process.env.APP_EMAIL || '',
  
  headless: process.env.HEADLESS === 'true',
  downloadDir: path.join(__dirname, '../downloads'),
  delayBetweenDownloads: 3000,
  
  maxDriversToProcess: null, // null = todos
  concurrency: 3, // 3 navegadores en paralelo
};

// ============================================================================
// UTILIDADES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDownloadDir(): void {
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
    console.log(`📁 Directorio de descargas creado: ${CONFIG.downloadDir}`);
  }
}

/**
 * Parsea una fecha en formato YYYY-MM-DD sin problemas de zona horaria
 */
function parseDate(dateStr: string): { day: number; month: number; year: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { day, month, year };
}

/**
 * Genera el nombre de la carpeta semanal
 * Ejemplo: "20-26 Oct"
 */
function generateWeekFolderName(startDate: string, endDate: string): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthName = months[end.month - 1]; // -1 porque months es 0-indexed
  
  return `${start.day}-${end.day} ${monthName}`;
}

function cleanDriverName(name: string): string {
  let cleaned = name
    .replace(/\s+(js|JS|Js)$/i, '')
    .replace(/\s+(m&g|M&G|M\&G)$/i, '')
    .trim();
  
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Detecta el tipo de conductor basado en el sufijo
 */
function getDriverType(name: string): 'JS' | 'M&G' {
  const lowerName = name.toLowerCase();
  if (lowerName.includes(' m&g') || lowerName.includes('m\&g')) return 'M&G';
  return 'JS'; // Por defecto JS (incluye los que tienen " js")
}

function generatePdfFileName(driver: ExternalDriver): string {
  const cleanName = cleanDriverName(driver.nombre);
  const weekRange = generateWeekFolderName(CONFIG.startDate, CONFIG.endDate);
  
  return `${cleanName} ${weekRange}.pdf`;
}

function generateProgressBar(current: number, total: number, barLength: number = 40): string {
  const progress = current / total;
  const filledLength = Math.round(barLength * progress);
  const bar = '━'.repeat(filledLength) + '━'.repeat(barLength - filledLength);
  return `[${current}/${total}] ${bar}`;
}

// ============================================================================
// AUTOMATIZACIÓN CON PLAYWRIGHT
// ============================================================================

class PDFDownloadAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private workerId: number;

  constructor(workerId: number) {
    this.workerId = workerId;
  }

  async initialize(): Promise<void> {
    ensureDownloadDir();
    
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: 50,
    });

    this.context = await this.browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1440, height: 900 },
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(60000);
  }

  async login(): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');
    
    console.log(`🔐 [Worker ${this.workerId}] Iniciando sesión...`);
    
    await this.page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle' });
    
    await this.page.fill('#basic_email', CONFIG.email);
    await this.page.fill('#basic_password', CONFIG.password);
    
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
      this.page.click('button[type="submit"]')
    ]);
    
    await sleep(2000);
    
    await this.page.goto(CONFIG.driversPageUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    try {
      await this.page.waitForSelector('input[placeholder="Fecha desde"]', { timeout: 10000 });
    } catch (error) {
      console.log(`⚠️  [Worker ${this.workerId}] No se detectó el campo de fecha, pero continuando...`);
    }
    
    console.log(`✅ [Worker ${this.workerId}] Sesión iniciada`);
  }

  async downloadPDF(driver: ExternalDriver, isFirstDriver: boolean = false): Promise<string> {
    if (!this.page || !this.context) throw new Error('Navegador no inicializado');
    
    console.log(`\n📥 [Worker ${this.workerId}] Procesando: ${driver.nombre}`);
    
    if (!isFirstDriver) {
      const currentUrl = this.page.url();
      if (!currentUrl.includes('driverpayment')) {
        await this.page.goto(CONFIG.driversPageUrl, { waitUntil: 'networkidle' });
      }
    }
    
    console.log(`📅 [Worker ${this.workerId}] Configurando fechas...`);
    
    const fechaDesdeInput = await this.page.waitForSelector('input[placeholder="Fecha desde"]', { timeout: 10000 });
    await fechaDesdeInput.click();
    await sleep(300);
    await fechaDesdeInput.click({ clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    await sleep(200);
    await fechaDesdeInput.type(CONFIG.startDate, { delay: 50 });
    await sleep(300);
    await this.page.keyboard.press('Tab');
    await sleep(300);
    
    const fechaHastaInput = await this.page.waitForSelector('input[placeholder="Fecha hasta"]', { timeout: 10000 });
    await fechaHastaInput.click();
    await sleep(300);
    await fechaHastaInput.click({ clickCount: 3 });
    await this.page.keyboard.press('Backspace');
    await sleep(200);
    await fechaHastaInput.type(CONFIG.endDate, { delay: 50 });
    await sleep(300);
    await this.page.keyboard.press('Tab');
    await sleep(500);
    
    console.log(`🔍 [Worker ${this.workerId}] Buscando conductor...`);
    
    const driverInput = await this.page.waitForSelector('#filtersDriverPaymentForm_driver', { timeout: 10000 });
    await driverInput.click();
    await driverInput.fill('');
    await driverInput.fill(driver.driver_id);
    await sleep(1000);
    
    const dropdown = await this.page.waitForSelector('.rc-virtual-list-holder-inner', { timeout: 5000 });
    const firstOption = await dropdown.$('div:first-child');
    
    if (!firstOption) {
      throw new Error(`No se encontró el conductor con ID: ${driver.driver_id}`);
    }
    
    await firstOption.click();
    console.log(`✅ [Worker ${this.workerId}] Conductor seleccionado`);
    
    console.log(`🔍 [Worker ${this.workerId}] Ejecutando búsqueda...`);
    
    const submitButtonSelectors = [
      'button:has-text("Buscar")',
      'button[type="submit"]',
      '.ant-btn-primary',
    ];
    
    let submitClicked = false;
    for (const selector of submitButtonSelectors) {
      try {
        const submitButton = await this.page.$(selector);
        if (submitButton) {
          await submitButton.click();
          submitClicked = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    console.log(`⏳ [Worker ${this.workerId}] Esperando resultados...`);
    await this.page.waitForSelector('.anticon-file-pdf', { timeout: 20000 });
    console.log(`✅ [Worker ${this.workerId}] Resultados cargados`);
    
    await sleep(1000);
    
    const fileName = generatePdfFileName(driver);
    const filePath = path.join(CONFIG.downloadDir, fileName);
    
    console.log(`📄 [Worker ${this.workerId}] Generando PDF...`);
    
    let blobUrl: string | null = null;
    
    const requestHandler = async (request: any) => {
      const url = request.url();
      if (request.method() === 'GET' && url.startsWith('blob:')) {
        blobUrl = url;
      }
    };
    
    this.page.on('request', requestHandler);
    
    try {
      const pdfIcon = await this.page.waitForSelector('.anticon-file-pdf', { timeout: 5000 });
      await pdfIcon.click();
      
      console.log(`⏳ [Worker ${this.workerId}] Esperando blob URL...`);
      
      for (let i = 0; i < 20; i++) {
        if (blobUrl) break;
        await sleep(250);
      }
      
      this.page.off('request', requestHandler);
      
      if (!blobUrl) {
        throw new Error('No se pudo capturar la URL del blob');
      }
      
      const capturedBlobUrl: string = blobUrl;
      
      console.log(`🌐 [Worker ${this.workerId}] Abriendo blob en nueva pestaña...`);
      const newPage = await this.context.newPage();
      
      await newPage.goto(capturedBlobUrl, { waitUntil: 'networkidle' });
      await sleep(2000);
      
      console.log(`💾 [Worker ${this.workerId}] Descargando PDF...`);
      
      const base64Data = await newPage.evaluate(async (url) => {
        const response = await fetch(url);
        const blob = await response.blob();
        
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }, capturedBlobUrl);
      
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, pdfBuffer);
      
      console.log(`✅ [Worker ${this.workerId}] PDF descargado: ${fileName}`);
      
      await newPage.close();
      
      console.log(`🔄 [Worker ${this.workerId}] Refrescando página...`);
      await this.page.reload({ waitUntil: 'networkidle' });
      await sleep(1000);
      
      return filePath;
      
    } catch (error: any) {
      this.page.off('request', requestHandler);
      
      console.error(`❌ [Worker ${this.workerId}] Error:`, error.message);
      
      try {
        await this.page.reload({ waitUntil: 'networkidle' });
        await sleep(1000);
      } catch (refreshError) {
        console.log(`⚠️  [Worker ${this.workerId}] Error al refrescar`);
      }
      
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL CON CONCURRENCIA
// ============================================================================

async function processDriversConcurrently(
  drivers: ExternalDriver[],
  folderIds: { JS: string; 'M&G': string },
  concurrency: number
): Promise<void> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ driver: string; error: string }>,
  };

  // Crear pool de workers
  const workers: PDFDownloadAutomation[] = [];
  for (let i = 0; i < concurrency; i++) {
    const worker = new PDFDownloadAutomation(i + 1);
    await worker.initialize();
    await worker.login();
    workers.push(worker);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 INICIANDO PROCESAMIENTO CONCURRENTE (${concurrency} workers)`);
  console.log(`${'='.repeat(80)}\n`);

  let processed = 0;
  const total = drivers.length;

  // Función para que un worker procese su cola de drivers
  const workerProcess = async (worker: PDFDownloadAutomation, driversList: ExternalDriver[]) => {
    for (let i = 0; i < driversList.length; i++) {
      const driver = driversList[i];
      const isFirst = processed === 0; // Solo el primer driver en absoluto
      const driverType = getDriverType(driver.nombre);
      const targetFolderId = folderIds[driverType];
      
      try {
        const pdfPath = await worker.downloadPDF(driver, isFirst);
        
        const fileName = generatePdfFileName(driver);
        await uploadFileToDrive(pdfPath, fileName, targetFolderId);
        
        fs.unlinkSync(pdfPath);
        
        results.successful++;
        processed++;
        
        console.log(`\n${generateProgressBar(processed, total)}`);
        console.log(`✅ [${processed}/${total}] ${driver.nombre} → ${driverType}/${fileName}\n`);
        
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          driver: driver.nombre,
          error: error.message,
        });
        processed++;
        
        console.log(`\n${generateProgressBar(processed, total)}`);
        console.log(`❌ [${processed}/${total}] Error: ${driver.nombre}`);
        console.log(`    ${error.message}\n`);
      }
      
      // Pequeña pausa entre cada driver
      if (i < driversList.length - 1) {
        await sleep(CONFIG.delayBetweenDownloads);
      }
    }
  };

  // Dividir drivers entre workers (round-robin)
  const workerQueues: ExternalDriver[][] = Array.from({ length: concurrency }, () => []);
  
  for (let i = 0; i < drivers.length; i++) {
    const workerIndex = i % concurrency;
    workerQueues[workerIndex].push(drivers[i]);
  }

  // Cada worker procesa su cola de forma secuencial
  const workerPromises = workers.map((worker, index) => 
    workerProcess(worker, workerQueues[index])
  );

  // Esperar a que todos los workers terminen
  await Promise.all(workerPromises);

  // Cerrar todos los workers
  console.log('\n🔄 Cerrando navegadores...');
  await Promise.all(workers.map(w => w.close()));

  // Mostrar resumen
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 RESUMEN FINAL');
  console.log(`${'='.repeat(80)}`);
  console.log(`✅ Exitosos: ${results.successful}`);
  console.log(`❌ Fallidos: ${results.failed}`);
  console.log(`📊 Total: ${processed}/${total}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ ERRORES:`);
    results.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.driver}: ${err.error}`);
    });
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log('🚀 SCRIPT DE DESCARGA DE PDFs - CONDUCTORES EXTERNOS');
    console.log(`${'='.repeat(80)}\n`);

    console.log('📋 Cargando conductores desde Google Sheets...');
    const drivers = await getExternalDrivers(CONFIG.spreadsheetsId, CONFIG.sheetName);
    console.log(`✅ ${drivers.length} conductores cargados\n`);

    console.log('📁 Preparando carpetas en Google Drive...');
    
    // Crear carpetas de agencias (JS y M&G) dentro de la carpeta madre
    const jsAgencyFolderId = await createDriveFolder('JS', CONFIG.driveFolderId, CONFIG.ownerEmail);
    const mgAgencyFolderId = await createDriveFolder('M&G', CONFIG.driveFolderId, CONFIG.ownerEmail);
    
    // Crear carpetas semanales dentro de cada agencia
    const weekName = generateWeekFolderName(CONFIG.startDate, CONFIG.endDate);
    const jsWeekFolderId = await createDriveFolder(weekName, jsAgencyFolderId, CONFIG.ownerEmail);
    const mgWeekFolderId = await createDriveFolder(weekName, mgAgencyFolderId, CONFIG.ownerEmail);
    
    console.log(`✅ Estructura de carpetas lista:`);
    console.log(`   📁 JS/${weekName}`);
    console.log(`   📁 M&G/${weekName}\n`);

    const driversToProcess = CONFIG.maxDriversToProcess 
      ? drivers.slice(0, CONFIG.maxDriversToProcess)
      : drivers;
    
    if (CONFIG.maxDriversToProcess) {
      console.log(`⚠️  MODO PRUEBA: Procesando solo ${driversToProcess.length} conductores\n`);
    }

    // Separar drivers por tipo
    const jsCarpeta = { folderId: jsWeekFolderId, drivers: [] as ExternalDriver[] };
    const mgCarpeta = { folderId: mgWeekFolderId, drivers: [] as ExternalDriver[] };
    
    for (const driver of driversToProcess) {
      const type = getDriverType(driver.nombre);
      if (type === 'M&G') {
        mgCarpeta.drivers.push(driver);
      } else {
        jsCarpeta.drivers.push(driver);
      }
    }
    
    console.log(`📊 Distribución:`);
    console.log(`   JS: ${jsCarpeta.drivers.length} conductores`);
    console.log(`   M&G: ${mgCarpeta.drivers.length} conductores\n`);

    // Procesar ambos grupos con sus carpetas correspondientes
    await processDriversConcurrently(
      driversToProcess, 
      { JS: jsWeekFolderId, 'M&G': mgWeekFolderId },
      CONFIG.concurrency
    );

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ PROCESO COMPLETADO');
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

main();