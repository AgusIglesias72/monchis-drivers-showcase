# Railway Deployment Setup

Esta aplicación está configurada para funcionar en dos ambientes:

## Vercel (Producción con Clerk Auth)
- **URL**: https://monchis-drivers.vercel.app
- Clerk habilitado para autenticación de usuarios
- Panel de administración completo
- Pre-rendering habilitado para páginas públicas

## Railway (Automation Server sin Auth)
- **Propósito**: Ejecutar endpoints de automatización con Playwright
- Clerk completamente deshabilitado
- Optimizado solo para tareas de scraping y procesamiento

## Variables de Entorno para Railway

**IMPORTANTE**: El Dockerfile ya incluye `NEXT_PUBLIC_DISABLE_CLERK=true` por defecto, por lo que **NO necesitas agregarla manualmente en Railway**.

### Variables requeridas para Railway:

```bash
# Base de datos
DATABASE_URL=your_database_url

# Google Sheets & Drive
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_DRIVE_FOLDER_ID=your_folder_id

# Credenciales de la app a scrapear
APP_EMAIL=your_app_email
APP_PASSWORD=your_app_password
APP_LOGIN_URL=https://your-app.com/login
APP_DRIVERS_URL=https://your-app.com/reports/driverpayment

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
OWNER_EMAIL=notifications@yourdomain.com

# OAuth (opcional para drive)
GOOGLE_OAUTH_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret

# Antropic (para validación de documentos)
ANTHROPIC_API_KEY=your_anthropic_key
```

**Nota**: `NEXT_PUBLIC_DISABLE_CLERK=true` ya está configurado en el Dockerfile, no necesitas agregarlo.

## Endpoints disponibles en Railway

Una vez desplegado, estos endpoints estarán disponibles sin autenticación:

- `POST /api/reports/process-all` - Procesar reportes y conductores externos
- `POST /api/reports/upload-only` - Solo subir reportes a Google Sheets
- `GET /api/drivers/process-forms` - Preview de formularios de conductores
- `POST /api/drivers/process-forms` - Procesar formularios de conductores

## Cómo funciona

El Dockerfile configura `NEXT_PUBLIC_DISABLE_CLERK=true` tanto durante el build como en runtime. Esto hace que:

1. `ClerkProviderWrapper` no inicialice ClerkProvider
2. Las páginas de autenticación (`/sign-in`, `/sign-up`, etc.) muestren un mensaje informativo
3. El build de Next.js no falle por falta de credenciales de Clerk
4. Los endpoints de API funcionen normalmente sin middleware de autenticación

## Build en Railway

El Dockerfile está configurado para:
1. Instalar todas las dependencias (incluyendo Playwright)
2. Instalar Chromium con todas sus dependencias del sistema
3. Hacer build de Next.js
4. Limpiar devDependencies para reducir tamaño
5. Iniciar con `npm start`

## Testing local sin Clerk

Para probar localmente sin Clerk:

```bash
# En tu .env.local
NEXT_PUBLIC_DISABLE_CLERK=true

# Iniciar la app
npm run dev
```

Las páginas de autenticación mostrarán un mensaje informativo pero los endpoints de API funcionarán normalmente.
