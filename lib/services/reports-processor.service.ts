// lib/services/reports-processor.service.ts
import 'dotenv/config';
import { chromium, Browser, Page, BrowserContext, Download } from 'playwright';
import * as XLSX from 'xlsx';
import { writeToSheet, clearSheet, appendToSheet } from '@/scripts/utils/sheet-connection';
import { performOktaLogin } from '../utils/okta-login';

export interface ReportsConfig {
  loginUrl: string;
  reportsUrl: string;
  email: string;
  password: string;
  spreadsheetId: string;
  sheetName: string;
  startDate: string;
  endDate: string;
  daysPerRange: number;
  headless: boolean;
  keepBrowserOpen?: boolean; // Nueva opción para mantener el navegador abierto
  // Credenciales opcionales para Okta (si no se proveen, usa .env)
  googleUsername?: string; // Se extrae del oktaEmail (parte antes del @)
  oktaEmail?: string; // Email completo de ITTI (ej: "agustin.iglesias@itti.digital")
  // appEmail y appPassword SIEMPRE vienen del .env
}

interface DateRange {
  start: string;
  end: string;
}

interface ProcessStats {
  totalRows: number;
  dataRows: number;
  processedRanges: number;
  filteredRows: number;
}

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  downloadTimeout: 600000, // 10 minutos
  retry: {
    maxAttempts: 3,
    delayBetweenRetries: 10000, // 10 segundos
  },
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

function generateDateRanges(startDate: string, endDate: string, daysPerRange: number = 1): DateRange[] {
  const ranges: DateRange[] = [];
  
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  
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

function filterInvalidRows(data: any[][]): any[][] {
  return data.filter((row, index) => {
    // Nunca filtrar el header (primera fila)
    if (index === 0) return true;
    
    // 1. FILTRAR FILAS COMPLETAMENTE VACÍAS
    const isEmpty = row.every(cell => 
      cell === null || 
      cell === undefined || 
      cell === '' || 
      (typeof cell === 'string' && cell.trim() === '')
    );
    
    if (isEmpty) return false;
    
    // 2. FILTRAR FILAS DE TOTAL (LÓGICA ROBUSTA)
    // Verificar si las primeras 4 columnas (A, B, C, D = índices 0, 1, 2, 3) están TODAS vacías
    const firstFourColumns = row.slice(0, 4);
    const allFirstFourEmpty = firstFourColumns.every(cell => 
      cell === null || 
      cell === undefined || 
      cell === '' || 
      (typeof cell === 'string' && cell.trim() === '')
    );
    
    // Si las primeras 4 columnas están vacías, verificar si hay "Total" en la fila
    if (allFirstFourEmpty) {
      const hasTotal = row.some(cell => 
        typeof cell === 'string' && 
        cell.toLowerCase().includes('total')
      );
      
      if (hasTotal) {
        return false; // Filtrar esta fila de resumen
      }
    }
    
    // 3. FILTRAR FILAS MAYORMENTE VACÍAS
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

function readExcelFromBuffer(buffer: Buffer): any[][] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  return data;
}

// ============================================================================
// CLASE DE AUTOMATIZACIÓN
// ============================================================================

class ReportProcessorAndUploader {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private allData: any[][] = [];
  private lastChunk: any[][] = [];
  private processedRanges: number = 0;
  private totalRowsFiltered: number = 0;
  private config: ReportsConfig;
  private logCallback?: (message: string) => void;

  constructor(config: ReportsConfig, logCallback?: (message: string) => void) {
    this.config = config;
    this.logCallback = logCallback;
  }

  private log(message: string): void {
    console.log(message);
    if (this.logCallback) {
      this.logCallback(message);
    }
  }

  async initialize(): Promise<void> {
    this.log('🚀 Iniciando navegador...');

    try {
      // Configuración para Docker/Railway
      const isProduction = process.env.NODE_ENV === 'production';

      const launchOptions: any = {
        headless: this.config.headless,
      };

      // En producción (Docker), usar configuración específica
      if (isProduction) {
        this.log('🐳 Detectado entorno de producción - configurando para Docker/Railway');
        launchOptions.args = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ];
        // Asegurar que headless esté en true en producción
        launchOptions.headless = true;
      } else {
        launchOptions.slowMo = 50;
      }

      this.log(`📦 Lanzando Chromium con headless=${launchOptions.headless}, args=${JSON.stringify(launchOptions.args || [])}`);

      this.browser = await chromium.launch(launchOptions);
      this.log('✅ Chromium lanzado exitosamente');

      this.context = await this.browser.newContext({
        acceptDownloads: true,
        viewport: { width: 1440, height: 900 },
      });
      this.log('✅ Contexto del navegador creado');

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(60000);
      this.log('✅ Página creada - Navegador completamente inicializado');

    } catch (error: any) {
      this.log(`❌ Error al inicializar navegador: ${error.message}`);
      this.log(`Stack: ${error.stack}`);
      throw error;
    }
  }

  async login(): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');

    this.log('🔐 Iniciando sesión con Okta...');

    await performOktaLogin({
      page: this.page,
      loginUrl: this.config.loginUrl,
      targetUrl: this.config.reportsUrl,
      oktaEmail: this.config.oktaEmail,
      // appEmail y appPassword se usan del .env por defecto en performOktaLogin
    });

    this.log('✅ Sesión iniciada');
  }

  async navigateToReports(): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');

    this.log('📊 Verificando página de reportes...');

    // Verificar si ya estamos en la página de reportes (el login ya nos llevó allí)
    const currentUrl = this.page.url();
    if (!currentUrl.includes('reports')) {
      this.log('   Navegando a reportes...');
      await this.page.goto(this.config.reportsUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
    }

    await this.page.waitForSelector('input[placeholder="Fecha desde"]', { timeout: 10000 });
    this.log('✅ Página de reportes cargada');
  }

  async setDateRange(startDate: string, endDate: string): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');
    
    this.log(`📅 Configurando rango: ${startDate} a ${endDate}`);
    
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
    
    this.log('✅ Fechas configuradas');
  }

  async downloadAndProcessExcel(): Promise<void> {
    if (!this.page) throw new Error('Página no inicializada');
    
    this.log('📥 Iniciando descarga y procesamiento...');
    
    const excelIcon = await this.page.waitForSelector('.anticon-file-excel', { timeout: 10000 });
    await excelIcon.click();
    this.log('✅ Click en ícono de Excel');
    
    await sleep(1500);
    
    this.log('☑️  Marcando checkbox de drivers deshabilitados...');
    try {
      const checkbox = await this.page.waitForSelector('input.ant-checkbox-input[type="checkbox"]', { 
        timeout: 5000 
      });
      await checkbox.click();
      this.log('✅ Checkbox marcado');
      await sleep(500);
    } catch (error) {
      this.log('⚠️  No se pudo encontrar/marcar el checkbox de drivers deshabilitados');
    }
    
    const downloadButton = await this.page.waitForSelector(
      'span:has-text("Descargar de todos los drivers")',
      { timeout: 10000 }
    );
    
    if (!downloadButton) {
      throw new Error('No se encontró el botón de descarga');
    }
    
    this.log('⏳ Descargando Excel en memoria (timeout: 10 min)...');

    let download: Download;
    let downloadAttempt = 0;
    const maxDownloadAttempts = 3;

    while (downloadAttempt < maxDownloadAttempts) {
      try {
        downloadAttempt++;

        if (downloadAttempt > 1) {
          this.log(`   🔄 Intento ${downloadAttempt}/${maxDownloadAttempts} de descarga...`);
        }

        const downloadPromise = this.page.waitForEvent('download', {
          timeout: CONFIG.downloadTimeout // 10 minutos
        });

        await downloadButton.click();

        download = await downloadPromise;
        this.log('✅ Descarga iniciada');
        break; // Éxito, salir del loop

      } catch (error: any) {
        const isNetworkError = error.message && (
          error.message.includes('ERR_NETWORK_CHANGED') ||
          error.message.includes('net::') ||
          error.message.includes('Network')
        );

        const isTimeout = error.message && error.message.includes('Timeout');

        if ((isNetworkError || isTimeout) && downloadAttempt < maxDownloadAttempts) {
          this.log(`   ⚠️  Error de ${isNetworkError ? 'red' : 'timeout'} detectado, recargando página...`);

          // Recargar la página como fallback
          await this.page.reload({ waitUntil: 'networkidle', timeout: 30000 });
          await sleep(2000);

          // Re-buscar el botón de descarga después del reload
          const reloadedDownloadButton = await this.page.waitForSelector(
            'span:has-text("Descargar de todos los drivers")',
            { timeout: 10000 }
          );

          if (!reloadedDownloadButton) {
            throw new Error('No se encontró el botón de descarga después de recargar');
          }

          // Continuar con el siguiente intento
          continue;
        }

        // Si no es un error recuperable o ya agotamos los intentos
        if (isTimeout) {
          throw new Error('TIMEOUT'); // Error específico para retry
        }
        throw error;
      }
    }

    if (!download!) {
      throw new Error('No se pudo completar la descarga después de ' + maxDownloadAttempts + ' intentos');
    }
    
    this.log('📖 Leyendo Excel en memoria...');
    const buffer = await download.createReadStream().then(stream => {
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    });
    
    this.log('✅ Excel leído en memoria');
    
    this.log('🔄 Procesando datos...');
    const rawData = readExcelFromBuffer(buffer);
    this.log(`   📊 ${rawData.length} filas leídas`);
    
    const isFirstFile = this.allData.length === 0;
    
    let dataToFilter: any[][];
    
    if (isFirstFile) {
      dataToFilter = rawData;
    } else {
      dataToFilter = rawData.slice(1);
    }
    
    const cleanData = filterInvalidRows(dataToFilter);
    const removedCount = dataToFilter.length - cleanData.length;
    this.totalRowsFiltered += removedCount;
    
    if (removedCount > 0) {
      this.log(`   🗑️  ${removedCount} fila(s) filtrada(s)`);
    }
    
    if (isFirstFile) {
      this.allData = cleanData;
      this.log(`   ✅ ${cleanData.length} filas agregadas (incluyendo headers)`);
    } else {
      this.allData = this.allData.concat(cleanData);
      this.log(`   ✅ ${cleanData.length} filas de datos agregadas`);
    }

    this.lastChunk = cleanData;
    this.processedRanges++;
    
    await sleep(2000);
    
    // Cerrar modal
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
    this.log(`\n📊 PROCESANDO RANGO: ${startDate} → ${endDate}`);
    
    const { maxAttempts, delayBetweenRetries } = CONFIG.retry;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          this.log(`\n🔄 REINTENTO ${attempt}/${maxAttempts} para ${startDate} → ${endDate}`);
        }
        
        await this.setDateRange(startDate, endDate);
        await this.downloadAndProcessExcel();
        
        this.log(`✅ Rango ${startDate} → ${endDate} procesado exitosamente\n`);
        return; // Éxito, salir del loop
        
      } catch (error: any) {
        const isTimeout = error.message === 'TIMEOUT';
        const isLastAttempt = attempt === maxAttempts;
        
        if (isTimeout) {
          this.log(`⏰ Timeout en descarga (intento ${attempt}/${maxAttempts})`);
          
          if (!isLastAttempt) {
            this.log(`⏳ Esperando ${delayBetweenRetries / 1000} segundos antes de reintentar...`);
            await sleep(delayBetweenRetries);
            
            // Recargar página para empezar fresco
            try {
              this.log('🔄 Recargando página...');
              await this.page?.reload({ waitUntil: 'networkidle' });
              await sleep(2000);
              this.log('✅ Página recargada');
            } catch (reloadError) {
              this.log('⚠️  Error recargando página, continuando...');
            }
          } else {
            this.log(`❌ Timeout después de ${maxAttempts} intentos`);
            throw new Error(`Timeout en descarga después de ${maxAttempts} intentos para ${startDate} → ${endDate}`);
          }
        } else {
          // Error no relacionado con timeout - también reintentar
          this.log(`❌ Error (intento ${attempt}/${maxAttempts}): ${error.message}`);
          
          if (!isLastAttempt) {
            this.log(`⏳ Esperando ${delayBetweenRetries / 1000} segundos antes de reintentar...`);
            await sleep(delayBetweenRetries);
            
            try {
              this.log('🔄 Recargando página...');
              await this.page?.reload({ waitUntil: 'networkidle' });
              await sleep(2000);
              this.log('✅ Página recargada');
            } catch (reloadError) {
              this.log('⚠️  Error recargando página, continuando...');
            }
          } else {
            this.log(`❌ Error después de ${maxAttempts} intentos`);
            throw error;
          }
        }
      }
    }
  }

  async uploadChunkToSheets(isFirstRange: boolean): Promise<void> {
    if (this.lastChunk.length === 0) {
      this.log('⚠️  Rango sin filas nuevas, nada que subir a Sheets');
      return;
    }

    if (isFirstRange) {
      this.log('\n📝 SUBIENDO A GOOGLE SHEETS (primer rango)');
      this.log('🧹 Limpiando hoja...');
      await clearSheet(this.config.spreadsheetId, this.config.sheetName, false);
      this.log('✅ Hoja limpiada');

      this.log(`📝 Escribiendo ${this.lastChunk.length} filas (incluyendo headers)...`);
      await writeToSheet(
        this.config.spreadsheetId,
        this.config.sheetName,
        this.lastChunk,
        'A1'
      );
    } else {
      this.log(`\n➕ Agregando ${this.lastChunk.length} filas del rango a Google Sheets...`);
      await appendToSheet(
        this.config.spreadsheetId,
        this.config.sheetName,
        this.lastChunk
      );
    }

    this.log('✅ Rango subido a Sheets\n');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.log('🔒 Navegador cerrado');
    }
  }

  getStats(): ProcessStats {
    return {
      totalRows: this.allData.length,
      dataRows: this.allData.length - 1,
      processedRanges: this.processedRanges,
      filteredRows: this.totalRowsFiltered,
    };
  }

  async extractSession(): Promise<BrowserSession> {
    if (!this.browser || !this.context || !this.page) {
      throw new Error('No hay navegador activo para extraer sesión');
    }

    this.log('📦 Extrayendo sesión del navegador...');

    // Extraer cookies
    const cookies = await this.context.cookies();

    // Extraer localStorage
    const localStorage = await this.page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          data[key] = window.localStorage.getItem(key) || '';
        }
      }
      return data;
    });

    // Extraer sessionStorage
    const sessionStorage = await this.page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          data[key] = window.sessionStorage.getItem(key) || '';
        }
      }
      return data;
    });

    this.log('✅ Sesión extraída exitosamente');
    this.log(`   Cookies: ${cookies.length}`);
    this.log(`   localStorage keys: ${Object.keys(localStorage).length}`);
    this.log(`   sessionStorage keys: ${Object.keys(sessionStorage).length}`);

    return {
      browser: this.browser,
      context: this.context,
      page: this.page,
      cookies,
      localStorage,
      sessionStorage,
    };
  }

  getData(): any[][] {
    return this.allData;
  }
}

// ============================================================================
// EXPORTAR SERVICE
// ============================================================================

export const reportsProcessorService = {
  async processAndUpload(
    config: ReportsConfig,
    logCallback?: (message: string) => void
  ): Promise<{ stats: ProcessStats; session?: BrowserSession }> {
    const processor = new ReportProcessorAndUploader(config, logCallback);

    try {
      const dateRanges = generateDateRanges(config.startDate, config.endDate, config.daysPerRange);

      if (logCallback) {
        logCallback(`📋 Se procesarán ${dateRanges.length} rangos de fechas\n`);
      }

      await processor.initialize();
      await processor.login();
      await processor.navigateToReports();

      for (let i = 0; i < dateRanges.length; i++) {
        const range = dateRanges[i];
        if (logCallback) {
          logCallback(`[${i + 1}/${dateRanges.length}]`);
        }

        await processor.processDateRange(range.start, range.end);
        await processor.uploadChunkToSheets(i === 0);

        if (i < dateRanges.length - 1) {
          await sleep(5000);
        }
      }

      const stats = processor.getStats();

      // Si keepBrowserOpen es true, extraer y devolver la sesión
      if (config.keepBrowserOpen) {
        const session = await processor.extractSession();
        return { stats, session };
      }

      return { stats };

    } finally {
      // Solo cerrar si keepBrowserOpen es false
      if (!config.keepBrowserOpen) {
        await processor.close();
      }
    }
  },
};