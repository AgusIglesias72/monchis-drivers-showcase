// lib/utils/okta-login.ts
import { Page } from 'playwright';

interface OktaLoginOptions {
  page: Page;
  loginUrl: string;
  oktaEmail?: string;
  oktaPassword?: string;
  targetUrl?: string;
  workerId?: number;
  // Login de la aplicación Monchis después de Okta
  appEmail?: string;
  appPassword?: string;
}

/**
 * Realiza login automático con Okta SAML ITTI + Okta MFA
 *
 * @param options Configuración de login
 * @returns Promise que se resuelve cuando el login es exitoso
 */
export async function performOktaLogin(options: OktaLoginOptions): Promise<void> {
  const {
    page,
    loginUrl,
    oktaEmail = process.env.OKTA_EMAIL || 'agustin.iglesias@itti.digital',
    oktaPassword = process.env.OKTA_PASSWORD || '',
    targetUrl,
    workerId,
    appEmail = process.env.APP_EMAIL || '',
    appPassword = process.env.APP_PASSWORD || '',
  } = options;

  const logPrefix = workerId !== undefined ? `[Worker ${workerId}]` : '';

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  console.log(`🔐 ${logPrefix} Iniciando login con Okta SAML ITTI...`);

  // Navegar a la URL de login
  await page.goto(loginUrl, { waitUntil: 'networkidle' });
  console.log(`✅ ${logPrefix} Página de login cargada`);

  // PASO 1: Click en botón de Okta SAML ITTI
  const oktaSamlButtonSelectors = [
    'a[title="SAML ・ Okta ITTI"]',
    'a[href*="itti-py.okta.com"]',
    'a#idp3',
    'a[data-idp="SAML"][title*="ITTI"]',
  ];

  let authButton = null;

  // Buscar botón de Okta SAML ITTI
  for (const selector of oktaSamlButtonSelectors) {
    const button = await page.$(selector);
    if (button) {
      console.log(`   ✓ Botón de Okta SAML ITTI encontrado con: ${selector}`);
      authButton = button;
      break;
    }
  }

  if (authButton) {
    await authButton.click();
    console.log(`✅ ${logPrefix} Click en botón de Okta SAML ITTI realizado`);
    await page.waitForLoadState('networkidle');
  } else {
    console.log(`   ⚠️  No se encontró botón de Okta SAML ITTI`);
    throw new Error('No se encontró el botón de Okta SAML ITTI en la página de login');
  }

  // PASO 2: Completar email en Okta
  await sleep(3000);

  console.log(`📧 ${logPrefix} Buscando formulario de Okta...`);
  console.log(`   URL actual: ${page.url()}`);
  console.log(`   Título: ${await page.title()}`);

  // Primero verificar si hay iframes
  const frames = page.frames();
  console.log(`   Total de frames en la página: ${frames.length}`);

  // Debug: listar todos los inputs en el main frame
  let allInputs = await page.$$('input');
  console.log(`   Total de inputs en main frame: ${allInputs.length}`);

  // Si no hay inputs, buscar en los iframes
  if (allInputs.length === 0) {
    console.log(`   Buscando en iframes...`);
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const frameUrl = frame.url();
      console.log(`   Frame ${i}: ${frameUrl}`);

      const frameInputs = await frame.$$('input').catch(() => []);
      console.log(`   Inputs en frame ${i}: ${frameInputs.length}`);

      if (frameInputs.length > 0) {
        allInputs = frameInputs;
        console.log(`   ✓ Usando frame ${i} que tiene inputs`);
        break;
      }
    }
  }

  // Si todavía no hay inputs, esperar un poco más
  if (allInputs.length === 0) {
    console.log(`   ⚠️  No se encontraron inputs, esperando 3 segundos más...`);
    await sleep(3000);
    allInputs = await page.$$('input');
    console.log(`   Inputs después de espera: ${allInputs.length}`);
  }

  // Listar todos los inputs para debug
  for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
    const input = allInputs[i];
    const type = await input.getAttribute('type').catch(() => '');
    const name = await input.getAttribute('name').catch(() => '');
    const id = await input.getAttribute('id').catch(() => '');
    const visible = await input.isVisible().catch(() => false);
    console.log(`   Input ${i + 1}: type="${type}", name="${name}", id="${id}", visible=${visible}`);
  }

  const oktaEmailSelectors = [
    'input[name="identifier"]',
    'input[type="text"][autocomplete="username"]',
    'span[data-se="o-form-input-identifier"] input',
    '.o-form-input-name-identifier input',
    'input[type="text"]',
    'input[type="email"]',
  ];

  let oktaEmailInput = null;
  let usedSelector = '';

  // Intentar con waitForSelector primero
  try {
    console.log(`   Esperando a que aparezca input[name="identifier"]...`);
    oktaEmailInput = await page.waitForSelector('input[name="identifier"]', { timeout: 10000 });
    usedSelector = 'input[name="identifier"]';
    console.log(`   ✓ Input encontrado con waitForSelector`);
  } catch (e) {
    console.log(`   ⚠️  waitForSelector falló, intentando con selectores alternativos...`);

    for (const selector of oktaEmailSelectors) {
      const input = await page.$(selector);
      if (input) {
        console.log(`   ✓ Input de Okta encontrado con: ${selector}`);
        const isVisible = await input.isVisible();
        console.log(`   Visible: ${isVisible}`);
        if (isVisible) {
          oktaEmailInput = input;
          usedSelector = selector;
          break;
        }
      }
    }
  }

  if (!oktaEmailInput) {
    console.log(`   ⚠️  No se encontró el formulario de email de Okta después de todos los intentos`);
    throw new Error('No se encontró el input de email en Okta');
  }

  console.log(`📧 ${logPrefix} Ingresando email en Okta: ${oktaEmail}`);

  // Intentar fill primero
  try {
    await oktaEmailInput.click();
    await sleep(500);
    await oktaEmailInput.fill(oktaEmail);

    // Verificar si se llenó
    const value = await oktaEmailInput.inputValue();
    console.log(`   Valor después de fill: "${value}"`);

    if (!value || value.trim() === '') {
      // Fallback: escribir con teclado
      console.log(`   ⚠️  Fill no funcionó, intentando con teclado...`);
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(oktaEmail, { delay: 100 });

      const valueAfterKeyboard = await oktaEmailInput.inputValue();
      console.log(`   Valor después de teclado: "${valueAfterKeyboard}"`);
    }
    console.log(`   ✓ Email ingresado correctamente`);
  } catch (error) {
    console.log(`   ⚠️  Error al llenar email: ${error}`);
    throw new Error(`No se pudo ingresar el email en Okta: ${error}`);
  }

  await sleep(1000);

  // Click en "Siguiente" / "Next"
  console.log(`🔘 ${logPrefix} Buscando botón "Siguiente" / "Next"...`);

  const oktaNextSelectors = [
    // Español
    'input[type="submit"][value="Siguiente"]',
    'button:has-text("Siguiente")',
    'input[value="Siguiente"]',
    // Inglés
    'input[type="submit"][value="Next"]',
    'button:has-text("Next")',
    'input[value="Next"]',
    // Genérico (cualquier botón submit visible)
    'button[type="submit"]',
    'input.button-primary[type="submit"]',
  ];

  let nextButtonClicked = false;
  for (const selector of oktaNextSelectors) {
    const button = await page.$(selector);
    if (button) {
      const isVisible = await button.isVisible();
      const text = await button.textContent().catch(() => '');
      const value = await button.getAttribute('value').catch(() => '');
      console.log(`   ✓ Botón encontrado con: ${selector}, visible: ${isVisible}, text: "${text}", value: "${value}"`);
      if (isVisible) {
        await button.click();
        console.log(`✅ ${logPrefix} Click en botón "Next/Siguiente" realizado`);
        await page.waitForLoadState('networkidle');
        await sleep(1000);
        nextButtonClicked = true;
        break;
      }
    }
  }

  if (!nextButtonClicked) {
    // Debug: listar todos los botones
    console.log(`   ⚠️  No se encontró botón "Siguiente" o "Next"`);
    const allButtons = await page.$$('button, input[type="submit"]');
    console.log(`   Total de botones: ${allButtons.length}`);
    for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
      const button = allButtons[i];
      const text = await button.textContent();
      const value = await button.getAttribute('value');
      const type = await button.getAttribute('type');
      console.log(`   Botón ${i + 1}: text="${text}", value="${value}", type="${type}"`);
    }

    throw new Error('No se encontró el botón "Siguiente" o "Next" en Okta');
  }

  // PASO 3: Seleccionar opción de Contraseña en MFA
  await sleep(2000);

  console.log(`🔍 ${logPrefix} Buscando opciones de MFA...`);

  // Buscar enlaces "Seleccionar" (son <a> tags, no inputs)
  const selectButtonSelectors = [
    'a.select-factor',
    'a[data-se="button"]',
    'a.button:has-text("Seleccionar")',
    'input[type="submit"][value="Seleccionar"]',
  ];

  let selectButtons: any[] = [];
  for (const selector of selectButtonSelectors) {
    const buttons = await page.$$(selector);
    if (buttons.length > 0) {
      console.log(`   ✓ Encontrados ${buttons.length} botones con selector: ${selector}`);
      selectButtons = buttons;
      break;
    }
  }

  console.log(`   Total de botones "Seleccionar" encontrados: ${selectButtons.length}`);

  if (selectButtons.length === 0) {
    console.log(`   ⚠️  No se encontraron opciones de MFA`);
    console.log(`   URL actual: ${page.url()}`);
    console.log(`   Título: ${await page.title()}`);

    // Debug: listar todos los enlaces
    const allLinks = await page.$$('a');
    console.log(`   Total de enlaces en la página: ${allLinks.length}`);
    for (let i = 0; i < Math.min(allLinks.length, 10); i++) {
      const link = allLinks[i];
      const text = await link.textContent();
      const classes = await link.getAttribute('class');
      console.log(`   Link ${i + 1}: text="${text?.trim()}", class="${classes}"`);
    }

    throw new Error('No se encontraron opciones de verificación MFA en Okta');
  }

  // Listar todas las opciones disponibles para debugging
  for (let i = 0; i < selectButtons.length; i++) {
    const button = selectButtons[i];
    const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
    const parentText = await button.evaluate((el: any) => {
      const parent = el.closest('.authenticator-row') || el.closest('div');
      return parent?.textContent?.trim() || '';
    });
    console.log(`   Opción ${i + 1}: aria-label="${ariaLabel}"`);
    console.log(`      Texto del contenedor: ${parentText.substring(0, 60)}...`);
  }

  // Buscar el botón de "Okta Verify Push" - buscar por aria-label
  let pushButton = null;
  for (const button of selectButtons) {
    const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
    const ariaLowerCase = ariaLabel?.toLowerCase() || '';

    // Buscar específicamente "notificación push" o "reciba una notificación"
    // Y EXCLUIR la opción de "código"
    const hasNotification = ariaLowerCase.includes('notificación') || ariaLowerCase.includes('reciba');
    const hasPush = ariaLowerCase.includes('push');
    const hasCode = ariaLowerCase.includes('código') || ariaLowerCase.includes('introduzca');

    if ((hasNotification || hasPush) && !hasCode) {
      console.log(`   ✓ Encontrado botón de Okta Verify Push: "${ariaLabel}"`);
      pushButton = button;
      break;
    }
  }

  // Debug: si no encontramos, mostrar por qué se rechazaron las opciones
  if (!pushButton) {
    console.log(`   ⚠️  No se encontró opción de Push. Analizando opciones:`);
    for (const button of selectButtons) {
      const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
      const ariaLowerCase = ariaLabel?.toLowerCase() || '';
      const hasCode = ariaLowerCase.includes('código') || ariaLowerCase.includes('introduzca');
      console.log(`      "${ariaLabel}" - ${hasCode ? 'RECHAZADO (tiene código)' : 'No tiene palabras clave de push'}`);
    }
  }

  // Si no encontramos Okta Verify Push, intentar "Volver a iniciar sesión"
  if (!pushButton) {
    console.log(`   ⚠️  No se encontró opción de Okta Verify Push`);
    console.log(`   Buscando enlace "Volver a iniciar sesión"...`);

    const backToLoginSelectors = [
      'a[data-se="cancel"]',
      'a.js-cancel',
      'a:has-text("Volver a iniciar sesión")',
      'a.link:has-text("Volver")',
    ];

    let backToLoginLink = null;
    for (const selector of backToLoginSelectors) {
      const link = await page.$(selector);
      if (link) {
        const text = await link.textContent();
        console.log(`   ✓ Encontrado enlace: "${text?.trim()}" con selector: ${selector}`);
        backToLoginLink = link;
        break;
      }
    }

    if (backToLoginLink) {
      console.log(`   🔄 Haciendo click en "Volver a iniciar sesión"...`);
      await backToLoginLink.click();
      await page.waitForLoadState('networkidle');
      await sleep(2000);

      console.log(`   📧 Re-ingresando email de Okta...`);
      // Buscar el input de nuevo
      const emailInput = await page.waitForSelector('input[name="identifier"]', { timeout: 10000 });
      await emailInput.click();
      await sleep(300);
      await emailInput.fill(oktaEmail);
      await sleep(500);

      // Click en "Siguiente" / "Next" de nuevo
      const nextButton = await page.$('input[type="submit"][value="Siguiente"]')
        || await page.$('input[type="submit"][value="Next"]')
        || await page.$('button[type="submit"]');
      if (nextButton) {
        await nextButton.click();
        console.log(`   ✅ Click en "Next/Siguiente" realizado (segundo intento)`);
        await page.waitForLoadState('networkidle');
        await sleep(2000);
      }

      // Buscar opciones de MFA de nuevo
      console.log(`   🔍 Buscando opciones de MFA (segundo intento)...`);
      selectButtons = [];
      for (const selector of selectButtonSelectors) {
        const buttons = await page.$$(selector);
        if (buttons.length > 0) {
          console.log(`   ✓ Encontrados ${buttons.length} botones en segundo intento`);
          selectButtons = buttons;
          break;
        }
      }

      // Listar opciones de nuevo
      for (let i = 0; i < selectButtons.length; i++) {
        const button = selectButtons[i];
        const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
        console.log(`   Opción ${i + 1} (2do intento): aria-label="${ariaLabel}"`);
      }

      // Buscar Okta Verify Push de nuevo
      for (const button of selectButtons) {
        const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
        const ariaLowerCase = ariaLabel?.toLowerCase() || '';
        const hasNotification = ariaLowerCase.includes('notificación') || ariaLowerCase.includes('reciba');
        const hasPush = ariaLowerCase.includes('push');
        const hasCode = ariaLowerCase.includes('código') || ariaLowerCase.includes('introduzca');

        if ((hasNotification || hasPush) && !hasCode) {
          console.log(`   ✓ Encontrado botón de Okta Verify Push en segundo intento: "${ariaLabel}"`);
          pushButton = button;
          break;
        }
      }
    }
  }

  // Si aún no encontramos, usar la SEGUNDA opción (primera es código, segunda es push)
  if (!pushButton && selectButtons.length >= 2) {
    console.log(`   ⚠️  No se encontró por aria-label, usando segunda opción (suele ser Push)`);
    pushButton = selectButtons[1];
  } else if (!pushButton && selectButtons.length === 1) {
    console.log(`   ⚠️  Solo hay 1 opción, usándola`);
    pushButton = selectButtons[0];
  }

  if (!pushButton) {
    throw new Error('No se pudo encontrar la opción de Okta Verify Push después de reintentar');
  }

  console.log(`   ✓ Haciendo click en opción de Okta Verify Push...`);

  try {
    await pushButton.click();
    console.log(`✅ ${logPrefix} Opción de Okta Verify Push seleccionada`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);
  } catch (error) {
    console.log(`   ⚠️  Error al hacer click: ${error}`);
    throw new Error(`No se pudo seleccionar la opción de Okta Verify Push: ${error}`);
  }

  // PASO 4: Esperar aprobación del push
  console.log(`📱 ${logPrefix} Esperando aprobación de Okta Verify en tu dispositivo...`);
  console.log(`   Por favor, aprueba la notificación push en tu teléfono`);

  // Esperar a que la URL cambie (indica que se aprobó)
  try {
    await page.waitForFunction(
      (currentUrl) => window.location.href !== currentUrl,
      page.url(),
      { timeout: 120000 } // 2 minutos para aprobar
    );
    console.log(`✅ ${logPrefix} Notificación push aprobada - URL cambió`);
  } catch (error) {
    console.log(`   ⚠️  Timeout esperando aprobación del push`);
    throw new Error('No se aprobó la notificación push en el tiempo esperado (2 minutos)');
  }

  // Esperar a que Okta complete todo el flujo de redirect
  console.log(`⏳ ${logPrefix} Esperando que Okta complete el flujo de autenticación...`);
  await page.waitForLoadState('networkidle');
  await sleep(5000); // Más tiempo para que Okta y Cloudflare procesen el redirect

  const currentUrl = page.url();
  console.log(`✅ ${logPrefix} Verificación MFA completada`);
  console.log(`   URL actual después de MFA: ${currentUrl}`);

  // Verificar si ya estamos en Cloudflare o en la app objetivo
  const isInCloudflare = currentUrl.includes('cloudflareaccess.com');
  const isInOkta = currentUrl.includes('okta.com');
  const isInTarget = targetUrl && currentUrl.includes(new URL(targetUrl).hostname);

  console.log(`   Estado: ${isInCloudflare ? 'En Cloudflare' : isInOkta ? 'En Okta' : isInTarget ? 'En página objetivo' : 'Ubicación desconocida'}`);

  // PASO 5: Navegar a la URL objetivo si se especificó y no estamos ya ahí
  if (targetUrl && !isInTarget) {
    await sleep(2000);
    console.log(`📍 ${logPrefix} Navegando a URL objetivo: ${targetUrl}`);

    try {
      await page.goto(targetUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      await sleep(3000); // Esperar un poco más después de cargar
      console.log(`✅ ${logPrefix} Página objetivo cargada`);
      console.log(`   URL final: ${page.url()}`);
    } catch (error) {
      console.log(`   ⚠️  Error al navegar a URL objetivo: ${error}`);
      throw new Error(`No se pudo navegar a la URL objetivo: ${error}`);
    }
  } else if (isInTarget) {
    console.log(`✅ ${logPrefix} Ya estamos en la página objetivo`);
  }

  // PASO 6: Login en la aplicación Monchis si terminamos en /auth/login
  const finalUrl = page.url();
  if (finalUrl.includes('/auth/login')) {
    console.log(`🔐 ${logPrefix} Detectada página de login de Monchis, iniciando sesión...`);

    if (!appEmail || !appPassword) {
      throw new Error('Se requieren APP_EMAIL y APP_PASSWORD para login de la aplicación');
    }

    await sleep(2000);

    // Buscar campos de email y password (Ant Design)
    const emailInput = await page.waitForSelector('input#basic_email', { timeout: 10000 });
    const passwordInput = await page.waitForSelector('input#basic_password', { timeout: 10000 });

    console.log(`   ✓ Campos de login encontrados`);

    // Llenar email
    await emailInput.fill(appEmail);
    await sleep(300);

    // Llenar password
    await passwordInput.fill(appPassword);
    await sleep(300);

    console.log(`   ✓ Credenciales ingresadas`);

    // Buscar y clickear botón de submit (Ant Design)
    const submitButton = await page.waitForSelector('button[type="submit"].ant-btn-primary', { timeout: 5000 });
    await submitButton.click();

    console.log(`   ✓ Formulario enviado, esperando redirección...`);

    // Esperar a que se complete el login (cambio de URL o desaparición del formulario)
    try {
      await page.waitForFunction(
        () => !window.location.href.includes('/auth/login'),
        { timeout: 15000 }
      );
      console.log(`✅ ${logPrefix} Login de aplicación Monchis completado`);
      console.log(`   URL después de login: ${page.url()}`);
    } catch (error) {
      console.log(`   ⚠️  Timeout esperando redirección después del login`);
      // Continuar de todas formas, puede que haya funcionado
    }

    await sleep(2000);

    // Navegar a la URL objetivo después del login exitoso
    if (targetUrl) {
      console.log(`📍 ${logPrefix} Navegando a la página objetivo: ${targetUrl}`);
      try {
        await page.goto(targetUrl, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        await sleep(2000);
        console.log(`✅ ${logPrefix} Página objetivo cargada: ${page.url()}`);
      } catch (error) {
        console.log(`   ⚠️  Error navegando a página objetivo: ${error}`);
        throw new Error(`No se pudo navegar a la página de reportes: ${error}`);
      }
    }
  }

  console.log(`🎉 ${logPrefix} Login completado exitosamente`);
}
