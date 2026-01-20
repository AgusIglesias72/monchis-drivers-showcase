// lib/services/external-drivers-processor.service.ts
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { backgroundJobsService } from './background-jobs.service';
import {
  getDriversFromReportePagos,
  ReportDriver,
  createDriveFolder,
  uploadBufferToDrive,
  generateWeekFolderName,
} from './google-sheets-drive.service';
import { performGoogleOktaLogin } from '../utils/google-okta-login';
import { BrowserSession } from './reports-processor.service';

const DELAY_BETWEEN_DOWNLOADS = 3000;

const RETRY_CONFIG = {
  maxRetryAttempts: 2,
  delayBeforeRetry: 10000,
};

interface ProcessJobMetadata {
  startDate: string;
  endDate: string;
  concurrency: number;
  maxDrivers: number | null;
  spreadsheetsId: string;
  reportSheetName: string;
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

function cleanDriverName(nombre: string, apellido: string): string {
  const cleanApellido = apellido
    .replace(/\s+(js|JS|Js)$/i, '')
    .replace(/\s+(m&g|M&G|M\&G)$/i, '')
    .trim();
  
  const fullName = `${nombre} ${cleanApellido}`;
  
  return fullName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function generatePdfFileName(driver: ReportDriver, startDate: string, endDate: string): string {
  const cleanName = cleanDriverName(driver.nombre, driver.apellido);
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
    try {
      const isProduction = process.env.NODE_ENV === 'production';

      // Configuración para Docker/Railway
      const launchOptions: any = {
        headless: isProduction,
      };

      // En producción (Docker), usar configuración específica
      if (isProduction) {
        console.log(`🐳 [Worker ${this.workerId}] Detectado entorno de producción - configurando para Docker/Railway`);
        launchOptions.args = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ];
        launchOptions.headless = true;
      } else {
        launchOptions.slowMo = 50;
      }

      console.log(`📦 [Worker ${this.workerId}] Lanzando Chromium con headless=${launchOptions.headless}, args=${JSON.stringify(launchOptions.args || [])}`);

      this.browser = await chromium.launch(launchOptions);
      console.log(`✅ [Worker ${this.workerId}] Chromium lanzado exitosamente`);

      this.context = await this.browser.newContext({
        acceptDownloads: true,
        viewport: { width: 1920, height: 1080 },
      });
      console.log(`✅ [Worker ${this.workerId}] Contexto creado`);

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(60000);
      console.log(`✅ [Worker ${this.workerId}] Navegador completamente inicializado`);

    } catch (error: any) {
      console.error(`❌ [Worker ${this.workerId}] Error al inicializar navegador: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
      throw error;
    }
  }

  async initializeWithSession(session: BrowserSession): Promise<void> {
    console.log(`🔄 [Worker ${this.workerId}] Clonando sesión del navegador principal...`);

    // Usar el mismo browser pero crear un nuevo contexto con las cookies
    this.browser = session.browser;

    this.context = await this.browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1920, height: 1080 },
    });

    // Agregar cookies al nuevo contexto
    await this.context.addCookies(session.cookies);
    console.log(`   ✓ ${session.cookies.length} cookies clonadas`);

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(60000);

    // Restaurar localStorage y sessionStorage
    await this.page.evaluate(
      ({ localStorage, sessionStorage }) => {
        // Restaurar localStorage
        for (const [key, value] of Object.entries(localStorage)) {
          window.localStorage.setItem(key, value);
        }
        // Restaurar sessionStorage
        for (const [key, value] of Object.entries(sessionStorage)) {
          window.sessionStorage.setItem(key, value);
        }
      },
      { localStorage: session.localStorage, sessionStorage: session.sessionStorage }
    );

    console.log(`✅ [Worker ${this.workerId}] Sesión clonada exitosamente`);
  }

  async login(email: string, password: string, loginUrl: string, driversPageUrl: string): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');

    console.log(`🔐 [Worker ${this.workerId}] Iniciando sesión con Google Workspace + Okta...`);

    await performGoogleOktaLogin({
      page: this.page,
      loginUrl,
      targetUrl: driversPageUrl,
      workerId: this.workerId,
    });

    try {
      await this.page.waitForSelector('input[placeholder="Fecha desde"]', { timeout: 10000 });
    } catch (error) {
      console.log(`⚠️  [Worker ${this.workerId}] No se detectó el campo de fecha, pero continuando...`);
    }

    console.log(`✅ [Worker ${this.workerId}] Sesión iniciada`);
  }

  async downloadPDFToBuffer(
    driver: ReportDriver,
    startDate: string,
    endDate: string,
    driversPageUrl: string,
    isFirstDriver: boolean = false
  ): Promise<Buffer> {
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
    
    console.log(`🔍 [Worker ${this.workerId}] Buscando conductor: ${driver.fullName}`);
    
    const driverSelect = await this.page.waitForSelector('.ant-select-selector', { 
      timeout: 10000 
    });
    await driverSelect.click();
    await sleep(500);
    
    const driverInput = await this.page.waitForSelector('#filtersDriverPaymentForm_driver', { 
      timeout: 10000 
    });
    
    await driverInput.fill(driver.fullName);
    await sleep(2000);
    
    console.log(`⏳ [Worker ${this.workerId}] Esperando dropdown...`);
    
    const dropdown = await this.page.waitForSelector('.rc-virtual-list-holder-inner', { 
      timeout: 15000,
      state: 'visible'
    });
    
    console.log(`✅ [Worker ${this.workerId}] Dropdown apareció`);
    
    const firstOption = await dropdown.$('div:first-child');
    
    if (!firstOption) {
      throw new Error(`No se encontró ninguna opción para: ${driver.fullName}`);
    }
    
    await firstOption.click();
    await sleep(500);
    
    console.log(`✅ [Worker ${this.workerId}] Conductor seleccionado: ${driver.fullName}`);
    
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
    await sleep(2000);
    
    console.log(`⏳ [Worker ${this.workerId}] Abriendo visor de PDF...`);
    
    const pdfIcon = await this.page.waitForSelector('.anticon-file-pdf', { timeout: 5000 });
    await pdfIcon.click();
    
    try {
      await sleep(3000);
      
      console.log(`🔍 [Worker ${this.workerId}] Buscando iframe con PDF...`);
      
      const iframes = await this.page.$$('iframe');
      let pdfBuffer: Buffer | null = null;
      
      for (const iframe of iframes) {
        try {
          const src = await iframe.getAttribute('src');
          
          if (src && src.startsWith('blob:')) {
            console.log(`📄 [Worker ${this.workerId}] Iframe con blob encontrado`);
            
            const base64Data = await this.page.evaluate(async (blobUrl) => {
              const response = await fetch(blobUrl);
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
            }, src);
            
            pdfBuffer = Buffer.from(base64Data, 'base64');
            
            if (pdfBuffer.length > 1000) {
              console.log(`✅ [Worker ${this.workerId}] PDF capturado (${pdfBuffer.length} bytes)`);
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!pdfBuffer || pdfBuffer.length < 1000) {
        console.log(`🔍 [Worker ${this.workerId}] Buscando embed/object con PDF...`);
        
        const embeds = await this.page.$$('embed[type="application/pdf"], object[type="application/pdf"]');
        
        for (const embed of embeds) {
          try {
            const src = await embed.getAttribute('src') || await embed.getAttribute('data');
            
            if (src && src.startsWith('blob:')) {
              const base64Data = await this.page.evaluate(async (blobUrl) => {
                const response = await fetch(blobUrl);
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
              }, src);
              
              pdfBuffer = Buffer.from(base64Data, 'base64');
              
              if (pdfBuffer.length > 1000) {
                console.log(`✅ [Worker ${this.workerId}] PDF capturado (${pdfBuffer.length} bytes)`);
                break;
              }
            }
          } catch (error) {
            continue;
          }
        }
      }
      
      if (!pdfBuffer || pdfBuffer.length < 1000) {
        console.log(`🔍 [Worker ${this.workerId}] Buscando todos los blobs...`);
        
        const allBlobs = await this.page.evaluate(() => {
          const blobs: string[] = [];
          
          document.querySelectorAll('iframe').forEach(iframe => {
            const src = iframe.getAttribute('src');
            if (src && src.startsWith('blob:')) blobs.push(src);
          });
          
          document.querySelectorAll('embed, object').forEach(el => {
            const src = el.getAttribute('src') || el.getAttribute('data');
            if (src && src.startsWith('blob:')) blobs.push(src);
          });
          
          return blobs;
        });
        
        for (const blobUrl of allBlobs) {
          try {
            const base64Data = await this.page.evaluate(async (url) => {
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
            }, blobUrl);
            
            const testBuffer = Buffer.from(base64Data, 'base64');
            
            if (testBuffer.length > 1000) {
              pdfBuffer = testBuffer;
              console.log(`✅ [Worker ${this.workerId}] PDF válido (${pdfBuffer.length} bytes)`);
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }
      
      if (!pdfBuffer || pdfBuffer.length < 1000) {
        throw new Error('No se pudo capturar un PDF válido');
      }
      
      try {
        const closeSelectors = [
          '.ant-modal-close',
          'button[aria-label="Close"]',
          '.ant-modal-footer button:has-text("Cerrar")',
          '.ant-modal-footer button:has-text("Cancelar")'
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
        await this.page.reload({ waitUntil: 'networkidle' });
      }
      
      await sleep(1000);
      
      return pdfBuffer;
      
    } catch (error: any) {
      console.error(`❌ [Worker ${this.workerId}] Error capturando PDF:`, error.message);
      
      try {
        await this.page.reload({ waitUntil: 'networkidle' });
      } catch (reloadError) {
        // Ignorar
      }
      
      throw new Error(`No se pudo capturar el PDF: ${error.message}`);
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
  async processJob(jobId: string, sharedSession?: BrowserSession): Promise<void> {
    console.log(`🚀🚀🚀 [PROCESSOR] Iniciando processJob para ${jobId} 🚀🚀🚀`);

    if (sharedSession) {
      console.log(`🔄 [PROCESSOR] Sesión compartida detectada - se clonará para los workers`);
    }
    
    try {
      console.log(`[${jobId}] Obteniendo job de la base de datos...`);
      const job = await backgroundJobsService.getById(jobId);
      
      if (!job) {
        console.error(`❌ [${jobId}] Job no encontrado en la base de datos`);
        throw new Error('Job no encontrado');
      }
      
      console.log(`✅ [${jobId}] Job encontrado. Status actual: ${job.status}`);

      console.log(`[${jobId}] Cambiando status a PROCESSING...`);
      await backgroundJobsService.updateStatus(jobId, 'PROCESSING');
      console.log(`✅ [${jobId}] Status cambiado a PROCESSING`);
      
      await backgroundJobsService.addLog(jobId, '🚀 Iniciando procesamiento...');
      console.log(`✅ [${jobId}] Log inicial agregado`);

      const metadata = job.metadata as unknown as ProcessJobMetadata;
      console.log(`[${jobId}] Metadata:`, {
        startDate: metadata.startDate,
        endDate: metadata.endDate,
        concurrency: metadata.concurrency,
        maxDrivers: metadata.maxDrivers,
        hasSpreadsheetId: !!metadata.spreadsheetsId,
        hasReportSheetName: !!metadata.reportSheetName,
        hasDriveFolderId: !!metadata.driveFolderId,
        hasEmail: !!metadata.email,
        hasPassword: !!metadata.password,
      });
      
      if (!metadata.spreadsheetsId) throw new Error('Missing spreadsheetsId in metadata');
      if (!metadata.reportSheetName) throw new Error('Missing reportSheetName in metadata');
      if (!metadata.driveFolderId) throw new Error('Missing driveFolderId in metadata');
      if (!metadata.email || !metadata.password) throw new Error('Missing email or password in metadata');
      
      console.log(`[${jobId}] Obteniendo conductores desde Reporte Pagos...`);
      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, '📊 LEYENDO DRIVERS DESDE REPORTE PAGOS');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      
      const drivers = await getDriversFromReportePagos(
        metadata.spreadsheetsId,
        metadata.reportSheetName,
        metadata.startDate,
        metadata.endDate
      );
      
      console.log(`✅ [${jobId}] ${drivers.length} conductores obtenidos de Reporte Pagos`);
      
      const driversToProcess = metadata.maxDrivers 
        ? drivers.slice(0, metadata.maxDrivers)
        : drivers;
      
      console.log(`[${jobId}] Procesando ${driversToProcess.length} conductores`);
      await backgroundJobsService.updateProgress(jobId, 0, driversToProcess.length);
      await backgroundJobsService.addLog(jobId, `✅ ${driversToProcess.length} conductores encontrados`);
      await backgroundJobsService.addLog(jobId, `   JS: ${driversToProcess.filter(d => d.type === 'JS').length}`);
      await backgroundJobsService.addLog(jobId, `   M&G: ${driversToProcess.filter(d => d.type === 'M&G').length}`);
      await backgroundJobsService.addLog(jobId, '');

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

      // Determinar número de workers según si hay sesión compartida
      const numWorkers = sharedSession ? 1 : metadata.concurrency;

      console.log(`[${jobId}] Iniciando ${numWorkers} worker(s) con Playwright...`);
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');

      if (sharedSession) {
        await backgroundJobsService.addLog(jobId, `🤖 USANDO 1 WORKER (sesión compartida)`);
        await backgroundJobsService.addLog(jobId, '🔄 Sin login adicional - reutilizando sesión del paso anterior');
      } else {
        await backgroundJobsService.addLog(jobId, `🤖 INICIANDO ${metadata.concurrency} WORKERS`);
      }

      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');

      const workers: PDFDownloadAutomation[] = [];

      if (sharedSession) {
        // Usar un solo worker con la sesión compartida (sin login)
        console.log(`[${jobId}] Reutilizando navegador del paso anterior...`);
        const worker = new PDFDownloadAutomation(1);

        // Simplemente asignar la página existente
        worker['browser'] = sharedSession.browser;
        worker['context'] = sharedSession.context;
        worker['page'] = sharedSession.page;

        workers.push(worker);
        await backgroundJobsService.addLog(jobId, `✅ Worker reutilizando sesión existente`);
        console.log(`✅ [${jobId}] Worker listo con sesión compartida`);

      } else {
        // Flujo normal con múltiples workers y login
        for (let i = 0; i < metadata.concurrency; i++) {
          console.log(`[${jobId}] Inicializando worker ${i + 1}...`);
          const worker = new PDFDownloadAutomation(i + 1);

          await worker.initialize();
          console.log(`[${jobId}] Worker ${i + 1} inicializado, haciendo login...`);
          await worker.login(metadata.email, metadata.password, metadata.loginUrl, metadata.driversPageUrl);
          await backgroundJobsService.addLog(jobId, `✅ Worker ${i + 1} listo`);

          workers.push(worker);
          console.log(`✅ [${jobId}] Worker ${i + 1} listo`);
        }
      }

      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, '🚀 PROCESANDO CONDUCTORES');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, '');

      console.log(`[${jobId}] Dividiendo conductores entre ${numWorkers} worker(s)...`);
      const workerQueues: ReportDriver[][] = Array.from({ length: numWorkers }, () => []);

      for (let i = 0; i < driversToProcess.length; i++) {
        workerQueues[i % numWorkers].push(driversToProcess[i]);
      }

      console.log(`[${jobId}] Distribución de conductores:`,
        workerQueues.map((q, i) => `Worker ${i + 1}: ${q.length}`).join(', ')
      );

      // ✅ CAMBIO: Guardar objeto driver completo en errors
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as Array<{ driver: ReportDriver; error: string }>,
      };

      let processed = 0;

      const workerProcess = async (worker: PDFDownloadAutomation, driversList: ReportDriver[], workerIndex: number) => {
        console.log(`[${jobId}] Worker ${workerIndex + 1} comenzando procesamiento de ${driversList.length} conductores`);
        
        for (let i = 0; i < driversList.length; i++) {
          const driver = driversList[i];
          const isFirst = processed === 0;
          const targetFolderId = driver.type === 'M&G' ? mgWeekFolderId : jsWeekFolderId;
          
          try {
            const cleanName = cleanDriverName(driver.nombre, driver.apellido);
            console.log(`[${jobId}] Worker ${workerIndex + 1} procesando: ${cleanName}`);
            
            const pdfBuffer = await worker.downloadPDFToBuffer(
              driver,
              metadata.startDate,
              metadata.endDate,
              metadata.driversPageUrl,
              isFirst
            );
            
            const fileName = generatePdfFileName(driver, metadata.startDate, metadata.endDate);
            await uploadBufferToDrive(pdfBuffer, fileName, targetFolderId);
            
            results.successful++;
            processed++;
            
            await backgroundJobsService.updateProgress(jobId, processed, driversToProcess.length);
            await backgroundJobsService.addLog(
              jobId, 
              `✅ [${processed}/${driversToProcess.length}] ${cleanName} → ${driver.type}`
            );
            
            console.log(`✅ [${jobId}] Worker ${workerIndex + 1}: ${cleanName} completado (${processed}/${driversToProcess.length})`);
            
          } catch (error: any) {
            const cleanName = cleanDriverName(driver.nombre, driver.apellido);
            console.error(`❌ [${jobId}] Worker ${workerIndex + 1} error con ${cleanName}:`, error.message);
            
            results.failed++;
            results.errors.push({ driver: driver, error: error.message }); // ✅ Guardar objeto completo
            processed++;
            
            await backgroundJobsService.updateProgress(jobId, processed, driversToProcess.length);
            await backgroundJobsService.addLog(jobId, `❌ [${processed}/${driversToProcess.length}] ${cleanName} - ERROR`);
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

      // ✅ SISTEMA DE RETRY AUTOMÁTICO
      let retryAttempt = 0;
      let failedDrivers = results.errors.map(e => e.driver);
      
      while (failedDrivers.length > 0 && retryAttempt < RETRY_CONFIG.maxRetryAttempts) {
        retryAttempt++;
        
        console.log(`\n🔄🔄🔄 [${jobId}] REINTENTANDO ${failedDrivers.length} CONDUCTORES FALLIDOS (Intento ${retryAttempt}/${RETRY_CONFIG.maxRetryAttempts}) 🔄🔄🔄\n`);
        
        await backgroundJobsService.addLog(jobId, '');
        await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
        await backgroundJobsService.addLog(jobId, `🔄 REINTENTO ${retryAttempt}/${RETRY_CONFIG.maxRetryAttempts}`);
        await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
        await backgroundJobsService.addLog(jobId, `⚠️  ${failedDrivers.length} conductores a reintentar`);
        await backgroundJobsService.addLog(jobId, '');
        
        console.log(`[${jobId}] Esperando ${RETRY_CONFIG.delayBeforeRetry / 1000} segundos antes de reintentar...`);
        await sleep(RETRY_CONFIG.delayBeforeRetry);
        
        const retryQueues: ReportDriver[][] = Array.from({ length: metadata.concurrency }, () => []);
        
        for (let i = 0; i < failedDrivers.length; i++) {
          retryQueues[i % metadata.concurrency].push(failedDrivers[i]);
        }
        
        console.log(`[${jobId}] Distribución retry:`, 
          retryQueues.map((q, i) => `Worker ${i + 1}: ${q.length}`).join(', ')
        );
        
        const retryErrors: Array<{ driver: ReportDriver; error: string }> = [];
        
        const retryWorkerProcess = async (worker: PDFDownloadAutomation, driversList: ReportDriver[], workerIndex: number) => {
          for (const driver of driversList) {
            const targetFolderId = driver.type === 'M&G' ? mgWeekFolderId : jsWeekFolderId;
            
            try {
              const cleanName = cleanDriverName(driver.nombre, driver.apellido);
              console.log(`[${jobId}] Worker ${workerIndex + 1} reintentando: ${cleanName}`);
              
              const pdfBuffer = await worker.downloadPDFToBuffer(
                driver,
                metadata.startDate,
                metadata.endDate,
                metadata.driversPageUrl,
                false
              );
              
              const fileName = generatePdfFileName(driver, metadata.startDate, metadata.endDate);
              await uploadBufferToDrive(pdfBuffer, fileName, targetFolderId);
              
              results.successful++;
              results.failed--;
              
              const errorIndex = results.errors.findIndex(e => e.driver.fullName === driver.fullName);
              if (errorIndex > -1) {
                results.errors.splice(errorIndex, 1);
              }
              
              await backgroundJobsService.addLog(
                jobId, 
                `✅ [Retry] ${cleanName} → ${driver.type} (recuperado)`
              );
              
              console.log(`✅ [${jobId}] Worker ${workerIndex + 1}: ${cleanName} recuperado exitosamente`);
              
            } catch (error: any) {
              const cleanName = cleanDriverName(driver.nombre, driver.apellido);
              console.error(`❌ [${jobId}] Worker ${workerIndex + 1} falló nuevamente: ${cleanName}`);
              
              retryErrors.push({ driver: driver, error: error.message });
              
              await backgroundJobsService.addLog(
                jobId, 
                `❌ [Retry] ${cleanName} - Falló nuevamente`
              );
            }
            
            await sleep(DELAY_BETWEEN_DOWNLOADS);
          }
        };
        
        await Promise.all(workers.map((worker, index) => retryWorkerProcess(worker, retryQueues[index], index)));
        
        failedDrivers = retryErrors.map(e => e.driver);
        
        console.log(`[${jobId}] Retry ${retryAttempt} completado. Quedan ${failedDrivers.length} fallidos`);
      }

      console.log(`[${jobId}] Cerrando navegadores...`);
      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');
      await backgroundJobsService.addLog(jobId, '🏁 FINALIZANDO PROCESO');
      await backgroundJobsService.addLog(jobId, '═══════════════════════════════════════');

      // Solo cerrar navegadores si NO es sesión compartida
      if (!sharedSession) {
        await Promise.all(workers.map(w => w.close()));
        console.log(`✅ [${jobId}] Navegadores cerrados`);
      } else {
        console.log(`🔄 [${jobId}] Navegador compartido - no se cierra aquí`);
        await backgroundJobsService.addLog(jobId, '🔄 Sesión compartida preservada');
      }

      const finalResult = {
        successful: results.successful,
        failed: results.failed,
        total: driversToProcess.length,
        errors: results.errors.map(e => ({ driver: cleanDriverName(e.driver.nombre, e.driver.apellido), error: e.error })),
        jsFolder: `JS/${weekName}`,
        mgFolder: `M&G/${weekName}`,
        retriesPerformed: retryAttempt,
      };

      console.log(`[${jobId}] Guardando resultado final...`);
      await backgroundJobsService.saveResult(jobId, finalResult);
      
      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '📊 RESUMEN FINAL:');
      await backgroundJobsService.addLog(jobId, `   ✅ Exitosos: ${results.successful}`);
      await backgroundJobsService.addLog(jobId, `   ❌ Fallidos: ${results.failed}`);
      await backgroundJobsService.addLog(jobId, `   📁 Total: ${driversToProcess.length}`);
      await backgroundJobsService.addLog(jobId, `   🔄 Reintentos realizados: ${retryAttempt}`);
      
      if (results.errors.length > 0) {
        await backgroundJobsService.addLog(jobId, '');
        await backgroundJobsService.addLog(jobId, `⚠️  CONDUCTORES QUE NO SE PUDIERON RECUPERAR (${results.errors.length}):`);
        for (const err of results.errors) {
          await backgroundJobsService.addLog(jobId, `   • ${cleanDriverName(err.driver.nombre, err.driver.apellido)}`);
        }
        await backgroundJobsService.addLog(jobId, '');
        await backgroundJobsService.addLog(jobId, '💡 Tip: Estos conductores necesitan revisión manual');
      } else {
        await backgroundJobsService.addLog(jobId, '');
        await backgroundJobsService.addLog(jobId, '🎉 ¡Todos los conductores procesados exitosamente!');
      }
      
      await backgroundJobsService.addLog(jobId, '');
      await backgroundJobsService.addLog(jobId, '✅ Proceso completado');
      
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