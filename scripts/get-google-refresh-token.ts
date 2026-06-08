// scripts/get-google-refresh-token.ts
import { google } from 'googleapis';
import * as http from 'http';
import { parse } from 'url';
import open from 'open'; // npm install open
import 'dotenv/config';

// URL del endpoint que persiste el token en la DB (prod por defecto, o
// override con TOKEN_PUBLISH_URL para apuntar a dev/staging). Si está vacío,
// no publica y solo imprime el token.
const PUBLISH_URL =
  process.env.TOKEN_PUBLISH_URL ||
  'https://admin.monchis-drivers.com/api/admin/google-oauth/refresh-token';
const CRON_SECRET = process.env.CRON_SECRET;

async function publishTokenToServer(refreshToken: string): Promise<void> {
  if (!CRON_SECRET) {
    console.log(
      '⚠️  CRON_SECRET no está en .env — el token NO se publicó al servidor.',
    );
    console.log('   Pegalo a mano en `.env` de cada entorno, o configurá CRON_SECRET.\n');
    return;
  }
  try {
    console.log(`\n📡 Publicando token a ${PUBLISH_URL} ...`);
    const res = await fetch(PUBLISH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({
        refreshToken,
        rotatedBy: `script:${process.env.USER || 'unknown'}`,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`❌ Servidor respondió ${res.status}: ${text}`);
      console.log('   Vas a tener que pegarlo a mano en `.env`.\n');
      return;
    }
    console.log('✅ Token publicado en DB — todos los entornos lo van a usar.');
  } catch (err) {
    console.error(
      '❌ Error publicando token:',
      err instanceof Error ? err.message : err,
    );
    console.log('   Vas a tener que pegarlo a mano en `.env`.\n');
  }
}

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/gmail.send',
];

async function getRefreshToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Falta GOOGLE_OAUTH_CLIENT_ID o GOOGLE_OAUTH_CLIENT_SECRET en .env');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n' + '='.repeat(80));
  console.log('🔐 OBTENER REFRESH TOKEN DE GOOGLE OAUTH');
  console.log('='.repeat(80));
  console.log('\n⚠️  IMPORTANTE: Verificá que esta URL esté en Google Cloud Console:');
  console.log(`   ${REDIRECT_URI}`);
  console.log('\n📍 Para agregarla:');
  console.log('   1. Ve a: https://console.cloud.google.com/apis/credentials');
  console.log('   2. Click en tu OAuth 2.0 Client ID');
  console.log('   3. Agregá en "Authorized redirect URIs": ' + REDIRECT_URI);
  console.log('   4. Guardá y esperá unos segundos\n');
  console.log('='.repeat(80));
  console.log('\n🌐 Abriendo navegador en 3 segundos...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Crear servidor para capturar el callback
  const server = http.createServer(async (req, res) => {
    if (req.url?.startsWith('/oauth/callback')) {
      const queryData = parse(req.url, true).query;
      const code = queryData.code as string;
      const error = queryData.error as string;

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: Arial; padding: 50px; text-align: center;">
              <h1 style="color: red;">❌ Error de Autorización</h1>
              <p>${error}</p>
              <p>Cerrá esta ventana y revisá la consola.</p>
            </body>
          </html>
        `);
        console.error('\n❌ Error de autorización:', error);
        server.close();
        process.exit(1);
        return;
      }

      if (code) {
        try {
          console.log('\n⏳ Intercambiando código por tokens...');
          
          const { tokens } = await oauth2Client.getToken(code);
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial; padding: 50px; text-align: center;">
                <h1 style="color: green;">✅ Autorización Exitosa!</h1>
                <p>Ya podés cerrar esta ventana y volver a la terminal.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  El refresh token fue guardado exitosamente.
                </p>
              </body>
            </html>
          `);

          if (!tokens.refresh_token) {
            console.error('\n❌ No se obtuvo refresh_token');
            console.log('💡 Solución:');
            console.log('   1. Ve a: https://myaccount.google.com/permissions');
            console.log('   2. Busca tu aplicación y revoca el acceso');
            console.log('   3. Ejecuta este script de nuevo\n');
            server.close();
            process.exit(1);
            return;
          }

          console.log('\n✅ Tokens obtenidos exitosamente!\n');
          console.log('='.repeat(80));
          console.log('📋 NUEVO REFRESH TOKEN:');
          console.log('='.repeat(80));
          console.log(`\nGOOGLE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token}"\n`);
          console.log('='.repeat(80));

          // Publicar a producción automáticamente (si está configurado).
          // El endpoint guarda el token en DB y todos los entornos lo leen
          // desde ahí — así ya no hace falta editar `.env` en Vercel/Railway.
          await publishTokenToServer(tokens.refresh_token);

          console.log('\n💡 Información adicional:\n');
          console.log(`Token Type: ${tokens.token_type}`);
          console.log(`Scopes: Drive + Gmail`);
          console.log(
            `\nℹ️  Modo Testing en GCP: el token caduca a los ~7 días.\n` +
            `   El cron /api/cron/refresh-google-token mandará Slack cuando empiece a fallar.\n`
          );

          server.close();
          process.exit(0);
        } catch (error: any) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial; padding: 50px; text-align: center;">
                <h1 style="color: red;">❌ Error</h1>
                <p>${error.message}</p>
              </body>
            </html>
          `);
          console.error('\n❌ Error:', error.message);
          server.close();
          process.exit(1);
        }
      }
    }
  });

  server.listen(PORT, async () => {
    console.log(`🌐 Servidor local corriendo en http://localhost:${PORT}`);
    console.log('⏳ Esperando autorización...\n');
    
    // Abrir navegador automáticamente
    try {
      await open(authUrl);
      console.log('✅ Navegador abierto automáticamente');
    } catch (error) {
      console.log('⚠️  No se pudo abrir el navegador automáticamente');
      console.log('📋 Abrí esta URL manualmente:\n');
      console.log(authUrl + '\n');
    }
  });

  // Timeout de 5 minutos
  setTimeout(() => {
    console.error('\n❌ Timeout: No se recibió autorización en 5 minutos');
    server.close();
    process.exit(1);
  }, 5 * 60 * 1000);
}

getRefreshToken();