// lib/utils/okta-login.ts
import { Page, Frame } from 'playwright';

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

  /**
   * Espera escalonada: intenta encontrar un elemento esperando 1s, luego 2s más (total 3s), 
   * luego 2s más (total 5s), luego 5s más (total 10s)
   * Retorna true si el elemento se encuentra, false si no se encuentra después de todos los intentos
   */
  async function waitForElementScaled(
    selector: string,
    frame: any = page,
    description: string = 'elemento'
  ): Promise<boolean> {
    const waitIncrements = [1000, 2000, 2000, 5000]; // 1s, +2s (total 3s), +2s (total 5s), +5s (total 10s)
    const totalTimes = [1000, 3000, 5000, 10000]; // Para logging
    let totalWaited = 0;

    for (let i = 0; i < waitIncrements.length; i++) {
      const waitIncrement = waitIncrements[i];
      const totalTime = totalTimes[i];
      console.log(`   ⏳ Esperando ${waitIncrement / 1000}s más para que aparezca ${description}... (total: ${totalTime / 1000}s)`);
      await sleep(waitIncrement);
      totalWaited += waitIncrement;

      try {
        const element = await frame.$(selector);
        if (element) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            console.log(`   ✅ ${description} encontrado después de ${totalWaited / 1000}s`);
            return true;
          }
        }
      } catch (e) {
        // Continuar con el siguiente intento
      }
    }

    console.log(`   ⚠️  ${description} no encontrado después de ${totalWaited / 1000}s, continuando de todas formas...`);
    return false;
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
    
    // Esperar a que la navegación comience
    await sleep(2000);
    
    // Esperar a que la página de Okta cargue completamente
    try {
      await page.waitForURL(/okta\.com/, { timeout: 15000 });
      console.log(`   ✓ Redirigido a página de Okta`);
    } catch (e) {
      console.log(`   ⚠️  No se detectó redirección a Okta, continuando...`);
    }
    
    // Estrategia mejorada: esperar 5 segundos y luego verificar cada 5 segundos si el selector está disponible
    console.log(`   ⏳ Esperando 5 segundos para que la página se renderice...`);
    await sleep(5000);
    
    // Verificar si el input está disponible, intentando cada 5 segundos hasta 30 segundos
    let inputFound = false;
    const maxAttempts = 6; // 6 intentos de 5 segundos = 30 segundos máximo
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`   🔍 Intento ${attempt}/${maxAttempts}: Buscando input de email...`);
      const emailInput = await page.$('span[data-se="o-form-input-identifier"] input').catch(() => null);
      if (emailInput) {
        const isVisible = await emailInput.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`   ✓ Input encontrado y visible en intento ${attempt}`);
          inputFound = true;
          break;
        }
      }
      if (attempt < maxAttempts) {
        console.log(`   ⏳ Esperando 5 segundos más...`);
        await sleep(5000);
      }
    }
    
    if (!inputFound) {
      console.log(`   ⚠️  Input no encontrado después de ${maxAttempts} intentos, continuando de todas formas...`);
    }
    
    console.log(`   ✓ Página de Okta lista para continuar`);
  } else {
    console.log(`   ⚠️  No se encontró botón de Okta SAML ITTI`);
    throw new Error('No se encontró el botón de Okta SAML ITTI en la página de login');
  }

  // PASO 2: Completar email en Okta
  console.log(`📧 ${logPrefix} Buscando formulario de Okta...`);
  console.log(`   URL actual: ${page.url()}`);
  console.log(`   Título: ${await page.title()}`);
  console.log(`   Iniciando búsqueda del input de email...`);

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
    console.log(`   ⚠️  No se encontraron inputs, esperando 5 segundos más...`);
    await sleep(5000);
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

  // Priorizar el selector específico que el usuario identificó
  const oktaEmailSelectors = [
    'span[data-se="o-form-input-identifier"] input', // Selector específico del span
    'input[name="identifier"]',
    '.o-form-input-name-identifier input',
    'input[type="text"][autocomplete="username"]',
    'input[type="text"]',
    'input[type="email"]',
  ];

  let oktaEmailInput = null;
  let usedSelector = '';
  let targetFrame: Page | Frame = page; // Por defecto usar el frame principal

  // Intentar con el selector específico del span primero
  console.log(`   [PASO 1] Intentando encontrar span[data-se="o-form-input-identifier"] input en frame principal...`);
  try {
    oktaEmailInput = await page.waitForSelector('span[data-se="o-form-input-identifier"] input', { 
      timeout: 15000,
      state: 'visible'
    });
    usedSelector = 'span[data-se="o-form-input-identifier"] input';
    console.log(`   ✅ Input encontrado con selector específico del span en frame principal`);
  } catch (e) {
    console.log(`   ⚠️  Selector del span no encontrado (${e}), intentando con input[name="identifier"]...`);
    
    // Intentar con input[name="identifier"] directamente
    console.log(`   [PASO 2] Intentando encontrar input[name="identifier"] en frame principal...`);
    try {
      oktaEmailInput = await page.waitForSelector('input[name="identifier"]', { 
        timeout: 10000,
        state: 'visible'
      });
      usedSelector = 'input[name="identifier"]';
      console.log(`   ✅ Input encontrado con input[name="identifier"] en frame principal`);
    } catch (e2) {
      console.log(`   ⚠️  waitForSelector en frame principal falló (${e2}), buscando en iframes...`);
      
      // Buscar en iframes con el selector específico primero
      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        try {
          console.log(`   [PASO 3] Buscando en frame ${i} (${frame.url()})...`);
          oktaEmailInput = await frame.waitForSelector('span[data-se="o-form-input-identifier"] input', { 
            timeout: 5000,
            state: 'visible'
          });
          targetFrame = frame;
          usedSelector = 'span[data-se="o-form-input-identifier"] input';
          console.log(`   ✅ Input encontrado en frame ${i} con selector del span`);
          break;
        } catch (frameError1) {
          // Intentar con input[name="identifier"] en este frame
          try {
            console.log(`   [PASO 4] Intentando input[name="identifier"] en frame ${i}...`);
            oktaEmailInput = await frame.waitForSelector('input[name="identifier"]', { 
              timeout: 3000,
              state: 'visible'
            });
            targetFrame = frame;
            usedSelector = 'input[name="identifier"]';
            console.log(`   ✅ Input encontrado en frame ${i} con input[name="identifier"]`);
            break;
          } catch (frameError2) {
            console.log(`   ⚠️  Frame ${i} no tiene el input buscado`);
            // Continuar con el siguiente frame
          }
        }
      }
      
      // Si aún no se encontró, intentar con selectores alternativos usando querySelector
      if (!oktaEmailInput) {
        console.log(`   [PASO 5] Intentando con selectores alternativos usando querySelector...`);
        for (const selector of oktaEmailSelectors) {
          try {
            console.log(`      Probando selector: ${selector}`);
            const input = await targetFrame.$(selector);
            if (input) {
              const isVisible = await input.isVisible();
              const isEditable = await input.isEditable();
              const isEnabled = await input.isEnabled();
              console.log(`      ✓ Input encontrado con: ${selector}`);
              console.log(`         visible: ${isVisible}, editable: ${isEditable}, enabled: ${isEnabled}`);
              if (isVisible && isEditable && isEnabled) {
                oktaEmailInput = input;
                usedSelector = selector;
                console.log(`   ✅ Input seleccionado con selector: ${selector}`);
                break;
              }
            }
          } catch (selectorError) {
            console.log(`      ✗ Selector ${selector} falló: ${selectorError}`);
            // Continuar con el siguiente selector
          }
        }
      }
    }
  }

  if (!oktaEmailInput) {
    console.log(`   ⚠️  No se encontró el formulario de email de Okta después de todos los intentos`);
    console.log(`   URL final: ${page.url()}`);
    console.log(`   Título: ${await page.title()}`);
    
    // Debug adicional: intentar encontrar cualquier input visible
    console.log(`   [DEBUG] Buscando cualquier input visible en la página...`);
    const allVisibleInputs = await page.$$('input');
    for (let i = 0; i < allVisibleInputs.length; i++) {
      const inp = allVisibleInputs[i];
      const vis = await inp.isVisible().catch(() => false);
      const name = await inp.getAttribute('name').catch(() => '');
      const type = await inp.getAttribute('type').catch(() => '');
      console.log(`      Input ${i}: name="${name}", type="${type}", visible=${vis}`);
    }
    
    throw new Error('No se encontró el input de email en Okta');
  }

  console.log(`   ✅ Input encontrado exitosamente con selector: ${usedSelector}`);
  console.log(`   Continuando con la escritura del email...`);

  // Esperar a que el input sea completamente interactivo
  console.log(`   Esperando a que el input sea interactivo...`);
  await sleep(1500);
  
  // Verificar que el input sea visible y editable
  const isVisible = await oktaEmailInput.isVisible();
  const isEditable = await oktaEmailInput.isEditable();
  const isEnabled = await oktaEmailInput.isEnabled();
  console.log(`   Input visible: ${isVisible}, editable: ${isEditable}, enabled: ${isEnabled}`);
  
  if (!isVisible || !isEditable || !isEnabled) {
    console.log(`   ⚠️  Input no está listo, esperando 3 segundos más...`);
    await sleep(3000);
    
    // Verificar de nuevo
    const isVisible2 = await oktaEmailInput.isVisible();
    const isEditable2 = await oktaEmailInput.isEditable();
    const isEnabled2 = await oktaEmailInput.isEnabled();
    console.log(`   Después de espera - visible: ${isVisible2}, editable: ${isEditable2}, enabled: ${isEnabled2}`);
    
    if (!isVisible2 || !isEditable2 || !isEnabled2) {
      throw new Error('El input de email no está listo para interactuar después de esperar');
    }
  }

  console.log(`📧 ${logPrefix} Ingresando email en Okta: ${oktaEmail}`);
  console.log(`   Email a ingresar: "${oktaEmail}"`);

  // Intentar múltiples métodos para asegurar que el email se escriba
  let emailWritten = false;
  
  try {
    // Método 1: Hacer scroll y click, luego fill
    console.log(`   [MÉTODO 1] Scroll + Click + Fill...`);
    console.log(`      Haciendo scroll al input...`);
    await oktaEmailInput.scrollIntoViewIfNeeded();
    await sleep(500);
    console.log(`      ✓ Scroll completado`);
    
    // Click para enfocar
    console.log(`      Haciendo click en el input...`);
    await oktaEmailInput.click({ force: true });
    await sleep(800);
    console.log(`      ✓ Click realizado`);
    
    // Limpiar cualquier valor existente
    console.log(`      Limpiando valor existente...`);
    const currentValue = await oktaEmailInput.inputValue().catch(() => '');
    console.log(`      Valor actual antes de limpiar: "${currentValue}"`);
    await oktaEmailInput.fill('');
    await sleep(300);
    console.log(`      ✓ Input limpiado`);
    
    // Llenar con el email
    console.log(`      Escribiendo email: "${oktaEmail}"...`);
    await oktaEmailInput.fill(oktaEmail);
    await sleep(800);
    console.log(`      ✓ Fill ejecutado`);

    // Verificar si se llenó
    const value = await oktaEmailInput.inputValue();
    console.log(`      Valor después de fill: "${value}"`);

    if (value && value.trim() === oktaEmail.trim()) {
      emailWritten = true;
      console.log(`   ✅ Email ingresado correctamente con fill`);
    } else {
      console.log(`   ⚠️  Fill no funcionó completamente (esperado: "${oktaEmail}", obtenido: "${value}"), intentando con teclado...`);
    }
  } catch (error) {
    console.log(`   ⚠️  Error con método fill: ${error}`);
    console.log(`      Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
  }

  // Método 2: Si fill no funcionó, usar teclado
  if (!emailWritten) {
    try {
      console.log(`   Método 2: Teclado...`);
      await oktaEmailInput.click({ force: true });
      await sleep(500);
      
      // Seleccionar todo y borrar
      await page.keyboard.press('Control+A');
      await sleep(200);
      await page.keyboard.press('Backspace');
      await sleep(300);

      // Escribir el email carácter por carácter
      await page.keyboard.type(oktaEmail, { delay: 50 });
      await sleep(800);

      const valueAfterKeyboard = await oktaEmailInput.inputValue();
      console.log(`   Valor después de teclado: "${valueAfterKeyboard}"`);
      
      if (valueAfterKeyboard && valueAfterKeyboard.trim() === oktaEmail.trim()) {
        emailWritten = true;
        console.log(`   ✓ Email ingresado correctamente con teclado`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error con método teclado: ${error}`);
    }
  }

  // Método 3: Si aún no funcionó, usar evaluate para establecer el valor directamente
  if (!emailWritten) {
    try {
      console.log(`   Método 3: Establecer valor directamente con evaluate...`);
      await oktaEmailInput.evaluate((el: HTMLInputElement, email: string) => {
        el.value = email;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, oktaEmail);
      await sleep(500);
      
      const valueAfterEvaluate = await oktaEmailInput.inputValue();
      console.log(`   Valor después de evaluate: "${valueAfterEvaluate}"`);
      
      if (valueAfterEvaluate && valueAfterEvaluate.trim() === oktaEmail.trim()) {
        emailWritten = true;
        console.log(`   ✓ Email ingresado correctamente con evaluate`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error con método evaluate: ${error}`);
    }
  }

  if (!emailWritten) {
    // Última verificación
    const finalValue = await oktaEmailInput.inputValue();
    console.log(`   ⚠️  Valor final en el input: "${finalValue}"`);
    throw new Error(`No se pudo ingresar el email en Okta después de intentar todos los métodos. Valor final: "${finalValue}"`);
  }
  
  console.log(`   ✅ Email ingresado exitosamente: ${oktaEmail}`);

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
        // Espera escalonada en lugar de waitForLoadState
        console.log(`   ⏳ Esperando a que la página responda...`);
        await sleep(1000); // Espera inicial de 1 segundo
        // Verificar si el selector de MFA está disponible (espera escalonada)
        await waitForElementScaled('div[data-se="okta_verify-push"]', page, 'opciones de MFA');
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

  // PASO 3: Seleccionar opción de Okta Verify Push en MFA
  console.log(`🔍 ${logPrefix} Buscando opciones de MFA...`);
  
  // Espera escalonada para que las opciones de MFA estén disponibles
  await waitForElementScaled('div[data-se="okta_verify-push"]', page, 'opciones de MFA');

  // Buscar primero el botón específico de Okta Verify Push usando el selector exacto
  let pushButton = null;
  
  // Estrategia 1: Buscar directamente el botón dentro del div con data-se="okta_verify-push"
  console.log(`   [Estrategia 1] Buscando botón dentro de div[data-se="okta_verify-push"]...`);
  try {
    const oktaVerifyContainer = await page.$('div[data-se="okta_verify-push"]');
    if (oktaVerifyContainer) {
      console.log(`   ✓ Contenedor de Okta Verify Push encontrado`);
      pushButton = await oktaVerifyContainer.$('a[data-se="button"]');
      if (pushButton) {
        const ariaLabel = await pushButton.getAttribute('aria-label').catch(() => '');
        console.log(`   ✅ Botón de Okta Verify Push encontrado con selector específico: "${ariaLabel}"`);
      }
    }
  } catch (e) {
    console.log(`   ⚠️  Estrategia 1 falló: ${e}`);
  }

  // Estrategia 2: Buscar por aria-label específico
  if (!pushButton) {
    console.log(`   [Estrategia 2] Buscando por aria-label que contenga "notificación push"...`);
    try {
      const buttons = await page.$$('a[data-se="button"]');
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
        const ariaLowerCase = ariaLabel?.toLowerCase() || '';
        if (ariaLowerCase.includes('notificación push') || ariaLowerCase.includes('reciba una notificación')) {
          // Verificar que no sea el de código
          if (!ariaLowerCase.includes('código') && !ariaLowerCase.includes('introduzca')) {
            pushButton = button;
            console.log(`   ✅ Botón de Okta Verify Push encontrado por aria-label: "${ariaLabel}"`);
            break;
          }
        }
      }
    } catch (e) {
      console.log(`   ⚠️  Estrategia 2 falló: ${e}`);
    }
  }

  // Estrategia 3: Buscar todos los botones "Seleccionar" y filtrar
  if (!pushButton) {
    console.log(`   [Estrategia 3] Buscando todos los botones "Seleccionar"...`);
    const selectButtonSelectors = [
      'div[data-se="okta_verify-push"] a.select-factor',
      'div[data-se="okta_verify-push"] a[data-se="button"]',
      'a.select-factor',
      'a[data-se="button"]',
      'a.button:has-text("Seleccionar")',
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
  }

  // Si aún no encontramos el botón, usar fallback: buscar la segunda opción
  if (!pushButton) {
    console.log(`   ⚠️  No se encontró opción de Push con estrategias específicas. Buscando todas las opciones...`);
    
    const selectButtonSelectors = [
      'a.select-factor',
      'a[data-se="button"]',
      'a.button:has-text("Seleccionar")',
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

    if (selectButtons.length > 0) {
      // Listar todas las opciones disponibles para debugging
      for (let i = 0; i < selectButtons.length; i++) {
        const button = selectButtons[i];
        const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
        console.log(`   Opción ${i + 1}: aria-label="${ariaLabel}"`);
      }

      // Si hay al menos 2 opciones, usar la segunda (primera suele ser código, segunda es push)
      if (selectButtons.length >= 2) {
        console.log(`   ⚠️  Usando segunda opción (suele ser Push)`);
        pushButton = selectButtons[1];
      } else if (selectButtons.length === 1) {
        console.log(`   ⚠️  Solo hay 1 opción, usándola`);
        pushButton = selectButtons[0];
      }
    }
  }

  // Si aún no encontramos Okta Verify Push, intentar "Volver a iniciar sesión"
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
      // Espera escalonada
      await sleep(1000);
      await waitForElementScaled('input[name="identifier"]', page, 'input de email');

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
        // Espera escalonada
        await sleep(1000);
        await waitForElementScaled('div[data-se="okta_verify-push"]', page, 'opciones de MFA');
      }

      // Buscar opciones de MFA de nuevo
      console.log(`   🔍 Buscando opciones de MFA (segundo intento)...`);
      const selectButtonSelectorsRetry = [
        'div[data-se="okta_verify-push"] a[data-se="button"]',
        'a.select-factor',
        'a[data-se="button"]',
        'a.button:has-text("Seleccionar")',
      ];
      let selectButtons: any[] = [];
      for (const selector of selectButtonSelectorsRetry) {
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

      // Si aún no encontramos, usar la SEGUNDA opción (primera es código, segunda es push)
      if (!pushButton && selectButtons.length >= 2) {
        console.log(`   ⚠️  No se encontró por aria-label, usando segunda opción (suele ser Push)`);
        pushButton = selectButtons[1];
      } else if (!pushButton && selectButtons.length === 1) {
        console.log(`   ⚠️  Solo hay 1 opción, usándola`);
        pushButton = selectButtons[0];
      }
    }
  }

  if (!pushButton) {
    throw new Error('No se pudo encontrar la opción de Okta Verify Push después de reintentar');
  }

  // Verificar que el botón sea visible y clickeable
  const pushButtonVisible = await pushButton.isVisible();
  const pushButtonEnabled = await pushButton.isEnabled().catch(() => true);
  console.log(`   Botón encontrado - visible: ${pushButtonVisible}, enabled: ${pushButtonEnabled}`);
  
  if (!pushButtonVisible) {
    console.log(`   ⚠️  Botón no visible, haciendo scroll...`);
    await pushButton.scrollIntoViewIfNeeded();
    await sleep(500);
  }

  console.log(`   ✓ Haciendo click en opción de Okta Verify Push...`);

  try {
    // Hacer scroll si es necesario
    await pushButton.scrollIntoViewIfNeeded();
    await sleep(300);
    
    // Hacer click
    await pushButton.click({ force: true });
    console.log(`✅ ${logPrefix} Click en opción de Okta Verify Push realizado`);
    
    // Espera escalonada en lugar de waitForLoadState
    console.log(`   ⏳ Esperando a que la página responda...`);
    await sleep(1000); // Espera inicial de 1 segundo
    // La página debería estar lista, continuamos sin esperar más
    console.log(`   ✓ Continuando con el flujo de autenticación`);
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
  // Espera escalonada en lugar de waitForLoadState
  await sleep(1000);
  await sleep(3000); // Espera adicional para que Okta y Cloudflare procesen el redirect

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
