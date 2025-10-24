// test-drive-connection.ts
// Script para probar la conexión con Google Drive y descargar un archivo de prueba

import { google } from 'googleapis';
import { promises as fs } from 'fs';
import 'dotenv/config'; // 👈 AGREGAR ESTA LÍNEA AL INICIO

async function testDriveConnection() {
  console.log('🔧 Testing Google Drive Connection...\n');

  try {
    // 1. Verificar variables de entorno
    console.log('1️⃣ Verificando variables de entorno...');
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;

    if (!email || !key) {
      console.error('❌ Faltan variables de entorno:');
      if (!email) console.error('   - GOOGLE_SERVICE_ACCOUNT_EMAIL');
      if (!key) console.error('   - GOOGLE_PRIVATE_KEY');
      process.exit(1);
    }

    console.log(`✅ GOOGLE_SERVICE_ACCOUNT_EMAIL: ${email}`);
    console.log(`✅ GOOGLE_PRIVATE_KEY: ${key.substring(0, 50)}...`);

    // 2. Autenticar
    console.log('\n2️⃣ Autenticando con Google Drive API...');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Autenticación configurada');

    // 3. Probar con un ID de archivo del XLSX
    console.log('\n3️⃣ Probando descarga de archivo de prueba...');
    
    // Este es un ID de ejemplo del primer registro del XLSX
    // Reemplazar con un ID válido de tu Drive
    const testFileId = '1SobHqtor2mIEVBo2VHhMT-NMxBSDGIfB';
    
    console.log(`📥 Intentando descargar archivo: ${testFileId}`);
    
    try {
      // Primero, obtener metadata del archivo
      const metadata = await drive.files.get({
        fileId: testFileId,
        fields: 'id, name, mimeType, size, createdTime'
      });

      console.log('\n📋 Metadata del archivo:');
      console.log(`   Nombre: ${metadata.data.name}`);
      console.log(`   Tipo: ${metadata.data.mimeType}`);
      console.log(`   Tamaño: ${metadata.data.size ? `${(parseInt(metadata.data.size) / 1024).toFixed(2)} KB` : 'N/A'}`);
      console.log(`   Creado: ${metadata.data.createdTime}`);

      // Ahora descargar el contenido
      const response = await drive.files.get(
        { fileId: testFileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      const buffer = Buffer.from(response.data as ArrayBuffer);
      console.log(`\n✅ Archivo descargado exitosamente: ${buffer.length} bytes`);

      // Detectar tipo
      const header = buffer.slice(0, 8).toString('hex');
      let detectedType = 'unknown';
      
      if (header.startsWith('ffd8ff')) detectedType = 'JPEG';
      else if (header.startsWith('89504e47')) detectedType = 'PNG';
      else if (header.startsWith('25504446')) detectedType = 'PDF';
      else if (header.startsWith('47494638')) detectedType = 'GIF';
      
      console.log(`📄 Tipo detectado: ${detectedType}`);

      // Guardar archivo de prueba
      const testOutputPath = '/home/claude/test-download.jpg';
      await fs.writeFile(testOutputPath, buffer);
      console.log(`💾 Archivo guardado en: ${testOutputPath}`);

      console.log('\n✅ TEST EXITOSO - Google Drive funcionando correctamente!');
      console.log('\n💡 Siguiente paso: Ejecutar validate-xlsx.ts');

    } catch (fileError: any) {
      console.error('\n❌ Error descargando archivo de prueba:');
      console.error(`   ${fileError.message}`);
      
      if (fileError.code === 404) {
        console.error('\n💡 Posibles causas:');
        console.error('   1. El archivo no existe o fue eliminado');
        console.error('   2. La cuenta de servicio no tiene permisos para acceder al archivo');
        console.error('   3. El ID del archivo es incorrecto');
        console.error('\n🔧 Solución:');
        console.error('   - Compartir los archivos de Drive con la cuenta de servicio:');
        console.error(`     ${email}`);
        console.error('   - O agregar la cuenta de servicio como "viewer" a la carpeta de Drive');
      }
      
      throw fileError;
    }

  } catch (error: any) {
    console.error('\n❌ Error en el test:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Verificar que las credenciales sean correctas');
    console.error('   2. Verificar que la cuenta de servicio tenga acceso a los archivos');
    console.error('   3. Verificar que los archivos de Drive no hayan sido eliminados');
    process.exit(1);
  }
}

// Función auxiliar para probar múltiples IDs del XLSX
async function testMultipleFiles() {
  console.log('\n🔧 Testing múltiples archivos del XLSX...\n');

  // IDs de ejemplo del primer registro
  const testIds = [
    '1SobHqtor2mIEVBo2VHhMT-NMxBSDGIfB',  // Cédula 1
    '13RDxkgfzKkZe7HfE3_6Hm3Qr4AX3cg-E',  // Antecedentes
  ];

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  let successful = 0;
  let failed = 0;

  for (const fileId of testIds) {
    try {
      console.log(`\n📄 Probando archivo: ${fileId}`);
      
      const metadata = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size'
      });

      console.log(`   ✅ ${metadata.data.name} - ${metadata.data.mimeType}`);
      successful++;

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Exitosos: ${successful}/${testIds.length}`);
  console.log(`❌ Fallidos: ${failed}/${testIds.length}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  Algunos archivos no se pudieron acceder.');
    console.log('   Asegúrate de compartir todos los archivos con la cuenta de servicio.');
  }
}

// Ejecutar ambos tests
async function main() {
  console.log('='.repeat(60));
  console.log('🧪 GOOGLE DRIVE CONNECTION TEST');
  console.log('='.repeat(60) + '\n');

  await testDriveConnection();
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING MÚLTIPLES ARCHIVOS');
  console.log('='.repeat(60));
  
  await testMultipleFiles();
  
  console.log('\n✅ Todos los tests completados!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });