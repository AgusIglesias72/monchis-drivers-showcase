// app/layout.tsx
import { Toaster } from 'sonner';
import { GoogleAnalytics } from '@next/third-parties/google'
import { GoogleTagManager } from '@/components/GoogleTagManager'
import ClarityScript from "@/components/ClarityScript"
import './globals.css';
import { ClerkProviderWrapper } from '@/components/ClerkProviderWrapper'

export const metadata = {
  metadataBase: new URL('https://monchis-drivers.vercel.app'),
  title: {
    default: 'Monchis Drivers - Trabaja como Repartidor en Paraguay',
    template: '%s | Monchis Drivers'
  },
  description: 'Únete al equipo de drivers de Monchis y gana dinero haciendo entregas en Paraguay. Horarios flexibles, pagos semanales y beneficios exclusivos.',
  applicationName: 'Monchis Drivers',
  referrer: 'origin-when-cross-origin',
  keywords: ['monchis', 'driver', 'delivery', 'paraguay', 'asuncion', 'trabajo', 'repartidor', 'entregas', 'gana dinero'],
  authors: [{ name: 'Monchis', url: 'https://monchis.com.py' }],
  creator: 'Monchis',
  publisher: 'Monchis',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'es_PY',
    url: 'https://monchis-drivers.vercel.app',
    siteName: 'Monchis Drivers',
    title: 'Monchis Drivers - Trabaja como Repartidor en Paraguay',
    description: 'Únete al equipo de drivers de Monchis y gana dinero haciendo entregas en Paraguay.',
    images: [
      {
        url: '/monchis-logo-red.png',
        width: 1200,
        height: 630,
        alt: 'Monchis Drivers',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Monchis Drivers - Trabaja como Repartidor en Paraguay',
    description: 'Únete al equipo de drivers de Monchis',
    images: ['/monchis-logo-red.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/monchis-icon.svg' },
      { url: '/monchis-icon.svg', sizes: '32x32', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/monchis-icon.svg' },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId: string = process.env.NEXT_PUBLIC_GA_ID || '';
  const gtmId: string = process.env.NEXT_PUBLIC_GTM_ID || '';
  
  return (
    <ClerkProviderWrapper>
      <html lang="es">
        <head>
          {/* Tipografía Monchis (sistema STUDIO): Bricolage Grotesque (display) + Plus Jakarta Sans (body) + Space Mono (mono).
              Cargadas vía <link> (runtime, en el browser) en vez de next/font para no depender
              de fonts.gstatic.com en build (bloqueado en dev). */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap"
            rel="stylesheet"
          />
          {/* Google Tag Manager debe ir en el <head> */}
          {gtmId && <GoogleTagManager gtmId={gtmId} />}
        </head>
        <body className="font-sans">
          {children}
         
          {/* Sonner Toast */}
          <Toaster
            position="top-center"
            richColors
            closeButton
            expand={false}
            toastOptions={{
              style: {
                fontFamily: 'var(--font-montserrat)',
              },
              duration: 3000,
            }}
          />
                  
          <ClarityScript />
         
          {/* Google Analytics se mantiene */}
          {gaId && <GoogleAnalytics gaId={gaId} />}
        </body>
      </html>
    </ClerkProviderWrapper>
  );
}