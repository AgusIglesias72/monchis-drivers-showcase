// lib/services/bonus-processor.service.ts
// Service para procesar bonos por pedido con Playwright

import 'dotenv/config';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { google } from 'googleapis';
import { parseOrdersExcel, OrderData } from '../utils/excel-order-parser';
import { performGoogleOktaLogin } from '../utils/google-okta-login';
import { BrowserSession } from './reports-processor.service';
import { prisma } from '../prisma';
import * as fs from 'fs';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BonusProcessConfig {
  bonusDate: string; // YYYY-MM-DD - fecha de los pedidos a procesar
  executionMode: 'DRY_RUN' | 'EXECUTE';
  notificationEmails?: string[];
  keepBrowserOpen?: boolean;
  loginUrl?: string;
  ordersReportUrl?: string;
  extrasListUrl?: string;
  extrasAssignUrl?: string;
  email?: string;
  password?: string;
}

export interface BonusRule {
  id: string;
  date: Date;
  startTime: string; // "14:00"
  endTime: string;   // "18:00"
  zones: string[];   // ["Centro", "Villa Morra"] o ["ALL"]
  amountPerOrder: number;
  isActive: boolean;
}

export interface BonusComputation {
  driverCedula: string; // Puede ser cédula real o driverName como fallback
  driverName: string;
  orderCount: number;
  bonusAmount: number;
  extraName: string;
  ruleId: string;
  bonusDate: Date;
}

export interface BonusProcessResult {
  bonusDate: string;
  executionMode: 'DRY_RUN' | 'EXECUTE';
  stats: {
    totalOrders: number;
    driversProcessed: number;
    extrasCreated: number;
    assignmentsSuccessful: number;
    assignmentsFailed: number;
    totalPayoutAmount: number;
  };
  preview?: Array<{
    extraName: string;
    totalAmount: number;
    driverCount: number;
    drivers: string[];
  }>;
  errors?: Array<{ driver: string; error: string }>;
  duplicatesDetected?: number;
  duplicates?: string[];
}

interface AssignmentStats {
  successful: number;
  failed: number;
  errors: Array<{ driver: string; error: string }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  downloadTimeout: 60000, // 1 minuto para descargas
  extraCreationTimeout: 30000, // 30 segundos por extra
  assignmentTimeout: 10000, // 10 segundos por grupo
  delayBetweenBatches: 2000, // 2 segundos entre batches
  batchSize: 10, // Conductores por batch en asignación
};

// ============================================================================
// UTILITIES
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

// ============================================================================
// BONUS PROCESSOR CLASS
// ============================================================================

class BonusProcessor {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private usingSharedSession = false;

  // ========== INITIALIZATION ==========

  async initialize(): Promise<void> {
    console.log('🚀 Inicializando Playwright para bonos...');

    const isProduction = process.env.NODE_ENV === 'production';
    const headless = process.env.HEADLESS !== 'false' && isProduction;

    const launchOptions: any = {
      headless,
    };

    // Args para Docker/Railway (si es producción)
    if (isProduction) {
      launchOptions.args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--force-color-profile=srgb',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
      ];
    }

    this.browser = await chromium.launch(launchOptions);
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    this.page = await this.context.newPage();

    console.log(`✅ Navegador inicializado (headless: ${headless})`);
  }

  async initializeWithUserDataDir(userDataDir: string): Promise<void> {
    console.log(`🚀 Inicializando Playwright con User Data Directory...`);
    console.log(`   📁 Directorio: ${userDataDir}`);

    const isProduction = process.env.NODE_ENV === 'production';
    const headless = process.env.HEADLESS !== 'false' && isProduction;

    const launchOptions: any = {
      headless,
      args: [
        '--disable-blink-features=AutomationControlled', // Evitar detección de bot
      ],
    };

    // Args para Docker/Railway (si es producción)
    if (isProduction) {
      launchOptions.args.push(
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      );
    }

    // Lanzar con contexto persistente (incluye userDataDir)
    this.context = await chromium.launchPersistentContext(userDataDir, {
      headless,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...launchOptions,
    });

    this.page = this.context.pages()[0] || await this.context.newPage();
    // @ts-ignore - browser no está disponible en persistent context pero guardamos el context
    this.browser = null;

    console.log(`✅ Navegador inicializado con sesión persistente (headless: ${headless})`);
  }

  async initializeWithSession(session: BrowserSession): Promise<void> {
    console.log('🔗 Reutilizando sesión de navegador existente...');

    this.browser = session.browser;
    this.context = session.context;
    this.page = session.page;
    this.usingSharedSession = true;

    console.log('✅ Sesión reutilizada');
  }

  // ========== AUTHENTICATION ==========

  async login(loginUrl: string, targetUrl: string): Promise<void> {
    if (!this.page) {
      throw new Error('Página no inicializada');
    }

    console.log('🔐 Iniciando login con Google + Okta...');

    const googleUsername = process.env.GOOGLE_USERNAME;
    const googlePassword = process.env.GOOGLE_PASSWORD;
    const oktaEmail = process.env.OKTA_EMAIL;
    const oktaPassword = process.env.OKTA_PASSWORD;
    const appEmail = process.env.APP_EMAIL;
    const appPassword = process.env.APP_PASSWORD;

    await performGoogleOktaLogin({
      page: this.page,
      loginUrl,
      googleUsername,
      googlePassword,
      oktaEmail,
      oktaPassword,
      appEmail,
      appPassword,
      targetUrl,
    });

    console.log('✅ Login completado exitosamente');
  }

  // ========== DOWNLOAD ORDERS REPORT ==========

  async downloadOrdersReport(url: string, bonusDate: string): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Página no inicializada');
    }

    console.log(`📥 Descargando reporte de pedidos para ${bonusDate}...`);

    // Navegar a la página de reportes
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Click en el input de fecha para abrir el date picker
    const dateInput = await this.page.waitForSelector('input[name="filterDateRange"]', { timeout: 10000 });
    await dateInput.click();
    await sleep(500);

    // Esperar a que aparezca el calendar dropdown
    await this.page.waitForSelector('.ant-picker-dropdown', { timeout: 5000 });
    await sleep(500);

    // Parsear la fecha (YYYY-MM-DD)
    const [year, month, day] = bonusDate.split('-').map(Number);

    // Seleccionar la fecha en el calendario usando el atributo title (formato YYYY-MM-DD)
    const dateCell = await this.page.waitForSelector(
      `.ant-picker-cell[title="${bonusDate}"]`,
      { timeout: 5000 }
    );

    if (!dateCell) {
      throw new Error(`No se encontró la celda para la fecha ${bonusDate}`);
    }

    // Click en la fecha dos veces (start y end del rango)
    await dateCell.click();
    await sleep(300);
    await dateCell.click();
    await sleep(500);

    console.log(`   📅 Fecha seleccionada: ${bonusDate}`);

    // Click en el botón "Buscar"
    const searchButton = await this.page.waitForSelector('button:has-text("Buscar")', { timeout: 5000 });
    await searchButton.click();

    // Esperar a que cargue la búsqueda
    await this.page.waitForLoadState('networkidle');
    await sleep(3000);

    console.log('   🔍 Búsqueda completada, iniciando descarga...');

    // Preparar descarga
    const downloadPromise = this.page.waitForEvent('download', { timeout: CONFIG.downloadTimeout });

    // Click en botón "Descargar"
    const downloadButton = await this.page.waitForSelector('button:has-text("Descargar")', { timeout: 5000 });
    await downloadButton.click();

    // Esperar descarga
    const download = await downloadPromise;
    const path = await download.path();

    if (!path) {
      throw new Error('No se pudo obtener el archivo descargado');
    }

    const buffer = await fs.promises.readFile(path);
    console.log(`✅ Reporte descargado: ${buffer.length} bytes`);

    return buffer;
  }

  // ========== LOAD BONUS RULES ==========

  async loadBonusRules(sheetId: string, bonusDate: Date): Promise<BonusRule[]> {
    console.log(`📋 Cargando reglas de bonos para ${formatDate(bonusDate)}...`);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Usar valueRenderOption: 'FORMATTED_VALUE' para obtener valores formateados
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Bonus Rules!A2:G', // Saltar header
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      console.log('   ⚠️  No hay reglas configuradas');
      return [];
    }

    const bonusDateStr = formatDate(bonusDate);

    const rules: BonusRule[] = rows
      .filter((row) => {
        const fecha = row[0]; // Columna A
        const activo = row[5]; // Columna F

        return fecha === bonusDateStr && activo === 'TRUE';
      })
      .map((row, index) => {
        const [fecha, horaInicio, horaFin, zonasStr, montoPorPedido, activo, descripcion] = row;

        // Parsear horas (pueden venir como "11:59:00 p.m." o "23:59")
        const startTime = this.parseTimeString(horaInicio);
        const endTime = this.parseTimeString(horaFin);

        // Si 'Zona' está vacío o dice 'Todas' (case-insensitive), entonces aplican todas las zonas
        const zonasTrimmed = zonasStr?.trim() || '';
        const zones = !zonasTrimmed || zonasTrimmed.toUpperCase() === 'TODAS'
          ? ['ALL']
          : zonasStr.includes(',')
          ? zonasStr.split(',').map((z: string) => z.trim())
          : [zonasStr.trim()];

        return {
          id: `rule_${index}_${Date.now()}`,
          date: bonusDate,
          startTime,
          endTime,
          zones,
          amountPerOrder: parseFloat(montoPorPedido),
          isActive: activo === 'TRUE',
        };
      });

    console.log(`✅ ${rules.length} reglas activas encontradas`);
    rules.forEach((rule, i) => {
      console.log(`   ${i + 1}. ${rule.startTime}-${rule.endTime} | ${rule.zones.join(', ')} | ${rule.amountPerOrder} Gs`);
    });

    return rules;
  }

  // Helper para parsear strings de tiempo desde Google Sheets
  private parseTimeString(timeStr: string): string {
    if (!timeStr) return '00:00';

    // Si ya está en formato HH:MM, retornar directamente
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    }

    // Si viene como "11:59:00 p.m." o "11:59:00 a.m."
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.m\.|p\.m\.)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const period = match[4];

      // Convertir a formato 24 horas si hay am/pm
      if (period) {
        const isPM = period.toLowerCase().includes('p');
        if (isPM && hours < 12) {
          hours += 12;
        } else if (!isPM && hours === 12) {
          hours = 0;
        }
      }

      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    // Fallback: retornar el valor original
    return timeStr;
  }

  // ========== COMPUTE BONUSES ==========

  computeBonuses(orders: OrderData[], rules: BonusRule[]): Map<string, BonusComputation[]> {
    console.log(`🧮 Computando bonos...`);
    console.log(`   📦 ${orders.length} pedidos`);
    console.log(`   📋 ${rules.length} reglas`);

    // 1. Ordenar reglas: ESPECÍFICAS primero
    const sortedRules = rules
      .filter((r) => r.isActive)
      .sort((a, b) => {
        const aIsSpecific = !a.zones.includes('ALL') && !a.zones.includes('TODAS');
        const bIsSpecific = !b.zones.includes('ALL') && !b.zones.includes('TODAS');
        if (aIsSpecific && !bIsSpecific) return -1;
        if (!aIsSpecific && bIsSpecific) return 1;
        return 0;
      });

    // 2. Agrupar pedidos por (driver, regla aplicable)
    const bonusesByDriver = new Map<string, Map<string, any>>();

    for (const order of orders) {
      // Solo procesar pedidos FINALIZED (ya vienen filtrados del parser, pero por si acaso)
      if (order.status !== 'FINALIZED') continue;

      // Encontrar PRIMERA regla que coincida
      const matchingRule = sortedRules.find((rule) => {
        // Validar horario
        if (order.orderTime < rule.startTime || order.orderTime >= rule.endTime) {
          return false;
        }

        // Validar zona
        if (
          !rule.zones.includes('ALL') &&
          !rule.zones.includes('TODAS') &&
          !rule.zones.includes(order.zone)
        ) {
          return false;
        }

        return true;
      });

      if (!matchingRule) continue;

      // Agrupar por (driver, regla)
      // Usamos driverName como key ya que driverCedula es opcional
      const driverKey = order.driverCedula || order.driverName;
      const ruleKey = matchingRule.id;

      if (!bonusesByDriver.has(driverKey)) {
        bonusesByDriver.set(driverKey, new Map());
      }

      const driverBonuses = bonusesByDriver.get(driverKey)!;

      if (!driverBonuses.has(ruleKey)) {
        driverBonuses.set(ruleKey, {
          orderCount: 0,
          amountPerOrder: matchingRule.amountPerOrder,
          ruleId: matchingRule.id,
          driverCedula: order.driverCedula || '', // Puede estar vacío
          driverName: order.driverName,
          bonusDate: matchingRule.date,
        });
      }

      driverBonuses.get(ruleKey)!.orderCount++;
    }

    // 3. Generar map de extras (agrupar por mismo nombre)
    const extrasByName = new Map<string, BonusComputation[]>();

    for (const [driverKey, driverBonuses] of bonusesByDriver) {
      for (const [ruleId, bonusData] of driverBonuses) {
        const extraName = this.generateExtraName(bonusData.bonusDate, bonusData.orderCount, bonusData.amountPerOrder);

        if (!extrasByName.has(extraName)) {
          extrasByName.set(extraName, []);
        }

        extrasByName.get(extraName)!.push({
          driverCedula: driverKey, // Puede ser cédula real o driverName
          driverName: bonusData.driverName,
          orderCount: bonusData.orderCount,
          bonusAmount: bonusData.orderCount * bonusData.amountPerOrder,
          extraName: extraName,
          ruleId: bonusData.ruleId,
          bonusDate: bonusData.bonusDate,
        });
      }
    }

    console.log(`✅ ${extrasByName.size} extras diferentes a crear`);
    console.log(`   👥 ${bonusesByDriver.size} conductores beneficiados`);

    return extrasByName;
  }

  generateExtraName(date: Date, orderCount: number, amountPerOrder: number): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;

    // Formatear monto con separador de miles
    const formattedAmount = amountPerOrder.toLocaleString('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return `${day}/${month} (${orderCount}) - ${formattedAmount} Gs`;
  }

  // ========== VALIDATE DUPLICATES ==========

  async validateNoDuplicatesInDB(bonusDate: Date, driverCedulas: string[]): Promise<string[]> {
    console.log(`🔍 Validando duplicados en DB para ${formatDate(bonusDate)}...`);

    const existing = await prisma.bonusAssignment.findMany({
      where: {
        bonusDate: bonusDate,
        driverCedula: { in: driverCedulas },
      },
      select: {
        driverCedula: true,
        driverName: true,
        extraName: true,
      },
    });

    const duplicates = existing.map((e) => e.driverCedula);

    if (duplicates.length > 0) {
      console.log(`⚠️  DUPLICADOS DETECTADOS: ${duplicates.length} conductores ya tienen bonos`);
      existing.slice(0, 5).forEach((e) => {
        console.log(`   - ${e.driverCedula} (${e.driverName}): ${e.extraName}`);
      });
      if (existing.length > 5) {
        console.log(`   ... y ${existing.length - 5} más`);
      }
    } else {
      console.log('   ✅ No hay duplicados en DB');
    }

    return duplicates;
  }

  async validateExtraNotExists(extraName: string): Promise<boolean> {
    if (!this.page) {
      throw new Error('Página no inicializada');
    }

    const url = process.env.APP_EXTRAS_LIST_URL!;
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await sleep(1000);

    // Buscar extra por nombre (asumiendo que hay un campo de búsqueda)
    try {
      const searchInput = await this.page.$('input[placeholder*="Buscar"], input[type="search"]');
      if (searchInput) {
        await searchInput.fill(extraName);
        await sleep(1500);

        // Verificar si aparece en la tabla
        const existingExtra = await this.page.$(`tr:has-text("${extraName}")`);

        if (existingExtra) {
          console.log(`⚠️  Extra "${extraName}" YA EXISTE en la aplicación`);
          return false;
        }
      }
    } catch (error) {
      // Si no hay campo de búsqueda, solo verificamos visualmente la tabla
      const existingExtra = await this.page.$(`tr:has-text("${extraName}")`);
      if (existingExtra) {
        console.log(`⚠️  Extra "${extraName}" YA EXISTE en la aplicación`);
        return false;
      }
    }

    console.log(`✅ Extra "${extraName}" NO existe, se puede crear`);
    return true;
  }

  // ========== CREATE EXTRA ==========

  async createExtra(extraName: string, totalAmount: number): Promise<boolean> {
    if (!this.page) {
      throw new Error('Página no inicializada');
    }

    const url = process.env.APP_EXTRAS_LIST_URL!;

    console.log(`🎁 Creando extra: ${extraName} (${totalAmount} Gs)`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await sleep(1000);

    // Validar que NO existe
    const exists = !(await this.validateExtraNotExists(extraName));
    if (exists) {
      console.log(`   ⚠️  Saltando creación (ya existe)`);
      return true;
    }

    // Click en botón "Crear" o "Nuevo"
    const crearBtn = await this.page.waitForSelector('button:has-text("Crear"), button:has-text("Nuevo")', {
      timeout: 5000,
    });
    await crearBtn.click();
    await sleep(500);

    // Esperar modal
    await this.page.waitForSelector('.ant-modal-content, .modal-content', { timeout: 5000 });

    // Completar formulario
    const nombreInput = await this.page.waitForSelector('input[name="name"], input[placeholder*="Nombre"]', {
      timeout: 5000,
    });
    await nombreInput.fill(extraName);

    const montoInput = await this.page.waitForSelector('input[name="amount"], input[placeholder*="Monto"]', {
      timeout: 5000,
    });
    await montoInput.fill(totalAmount.toString());

    // Guardar
    const guardarBtn = await this.page.waitForSelector(
      '.ant-modal-footer button:has-text("Guardar"), button:has-text("Confirmar")',
      { timeout: 5000 }
    );
    await guardarBtn.click();

    // Esperar confirmación
    await this.page.waitForSelector('.ant-message-success, .toast-success', {
      timeout: CONFIG.extraCreationTimeout,
    });

    console.log(`   ✅ Extra creado exitosamente`);
    return true;
  }

  /**
   * Crea un extra en la UI usando los selectores específicos del modal
   */
  async createExtraInUI(extraName: string, totalAmount: number): Promise<boolean> {
    if (!this.page) {
      throw new Error('Página no inicializada');
    }

    const url = process.env.APP_EXTRAS_LIST_URL!;

    console.log(`🎁 Creando extra en UI: ${extraName} (${totalAmount} Gs)`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await sleep(2000);

    // PASO 1: Buscar si el extra ya existe
    console.log(`   🔍 Verificando si el extra ya existe...`);

    // Llenar input de búsqueda
    const searchInput = await this.page.waitForSelector('input#extraName', { timeout: 5000 });
    await searchInput.click();
    await searchInput.fill(extraName);
    await sleep(300);

    // Click en botón "Buscar"
    const buscarBtn = await this.page.waitForSelector('button.ant-btn-primary:has-text("Buscar")', { timeout: 5000 });
    await buscarBtn.click();
    console.log(`   🖱️  Click en "Buscar"`);
    await sleep(2000);

    // Verificar si hay resultados en la tabla
    const tableRows = await this.page.$$('tbody.ant-table-tbody tr');

    if (tableRows.length > 0) {
      // Buscar si alguna fila contiene el nombre exacto del extra
      let extraExists = false;

      for (const row of tableRows) {
        const cellText = await row.$eval('td:first-child', (el) => el.textContent || '');
        if (cellText.trim() === extraName) {
          extraExists = true;
          break;
        }
      }

      if (extraExists) {
        console.log(`   ⚠️  Extra "${extraName}" ya existe, saltando creación`);
        return true;
      }
    }

    console.log(`   ✅ Extra no existe, procediendo a crear...`);

    // PASO 2: Click en botón "Nuevo extra"
    console.log(`   🖱️  Buscando botón "Nuevo extra"...`);
    const nuevoExtraBtn = await this.page.waitForSelector('button.ant-btn-primary:has-text("Nuevo extra")', {
      timeout: 10000,
    });
    await nuevoExtraBtn.click();
    console.log(`   ✅ Click en "Nuevo extra"`);
    await sleep(1000);

    // PASO 3: Esperar modal
    console.log(`   ⏳ Esperando modal...`);
    await this.page.waitForSelector('.ant-modal-content', { timeout: 5000 });
    console.log(`   ✅ Modal abierto`);
    await sleep(500);

    // PASO 4: Llenar input#name
    console.log(`   📝 Llenando nombre del extra: ${extraName}`);
    const nameInput = await this.page.waitForSelector('input#name', { timeout: 5000 });
    await nameInput.click();
    await nameInput.fill(extraName);
    console.log(`   ✅ Nombre llenado`);
    await sleep(300);

    // PASO 5: Llenar input#amount
    console.log(`   💰 Llenando monto: ${totalAmount}`);
    const amountInput = await this.page.waitForSelector('input#amount', { timeout: 5000 });
    await amountInput.click();
    await amountInput.fill(totalAmount.toString());
    console.log(`   ✅ Monto llenado`);
    await sleep(300);

    // PASO 6: Click en botón "Aceptar"
    console.log(`   🖱️  Buscando botón "Aceptar"...`);
    const aceptarBtn = await this.page.waitForSelector('.ant-modal-footer button.ant-btn-primary:has-text("Aceptar")', {
      timeout: 5000,
    });
    await aceptarBtn.click();
    console.log(`   ✅ Click en "Aceptar"`);
    await sleep(2000);

    console.log(`   ✅ Extra "${extraName}" creado exitosamente`);
    return true;
  }

  /**
   * Selecciona conductores en la UI para asignarles un extra
   * Basado en el HTML real de /extras/assign con tabs "Drivers"
   * Asigna todos los drivers de un mismo extra de una sola vez y registra en Google Sheet
   */
  async selectDriversForExtra(
    extraName: string,
    driverNames: string[],
    bonusDate: string
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ driver: string; error: string }>;
  }> {
    if (!this.page) {
      throw new Error('Página no inicializada');
    }

    const url = process.env.APP_EXTRAS_ASSIGN_URL!;

    console.log(`👥 Seleccionando ${driverNames.length} conductores para extra "${extraName}"...`);

    let successful = 0;
    let failed = 0;
    const errors: Array<{ driver: string; error: string }> = [];
    const successfulAssignments: Array<{ driverName: string; extraName: string; bonusDate: string }> = [];

    // Navegar a la página de asignación
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await sleep(2000);

    // PASO 1: Click en tab "Drivers"
    console.log(`   📑 Cambiando a tab "Drivers"...`);
    const driversTab = await this.page.waitForSelector('#rc-tabs-0-tab-2', { timeout: 10000 });
    await driversTab.click();
    console.log(`   ✅ Tab "Drivers" seleccionado`);
    await sleep(1000);

    // PASO 2: Buscar y seleccionar cada conductor
    for (const driverName of driverNames) {
      try {
        console.log(`   🔍 Buscando: ${driverName}`);

        // Llenar input de búsqueda
        const searchInput = await this.page.waitForSelector('input#name', { timeout: 5000 });
        await searchInput.click();
        await searchInput.fill(''); // Limpiar
        await sleep(200);
        await searchInput.fill(driverName);
        await sleep(300);

        // Click en botón "Buscar"
        const buscarBtn = await this.page.waitForSelector('button.Assignments_mainSearch__3mHy1', { timeout: 5000 });
        await buscarBtn.click();
        await sleep(1500);

        // Verificar si hay resultados
        let checkbox = await this.page.$('tbody.ant-table-tbody tr input[type="checkbox"]');

        // Si no está en "Activo", intentar con "Inactivo"
        if (!checkbox) {
          console.log(`   ⚠️  No encontrado en "Activo", probando "Inactivo"...`);

          const statusSelector = await this.page.waitForSelector('input#status', { timeout: 5000 });
          await statusSelector.click();
          await sleep(500);

          const inactivoOption = await this.page.waitForSelector(
            '.ant-select-item-option-content:has-text("Inactivo")',
            { timeout: 5000 }
          );
          await inactivoOption.click();
          await sleep(500);

          await buscarBtn.click();
          await sleep(1500);

          checkbox = await this.page.$('tbody.ant-table-tbody tr input[type="checkbox"]');
        }

        if (checkbox) {
          const isChecked = await checkbox.isChecked();
          if (!isChecked) {
            await checkbox.click();
            console.log(`   ✅ "${driverName}" seleccionado`);
            successful++;
            successfulAssignments.push({ driverName, extraName, bonusDate });
          } else {
            console.log(`   ℹ️  "${driverName}" ya seleccionado`);
            successful++;
            successfulAssignments.push({ driverName, extraName, bonusDate });
          }

          // Volver a estado "Activo" si cambiamos
          const currentStatus = await this.page.$eval(
            '.ant-select-selection-item',
            (el) => el.textContent || ''
          );
          if (currentStatus === 'Inactivo') {
            const statusSelector = await this.page.waitForSelector('input#status', { timeout: 5000 });
            await statusSelector.click();
            await sleep(500);

            const activoOption = await this.page.waitForSelector(
              '.ant-select-item-option-content:has-text("Activo")',
              { timeout: 5000 }
            );
            await activoOption.click();
            await sleep(500);
          }
        } else {
          console.log(`   ❌ "${driverName}" no encontrado`);
          failed++;
          errors.push({ driver: driverName, error: 'No encontrado en resultados' });
        }

        await sleep(300);
      } catch (error: any) {
        console.log(`   ❌ Error con "${driverName}": ${error.message}`);
        failed++;
        errors.push({ driver: driverName, error: error.message });
      }
    }

    console.log(`\n   📊 Resumen de selección:`);
    console.log(`      ✅ Exitosos: ${successful}`);
    console.log(`      ❌ Fallidos: ${failed}`);

    // PASO 3: Click en botón "EXTRA"
    console.log(`\n   🎁 Abriendo drawer de extras...`);
    const extraBtn = await this.page.waitForSelector(
      'button.ant-btn-primary.Assignments_extraPrimaryButton__3iCSd:has-text("EXTRA")',
      { timeout: 5000 }
    );
    await extraBtn.click();
    await sleep(1500);

    // PASO 4: Seleccionar fecha
    console.log(`   📅 Seleccionando fecha: ${bonusDate}...`);
    const dateInput = await this.page.waitForSelector('input#date', { timeout: 5000 });
    await dateInput.click();

    // Limpiar campo de fecha primero
    await dateInput.fill('');
    await sleep(200);
    await dateInput.fill(bonusDate);
    await sleep(500);

    // PASO 5: Buscar el extra
    console.log(`   🔍 Buscando extra: ${extraName}...`);
    const extraSearchInput = await this.page.waitForSelector('input#search', { timeout: 5000 });
    await extraSearchInput.click();

    // Limpiar búsqueda anterior
    await extraSearchInput.fill('');
    await sleep(200);
    await extraSearchInput.fill(extraName);
    await sleep(300);

    // Click en botón de búsqueda
    const searchBtn = await this.page.waitForSelector(
      'button.ant-btn-icon-only:has([aria-label="search"])',
      { timeout: 5000 }
    );
    await searchBtn.click();
    await sleep(2000);

    // PASO 6: Seleccionar checkbox del extra
    console.log(`   ✅ Seleccionando extra en tabla...`);
    const extraRow = await this.page.waitForSelector(
      `tbody.ant-table-tbody tr:has-text("${extraName}")`,
      { timeout: 5000 }
    );

    const extraCheckbox = await extraRow.$('input[type="checkbox"]');
    if (extraCheckbox) {
      const isChecked = await extraCheckbox.isChecked();
      if (!isChecked) {
        await extraCheckbox.click();
        console.log(`   ✅ Extra seleccionado`);
      }
    }

    await sleep(500);

    // PASO 7: Click en botón "Guardar"
    console.log(`   💾 Guardando asignaciones...`);
    const guardarBtn = await this.page.waitForSelector(
      'button.ant-btn-primary:has-text("Guardar")',
      { timeout: 5000 }
    );
    await guardarBtn.click();
    console.log(`   ✅ Click en "Guardar"`);
    await sleep(3000); // Esperar a que se procese

    console.log(`\n   ✅ Asignación completada`);

    // PASO 8: Registrar asignaciones en Google Sheet "Bonus Assignments"
    if (successfulAssignments.length > 0) {
      console.log(`\n   📝 Registrando ${successfulAssignments.length} asignaciones en Google Sheet...`);
      await this.recordAssignmentsToSheet(successfulAssignments, bonusDate);
      console.log(`   ✅ Asignaciones registradas en "Bonus Assignments"`);
    }

    return { successful, failed, errors };
  }

  /**
   * Registra las asignaciones exitosas en el tab "Bonus Assignments" del Google Sheet
   */
  private async recordAssignmentsToSheet(
    assignments: Array<{ driverName: string; extraName: string; bonusDate: string }>,
    bonusDate: string
  ): Promise<void> {
    const sheetId = process.env.BONUS_RULES_SHEET_ID!;
    const timestamp = new Date().toISOString();

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Preparar filas para "Bonus Assignments"
    // Headers: Timestamp Ejecución | Fecha Bono | Cédula | Nombre Driver | Pedidos Calificados | Monto por Pedido | Bono Total | Extra Asignado | Regla Aplicada | Modo Ejecución | Estado | Error
    const rows = assignments.map((a) => [
      timestamp,
      bonusDate,
      '', // Cédula (no disponible en este contexto)
      a.driverName,
      '', // Pedidos Calificados (se completará más adelante si es necesario)
      '', // Monto por Pedido
      '', // Bono Total
      a.extraName,
      '', // Regla Aplicada
      'MANUAL', // Modo Ejecución
      'SUCCESS', // Estado
      '', // Error
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Bonus Assignments!A:L',
      valueInputOption: 'RAW',
      requestBody: {
        values: rows,
      },
    });
  }

  /**
   * Lee el resumen de bonos desde la hoja "Pedidos DD/MM" (columnas J-O)
   * Retorna un map de extras con sus drivers asignados
   */
  async readBonusSummaryFromSheet(
    bonusDate: string
  ): Promise<Map<string, { extraName: string; totalAmount: number; drivers: string[] }>> {
    const sheetId = process.env.BONUS_RULES_SHEET_ID!;
    const [year, month, day] = bonusDate.split('-');
    const sheetName = `Pedidos ${parseInt(day)}/${parseInt(month)}`;

    console.log(`📖 Leyendo resumen de bonos de "${sheetName}"...`);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Leer columnas J-O (Driver, Total Pedidos, Regla, Monto por Pedi, Total a Pagar, Extra a Crear)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!J2:O1000`, // Desde fila 2 para saltar headers
    });

    const rows = response.data.values || [];
    console.log(`   ✅ ${rows.length} filas de bonos encontradas`);

    // Agrupar por extra (columna O)
    const extraMap = new Map<string, { extraName: string; totalAmount: number; drivers: string[] }>();

    for (const row of rows) {
      if (row.length < 6) continue; // Saltar filas incompletas

      const driverName = row[0]; // Columna J
      const totalAmount = parseInt(row[4]) || 0; // Columna N (Total a Pagar)
      const extraName = row[5]; // Columna O (Extra a Crear)

      if (!extraName || !driverName) continue;

      if (!extraMap.has(extraName)) {
        extraMap.set(extraName, {
          extraName,
          totalAmount,
          drivers: [],
        });
      }

      extraMap.get(extraName)!.drivers.push(driverName);
    }

    console.log(`   ✅ ${extraMap.size} extras únicos encontrados:`);
    for (const [extraName, data] of extraMap) {
      console.log(`      - "${extraName}": ${data.drivers.length} drivers, ${data.totalAmount} Gs`);
    }

    return extraMap;
  }

  // ========== ASSIGN EXTRAS TO DRIVERS ==========

  async assignExtraToDrivers(extraName: string, driverCedulas: string[]): Promise<AssignmentStats> {
    if (!this.page) {
      throw new Error('Página no inicializada');
    }

    const url = process.env.APP_EXTRAS_ASSIGN_URL!;

    console.log(`👥 Asignando extra "${extraName}" a ${driverCedulas.length} conductores...`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
    await sleep(1000);

    let successful = 0;
    let failed = 0;
    const errors: Array<{ driver: string; error: string }> = [];

    // Seleccionar el extra
    const extraDropdown = await this.page.waitForSelector('[data-testid="extra-select"], select[name="extra"]', {
      timeout: 5000,
    });
    await extraDropdown.click();
    await sleep(500);

    const extraSearchInput = await this.page.$('[data-testid="extra-search"], input[placeholder*="Buscar extra"]');
    if (extraSearchInput) {
      await extraSearchInput.fill(extraName);
      await sleep(500);
    }

    const extraOption = await this.page.waitForSelector(`li:has-text("${extraName}"), option:has-text("${extraName}")`, {
      timeout: 5000,
    });
    await extraOption.click();
    await sleep(1000);

    console.log(`   ✅ Extra seleccionado`);

    // Asignar en batches
    const BATCH_SIZE = CONFIG.batchSize;

    for (let i = 0; i < driverCedulas.length; i += BATCH_SIZE) {
      const batch = driverCedulas.slice(i, i + BATCH_SIZE);
      console.log(`   📦 Procesando batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} conductores)...`);

      // Limpiar selección previa
      const limpiarBtn = await this.page.$('button:has-text("Limpiar")');
      if (limpiarBtn) await limpiarBtn.click();

      for (const cedula of batch) {
        try {
          const driverSearchInput = await this.page.waitForSelector(
            '[data-testid="driver-search"], input[placeholder*="Buscar conductor"]',
            { timeout: 3000 }
          );
          await driverSearchInput.fill(cedula);
          await sleep(800);

          const checkbox = await this.page.$(
            `[data-cedula="${cedula}"] input[type="checkbox"], tr:has-text("${cedula}") input[type="checkbox"]`
          );

          if (checkbox) {
            const isChecked = await checkbox.isChecked();
            if (!isChecked) {
              await checkbox.click();
            }
            successful++;
          } else {
            console.log(`      ⚠️  Conductor ${cedula} no encontrado`);
            failed++;
            errors.push({ driver: cedula, error: 'No encontrado en lista' });
          }
        } catch (error: any) {
          console.log(`      ❌ Error con conductor ${cedula}: ${error.message}`);
          failed++;
          errors.push({ driver: cedula, error: error.message });
        }
      }

      // Confirmar asignación del batch
      const asignarBtn = await this.page.waitForSelector('button:has-text("Asignar")', { timeout: 5000 });
      await asignarBtn.click();

      await this.page.waitForSelector('.ant-message-success, .toast-success', {
        timeout: CONFIG.assignmentTimeout,
      });

      console.log(`      ✅ Batch asignado`);
      await sleep(CONFIG.delayBetweenBatches);
    }

    console.log(`✅ Asignación completada: ${successful} exitosos, ${failed} fallidos`);

    return { successful, failed, errors };
  }

  // ========== UPLOAD ORDERS TO SHEET ==========

  async uploadOrdersToSheet(orders: OrderData[], bonusDate: string, sheetId: string): Promise<void> {
    console.log(`📤 Subiendo ${orders.length} pedidos al Google Sheet...`);

    // Parsear fecha para nombre de pestaña (DD/MM)
    const [year, month, day] = bonusDate.split('-');
    const sheetName = `Pedidos ${parseInt(day)}/${parseInt(month)}`;

    console.log(`   📋 Creando pestaña: "${sheetName}"`);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Crear pestaña "Pedidos DD/MM"
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
      console.log(`   ✅ Pestaña "${sheetName}" creada`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`   ⚠️  Pestaña "${sheetName}" ya existe, se sobrescribirá`);
        // Limpiar contenido existente
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: `${sheetName}!A:Z`,
        });
      } else {
        throw error;
      }
    }

    // 3. Preparar headers (estructura exacta del Excel)
    const headers = [
      'Id externo',
      'Nombre del comercio',
      'Hora y fecha de solicitud',
      'Hora de entrega',
      'Driver',
      'Estado del pedido',
      'Zona',
      'Cédula (Aux)', // Columna auxiliar para agregar cédulas manualmente si es necesario
    ];

    // 2. Preparar filas de datos
    const rows = orders.map((order) => [
      order.orderId,
      order.storeName || '',
      order.requestDateTime,
      order.deliveryTime || '',
      order.driverName,
      order.status,
      order.zone,
      order.driverCedula || '', // Si viene en el Excel, se incluye; sino queda vacío
    ]);

    // 3. Subir datos a la hoja
    const dataValues = [headers, ...rows];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:H${rows.length + 1}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: dataValues,
      },
    });
    console.log(`   ✅ ${orders.length} pedidos subidos a "${sheetName}"`);

    // 4. Obtener sheetId para operaciones de formato
    const targetSheetId = await this.getSheetIdByName(sheetId, sheetName, sheets);

    // 5. Formatear headers (negrita)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: targetSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat.textFormat.bold',
            },
          },
        ],
      },
    });

    console.log(`   ✅ Headers formateados`);

    // 6. Generar resumen de bonos en columnas J-O
    await this.addBonusSummaryToSheet(orders, bonusDate, sheetId, sheetName, sheets, targetSheetId);
  }

  // Helper para obtener sheetId por nombre
  private async getSheetIdByName(
    spreadsheetId: string,
    sheetName: string,
    sheets: any
  ): Promise<number> {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = response.data.sheets?.find((s: any) => s.properties.title === sheetName);
    return sheet?.properties?.sheetId || 0;
  }

  // ========== ADD BONUS SUMMARY TO SHEET ==========

  private async addBonusSummaryToSheet(
    orders: OrderData[],
    bonusDate: string,
    spreadsheetId: string,
    sheetName: string,
    sheets: any,
    sheetId: number
  ): Promise<void> {
    console.log(`📊 Generando resumen de bonos...`);

    // 1. Cargar reglas de bonos para esta fecha
    const bonusDateObj = new Date(bonusDate + 'T00:00:00'); // Evitar timezone issues
    const rules = await this.loadBonusRules(spreadsheetId, bonusDateObj);

    if (rules.length === 0) {
      console.log(`   ⚠️  No hay reglas de bonos activas para ${bonusDate}, saltando resumen`);
      return;
    }

    console.log(`   📋 ${rules.length} reglas de bonos encontradas`);

    // 2. Aplicar lógica de cómputo de bonos
    const bonusMap = this.computeBonuses(orders, rules);

    if (bonusMap.size === 0) {
      console.log(`   ⚠️  No hay pedidos elegibles para bonos, saltando resumen`);
      return;
    }

    // 3. Agrupar por driver (consolidar múltiples extras del mismo driver)
    const driverSummary = new Map<string, {
      driverName: string;
      entries: Array<{
        orderCount: number;
        ruleDescription: string;
        amountPerOrder: number;
        totalAmount: number;
        extraName: string;
      }>;
      totalOrders: number;
      totalAmount: number;
    }>();

    for (const [extraName, computations] of bonusMap) {
      for (const comp of computations) {
        const driverKey = comp.driverCedula || comp.driverName;

        if (!driverSummary.has(driverKey)) {
          driverSummary.set(driverKey, {
            driverName: comp.driverName,
            entries: [],
            totalOrders: 0,
            totalAmount: 0,
          });
        }

        const summary = driverSummary.get(driverKey)!;

        // Encontrar regla para descripción
        const rule = rules.find((r) => r.id === comp.ruleId);
        const ruleDescription = rule
          ? `${rule.startTime}-${rule.endTime} ${rule.zones.join(',')}`
          : 'N/A';

        summary.entries.push({
          orderCount: comp.orderCount,
          ruleDescription,
          amountPerOrder: comp.bonusAmount / comp.orderCount,
          totalAmount: comp.bonusAmount,
          extraName: comp.extraName,
        });

        summary.totalOrders += comp.orderCount;
        summary.totalAmount += comp.bonusAmount;
      }
    }

    // 4. Preparar headers y filas para columnas J-O
    const summaryHeaders = [
      'Driver',
      'Total Pedidos Elegibles',
      'Regla Aplicada',
      'Monto por Pedido',
      'Total a Pagar',
      'Extra a Crear',
    ];

    const summaryRows: any[][] = [];

    // Ordenar por total de pedidos elegibles (mayor a menor)
    const sortedDrivers = Array.from(driverSummary.entries()).sort((a, b) => {
      return b[1].totalOrders - a[1].totalOrders;
    });

    for (const [driverKey, summary] of sortedDrivers) {
      // Si el driver tiene múltiples entradas (múltiples reglas), agregar una fila por entrada
      for (let i = 0; i < summary.entries.length; i++) {
        const entry = summary.entries[i];
        summaryRows.push([
          i === 0 ? summary.driverName : '', // Solo mostrar nombre en primera fila
          entry.orderCount,
          entry.ruleDescription,
          entry.amountPerOrder,
          entry.totalAmount,
          entry.extraName,
        ]);
      }

      // Si hay múltiples entradas, agregar una fila de total
      if (summary.entries.length > 1) {
        summaryRows.push([
          `TOTAL ${summary.driverName}`,
          summary.totalOrders,
          '',
          '',
          summary.totalAmount,
          '',
        ]);
      }
    }

    // 5. Escribir headers y filas en columnas J-O
    const rangeStart = 'J1';
    const rangeEnd = `O${summaryRows.length + 1}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${rangeStart}:${rangeEnd}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [summaryHeaders, ...summaryRows],
      },
    });

    console.log(`   ✅ ${summaryRows.length} filas de resumen agregadas (columnas J-O)`);

    // 6. Formatear headers del resumen (negrita)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 9, // Columna J (0-indexed)
                endColumnIndex: 15, // Columna O (exclusive)
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                  },
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                },
              },
              fields: 'userEnteredFormat(textFormat.bold,backgroundColor)',
            },
          },
        ],
      },
    });

    console.log(`   ✅ Headers de resumen formateados`);
  }

  // ========== RECORD ASSIGNMENTS ==========

  async recordAssignments(
    assignments: BonusComputation[],
    executionMode: string,
    sheetId: string
  ): Promise<void> {
    console.log(`📝 Registrando asignaciones...`);

    const timestamp = new Date().toISOString();

    // 1. Guardar en DB (solo si EXECUTE)
    if (executionMode === 'EXECUTE') {
      await prisma.bonusAssignment.createMany({
        data: assignments.map((a) => ({
          executionDate: new Date(),
          bonusDate: a.bonusDate,
          driverCedula: a.driverCedula,
          driverName: a.driverName,
          orderCount: a.orderCount,
          bonusAmount: a.bonusAmount,
          extraName: a.extraName,
          ruleId: a.ruleId,
        })),
      });

      console.log(`   ✅ ${assignments.length} registros guardados en DB`);
    }

    // 2. Siempre registrar en Google Sheet
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const rows = assignments.map((a) => [
      timestamp,
      formatDate(a.bonusDate),
      a.driverCedula,
      a.driverName,
      a.orderCount,
      a.bonusAmount / a.orderCount, // Monto por pedido
      a.bonusAmount,
      a.extraName,
      a.ruleId,
      executionMode,
      'SUCCESS',
      '',
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Bonus Assignments!A:L',
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });

    console.log(`   ✅ ${assignments.length} registros agregados al Sheet de auditoría`);
  }

  // ========== MAIN PROCESS ==========

  async process(config: BonusProcessConfig): Promise<BonusProcessResult> {
    const {
      bonusDate,
      executionMode,
      loginUrl = process.env.APP_LOGIN_URL!,
      ordersReportUrl = process.env.APP_ORDERS_REPORT_URL!,
      email = process.env.APP_EMAIL!,
      password = process.env.APP_PASSWORD!,
    } = config;

    console.log('\n🎯 ============ INICIANDO PROCESO DE BONOS ============');
    console.log(`   📅 Fecha: ${bonusDate}`);
    console.log(`   🏃 Modo: ${executionMode}`);
    console.log('========================================================\n');

    try {
      // 1. Inicializar Playwright
      await this.initialize();

      // 2. Login
      await this.login(loginUrl, ordersReportUrl);

      // 3. Descargar Excel de pedidos
      const excelBuffer = await this.downloadOrdersReport(ordersReportUrl, bonusDate);

      // 4. Parsear Excel
      const orders = parseOrdersExcel(excelBuffer);

      // 4.5 Subir pedidos al Google Sheet (para referencia y auditoría)
      await this.uploadOrdersToSheet(orders, bonusDate, process.env.BONUS_RULES_SHEET_ID!);

      if (orders.length === 0) {
        console.log('⚠️  No hay pedidos para procesar');
        return {
          bonusDate,
          executionMode,
          stats: {
            totalOrders: 0,
            driversProcessed: 0,
            extrasCreated: 0,
            assignmentsSuccessful: 0,
            assignmentsFailed: 0,
            totalPayoutAmount: 0,
          },
        };
      }

      // 5. Cargar reglas
      const rules = await this.loadBonusRules(process.env.BONUS_RULES_SHEET_ID!, new Date(bonusDate));

      if (rules.length === 0) {
        console.log('⚠️  No hay reglas activas para esta fecha');
        return {
          bonusDate,
          executionMode,
          stats: {
            totalOrders: orders.length,
            driversProcessed: 0,
            extrasCreated: 0,
            assignmentsSuccessful: 0,
            assignmentsFailed: 0,
            totalPayoutAmount: 0,
          },
        };
      }

      // 6. Computar bonos
      const extrasByName = this.computeBonuses(orders, rules);

      // 7. Validar duplicados
      const allDriverCedulas = Array.from(extrasByName.values())
        .flat()
        .map((c) => c.driverCedula);
      const duplicates = await this.validateNoDuplicatesInDB(new Date(bonusDate), allDriverCedulas);

      // Filtrar conductores duplicados
      if (duplicates.length > 0) {
        for (const [extraName, computations] of extrasByName) {
          extrasByName.set(
            extraName,
            computations.filter((c) => !duplicates.includes(c.driverCedula))
          );
        }
      }

      // 8. Si es DRY_RUN, generar preview y terminar
      if (executionMode === 'DRY_RUN') {
        const preview = Array.from(extrasByName.entries()).map(([extraName, computations]) => ({
          extraName,
          totalAmount: computations[0]?.bonusAmount || 0,
          driverCount: computations.length,
          drivers: computations.map((c) => `${c.driverName} (${c.driverCedula})`),
        }));

        const totalPayout = Array.from(extrasByName.values())
          .flat()
          .reduce((sum, c) => sum + c.bonusAmount, 0);

        // Registrar en Sheet con status DRY_RUN
        const allComputations = Array.from(extrasByName.values()).flat();
        await this.recordAssignments(allComputations, 'DRY_RUN', process.env.BONUS_RULES_SHEET_ID!);

        return {
          bonusDate,
          executionMode: 'DRY_RUN',
          stats: {
            totalOrders: orders.length,
            driversProcessed: allDriverCedulas.length - duplicates.length,
            extrasCreated: 0,
            assignmentsSuccessful: 0,
            assignmentsFailed: 0,
            totalPayoutAmount: totalPayout,
          },
          preview,
          duplicatesDetected: duplicates.length,
          duplicates,
        };
      }

      // 9. EXECUTE: Crear extras y asignar
      let extrasCreated = 0;
      let assignmentsSuccessful = 0;
      let assignmentsFailed = 0;
      const allErrors: Array<{ driver: string; error: string }> = [];

      for (const [extraName, computations] of extrasByName) {
        if (computations.length === 0) continue;

        const totalAmount = computations[0].bonusAmount;

        // Crear extra
        const created = await this.createExtra(extraName, totalAmount);
        if (created) {
          extrasCreated++;

          // Asignar a conductores
          const driverCedulas = computations.map((c) => c.driverCedula);
          const assignmentStats = await this.assignExtraToDrivers(extraName, driverCedulas);

          assignmentsSuccessful += assignmentStats.successful;
          assignmentsFailed += assignmentStats.failed;
          allErrors.push(...assignmentStats.errors);
        }
      }

      // 10. Registrar en DB y Sheet
      const allComputations = Array.from(extrasByName.values()).flat();
      await this.recordAssignments(allComputations, 'EXECUTE', process.env.BONUS_RULES_SHEET_ID!);

      const totalPayout = allComputations.reduce((sum, c) => sum + c.bonusAmount, 0);

      return {
        bonusDate,
        executionMode: 'EXECUTE',
        stats: {
          totalOrders: orders.length,
          driversProcessed: allDriverCedulas.length - duplicates.length,
          extrasCreated,
          assignmentsSuccessful,
          assignmentsFailed,
          totalPayoutAmount: totalPayout,
        },
        errors: allErrors.length > 0 ? allErrors : undefined,
        duplicatesDetected: duplicates.length,
        duplicates: duplicates.length > 0 ? duplicates : undefined,
      };
    } finally {
      await this.close();
    }
  }

  // ========== CLEANUP ==========

  async close(): Promise<void> {
    if (!this.usingSharedSession && this.browser) {
      console.log('🔒 Cerrando navegador...');
      await this.browser.close();
      console.log('✅ Navegador cerrado');
    } else if (this.usingSharedSession) {
      console.log('🔗 Sesión compartida, no se cierra el navegador');
    }
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const bonusProcessorService = new BonusProcessor();
