import FormularioMonchis from '@/components/form/FormularioMonchis';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Postulación Driver - Monchis',
  description: 'Formulario de postulación para convertirte en driver de Monchis',
  robots: 'noindex, nofollow',
};

export default function HomePage() {
  return <FormularioMonchis />;
}