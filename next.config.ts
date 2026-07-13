import type { NextConfig } from "next";

// Need to add the following domain for images: m5ecgo49mnkes8vr.public.blob.vercel-storage.com

const imagesConfig = {
  domains: ['m5ecgo49mnkes8vr.public.blob.vercel-storage.com', 'contoapp.com', 'drive.google.com', 'ueno.com.py'],
}

// Headers de seguridad aplicados a todas las respuestas. Pueden ajustarse en
// rutas específicas si CSP necesita ser más permisivo (ej. webhooks).
const securityHeaders = [
  // Fuerza HTTPS durante 2 años incluyendo subdominios.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // No permitir iframes — bloquea clickjacking. CSP frame-ancestors es el
  // sustituto moderno; mantenemos también el legacy para navegadores viejos.
  { key: 'X-Frame-Options', value: 'DENY' },
  // No "sniff" del content-type (evita XSS via wrong mime).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Solo enviar origen al hacer requests cross-origin.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Bloquear features potentes que no usamos.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  images: imagesConfig,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Las rutas /design/screens/* se embeben en iframes dentro de /design,
      // mismo origen → SAMEORIGIN en lugar de DENY.
      {
        source: '/design/screens/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },

  // Aumentar el límite de tamaño del body para Server Actions.
  // En Next 15 esto vive bajo experimental.
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
