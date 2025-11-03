// lib/services/google-sheets-drive.service.ts
// Adaptado de scripts/utils/sheet-connection.ts para uso en Next.js

import { google } from 'googleapis';

// ============================================================================
// GOOGLE SHEETS
// ============================================================================

const sheetsAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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
 */
export async function getExternalDrivers(
  spreadsheetId: string,
  sheetName: string = 'Drivers Externos'
): Promise<ExternalDriver[]> {
  try {
    console.log(`📊 Obteniendo conductores externos de "${sheetName}"...`);
    
    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A:B`,
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.warn('⚠️  No se encontraron datos en la hoja');
      return [];
    }

    const drivers: ExternalDriver[] = rows
      .slice(1)
      .filter((row) => row[0] && row[1])
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
// GOOGLE DRIVE
// ============================================================================

const driveAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive'
  ],
});

const googleDrive = google.drive({
  version: 'v3',
  auth: driveAuth,
});

/**
 * Busca una carpeta por nombre dentro de una carpeta padre
 */
export async function findDriveFolderByName(
  folderName: string,
  parentFolderId: string
): Promise<string | null> {
  try {
    const response = await googleDrive.files.list({
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
 * Crea una carpeta en Google Drive
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId: string,
  userEmail?: string
): Promise<string> {
  try {
    console.log(`📁 Creando carpeta "${folderName}" en Drive...`);
    
    const existingFolder = await findDriveFolderByName(folderName, parentFolderId);
    
    if (existingFolder) {
      console.log(`✅ Carpeta "${folderName}" ya existe (ID: ${existingFolder})`);
      return existingFolder;
    }
    
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const response = await googleDrive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name',
    });

    const folderId = response.data.id!;
    console.log(`✅ Carpeta creada exitosamente (ID: ${folderId})`);
    
    if (userEmail) {
      try {
        console.log(`🔑 Dando permisos a ${userEmail}...`);
        
        await googleDrive.permissions.create({
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
 * Sube un archivo a Google Drive
 */
export async function uploadFileToDrive(
  filePath: string,
  fileName: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  try {
    console.log(`📤 Subiendo "${fileName}" a Drive...`);
    
    const fs = require('fs');
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(filePath),
    };

    const response = await googleDrive.files.create({
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
 */
export function generateWeekFolderName(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthName = months[end.getMonth()];
  
  return `${startDay}-${endDay} ${monthName}`;
}

/**
 * Obtiene o crea la carpeta semanal para los PDFs
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