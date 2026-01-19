// app/layout.tsx
import { Montserrat } from 'next/font/google';
import { Toaster } from 'sonner';
import { GoogleAnalytics } from '@next/third-parties/google'
import { GoogleTagManager } from '@/components/GoogleTagManager'
import ClarityScript from "@/components/ClarityScript"
import './globals.css';
import { ClerkProviderWrapper } from '@/components/ClerkProviderWrapper'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

// Force dynamic rendering to prevent Clerk initialization during build
export const dynamic = 'force-dynamic'

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
          {/* Google Tag Manager debe ir en el <head> */}
          {gtmId && <GoogleTagManager gtmId={gtmId} />}
        </head>
        <body className={`${montserrat.variable} font-sans`}>
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