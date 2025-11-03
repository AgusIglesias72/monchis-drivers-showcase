// lib/services/external-drivers-processor.service.ts
// Adaptado de scripts/external-drivers.ts para ejecutarse como background job

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
// UTILIDADES (del script original)
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDownloadDir(): void {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }
}

function parseDate(dateStr: string): { day: number; month: number; year: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { day, month, year };
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
// CLASE DE AUTOMATIZACIÓN (del script original)
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
      headless: process.env.NODE_ENV === 'production',
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
    
    console.log(`\n📥 [Worker ${this.workerId}] Procesando: ${driver.nombre}`);
    
    if (!isFirstDriver) {
      const currentUrl = this.page.url();
      if (!currentUrl.includes('driverpayment')) {
        await this.page.goto(driversPageUrl, { waitUntil: 'networkidle' });
      }
    }
    
    console.log(`📅 [Worker ${this.workerId}] Configurando fechas...`);
    
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
    
    const fileName = generatePdfFileName(driver, startDate, endDate);
    const filePath = path.join(DOWNLOADS_DIR, fileName);
    
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
// PROCESADOR PRINCIPAL (usa backgroundJobsService)
// ============================================================================

export const externalDriversProcessor = {
  async processJob(jobId: string): Promise<void> {
    try {
      await backgroundJobsService.updateStatus(jobId, 'PROCESSING');
      await backgroundJobsService.addLog(jobId, '🚀 Iniciando procesamiento...');

      const job = await backgroundJobsService.getById(jobId);
      if (!job) throw new Error('Job no encontrado');

      const metadata = job.metadata as unknown as ProcessJobMetadata;
      
      // 1. Obtener conductores
      await backgroundJobsService.addLog(jobId, '📊 Obteniendo lista de conductores...');
      const drivers = await getExternalDrivers(metadata.spreadsheetsId, 'Drivers Externos');
      
      const driversToProcess = metadata.maxDrivers 
        ? drivers.slice(0, metadata.maxDrivers)
        : drivers;
      
      await backgroundJobsService.updateProgress(jobId, 0, driversToProcess.length);
      await backgroundJobsService.addLog(jobId, `✅ ${driversToProcess.length} conductores a procesar`);

      // 2. Crear carpetas en Drive
      await backgroundJobsService.addLog(jobId, '📁 Creando estructura de carpetas...');
      
      const jsAgencyFolderId = await createDriveFolder('JS', metadata.driveFolderId, metadata.ownerEmail);
      const mgAgencyFolderId = await createDriveFolder('M&G', metadata.driveFolderId, metadata.ownerEmail);
      
      const weekName = generateWeekFolderName(metadata.startDate, metadata.endDate);
      const jsWeekFolderId = await createDriveFolder(weekName, jsAgencyFolderId, metadata.ownerEmail);
      const mgWeekFolderId = await createDriveFolder(weekName, mgAgencyFolderId, metadata.ownerEmail);
      
      await backgroundJobsService.addLog(jobId, `✅ Carpetas creadas: JS/${weekName} y M&G/${weekName}`);

      // 3. Inicializar workers
      const workers: PDFDownloadAutomation[] = [];
      for (let i = 0; i < metadata.concurrency; i++) {
        const worker = new PDFDownloadAutomation(i + 1);
        await worker.initialize();
        await worker.login(metadata.email, metadata.password, metadata.loginUrl, metadata.driversPageUrl);
        workers.push(worker);
        await backgroundJobsService.addLog(jobId, `✅ Worker ${i + 1} inicializado`);
      }

      // 4. Dividir drivers entre workers
      const workerQueues: ExternalDriver[][] = Array.from({ length: metadata.concurrency }, () => []);
      
      for (let i = 0; i < driversToProcess.length; i++) {
        const workerIndex = i % metadata.concurrency;
        workerQueues[workerIndex].push(driversToProcess[i]);
      }

      // 5. Procesar drivers
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as Array<{ driver: string; error: string }>,
      };

      let processed = 0;

      const workerProcess = async (worker: PDFDownloadAutomation, driversList: ExternalDriver[]) => {
        for (let i = 0; i < driversList.length; i++) {
          const driver = driversList[i];
          const isFirst = processed === 0;
          const driverType = getDriverType(driver.nombre);
          const targetFolderId = driverType === 'M&G' ? mgWeekFolderId : jsWeekFolderId;
          
          try {
            await backgroundJobsService.addLog(jobId, `📥 Procesando: ${driver.nombre}`);
            
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
              `✅ [${processed}/${driversToProcess.length}] ${driver.nombre} → ${driverType}/${fileName}`
            );
            
          } catch (error: any) {
            results.failed++;
            results.errors.push({
              driver: driver.nombre,
              error: error.message,
            });
            processed++;
            
            await backgroundJobsService.updateProgress(jobId, processed, driversToProcess.length);
            await backgroundJobsService.addLog(
              jobId,
              `❌ [${processed}/${driversToProcess.length}] Error: ${driver.nombre} - ${error.message}`
            );
          }
          
          if (i < driversList.length - 1) {
            await sleep(DELAY_BETWEEN_DOWNLOADS);
          }
        }
      };

      const workerPromises = workers.map((worker, index) => 
        workerProcess(worker, workerQueues[index])
      );

      await Promise.all(workerPromises);

      // 6. Cerrar workers
      await backgroundJobsService.addLog(jobId, '🔄 Cerrando navegadores...');
      await Promise.all(workers.map(w => w.close()));

      // 7. Guardar resultado
      const finalResult = {
        successful: results.successful,
        failed: results.failed,
        total: driversToProcess.length,
        errors: results.errors,
        jsFolder: `JS/${weekName}`,
        mgFolder: `M&G/${weekName}`,
      };

      await backgroundJobsService.saveResult(jobId, finalResult);
      await backgroundJobsService.addLog(jobId, `✅ Completado: ${results.successful} exitosos, ${results.failed} fallidos`);

    } catch (error: any) {
      console.error(`Error en job ${jobId}:`, error);
      await backgroundJobsService.markAsFailed(jobId, error.message);
      await backgroundJobsService.addLog(jobId, `❌ Error fatal: ${error.message}`);
    }
  },
};