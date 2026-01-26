// scripts/test-bonus-download.ts
// Script para probar solo la descarga de pedidos con Playwright

import 'dotenv/config';
import { bonusProcessorService } from '../lib/services/bonus-processor.service';
import { parseOrdersExcel } from '../lib/utils/excel-order-parser';

async function testBonusDownload() {
  console.log('🧪 ========== TEST: DESCARGA DE PEDIDOS ==========\n');

  // Configuración
  const bonusDate = '2026-01-22'; // Ajusta a una fecha que tenga pedidos
  const loginUrl = process.env.APP_LOGIN_URL!;
  const ordersReportUrl = process.env.APP_ORDERS_REPORT_URL!;

  console.log(`📅 Fecha a probar: ${bonusDate}`);
  console.log(`🔗 URL de login: ${loginUrl}`);
  console.log(`🔗 URL de pedidos: ${ordersReportUrl}\n`);

  try {
    // 1. Inicializar Playwright
    console.log('🚀 Paso 1: Inicializando Playwright...');
    // @ts-ignore - Accediendo a método privado para testing
    await bonusProcessorService.initialize();
    console.log('✅ Playwright inicializado\n');

    // 2. Login
    console.log('🔐 Paso 2: Haciendo login...');
    console.log('⏳ Esperando 30 segundos para que hagas login manualmente...');
    console.log('   👉 Abre el navegador que se acaba de abrir');
    console.log('   👉 Completa el login (Google + Okta + CAPTCHA si sale)');
    console.log('   👉 Espera a que llegues a la página principal');
    console.log('');

    // Navegar a login pero NO ejecutar el login automático
    // @ts-ignore
    const page = bonusProcessorService.page;
    if (!page) throw new Error('Page no inicializada');
    await page.goto(loginUrl);

    // Esperar 30 segundos para login manual
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('✅ Continuando (asumiendo que ya hiciste login)...\n');

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

    // 5. Mostrar preview de los primeros 10 pedidos
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

    // Agrupar por conductor (usamos nombre como key ya que no tenemos cédula)
    const driverMap = new Map<string, number>();
    orders.forEach(order => {
      const driverKey = order.driverCedula || order.driverName;
      const count = driverMap.get(driverKey) || 0;
      driverMap.set(driverKey, count + 1);
    });

    console.log(`Total de pedidos: ${orders.length}`);
    console.log(`Conductores únicos: ${driverMap.size}`);
    console.log(`Promedio por conductor: ${(orders.length / driverMap.size).toFixed(2)}`);

    // Top 5 conductores
    const topDrivers = Array.from(driverMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('\nTop 5 conductores con más pedidos:');
    topDrivers.forEach(([driverKey, count], i) => {
      const driver = orders.find(o => (o.driverCedula || o.driverName) === driverKey);
      console.log(`${i + 1}. ${driver?.driverName}: ${count} pedidos`);
    });

    // Agrupar por zona
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
    console.log('La descarga y parseo de pedidos funciona correctamente.\n');

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
    console.log('✅ Navegador cerrado');
    process.exit(0);
  }
}

// Ejecutar test
testBonusDownload().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
