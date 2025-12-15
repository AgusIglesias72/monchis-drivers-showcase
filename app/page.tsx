import FormularioMonchis from '@/components/form/FormularioMonchis';
import { SEOStructuredData } from '@/components/SEOStructuredData';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trabaja como Driver en Monchis Paraguay - Gana Dinero Entregando',
  description: '¿Buscas trabajo como driver en Paraguay? Únete a Monchis y gana dinero haciendo entregas. Horarios flexibles, pagos semanales, y beneficios exclusivos. Postula ahora en Asunción, Gran Asunción y todo Paraguay.',
  keywords: ['trabajo driver paraguay', 'delivery asuncion', 'repartidor monchis', 'trabajo entrega domicilio', 'driver asuncion', 'trabajo flexible paraguay', 'gana dinero entregando', 'repartidor delivery', 'trabajo independiente paraguay', 'monchis driver'],
  authors: [{ name: 'Monchis' }],
  creator: 'Monchis',
  publisher: 'Monchis',
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
  openGraph: {
    type: 'website',
    locale: 'es_PY',
    url: 'https://monchis-drivers.vercel.app',
    siteName: 'Monchis Drivers',
    title: 'Trabaja como Driver en Monchis Paraguay - Gana Dinero Entregando',
    description: '¿Buscas trabajo como driver en Paraguay? Únete a Monchis y gana dinero haciendo entregas. Horarios flexibles, pagos semanales, y beneficios exclusivos.',
    images: [
      {
        url: '/monchis-logo-red.png',
        width: 1200,
        height: 630,
        alt: 'Monchis - Trabaja como Driver',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trabaja como Driver en Monchis Paraguay',
    description: 'Únete a Monchis y gana dinero haciendo entregas. Horarios flexibles y pagos semanales.',
    images: ['/monchis-logo-red.png'],
  },
  alternates: {
    canonical: 'https://monchis-drivers.vercel.app',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function HomePage() {
  return (
    <>
      <SEOStructuredData />
      <FormularioMonchis />
    </>
  );
}