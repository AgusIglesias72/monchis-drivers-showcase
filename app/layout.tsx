// app/layout.tsx
import { Montserrat } from 'next/font/google';
import { Toaster } from 'sonner';
import { GoogleAnalytics } from '@next/third-parties/google'
import { GoogleTagManager } from '@/components/GoogleTagManager'
import ClarityScript from "@/components/ClarityScript"
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css';
import { esES } from '@clerk/localizations'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata = {
  title: 'Monchis - Postulación Driver',
  description: 'Únete al equipo de drivers de Monchis',
  openGraph: {
    title: 'Monchis - Postulación Driver',
    description: 'Únete al equipo de drivers de Monchis',
    images: '/monchis-icon.svg',
  },
  icons: {
    icon: '/monchis-icon.svg',
    apple: '/monchis-icon.svg',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId: string = process.env.NEXT_PUBLIC_GA_ID || '';
  const gtmId: string = process.env.NEXT_PUBLIC_GTM_ID || '';
  
  return (
    <ClerkProvider localization={esES}>
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
    </ClerkProvider>
  );
}