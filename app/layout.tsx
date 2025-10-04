// app/formulario/layout.tsx
import { Montserrat } from 'next/font/google';
import { Toaster } from 'sonner';
import Script from 'next/script';

const montserrat = Montserrat({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
});

export default function FormularioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${montserrat.variable} font-sans`}>
      {/* Google Analytics */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>

      {children}
      
      {/* Sonner Toast */}
      <Toaster 
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'var(--font-montserrat)',
          },
        }}
      />
    </div>
  );
}