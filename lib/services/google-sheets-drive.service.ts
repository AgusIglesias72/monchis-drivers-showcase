// lib/services/google-sheets-drive.service.ts
// Versión híbrida: Service Account para Sheets, OAuth para Drive

import { google } from 'googleapis';
import * as fs from 'fs';

export interface ExternalDriver {
  nombre: string;
  driver_id: string;
}

// ============================================================================
// GOOGLE SHEETS - SERVICE ACCOUNT
// ============================================================================

function getSheetsAuth() {
  const client_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const private_key = process.env.GOOGLE_PRIVATE_KEY;

  if (!client_email || !private_key) {
    throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY en .env');
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email,
      private_key: private_key.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

/**
 * Lee conductores desde Google Sheets usando Service Account
 */
export async function getExternalDrivers(
  spreadsheetId: string,
  sheetName: string
): Promise<ExternalDriver[]> {
  console.log(`📊 Leyendo conductores desde Google Sheets...`);
  
  try {
    const auth = getSheetsAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:B`, // Saltar header (A1:B1)
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('⚠️  No se encontraron conductores');
      return [];
    }

    const drivers: ExternalDriver[] = rows
      .filter((row) => row[0] && row[1])
      .map((row) => ({
        nombre: String(row[0]).trim(),
        driver_id: String(row[1]).trim(),
      }));

    console.log(`✅ ${drivers.length} conductores obtenidos`);
    return drivers;
  } catch (error: any) {
    console.error('❌ Error leyendo Google Sheets:', error.message);
    throw new Error(`Error leyendo Google Sheets: ${error.message}`);
  }
}

// ============================================================================
// GOOGLE DRIVE - OAUTH
// ============================================================================

let cachedOAuthClient: any = null;

/**
 * Obtiene cliente OAuth para Google Drive
 * Usa el token guardado en la base de datos o variables de entorno
 */
async function getDriveAuth() {
  if (cachedOAuthClient) {
    return cachedOAuthClient;
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN; // Nuevo!

  if (!clientId || !clientSecret) {
    throw new Error('Falta GOOGLE_OAUTH_CLIENT_ID o GOOGLE_OAUTH_CLIENT_SECRET en .env');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000' // No se usa en producción
  );

  if (refreshToken) {
    // Si tenemos refresh token, usarlo directamente
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    
    // El cliente auto-refrescará el access token cuando sea necesario
    cachedOAuthClient = oauth2Client;
    return oauth2Client;
  }

  throw new Error(
    'Falta GOOGLE_OAUTH_REFRESH_TOKEN en .env. ' +
    'Ejecuta: npm run auth:google para obtener el token'
  );
}

/**
 * Busca una carpeta por nombre en Drive
 */
async function findDriveFolderByName(
  folderName: string,
  parentFolderId: string
): Promise<string | null> {
  try {
    const auth = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    return null;
  } catch (error: any) {
    console.error(`❌ Error buscando carpeta "${folderName}":`, error.message);
    throw error;
  }
}

/**
 * Crea o encuentra una carpeta en Drive
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId: string,
  ownerEmail?: string
): Promise<string> {
  console.log(`📁 Verificando carpeta "${folderName}"...`);
  
  try {
    // Primero buscar si ya existe
    const existingFolderId = await findDriveFolderByName(folderName, parentFolderId);
    
    if (existingFolderId) {
      console.log(`✅ Carpeta "${folderName}" ya existe: ${existingFolderId}`);
      return existingFolderId;
    }

    // Si no existe, crearla
    console.log(`📁 Creando carpeta "${folderName}"...`);
    
    const auth = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    const folderId = response.data.id!;
    console.log(`✅ Carpeta "${folderName}" creada: ${folderId}`);

    // Compartir con el owner si se especificó
    if (ownerEmail) {
      try {
        await drive.permissions.create({
          fileId: folderId,
          requestBody: {
            type: 'user',
            role: 'writer',
            emailAddress: ownerEmail,
          },
        });
        console.log(`✅ Carpeta compartida con ${ownerEmail}`);
      } catch (permError) {
        console.warn(`⚠️  No se pudo compartir con ${ownerEmail}`);
      }
    }

    return folderId;
  } catch (error: any) {
    console.error(`❌ Error con carpeta "${folderName}":`, error.message);
    throw new Error(`Error creando carpeta: ${error.message}`);
  }
}

/**
 * Sube un archivo a Drive
 */
export async function uploadFileToDrive(
  filePath: string,
  fileName: string,
  folderId: string
): Promise<string> {
  try {
    const auth = await getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    return response.data.id!;
  } catch (error: any) {
    console.error(`❌ Error subiendo "${fileName}":`, error.message);
    throw new Error(`Error subiendo archivo: ${error.message}`);
  }
}

/**
 * Genera nombre de carpeta semanal
 * IMPORTANTE: Parsea las fechas sin conversión de zona horaria
 */
export function generateWeekFolderName(startDate: string, endDate: string): string {
  // Parsear manualmente para evitar conversión de zona horaria
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthName = months[endMonth - 1]; // -1 porque el array es 0-indexed

  return `${startDay}-${endDay} ${monthName}`;
}