// app/formulario/page.tsx
import FormularioMonchis from '@/components/form/FormularioMonchis';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Postulate como Driver - Monchis',
  description: 'Únete al equipo de Monchis. Completa tu postulación y empieza a trabajar como driver de delivery.',
  openGraph: {
    title: 'Postulate como Driver - Monchis',
    description: 'Únete al equipo de Monchis. Completa tu postulación y empieza a trabajar como driver de delivery.',
    type: 'website',
  },
};

export default function FormularioPage() {
  return <FormularioMonchis />;
}
