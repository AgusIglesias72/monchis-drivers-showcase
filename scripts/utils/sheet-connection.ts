// scripts/utils/sheet-connection.ts
// Utilidades para interactuar con Google Sheets y Google Drive
import 'dotenv/config';
import { google } from 'googleapis';

const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;

if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
  throw new Error('Missing Google Sheets credentials in environment variables');
}

// ============================================================================
// GOOGLE SHEETS
// ============================================================================

const sheetsAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const googleSheets = google.sheets({
  version: 'v4',
  auth: sheetsAuth,
});

/**
 * Interface para datos de conductores externos
 */
export interface ExternalDriver {
  nombre: string;
  driver_id: string;
}

/**
 * Obtiene la lista de conductores externos desde Google Sheets
 * @param spreadsheetId - ID del spreadsheet
 * @param sheetName - Nombre de la hoja (default: "Drivers Externos")
 * @returns Array de conductores con nombre e ID
 */
export async function getExternalDrivers(
  spreadsheetId: string,
  sheetName: string = 'Drivers Externos'
): Promise<ExternalDriver[]> {
  try {
    console.log(`📊 Obteniendo conductores externos de "${sheetName}"...`);
    
    const response = await googleSheets.spreadsheets.values.get({
      auth: sheetsAuth,
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A:B`, // Columna A: nombre, Columna B: driver_id
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.warn('⚠️  No se encontraron datos en la hoja');
      return [];
    }

    // Saltar la primera fila (headers) y procesar el resto
    const drivers: ExternalDriver[] = rows
      .slice(1)
      .filter((row) => row[0] && row[1]) // Filtrar filas vacías
      .map((row) => ({
        nombre: String(row[0]).trim(),
        driver_id: String(row[1]).trim(),
      }));

    console.log(`✅ Se encontraron ${drivers.length} conductores externos`);
    return drivers;
    
  } catch (error) {
    console.error('❌ Error al obtener conductores de Google Sheets:', error);
    throw error;
  }
}

// ============================================================================
// GOOGLE DRIVE - OAUTH AUTHENTICATION
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Configuración de OAuth
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

const TOKEN_PATH = path.join(process.cwd(), 'google-drive-token.json');

/**
 * Crea un cliente OAuth2 para Google Drive
 */
function createOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = 'http://localhost:3000'; // Para aplicaciones locales
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in environment variables');
  }
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Obtiene el token de OAuth, solicitando autorización si es necesario
 */
async function getOAuthToken(): Promise<any> {
  const oauth2Client = createOAuthClient();
  
  // Intentar cargar token guardado
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      oauth2Client.setCredentials(token);
      
      // Verificar si el token necesita refresh
      if (token.expiry_date && token.expiry_date < Date.now()) {
        console.log('🔄 Token expirado, refrescando...');
        const newToken = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(newToken.credentials);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(newToken.credentials));
        console.log('✅ Token refrescado');
      }
      
      return oauth2Client;
    } catch (error) {
      console.warn('⚠️  Token inválido, solicitando nueva autorización...');
    }
  }
  
  // Si no hay token o es inválido, solicitar autorización
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: OAUTH_SCOPES,
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🔐 AUTORIZACIÓN REQUERIDA');
  console.log('='.repeat(80));
  console.log('\n1. Abre esta URL en tu navegador:\n');
  console.log(authUrl);
  console.log('\n2. Autoriza la aplicación');
  console.log('3. Copia el código que te dan');
  console.log('4. Pégalo aquí:\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const code = await new Promise<string>((resolve) => {
    rl.question('Código de autorización: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
  
  // Intercambiar código por token
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  // Guardar token para uso futuro
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log(`\n✅ Token guardado en: ${TOKEN_PATH}`);
  console.log('💡 Este token se usará automáticamente en futuras ejecuciones\n');
  
  return oauth2Client;
}

// Inicializar cliente OAuth (se ejecutará cuando se necesite)
let driveAuthClient: any = null;

async function getDriveAuth() {
  if (!driveAuthClient) {
    driveAuthClient = await getOAuthToken();
  }
  return driveAuthClient;
}

const googleDrive = google.drive({
  version: 'v3',
  // La auth se configurará dinámicamente
});

/**
 * Crea una carpeta en Google Drive y le da permisos al usuario especificado
 * @param folderName - Nombre de la carpeta
 * @param parentFolderId - ID de la carpeta padre
 * @param userEmail - Email del usuario al que darle permisos (opcional)
 * @returns ID de la carpeta creada
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId: string,
  userEmail?: string
): Promise<string> {
  try {
    console.log(`📁 Creando carpeta "${folderName}" en Drive...`);
    
    const auth = await getDriveAuth();
    
    // Primero verificar si la carpeta ya existe
    const existingFolder = await findDriveFolderByName(folderName, parentFolderId);
    
    if (existingFolder) {
      console.log(`✅ Carpeta "${folderName}" ya existe (ID: ${existingFolder})`);
      return existingFolder;
    }
    
    // Si no existe, crearla
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const response = await google.drive({ version: 'v3', auth }).files.create({
      requestBody: fileMetadata,
      fields: 'id, name',
    });

    const folderId = response.data.id!;
    console.log(`✅ Carpeta creada exitosamente (ID: ${folderId})`);
    
    // Si se proporcionó un email de usuario, darle permisos
    if (userEmail) {
      try {
        console.log(`🔑 Dando permisos a ${userEmail}...`);
        
        await google.drive({ version: 'v3', auth }).permissions.create({
          fileId: folderId,
          requestBody: {
            type: 'user',
            role: 'writer',
            emailAddress: userEmail,
          },
          fields: 'id',
        });
        
        console.log(`✅ Permisos otorgados a ${userEmail}`);
      } catch (permError) {
        console.warn(`⚠️  No se pudieron otorgar permisos: ${(permError as Error).message}`);
      }
    }
    
    return folderId;
    
  } catch (error) {
    console.error(`❌ Error al crear carpeta "${folderName}":`, error);
    throw error;
  }
}

/**
 * Busca una carpeta por nombre dentro de una carpeta padre
 * @param folderName - Nombre de la carpeta a buscar
 * @param parentFolderId - ID de la carpeta padre
 * @returns ID de la carpeta si existe, null si no existe
 */
export async function findDriveFolderByName(
  folderName: string,
  parentFolderId: string
): Promise<string | null> {
  try {
    const auth = await getDriveAuth();
    
    const response = await google.drive({ version: 'v3', auth }).files.list({
      q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    return null;
    
  } catch (error) {
    console.error(`❌ Error buscando carpeta "${folderName}":`, error);
    throw error;
  }
}

/**
 * Sube un archivo a Google Drive
 * @param filePath - Ruta local del archivo
 * @param fileName - Nombre del archivo en Drive
 * @param folderId - ID de la carpeta destino
 * @returns ID y URL del archivo subido
 */
export async function uploadFileToDrive(
  filePath: string,
  fileName: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  try {
    console.log(`📤 Subiendo "${fileName}" a Drive...`);
    
    const auth = await getDriveAuth();
    const fs = require('fs');
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(filePath),
    };

    const response = await google.drive({ version: 'v3', auth }).files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    console.log(`✅ Archivo subido exitosamente`);
    console.log(`   🔗 Link: ${response.data.webViewLink}`);
    
    return {
      fileId: response.data.id!,
      webViewLink: response.data.webViewLink!,
    };
    
  } catch (error) {
    console.error(`❌ Error al subir archivo "${fileName}":`, error);
    throw error;
  }
}

/**
 * Genera el nombre de la carpeta semanal basado en fechas
 * @param startDate - Fecha de inicio (formato: YYYY-MM-DD)
 * @param endDate - Fecha de fin (formato: YYYY-MM-DD)
 * @returns Nombre de la carpeta (ej: "20-26 Oct")
 */
export function generateWeekFolderName(startDate: string, endDate: string): string {
  // Parsear fechas
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Obtener día de inicio y fin
  const startDay = start.getDate();
  const endDay = end.getDate();
  
  // Obtener mes (en español)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthName = months[end.getMonth()];
  
  // Formato: "20-26 Oct"
  return `${startDay}-${endDay} ${monthName}`;
}

/**
 * Obtiene o crea la carpeta semanal para los PDFs
 * @param parentFolderId - ID de la carpeta padre donde crear la carpeta semanal
 * @param startDate - Fecha de inicio de la semana
 * @param endDate - Fecha de fin de la semana
 * @param userEmail - Email del usuario al que darle permisos (opcional)
 * @returns ID de la carpeta semanal
 */
export async function getOrCreateWeekFolder(
  parentFolderId: string,
  startDate: string,
  endDate: string,
  userEmail?: string
): Promise<string> {
  const folderName = generateWeekFolderName(startDate, endDate);
  return await createDriveFolder(folderName, parentFolderId, userEmail);
}


// Agregar al final de scripts/utils/sheet-connection.ts

/**
 * Escribe datos en una hoja de Google Sheets
 * @param spreadsheetId - ID del spreadsheet
 * @param sheetName - Nombre de la hoja
 * @param values - Matriz de valores a escribir
 * @param startCell - Celda inicial (ej: "A1")
 */
export async function writeToSheet(
  spreadsheetId: string,
  sheetName: string,
  values: any[][],
  startCell: string = 'A1'
): Promise<void> {
  try {
    console.log(`📝 Escribiendo ${values.length} filas en "${sheetName}"...`);
    
    const range = `${sheetName}!${startCell}`;
    
    await googleSheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    
    console.log(`✅ Datos escritos exitosamente en "${sheetName}"`);
  } catch (error) {
    console.error(`❌ Error escribiendo en Google Sheets:`, error);
    throw error;
  }
}

/**
 * Limpia el contenido de una hoja (mantiene los headers)
 * @param spreadsheetId - ID del spreadsheet
 * @param sheetName - Nombre de la hoja
 */
export async function clearSheet(
  spreadsheetId: string,
  sheetName: string,
  keepHeaders: boolean = true
): Promise<void> {
  try {
    console.log(`🧹 Limpiando hoja "${sheetName}"...`);
    
    const startRow = keepHeaders ? 'A2' : 'A1';
    const range = `${sheetName}!${startRow}:ZZ`;
    
    await googleSheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
    
    console.log(`✅ Hoja "${sheetName}" limpiada`);
  } catch (error) {
    console.error(`❌ Error limpiando hoja:`, error);
    throw error;
  }
}

/**
 * Agrega filas al final de una hoja
 * @param spreadsheetId - ID del spreadsheet
 * @param sheetName - Nombre de la hoja
 * @param values - Matriz de valores a agregar
 */
export async function appendToSheet(
  spreadsheetId: string,
  sheetName: string,
  values: any[][]
): Promise<void> {
  try {
    console.log(`➕ Agregando ${values.length} filas a "${sheetName}"...`);
    
    await googleSheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    
    console.log(`✅ Filas agregadas exitosamente`);
  } catch (error) {
    console.error(`❌ Error agregando filas:`, error);
    throw error;
  }
}