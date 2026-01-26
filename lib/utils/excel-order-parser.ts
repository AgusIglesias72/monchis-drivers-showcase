// lib/utils/excel-order-parser.ts
// Parser para extraer datos de pedidos desde Excel descargado de /reports/requestsHistory

import * as XLSX from 'xlsx';

export interface OrderData {
  orderId: string;
  storeName?: string;     // "Bodega la Previa - Lambaré"
  requestDateTime: string; // "15/01/2026 23:53:44" (Hora y fecha de solicitud)
  deliveryTime?: string;   // "15/01/2026 23:58:01" (Hora de entrega)
  driverName: string;
  driverCedula?: string;  // Opcional - por ahora trabajamos con nombre solamente
  status: string;         // "FINALIZED", "CANCELED_BY_CLIENT", etc
  zone: string;           // "Centro", "Lambare", etc
  orderDate: string;      // YYYY-MM-DD (parseado de requestDateTime)
  orderTime: string;      // HH:MM (parseado de requestDateTime)
  amount?: number;        // Opcional - monto del pedido
}

interface RawOrderRow {
  [key: string]: any;
}

/**
 * Parsea un archivo Excel de pedidos y retorna un array de OrderData validados
 *
 * @param buffer - Buffer del archivo Excel descargado
 * @returns Array de pedidos validados (solo COMPLETED)
 */
export function parseOrdersExcel(buffer: Buffer): OrderData[] {
  console.log('📥 Parseando Excel de pedidos...');

  // 1. Leer archivo Excel
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('El archivo Excel no contiene hojas');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawData: RawOrderRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`   📊 ${rawData.length} filas encontradas en el Excel`);

  if (rawData.length === 0) {
    console.log('   ⚠️  Excel vacío, retornando array vacío');
    return [];
  }

  // 2. Detectar headers (asumiendo que pueden variar)
  const firstRow = rawData[0];
  const headers = Object.keys(firstRow);

  console.log('   📋 Headers detectados:', headers.join(', '));

  // 3. Mapear headers a nuestros campos esperados (case-insensitive)
  const headerMap = detectHeaderMapping(headers);

  console.log('   🔗 Mapeo de headers:');
  Object.entries(headerMap).forEach(([ourField, excelHeader]) => {
    console.log(`      ${ourField} → ${excelHeader || 'NO ENCONTRADO'}`);
  });

  // 4. Validar que tenemos los headers mínimos requeridos
  const requiredFields = ['orderId', 'requestDateTime', 'driverName', 'status', 'zone'];
  const missingFields = requiredFields.filter(field => !headerMap[field]);

  if (missingFields.length > 0) {
    throw new Error(`Headers requeridos no encontrados: ${missingFields.join(', ')}`);
  }

  // 5. Procesar cada fila
  const validOrders: OrderData[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const rowNumber = i + 2; // +2 porque Excel empieza en 1 y tiene header

    try {
      const order = parseOrderRow(row, headerMap, rowNumber);

      // Solo incluir pedidos FINALIZED (completados exitosamente)
      if (order.status === 'FINALIZED') {
        validOrders.push(order);
      }

    } catch (error: any) {
      errors.push(`Fila ${rowNumber}: ${error.message}`);
    }
  }

  // 6. Reportar resultado
  console.log(`   ✅ ${validOrders.length} pedidos válidos (FINALIZED)`);
  console.log(`   ⚠️  ${rawData.length - validOrders.length} pedidos filtrados (no FINALIZED o inválidos)`);

  if (errors.length > 0) {
    console.log(`   ❌ ${errors.length} errores de parseo:`);
    errors.slice(0, 5).forEach(err => console.log(`      - ${err}`));
    if (errors.length > 5) {
      console.log(`      ... y ${errors.length - 5} más`);
    }
  }

  return validOrders;
}

/**
 * Detecta el mapeo entre nuestros campos y los headers del Excel
 */
function detectHeaderMapping(headers: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {
    orderId: null,
    storeName: null,
    requestDateTime: null,
    deliveryTime: null,
    driverName: null,
    driverCedula: null,
    status: null,
    zone: null,
    amount: null,
  };

  // Normalizar headers (lowercase, sin espacios ni acentos)
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/\s+/g, ''); // Quitar espacios

  // Posibles variaciones de cada campo
  const patterns: Record<string, RegExp[]> = {
    orderId: [/^(id|order|pedido)[-_]?(externo|external|id|numero)?$/i],
    storeName: [/^(nombre|name)[-_]?(del|of|the)?[-_]?(comercio|store|shop|restaurant)$/i],
    requestDateTime: [/^(hora|time)[-_]?(y|and)?[-_]?(fecha|date)[-_]?(de)?[-_]?(solicitud|request)$/i],
    deliveryTime: [/^(hora|time)[-_]?(de)?[-_]?(entrega|delivery)$/i],
    driverName: [/^(driver|conductor|repartidor)$/i],
    driverCedula: [/^(driver|conductor|repartidor)[-_]?(cedula|ci|id|document)$/i, /^cedula$/i],
    status: [/^(status|estado|state)[-_]?(del)?[-_]?(pedido|order)?$/i],
    zone: [/^(zone|zona|area|region)$/i],
    amount: [/^(amount|monto|total|price|precio)$/i],
  };

  // Buscar coincidencias
  for (const header of headers) {
    const normalizedHeader = normalize(header);

    for (const [field, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        if (regex.test(normalizedHeader)) {
          mapping[field] = header;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Parsea una fila individual del Excel
 */
function parseOrderRow(
  row: RawOrderRow,
  headerMap: Record<string, string | null>,
  rowNumber: number
): OrderData {
  // Extraer valores usando el mapeo
  const orderId = String(row[headerMap.orderId!] || '').trim();
  const storeName = headerMap.storeName ? String(row[headerMap.storeName] || '').trim() : undefined;
  const requestDateTime = String(row[headerMap.requestDateTime!] || '').trim();
  const deliveryTime = headerMap.deliveryTime ? String(row[headerMap.deliveryTime] || '').trim() : undefined;
  const driverName = String(row[headerMap.driverName!] || '').trim();
  const zone = String(row[headerMap.zone!] || '').trim();
  const status = String(row[headerMap.status!] || '').trim().toUpperCase();
  const amountRaw = headerMap.amount ? row[headerMap.amount] : undefined;

  // Validaciones básicas
  if (!orderId) {
    throw new Error('Order ID vacío');
  }

  if (!driverName) {
    throw new Error('Nombre de conductor vacío');
  }

  if (!requestDateTime) {
    throw new Error('Hora y fecha de solicitud vacía');
  }

  // Parsear requestDateTime para extraer orderDate y orderTime
  // Formato esperado: "15/01/2026 23:53:44" o similar
  const { date: orderDate, time: orderTime } = parseDateTimeString(requestDateTime);

  if (!orderDate || !orderTime) {
    throw new Error(`Formato de fecha/hora de solicitud inválido: "${requestDateTime}"`);
  }

  // Extraer cédula si existe en el Excel, sino dejar undefined
  const driverCedula = headerMap.driverCedula
    ? String(row[headerMap.driverCedula] || '').trim() || undefined
    : undefined;

  if (!zone) {
    throw new Error('Zona vacía');
  }

  if (!status) {
    throw new Error('Estado vacío');
  }

  // Procesar monto (opcional)
  let amount: number | undefined = undefined;
  if (amountRaw !== undefined && amountRaw !== null && amountRaw !== '') {
    const parsedAmount = parseFloat(String(amountRaw).replace(/[^\d.-]/g, ''));
    if (!isNaN(parsedAmount)) {
      amount = parsedAmount;
    }
  }

  return {
    orderId,
    storeName,
    requestDateTime,
    deliveryTime,
    driverName,
    driverCedula,
    status,
    zone,
    orderDate,
    orderTime,
    amount,
  };
}

/**
 * Parsea un string de fecha/hora a formato separado
 * Formato esperado: "15/01/2026 23:53:44"
 */
function parseDateTimeString(dateTimeStr: string): { date: string | null; time: string | null } {
  if (!dateTimeStr) return { date: null, time: null };

  try {
    // Intentar parsear "DD/MM/YYYY HH:MM:SS" o "DD/MM/YYYY HH:MM"
    const match = dateTimeStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);

    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      const hour = match[4].padStart(2, '0');
      const minute = match[5];

      return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}`
      };
    }

    return { date: null, time: null };
  } catch (error) {
    return { date: null, time: null };
  }
}

/**
 * Convierte una fecha de Excel a formato YYYY-MM-DD
 */
function parseExcelDate(value: any): string | null {
  if (!value) return null;

  try {
    // Si es un número (fecha serial de Excel)
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        const year = date.y;
        const month = String(date.m).padStart(2, '0');
        const day = String(date.d).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    // Si es un string
    if (typeof value === 'string') {
      // Intentar parsear como fecha ISO
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      }

      // Intentar parsear DD/MM/YYYY o DD-MM-YYYY
      const dmyMatch = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        const year = dmyMatch[3];
        return `${year}-${month}-${day}`;
      }

      // Intentar parsear como Date de JavaScript
      const jsDate = new Date(value);
      if (!isNaN(jsDate.getTime())) {
        const year = jsDate.getFullYear();
        const month = String(jsDate.getMonth() + 1).padStart(2, '0');
        const day = String(jsDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    // Si es un objeto Date
    if (value instanceof Date && !isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

  } catch (error) {
    return null;
  }

  return null;
}

/**
 * Convierte una hora de Excel a formato HH:MM
 */
function parseExcelTime(value: any): string | null {
  if (!value) return null;

  try {
    // Si es un número (fracción de día de Excel: 0.5 = 12:00)
    if (typeof value === 'number' && value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Si es un número mayor a 1 (podría ser hora en formato serial completo)
    if (typeof value === 'number' && value >= 1) {
      const fraction = value - Math.floor(value);
      const totalMinutes = Math.round(fraction * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Si es un string
    if (typeof value === 'string') {
      // Intentar parsear HH:MM o HH:MM:SS
      const timeMatch = value.match(/^(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = timeMatch[1].padStart(2, '0');
        const minutes = timeMatch[2];
        return `${hours}:${minutes}`;
      }
    }

  } catch (error) {
    return null;
  }

  return null;
}
