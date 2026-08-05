// app/api/admin/google-oauth/html.ts
//
// Páginas mínimas para el flow de OAuth alojado — se abren directo en el
// navegador del celu, no son respuestas JSON para un fetch().

function shell(title: string, color: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #f5f5f5; margin: 0; padding: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .card { max-width: 420px; margin: 24px; padding: 32px 28px; background: #171717; border: 1px solid #262626; border-radius: 12px; text-align: center; }
  h1 { font-size: 20px; margin: 0 0 12px; color: ${color}; }
  p { font-size: 14px; line-height: 1.5; color: #a3a3a3; margin: 0 0 8px; }
  a.btn { display: inline-block; margin-top: 16px; padding: 10px 20px; background: #f5f5f5; color: #0a0a0a; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; }
  code { background: #262626; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
</style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`
}

export function errorPage(title: string, message: string, linkHref?: string, linkLabel = 'Iniciar sesión'): string {
  return shell(
    title,
    '#f87171',
    `<h1>❌ ${title}</h1><p>${message}</p>${linkHref ? `<a class="btn" href="${linkHref}">${linkLabel}</a>` : ''}`,
  )
}

export function successPage(rotatedBy: string): string {
  return shell(
    'Token renovado',
    '#4ade80',
    `<h1>✅ Token renovado</h1><p>El refresh token de Google se guardó correctamente y ya está disponible para todos los entornos.</p><p>Renovado por <code>${rotatedBy}</code></p>`,
  )
}
