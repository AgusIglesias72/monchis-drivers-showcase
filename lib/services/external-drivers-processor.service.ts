// lib/services/external-drivers-processor.service.ts
// Procesador de conductores externos usando Playwright - VERSIÓN HEADLESS TRUE

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { backgroundJobsService } from './background-jobs.service';
import {
  getExternalDrivers,
  createDriveFolder,
  uploadFileToDrive,
  generateWeekFolderName,
  ExternalDriver,
} from './google-sheets-drive.service';

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');
const DELAY_BETWEEN_DOWNLOADS = 3000;

interface ProcessJobMetadata {
  startDate: string;
  endDate: string;
  concurrency: number;
  maxDrivers: number | null;
  spreadsheetsId: string;
  driveFolderId: string;
  loginUrl: string;
  driversPageUrl: string;
  email: string;
  password: string;
  ownerEmail?: string;
}

// ============================================================================
// UTILIDADES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDownloadDir(): void {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }
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

function getDriverType(name: string): 'JS' | 'M&G' {
  const lowerName = name.toLowerCase();
  if (lowerName.includes(' m&g') || lowerName.includes('m&g')) return 'M&G';
  return 'JS';
}

function generatePdfFileName(driver: ExternalDriver, startDate: string, endDate: string): string {
  const cleanName = cleanDriverName(driver.nombre);
  const weekRange = generateWeekFolderName(startDate, endDate);
  return `${cleanName} ${weekRange}.pdf`;
}

// ============================================================================
// CLASE DE AUTOMATIZACIÓN
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
      headless: false, // ✅ HEADLESS FALSE para producción
      slowMo: 50,
    });

    this.context = await this.browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1920, height: 1080 },
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);
  }

  async login(email: string, password: string, loginUrl: string, driversPageUrl: string): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');
    
    console.log(`🔐 [Worker ${this.workerId}] Iniciando sesión...`);
    
    await this.page.goto(loginUrl, { waitUntil: 'networkidle' });
    
    await this.page.fill('#basic_email', email);
    await this.page.fill('#basic_password', password);
    
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
      this.page.click('button[type="submit"]')
    ]);
    
    await sleep(2000);
    
    await this.page.goto(driversPageUrl, { 
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

  async downloadPDF(
    driver: ExternalDriver,
    startDate: string,
    endDate: string,
    driversPageUrl: string,
    isFirstDriver: boolean = false
  ): Promise<string> {
    if (!this.page || !this.context) throw new Error('Navegador no inicializado');
    
    if (!isFirstDriver) {
      const currentUrl = this.page.url();
      if (!currentUrl.includes('driverpayment')) {
        await this.page.goto(driversPageUrl, { waitUntil: 'networkidle' });
      }
    }
    
    // Configurar fechas
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
    
    // Buscar conductor
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
    
    // Ejecutar búsqueda
    const submitButtonSelectors = [
      'button:has-text("Buscar")',
      'button[type="submit"]',
      '.ant-btn-primary',
    ];
    
    for (const selector of submitButtonSelectors) {
      try {
        const submitButton = await this.page.$(selector);
        if (submitButton) {
          await submitButton.click();
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    await this.page.waitForSelector('.anticon-file-pdf', { timeout: 20000 });
    await sleep(1000);
    
    const fileName = generatePdfFileName(driver, startDate, endDate);
    const filePath = path.join(DOWNLOADS_DIR, fileName);
    
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
      
      for (let i = 0; i < 20; i++) {
        if (blobUrl) break;
        await sleep(250);
      }
      
      this.page.off('request', requestHandler);
      
      if (!blobUrl) {
        throw new Error('No se pudo capturar la URL del blob');
      }
      
      // ✅ FIX 1: Dar tiempo antes de abrir nueva pestaña
      await sleep(1000);
      
      const capturedBlobUrl: string = blobUrl;
      const newPage = await this.context.newPage();
      
      // Ir al blob y manejar posibles errores de navegación
      await newPage.goto(capturedBlobUrl, { 
        waitUntil: 'load',
        timeout: 10000 
      }).catch((err) => {
        // Ignorar errores de navegación - el contenido puede estar cargándose
        console.log(`⚠️  [Worker ${this.workerId}] Nav warning (probablemente OK):`, err.message);
      });
      
      // ✅ FIX 2: Aumentar el sleep para dar tiempo al blob
      await sleep(3000);
      
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
      
      await newPage.close();
      await this.page.reload({ waitUntil: 'networkidle' });
      await sleep(1000);
      
      return filePath;
      
    } catch (error: any) {
      this.page.off('request', requestHandler);
      
      try {
        await this.page.reload({ waitUntil: 'networkidle' });
        await sleep(1000);
      } catch (refreshError) {
        // Ignorar
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
// PROCESADOR PRINCIPAL
// ============================================================================

export const externalDriversProcessor = {
  async processJob(jobId: string): Promise<void> {
    console.log(`🚀🚀🚀 [PROCESSOR] Iniciando processJob para ${jobId} 🚀🚀🚀`);
    
    try {
      // 1. Obtener el job PRIMERO
      console.log(`[${jobId}] Obteniendo job de la base de datos...`);
      const job = await backgroundJobsService.getById(jobId);
      
      if (!job) {
        console.error(`❌ [${jobId}] Job no encontrado en la base de datos`);
        throw new Error('Job no encontrado');
      }
      
      console.log(`✅ [${jobId}] Job encontrado. Status actual: ${job.status}`);

      // 2. Cambiar status a PROCESSING
      console.log(`[${jobId}] Cambiando status a PROCESSING...`);
      await backgroundJobsService.updateStatus(jobId, 'PROCESSING');
      console.log(`✅ [${jobId}] Status cambiado a PROCESSING`);
      
      await backgroundJobsService.addLog(jobId, '🚀 Iniciando procesamiento...');
      console.log(`✅ [${jobId}] Log inicial agregado`);

      // 3. Validar metadata
      const metadata = job.metadata as unknown as ProcessJobMetadata;
      console.log(`[${jobId}] Metadata:`, {
        startDate: metadata.startDate,
        endDate: metadata.endDate,
        concurrency: metadata.concurrency,
        maxDrivers: metadata.maxDrivers,
        hasSpreadsheetId: !!metadata.spreadsheetsId,
        hasDriveFolderId: !!metadata.driveFolderId,
        hasEmail: !!metadata.email,
        hasPassword: !!metadata.password,
      });
      
      if (!metadata.spreadsheetsId) {
        throw new Error('Missing spreadsheetsId in metadata');
      }
      if (!metadata.driveFolderId) {
        throw new Error('Missing driveFolderId in metadata');
      }
      if (!metadata.email || !metadata.password) {
        throw new Error('Missing email or password in metadata');
      }
      
      // 4. Obtener conductores
      console.log(`[${jobId}] Obteniendo conductores desde Google Sheets...`);
      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, '📊 OBTENIENDO CONDUCTORES');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      
      const drivers = await getExternalDrivers(metadata.spreadsheetsId, 'Drivers Externos');
      console.log(`✅ [${jobId}] ${drivers.length} conductores obtenidos de Google Sheets`);
      
      const driversToProcess = metadata.maxDrivers 
        ? drivers.slice(0, metadata.maxDrivers)
        : drivers;
      
      console.log(`[${jobId}] Procesando ${driversToProcess.length} conductores`);
      await backgroundJobsService.updateProgress(jobId, 0, driversToProcess.length);
      await backgroundJobsService.addLog(jobId, `✅ ${driversToProcess.length} conductores encontrados`);
      await backgroundJobsService.addLog(jobId, '');

      // 5. Crear carpetas
      console.log(`[${jobId}] Creando carpetas en Google Drive...`);
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, '📁 PREPARANDO CARPETAS EN DRIVE');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      
      const jsAgencyFolderId = await createDriveFolder('JS', metadata.driveFolderId, metadata.ownerEmail);
      const mgAgencyFolderId = await createDriveFolder('M&G', metadata.driveFolderId, metadata.ownerEmail);
      
      const weekName = generateWeekFolderName(metadata.startDate, metadata.endDate);
      const jsWeekFolderId = await createDriveFolder(weekName, jsAgencyFolderId, metadata.ownerEmail);
      const mgWeekFolderId = await createDriveFolder(weekName, mgAgencyFolderId, metadata.ownerEmail);
      
      console.log(`✅ [${jobId}] Carpetas creadas en Drive`);
      await backgroundJobsService.addLog(jobId, `✅ Carpeta JS: ${weekName}`);
      await backgroundJobsService.addLog(jobId, `✅ Carpeta M&G: ${weekName}`);
      await backgroundJobsService.addLog(jobId, '');

      // 6. Inicializar workers
      console.log(`[${jobId}] Iniciando ${metadata.concurrency} workers con Playwright...`);
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, `🤖 INICIANDO ${metadata.concurrency} WORKERS`);
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      
      const workers: PDFDownloadAutomation[] = [];
      for (let i = 0; i < metadata.concurrency; i++) {
        console.log(`[${jobId}] Inicializando worker ${i + 1}...`);
        const worker = new PDFDownloadAutomation(i + 1);
        await worker.initialize();
        console.log(`[${jobId}] Worker ${i + 1} inicializado, haciendo login...`);
        await worker.login(metadata.email, metadata.password, metadata.loginUrl, metadata.driversPageUrl);
        workers.push(worker);
        await backgroundJobsService.addLog(jobId, `✅ Worker ${i + 1} listo`);
        console.log(`✅ [${jobId}] Worker ${i + 1} listo`);
      }
      
      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, '🚀 PROCESANDO CONDUCTORES');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, '');

      // 7. Dividir drivers
      console.log(`[${jobId}] Dividiendo conductores entre ${metadata.concurrency} workers...`);
      const workerQueues: ExternalDriver[][] = Array.from({ length: metadata.concurrency }, () => []);
      
      for (let i = 0; i < driversToProcess.length; i++) {
        workerQueues[i % metadata.concurrency].push(driversToProcess[i]);
      }
      
      console.log(`[${jobId}] Distribución de conductores:`, 
        workerQueues.map((q, i) => `Worker ${i + 1}: ${q.length}`).join(', ')
      );

      // 8. Procesar
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as Array<{ driver: string; error: string }>,
      };

      let processed = 0;

      const workerProcess = async (worker: PDFDownloadAutomation, driversList: ExternalDriver[], workerIndex: number) => {
        console.log(`[${jobId}] Worker ${workerIndex + 1} comenzando procesamiento de ${driversList.length} conductores`);
        
        for (let i = 0; i < driversList.length; i++) {
          const driver = driversList[i];
          const isFirst = processed === 0;
          const driverType = getDriverType(driver.nombre);
          const targetFolderId = driverType === 'M&G' ? mgWeekFolderId : jsWeekFolderId;
          
          try {
            console.log(`[${jobId}] Worker ${workerIndex + 1} procesando: ${cleanDriverName(driver.nombre)}`);
            
            const pdfPath = await worker.downloadPDF(
              driver,
              metadata.startDate,
              metadata.endDate,
              metadata.driversPageUrl,
              isFirst
            );
            
            const fileName = generatePdfFileName(driver, metadata.startDate, metadata.endDate);
            await uploadFileToDrive(pdfPath, fileName, targetFolderId);
            
            fs.unlinkSync(pdfPath);
            
            results.successful++;
            processed++;
            
            await backgroundJobsService.updateProgress(jobId, processed, driversToProcess.length);
            await backgroundJobsService.addLog(
              jobId, 
              `✅ [${processed}/${driversToProcess.length}] ${cleanDriverName(driver.nombre)} → ${driverType}`
            );
            
            console.log(`✅ [${jobId}] Worker ${workerIndex + 1}: ${cleanDriverName(driver.nombre)} completado (${processed}/${driversToProcess.length})`);
            
          } catch (error: any) {
            console.error(`❌ [${jobId}] Worker ${workerIndex + 1} error con ${cleanDriverName(driver.nombre)}:`, error.message);
            
            results.failed++;
            results.errors.push({ driver: driver.nombre, error: error.message });
            processed++;
            
            await backgroundJobsService.updateProgress(jobId, processed, driversToProcess.length);
            await backgroundJobsService.addLog(jobId, `❌ [${processed}/${driversToProcess.length}] ${cleanDriverName(driver.nombre)} - ERROR`);
          }
          
          if (i < driversList.length - 1) {
            await sleep(DELAY_BETWEEN_DOWNLOADS);
          }
        }
        
        console.log(`[${jobId}] Worker ${workerIndex + 1} completó su cola de conductores`);
      };

      console.log(`[${jobId}] Iniciando procesamiento paralelo...`);
      await Promise.all(workers.map((worker, index) => workerProcess(worker, workerQueues[index], index)));
      console.log(`✅ [${jobId}] Todos los workers completaron su trabajo`);

      // 9. Cerrar
      console.log(`[${jobId}] Cerrando navegadores...`);
      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, '🏁 FINALIZANDO PROCESO');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await Promise.all(workers.map(w => w.close()));
      console.log(`✅ [${jobId}] Navegadores cerrados`);

      // 10. Resultado con detalles de errores
      const finalResult = {
        successful: results.successful,
        failed: results.failed,
        total: driversToProcess.length,
        errors: results.errors,
        jsFolder: `JS/${weekName}`,
        mgFolder: `M&G/${weekName}`,
      };

      console.log(`[${jobId}] Guardando resultado final...`);
      await backgroundJobsService.saveResult(jobId, finalResult);
      
      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '📊 RESUMEN FINAL:');
      await backgroundJobsService.addLog(jobId, `   ✅ Exitosos: ${results.successful}`);
      await backgroundJobsService.addLog(jobId, `   ❌ Fallidos: ${results.failed}`);
      await backgroundJobsService.addLog(jobId, `   📁 Total: ${driversToProcess.length}`);
      
      if (results.errors.length > 0) {
        await backgroundJobsService.addLog(jobId, '');
        await backgroundJobsService.addLog(jobId, '⚠️  CONDUCTORES CON ERRORES:');
        for (const err of results.errors) {
          await backgroundJobsService.addLog(jobId, `   • ${cleanDriverName(err.driver)}`);
        }
        await backgroundJobsService.addLog(jobId, '');
        await backgroundJobsService.addLog(jobId, '💡 Tip: Puedes reintentar los fallidos manualmente desde la app');
      }
      
      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '✅ Proceso completado exitosamente');
      
      console.log(`✅✅✅ [${jobId}] Proceso completado exitosamente ✅✅✅`);

    } catch (error: any) {
      console.error(`❌❌❌ [PROCESSOR] Error crítico en job ${jobId}:`, error);
      console.error(`Stack trace:`, error.stack);
      
      try {
        await backgroundJobsService.markAsFailed(jobId, error.message);
        await backgroundJobsService.addLog(jobId, `❌ Error fatal: ${error.message}`);
      } catch (dbError) {
        console.error(`❌ No se pudo actualizar el job en la DB:`, dbError);
      }
      
      throw error;
    }
  },
};