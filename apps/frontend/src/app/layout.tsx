import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Interplay Maps v1.0',
  description: 'Plataforma GIS Profesional para la Gestión de Infraestructura FTTH',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
