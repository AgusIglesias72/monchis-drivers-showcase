// scripts/test-login.ts
// Script para probar el flujo de login con Okta SAML ITTI

import { chromium } from 'playwright';
import 'dotenv/config';
import { performOktaLogin } from '../lib/utils/okta-login';

async function testLogin() {
  console.log('='.repeat(60));
  console.log('🚀 INICIANDO TEST DE LOGIN CON OKTA SAML ITTI');
  console.log('='.repeat(60));
  console.log('');

  const loginUrl = process.env.APP_LOGIN_URL || 'https://admin.monchis-drivers.com/auth/login';
  const oktaEmail = process.env.OKTA_EMAIL || 'agustin.iglesias@itti.digital';
  const oktaPassword = process.env.OKTA_PASSWORD || '';

  console.log(`📍 URL de login: ${loginUrl}`);
  console.log(`📧 Okta email: ${oktaEmail}`);
  console.log(`🔐 Okta password: ${oktaPassword ? '***' : 'NO CONFIGURADO'}`);
  console.log('');
  console.log('⏳ Iniciando navegador...');

  // Lanzar navegador en modo visible
  let browser;
  let page;
  
  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 100,
    });
    console.log('✅ Navegador lanzado exitosamente');
    console.log('');

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    console.log('✅ Contexto creado');

    page = await context.newPage();
    page.setDefaultTimeout(60000);
    console.log('✅ Página creada');
    console.log('');
    console.log('='.repeat(60));
    console.log('🔐 INICIANDO PROCESO DE LOGIN');
    console.log('='.repeat(60));
    console.log('');

    // Usar la función reutilizable
    await performOktaLogin({
      page,
      loginUrl,
      oktaEmail,
      oktaPassword,
    });

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ ¡LOGIN COMPLETADO EXITOSAMENTE!');
    console.log('='.repeat(60));
    console.log('');
    console.log(`📍 URL final: ${page.url()}`);
    console.log('');

    // Pausa para inspección manual
    console.log('⏸️  PAUSA: El navegador quedará abierto por 2 minutos para que inspecciones.');
    console.log('   Podés interactuar manualmente con la página.');
    console.log('   Presioná Ctrl+C para cerrar cuando termines.');
    console.log('');

    await page.waitForTimeout(120000); // 2 minutos

  } catch (error) {
    console.log('');
    console.log('='.repeat(60));
    console.error('❌ ERROR DURANTE EL LOGIN');
    console.log('='.repeat(60));
    console.error('');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
    }
    console.log('');
    console.log('⏸️  El navegador quedará abierto para inspección...');
    if (page) {
      await page.waitForTimeout(120000);
    }
  } finally {
    console.log('');
    console.log('='.repeat(60));
    console.log('🔒 Cerrando navegador...');
    if (browser) {
      await browser.close();
    }
    console.log('✅ Test finalizado');
    console.log('='.repeat(60));
  }
}

// Ejecutar con mejor manejo de errores
testLogin().catch((error) => {
  console.error('');
  console.error('='.repeat(60));
  console.error('❌ ERROR FATAL AL EJECUTAR EL SCRIPT');
  console.error('='.repeat(60));
  console.error('');
  console.error('Error:', error);
  if (error instanceof Error) {
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(1);
});
