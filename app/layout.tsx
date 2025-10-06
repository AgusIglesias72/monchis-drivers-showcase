import { Montserrat } from 'next/font/google';
import { Toaster } from 'sonner';
import Script from 'next/script';
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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="es">
      <body className={`${montserrat.variable} font-sans`}>
        {/* Google Analytics - Solo si existe el ID */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

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
      </body>
    </html>
  );
}