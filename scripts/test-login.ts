// scripts/test-login.ts
// Script para probar el flujo de login con Google Workspace + Okta

import { chromium } from 'playwright';
import 'dotenv/config';
import { performGoogleOktaLogin } from '../lib/utils/google-okta-login';

async function testLogin() {
  console.log('🚀 Iniciando test de login...\n');

  const loginUrl = process.env.APP_LOGIN_URL || 'https://admin.monchis-drivers.com/auth/login';
  const googleUsername = process.env.GOOGLE_USERNAME || 'agustin.iglesias';
  const googlePassword = process.env.GOOGLE_PASSWORD || '';
  const oktaEmail = process.env.OKTA_EMAIL || 'agustin.iglesias@itti.digital';
  const oktaPassword = process.env.OKTA_PASSWORD || '';

  console.log(`📍 URL: ${loginUrl}`);
  console.log(`👤 Google username: ${googleUsername}`);
  console.log(`🔐 Google password: ${googlePassword ? '***' : 'NO CONFIGURADO'}`);
  console.log(`📧 Okta email: ${oktaEmail}`);
  console.log(`🔐 Okta password: ${oktaPassword ? '***' : 'NO CONFIGURADO'}\n`);

  // Lanzar navegador en modo visible
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Usar la función reutilizable
    await performGoogleOktaLogin({
      page,
      loginUrl,
      googleUsername,
      googlePassword,
      oktaEmail,
      oktaPassword,
    });

    console.log('\n✅ ¡LOGIN COMPLETADO!\n');
    console.log(`📍 URL final: ${page.url()}`);

    // Pausa para inspección manual
    console.log('\n⏸️  PAUSA: El navegador quedará abierto por 2 minutos para que inspecciones.');
    console.log('   Podés interactuar manualmente con la página.');
    console.log('   Presioná Ctrl+C para cerrar cuando termines.\n');

    await page.waitForTimeout(120000); // 2 minutos

  } catch (error) {
    console.error('\n❌ Error durante el login:', error);
    console.log('\n⏸️  El navegador quedará abierto para inspección...');
    await page.waitForTimeout(120000);
  } finally {
    console.log('\n🔒 Cerrando navegador...');
    await browser.close();
    console.log('✅ Test finalizado');
  }
}

testLogin().catch(console.error);
