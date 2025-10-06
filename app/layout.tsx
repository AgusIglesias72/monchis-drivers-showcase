import { Montserrat } from 'next/font/google';
import { Toaster } from 'sonner';
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata = {
  title: 'Monchis - Postulación Driver',
  description: 'Únete al equipo de drivers de Monchis',
  // Add data for when link is shared
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
  const gaId : string = process.env.NEXT_PUBLIC_GA_ID || '';

  return (
    <html lang="es">
      <body className={`${montserrat.variable} font-sans`}>
        {/* Google Analytics - Solo si existe el ID */}


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
        <GoogleAnalytics gaId={gaId} />
      </body>
    </html>
  );
}