# Railway Deployment Setup

El project **Monchis Drivers** en Railway tiene **3 services**:

1. **`monchis-drivers`** — Next.js sin Clerk para correr endpoints de scraping/Playwright.
2. **`whatsapp_bot_monchis`** — Bot WhatsApp (whatsapp-web.js) que sirve `apps/whatsapp-bot/` del monorepo.
3. **`Postgres`** — DB del proyecto (la misma que usa Vercel).

Más detalle de cada uno abajo.

---

## Service 1: `monchis-drivers` (scraping Next.js)

**Propósito**: ejecutar endpoints de automatización con Playwright que no pueden correr en Vercel (timeout / cold starts).

**Endpoints disponibles** (sin auth, protegidos por `CRON_SECRET`):

- `POST /api/reports/process-all` - Procesar reportes y conductores externos
- `POST /api/reports/upload-only` - Solo subir reportes a Google Sheets
- `GET /api/drivers/process-forms` - Preview de formularios de conductores
- `POST /api/drivers/process-forms` - Procesar formularios de conductores

**Build**: `Dockerfile` en el root del monorepo. Setea `NEXT_PUBLIC_DISABLE_CLERK=true` para que el build no falle por falta de credenciales Clerk y los endpoints API no apliquen middleware de auth.

**Variables de entorno requeridas**:

```bash
DATABASE_URL=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
GOOGLE_SHEETS_ID=...
GOOGLE_DRIVE_FOLDER_ID=...
APP_EMAIL=...
APP_PASSWORD=...
APP_LOGIN_URL=...
APP_DRIVERS_URL=...
RESEND_API_KEY=...
OWNER_EMAIL=...
ANTHROPIC_API_KEY=...
CRON_SECRET=...
```

`NEXT_PUBLIC_DISABLE_CLERK=true` ya viene en el Dockerfile, **no agregar en Railway**.

---

## Service 2: `whatsapp_bot_monchis` (bot WhatsApp)

**Propósito**: bot WhatsApp Web que envía y recibe mensajes de postulantes. Vive en el monorepo bajo `apps/whatsapp-bot/`.

**Build**: `apps/whatsapp-bot/Dockerfile` (Chromium + Node 20). Config explícita en `apps/whatsapp-bot/railway.json` (healthcheck `/health`, restart on failure).

### Variables de entorno

```bash
# Identidad
API_KEY=<openssl rand -hex 32>          # compartida con Vercel (WHATSAPP_BOT_API_KEY)
PORT=3000
NODE_ENV=production

# Webhook entrante (mensajes que recibe el bot → POST al Next)
VERCEL_WEBHOOK_URL=https://monchis-drivers.vercel.app/api/whatsapp/webhook

# CORS — orígenes permitidos para llamar al bot desde browsers
ALLOWED_ORIGINS=https://monchis-drivers.vercel.app,http://localhost:3000,http://localhost:3001

# Puppeteer (Chromium del sistema)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true    # ya viene en el Dockerfile
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium  # ya viene en el Dockerfile
```

### Volumen persistente (CRÍTICO)

El bot usa **LocalAuth** de `whatsapp-web.js` que guarda la sesión en disco (`./.wwebjs_auth/`). Sin volumen montado, cada redeploy te obliga a re-escanear el QR.

- **Mount path**: `/app/.wwebjs_auth`
- Crear con: `railway volume add --mount-path /app/.wwebjs_auth` (con el service linkeado).

### GitHub connection / Root Directory

En Railway UI → `whatsapp_bot_monchis` → **Settings → Source**:
- **Repo**: `AgusIglesias72/monchis-drivers` (mismo monorepo que `monchis-drivers` service).
- **Root Directory**: `apps/whatsapp-bot`
- **Watch Paths**: `apps/whatsapp-bot/**`
- **Branch**: `main`

Con esto, `git push` que toque `apps/whatsapp-bot/**` triggea auto-deploy SOLO del bot (no del Next).

### Deploy manual (cuando hace falta)

Si no querés esperar el auto-deploy de un push, desde el root del monorepo:

```bash
railway up apps/whatsapp-bot --path-as-root --service whatsapp_bot_monchis --detach
```

### Escanear QR

1. Esperar a que el deploy esté `SUCCESS`.
2. Abrir logs del service: `railway logs --service whatsapp_bot_monchis` (o vía UI).
3. Buscar el QR ASCII en los logs.
4. WhatsApp → **Dispositivos vinculados** → **Vincular un dispositivo** → escanear el QR.
5. Verificar: `curl https://whatsappbotmonchis-production.up.railway.app/qr-status` debe devolver `connected: true`.

### Forzar nuevo QR (rotar número)

`POST /logout` con API key. Esto cierra sesión, limpia LocalAuth y dispara un nuevo QR.

```bash
curl -X POST -H "X-API-Key: $WHATSAPP_BOT_API_KEY" https://whatsappbotmonchis-production.up.railway.app/logout
```

### Endpoints del bot

| Método | Path | Descripción |
|---|---|---|
| GET | `/health` | Healthcheck (usado por Railway). |
| GET | `/qr-status` | Estado de conexión + QR ASCII si está disponible. |
| GET | `/connection-info` | Si conectado, devuelve número, displayName, platform. |
| POST | `/logout` | Cierra sesión y reinicia con nuevo QR (requiere API key). |
| POST | `/send-message` | Envía mensaje (con texto y/o imagen). |
| POST | `/send-contextual-message` | Envía mensaje desde template del bot (poco usado — preferir construir el texto desde Next). |
| POST | `/send-bulk` | Envía array de mensajes con rate-limit interno. |
| GET | `/message-types` | Tipos válidos del endpoint contextual. |

### Integración con Vercel

En Vercel → project `monchis-drivers` → Environment Variables:

```bash
WHATSAPP_BOT_URL=https://whatsappbotmonchis-production.up.railway.app
WHATSAPP_BOT_API_KEY=<misma API_KEY de Railway>
```

El Next.js usa `lib/services/whatsapp-bot.service.ts` para hablar con el bot. Todas las llamadas mandan `X-API-Key: ${WHATSAPP_BOT_API_KEY}` y van al `WHATSAPP_BOT_URL`.

### Templates de mensajes

Los templates viven en la tabla `WhatsAppTemplate` (DB de Postgres), no hard-codeados. Se editan desde `/admin/plantillas-whatsapp`. Para popular nuevos templates al setear el proyecto desde cero:

```bash
npx tsx prisma/seed-templates.ts
```

Es idempotente: salta keys que ya existen.

---

## Service 3: `Postgres`

DB compartida entre `monchis-drivers` (Next/Vercel y Railway scraping) y todos los flujos. Sin notas especiales — la URL se inyecta en los otros services via `${{ Postgres.DATABASE_URL }}`.

---

## Migraciones de DB

Las migrations viven en `prisma/migrations-manual/<fecha>-<descripcion>.sql`. **No** se usa `prisma migrate` ni `prisma db push` para evitar destructivos accidentales.

Correr una migration contra prod:

```bash
npx prisma db execute --file prisma/migrations-manual/<archivo>.sql --schema prisma/schema.prisma
```

Verificar antes de pushear el código que **dependa** del schema nuevo, para evitar ventanas de error en prod.

---

## Troubleshooting bot

- **Bot devuelve 404 "Application not found"**: el deploy crasheó o nunca llegó a healthy. Revisar logs del último deployment.
- **Bot conecta pero no manda mensajes**: ver `/qr-status`. Si está `qr_available`, hay que re-escanear.
- **Mensajes no llegan al webhook del Next**: verificar `VERCEL_WEBHOOK_URL` (debe apuntar al dominio prod sin trailing slash) y que el endpoint `/api/whatsapp/webhook` esté arriba.
- **Sesión se pierde tras cada redeploy**: faltó el volumen en `/app/.wwebjs_auth`.
- **CORS error desde el admin**: agregar el dominio a `ALLOWED_ORIGINS` (coma-separado).
