// scripts/test-bonus-with-session.ts
// Script para probar descarga de pedidos usando User Data Directory persistente

import 'dotenv/config';
import { bonusProcessorService } from '../lib/services/bonus-processor.service';
import { parseOrdersExcel } from '../lib/utils/excel-order-parser';
import * as path from 'path';
import * as os from 'os';

async function testBonusWithSession() {
  console.log('🧪 ========== TEST: DESCARGA CON SESIÓN PERSISTENTE ==========\n');

  // Configuración
  const bonusDate = '2026-01-25'; // Ajusta a una fecha que tenga pedidos
  const ordersReportUrl = process.env.APP_ORDERS_REPORT_URL!;

  // User Data Directory (se guarda en tu carpeta de usuario)
  const userDataDir = path.join(os.homedir(), '.playwright-monchis-session');

  console.log(`📅 Fecha a probar: ${bonusDate}`);
  console.log(`🔗 URL de pedidos: ${ordersReportUrl}`);
  console.log(`📁 User Data Dir: ${userDataDir}\n`);

  try {
    // 1. Inicializar con User Data Directory
    console.log('🚀 Paso 1: Inicializando con sesión persistente...');
    // @ts-ignore
    await bonusProcessorService.initializeWithUserDataDir(userDataDir);
    console.log('✅ Navegador inicializado con sesión persistente\n');

    // 2. Verificar si ya está logueado
    console.log('🔐 Paso 2: Verificando sesión...');
    // @ts-ignore
    const page = bonusProcessorService.page;
    if (!page) throw new Error('Page no inicializada');

    await page.goto(ordersReportUrl);
    await page.waitForLoadState('networkidle');

    // Esperar 3 segundos para ver si redirige a login
    await new Promise(resolve => setTimeout(resolve, 3000));

    const currentUrl = page.url();
    const isLoggedIn = !currentUrl.includes('/login') && !currentUrl.includes('/auth');

    if (isLoggedIn) {
      console.log('✅ Ya estás logueado! (sesión guardada funciona)\n');
    } else {
      console.log('⚠️  No estás logueado. Necesitás hacer login manual.\n');
      console.log('📝 INSTRUCCIONES:');
      console.log('   1. En el navegador que se abrió, completá el login (Google + Okta)');
      console.log('   2. Resolvé el CAPTCHA si aparece');
      console.log('   3. Esperá a llegar a la página de reportes');
      console.log('   4. Presiona ENTER en esta consola cuando estés listo\n');

      // Esperar a que el usuario presione Enter
      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve());
      });

      console.log('✅ Continuando...\n');
    }

    // 3. Descargar reporte
    console.log('📥 Paso 3: Descargando reporte de pedidos...');
    // @ts-ignore
    const excelBuffer = await bonusProcessorService.downloadOrdersReport(ordersReportUrl, bonusDate);
    console.log(`✅ Reporte descargado: ${excelBuffer.length} bytes\n`);

    // 4. Parsear Excel
    console.log('📊 Paso 4: Parseando Excel...');
    const orders = parseOrdersExcel(excelBuffer);
    console.log(`✅ Excel parseado: ${orders.length} pedidos encontrados\n`);

    // 4.5 Subir pedidos al Google Sheet
    console.log('📤 Paso 4.5: Subiendo pedidos al Google Sheet...');
    const sheetId = process.env.BONUS_RULES_SHEET_ID!;
    // @ts-ignore
    await bonusProcessorService.uploadOrdersToSheet(orders, bonusDate, sheetId);
    console.log('✅ Pedidos subidos al Sheet\n');

    // 4.6 NUEVO: Leer resumen de bonos de la hoja creada
    console.log('📖 Paso 4.6: Leyendo resumen de bonos...');
    // @ts-ignore
    const bonusSummary = await bonusProcessorService.readBonusSummaryFromSheet(bonusDate);
    console.log('✅ Resumen de bonos leído\n');

    // 4.7 NUEVO: Procesar cada extra dinámicamente
    console.log('🎁 Paso 4.7: Procesando extras y asignaciones...\n');

    let extraIndex = 0;
    for (const [extraKey, extraData] of bonusSummary) {
      extraIndex++;
      console.log(`\n📦 EXTRA ${extraIndex}/${bonusSummary.size}: ${extraData.extraName}`);
      console.log(`   💰 Monto: ${extraData.totalAmount} Gs`);
      console.log(`   👥 Drivers: ${extraData.drivers.length}`);

      // 4.7.1: Crear extra en la UI
      console.log(`\n   🎁 Creando extra en la UI...`);
      // @ts-ignore
      await bonusProcessorService.createExtraInUI(extraData.extraName, extraData.totalAmount);
      console.log(`   ✅ Extra creado`);

      // 4.7.2: Seleccionar conductores para este extra
      console.log(`\n   👥 Seleccionando ${extraData.drivers.length} conductores...`);
      // @ts-ignore
      const selectionResult = await bonusProcessorService.selectDriversForExtra(
        extraData.extraName,
        extraData.drivers,
        bonusDate
      );
      console.log(`   ✅ Asignaciones completadas`);
      console.log(`   📊 Resultado: ${selectionResult.successful} exitosos, ${selectionResult.failed} fallidos`);

      if (selectionResult.errors.length > 0) {
        console.log(`   ⚠️  Errores:`);
        selectionResult.errors.forEach(e => console.log(`      - ${e.driver}: ${e.error}`));
      }
    }

    console.log('\n✅ Todos los extras procesados\n');

    // 5. Mostrar preview
    console.log('📋 ========== PREVIEW DE PEDIDOS ==========');
    orders.slice(0, 10).forEach((order, i) => {
      console.log(`${i + 1}. ${order.driverName} (${order.driverCedula})`);
      console.log(`   Pedido: ${order.orderId}`);
      console.log(`   Fecha: ${order.orderDate} ${order.orderTime}`);
      console.log(`   Zona: ${order.zone}`);
      console.log(`   Estado: ${order.status}`);
      if (order.amount) console.log(`   Monto: ${order.amount} Gs`);
      console.log('');
    });

    if (orders.length > 10) {
      console.log(`... y ${orders.length - 10} pedidos más\n`);
    }

    // 6. Estadísticas
    console.log('📊 ========== ESTADÍSTICAS ==========');

    const driverMap = new Map<string, number>();
    orders.forEach(order => {
      const driverKey = order.driverCedula || order.driverName;
      const count = driverMap.get(driverKey) || 0;
      driverMap.set(driverKey, count + 1);
    });

    console.log(`Total de pedidos: ${orders.length}`);
    console.log(`Conductores únicos: ${driverMap.size}`);
    console.log(`Promedio por conductor: ${(orders.length / driverMap.size).toFixed(2)}`);

    const topDrivers = Array.from(driverMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('\nTop 5 conductores con más pedidos:');
    topDrivers.forEach(([driverKey, count], i) => {
      const driver = orders.find(o => (o.driverCedula || o.driverName) === driverKey);
      console.log(`${i + 1}. ${driver?.driverName}: ${count} pedidos`);
    });

    const zoneMap = new Map<string, number>();
    orders.forEach(order => {
      const count = zoneMap.get(order.zone) || 0;
      zoneMap.set(order.zone, count + 1);
    });

    console.log('\nPedidos por zona:');
    Array.from(zoneMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([zone, count]) => {
        console.log(`  ${zone}: ${count} pedidos`);
      });

    console.log('\n✅ ========== TEST EXITOSO ==========');
    console.log(`La sesión persistente funciona correctamente!`);
    console.log(`\n💡 IMPORTANTE: La próxima vez que ejecutes este script,`);
    console.log(`   YA NO necesitarás hacer login. La sesión estará guardada en:`);
    console.log(`   ${userDataDir}\n`);

  } catch (error: any) {
    console.error('\n❌ ========== TEST FALLIDO ==========');
    console.error(`Error: ${error.message}`);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cerrar navegador
    console.log('🔒 Cerrando navegador...');
    // @ts-ignore
    await bonusProcessorService.close();
    console.log('✅ Navegador cerrado (sesión guardada)');
    process.exit(0);
  }
}

// Ejecutar test
testBonusWithSession().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
