// lib/services/google-sheets.ts
import { google } from 'googleapis';

const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
  throw new Error('Missing Google Sheets credentials in environment variables');
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const googleSheets = google.sheets({
  version: 'v4',
  auth,
});

/**
 * Obtiene filas de una hoja de Google Sheets
 * @param {string} table_name - Nombre de la hoja (ej: 'Hoja1')
 * @param {string} spreadsheet_id - ID de la hoja de cálculo
 * @returns {Promise<Object>} - Respuesta de la API con los datos
 */
export const getRows = async (table_name: string, spreadsheet_id: string) => {
  try {
    const response = await googleSheets.spreadsheets.values.get({
      auth,
      spreadsheetId: spreadsheet_id,
      range: table_name,
    });

    return response;
  } catch (error) {
    console.error('Error al obtener filas de Google Sheets:', error);
    throw error;
  }
};

/**
 * Obtiene filas de una hoja específica con rango personalizado
 * @param {string} spreadsheet_id - ID de la hoja de cálculo
 * @param {string} range - Rango específico (ej: 'Hoja1!A1:C100')
 * @returns {Promise<any[][]>} - Array de arrays con los datos
 */
export const getRowsInRange = async (spreadsheet_id: string, range: string): Promise<any[][]> => {
  try {
    const response = await googleSheets.spreadsheets.values.get({
      auth,
      spreadsheetId: spreadsheet_id,
      range: range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error al obtener rango de Google Sheets:', error);
    throw error;
  }
};

/**
 * Estructura de datos para un Driver desde Google Sheets
 */
export interface DriverRow {
  id: string;
  cedula: string;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  tipoDoc: string;
  habilitado: string;
  fechaUltTurno: string;
  fechaRegistro: string;
}

/**
 * Obtiene datos de drivers desde Google Sheets
 * @param {string} spreadsheet_id - ID de la hoja de cálculo
 * @param {string} sheet_name - Nombre de la hoja (por defecto 'Drivers')
 * @returns {Promise<DriverRow[]>} - Array de datos de drivers
 */
export const getDriversData = async (
  spreadsheet_id: string, 
  sheet_name: string = 'Drivers'
): Promise<DriverRow[]> => {
  try {
    console.info(`Obteniendo datos de drivers de Google Sheets: ${sheet_name}`);
    
    // Obtener todos los datos de la hoja
    const response = await getRows(sheet_name, spreadsheet_id);
    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      console.warn('No se encontraron datos en la hoja o solo hay encabezados');
      return [];
    }
    
    // Procesar datos (saltamos la primera fila que son los encabezados)
    const driversData: DriverRow[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Verificar que la fila tenga al menos 10 columnas según el CSV
      if (!row || row.length < 10) {
        console.warn(`Fila ${i + 1} incompleta, saltando...`);
        continue;
      }
      
      const [id, cedula, nombre, apellido, telefono, correo, tipoDoc, habilitado, fechaUltTurno, fechaRegistro] = row;
      
      // Validar que los datos mínimos no estén vacíos (cédula y teléfono son obligatorios)
      if (!cedula || !telefono) {
        console.warn(`Fila ${i + 1} sin cédula o teléfono, saltando...`);
        continue;
      }
      
      driversData.push({
        id: String(id || ''),
        cedula: String(cedula),
        nombre: String(nombre || ''),
        apellido: String(apellido || ''),
        telefono: String(telefono),
        correo: String(correo || ''),
        tipoDoc: String(tipoDoc || ''),
        habilitado: String(habilitado || ''),
        fechaUltTurno: String(fechaUltTurno || ''),
        fechaRegistro: String(fechaRegistro || '')
      });
    }
    
    console.info(`Procesados ${driversData.length} drivers de ${rows.length - 1} filas`);
    return driversData;
    
  } catch (error) {
    console.error('Error al obtener datos de drivers de Google Sheets:', error);
    throw new Error(`Error al obtener datos de drivers: ${(error as Error).message}`);
  }
};

/**
 * Obtiene los últimos N drivers registrados
 * @param {string} spreadsheet_id - ID de la hoja de cálculo
 * @param {number} limit - Cantidad de drivers a obtener
 * @param {string} sheet_name - Nombre de la hoja
 * @returns {Promise<DriverRow[]>} - Array de los últimos drivers
 */
export const getLatestDrivers = async (
  spreadsheet_id: string,
  limit: number = 10,
  sheet_name: string = 'Drivers'
): Promise<DriverRow[]> => {
  try {
    const allDrivers = await getDriversData(spreadsheet_id, sheet_name);
    // Retornar los últimos N drivers (asumiendo que están ordenados por fecha)
    return allDrivers.slice(-limit);
  } catch (error) {
    console.error('Error al obtener últimos drivers:', error);
    throw error;
  }
};

/**
 * Obtiene drivers nuevos desde una fecha específica
 * @param {string} spreadsheet_id - ID de la hoja de cálculo
 * @param {string} fromDate - Fecha desde la cual buscar (formato DD/MM/YYYY)
 * @param {string} sheet_name - Nombre de la hoja
 * @returns {Promise<DriverRow[]>} - Array de drivers nuevos
 */
export const getNewDriversSince = async (
  spreadsheet_id: string,
  fromDate: string,
  sheet_name: string = 'Drivers'
): Promise<DriverRow[]> => {
  try {
    const allDrivers = await getDriversData(spreadsheet_id, sheet_name);
    
    // Convertir fecha de comparación a formato comparable
    const [day, month, year] = fromDate.split('/');
    const compareDate = new Date(`${year}-${month}-${day}`);
    
    return allDrivers.filter(driver => {
      if (!driver.fechaRegistro) return false;
      
      const [driverDay, driverMonth, driverYear] = driver.fechaRegistro.split('/');
      const driverDate = new Date(`${driverYear}-${driverMonth}-${driverDay}`);
      
      return driverDate > compareDate;
    });
  } catch (error) {
    console.error('Error al obtener drivers nuevos:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas básicas de los drivers
 * @param {string} spreadsheet_id - ID de la hoja de cálculo
 * @param {string} sheet_name - Nombre de la hoja
 * @returns {Promise<Object>} - Estadísticas de los drivers
 */
export const getDriversStats = async (
  spreadsheet_id: string,
  sheet_name: string = 'Drivers'
): Promise<{
  total: number;
  habilitados: number;
  conTurnos: number;
  sinTurnos: number;
  nuevosUltimos7Dias: number;
}> => {
  try {
    const drivers = await getDriversData(spreadsheet_id, sheet_name);
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const stats = {
      total: drivers.length,
      habilitados: drivers.filter(d => 
        d.habilitado.toLowerCase() === 'si' || 
        d.habilitado.toLowerCase() === 'sí' || 
        d.habilitado === '1'
      ).length,
      conTurnos: drivers.filter(d => d.fechaUltTurno).length,
      sinTurnos: drivers.filter(d => !d.fechaUltTurno).length,
      nuevosUltimos7Dias: drivers.filter(d => {
        if (!d.fechaRegistro) return false;
        const [day, month, year] = d.fechaRegistro.split('/');
        const driverDate = new Date(`${year}-${month}-${day}`);
        return driverDate > sevenDaysAgo;
      }).length
    };
    
    console.info('Estadísticas calculadas:', stats);
    return stats;
    
  } catch (error) {
    console.error('Error al calcular estadísticas:', error);
    throw error;
  }
};