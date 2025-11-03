// scripts/get-google-refresh-token.ts
// Script para obtener el refresh token de Google OAuth de forma permanente

import { google } from 'googleapis';
import * as readline from 'readline';
import 'dotenv/config';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

async function getRefreshToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Falta GOOGLE_OAUTH_CLIENT_ID o GOOGLE_OAUTH_CLIENT_SECRET en .env');
    console.log('\n💡 Agrega estas variables a tu .env:');
    console.log('   GOOGLE_OAUTH_CLIENT_ID=tu-client-id');
    console.log('   GOOGLE_OAUTH_CLIENT_SECRET=tu-client-secret');
    console.log('\n📚 Ver guía: https://developers.google.com/identity/protocols/oauth2');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000'
  );

  // Generar URL de autorización
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // IMPORTANTE: Esto genera el refresh_token
    scope: SCOPES,
    prompt: 'consent', // Forzar que pida consentimiento para obtener refresh_token
  });

  console.log('\n' + '='.repeat(80));
  console.log('🔐 OBTENER REFRESH TOKEN DE GOOGLE OAUTH');
  console.log('='.repeat(80));
  console.log('\nEste token te permitirá acceder a Google Drive de forma permanente\n');
  console.log('📋 PASOS:\n');
  console.log('1. Abre esta URL en tu navegador:\n');
  console.log(`   ${authUrl}\n`);
  console.log('2. Autoriza la aplicación con tu cuenta de Google');
  console.log('3. Copia el código que aparece en la URL (después de "code=")');
  console.log('4. Pégalo aquí abajo\n');
  console.log('─'.repeat(80) + '\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) => {
    rl.question('📝 Código de autorización: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  try {
    console.log('\n⏳ Intercambiando código por tokens...\n');
    
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.error('\n❌ No se obtuvo refresh_token');
      console.log('💡 Esto puede pasar si ya autorizaste la app anteriormente');
      console.log('   Solución: Revoca el acceso y vuelve a ejecutar el script');
      console.log('   1. Ve a: https://myaccount.google.com/permissions');
      console.log('   2. Busca tu aplicación y revócale el acceso');
      console.log('   3. Ejecuta este script de nuevo\n');
      process.exit(1);
    }

    console.log('✅ Tokens obtenidos exitosamente!\n');
    console.log('='.repeat(80));
    console.log('📋 AGREGA ESTA LÍNEA A TU .env:');
    console.log('='.repeat(80));
    console.log(`\nGOOGLE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token}"\n`);
    console.log('='.repeat(80));
    console.log('\n💡 Información adicional:\n');
    console.log(`Access Token: ${tokens.access_token?.substring(0, 30)}...`);
    console.log(`Expiry Date: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'N/A'}`);
    console.log(`Token Type: ${tokens.token_type}`);
    console.log(`\n✨ El refresh token NO expira y se puede usar indefinidamente`);
    console.log(`   (a menos que lo revoques manualmente)\n`);

  } catch (error: any) {
    console.error('\n❌ Error obteniendo tokens:', error.message);
    process.exit(1);
  }
}

getRefreshToken();